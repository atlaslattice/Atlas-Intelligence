/** Atlas ONE v2 — source-complete Work-page text search, an additive host port.
 * Reuses ONE publisher-owned SwarmChat broker; does not create a storage plane.
 * Full message bodies are scanned transiently and NEVER included in the result.
 * A mocked callback is not platform authentication: hostAuthenticated is ALWAYS false.
 */
import {createHash} from 'node:crypto';
import {isObject,requireValid} from './index.mjs';

export const WORK_SEARCH_SCHEMA = 'atlas.one.work-fullbody-search/v1';
const ID=/^[A-Za-z0-9_-]{3,80}$/;
const HASH=/^[a-f0-9]{64}$/;
const TERM=/^[A-Za-z0-9_:@.-]{2,120}$/;
const MAX_BODY_BYTES=65536;
const MAX_PAGE_BYTES=262144;
const hostFields=['tenant','account','principal'];
const isPositiveSeq=x=>Number.isInteger(x)&&x>=1&&x<=500;
const utf8length=x=>Buffer.byteLength(x,'utf8');
const sha=x=>createHash('sha256').update(Buffer.from(x,'utf8')).digest('hex');
function hold(reason){return {
  schema:WORK_SEARCH_SCHEMA,status:'HOLD',reason,matched:[],scannedWindow:null,
  hostAuthenticated:false,rightsVerified:false,privateContentReturned:false,
  postPerformed:false,canonEffect:'NONE'
};}
function identityValid(x){return isObject(x)&&hostFields.every(k=>typeof x[k]==='string'&&ID.test(x[k]))
  &&x.mode==='WORK'&&x.purpose==='research'&&Number.isSafeInteger(x.rightsEpoch)&&x.rightsEpoch>=0;}
function samePrincipal(r,s){return isObject(r)&&hostFields.every(k=>r[k]===s[k]);}
// ASCII-only token search: folding is length preserving in JS UTF-16 units.
const foldASCII=x=>x.replace(/[A-Z]/g,c=>c.toLowerCase());

/** Source-only port for a host-selected authenticated, Work-only message page.
 * The host supplies session/admission/readPage/egress callbacks. These are
 * developer-owned interfaces, NEVER user/model-provided request fields.
 * Critically, the real host MUST atomically check permissions at its network
 * response boundary: callback return alone does not close the egress race.
 */
export class WorkFullBodySearchPort {
  #session;#admission;#readPage;#egress;
  constructor({session,admission,readPage,egress}={}){
    requireValid([session,admission,readPage,egress].every(f=>typeof f==='function'),'HOST_PORT_CALLBACKS_REQUIRED');
    this.#session=session;this.#admission=admission;this.#readPage=readPage;this.#egress=egress;
  }
  async search(request={}){
    if(!isObject(request)||Object.keys(request).some(k=>!['roomId','query','afterSeq','pageSize','purpose'].includes(k)))
      return hold('REQUEST_SHAPE_INVALID');
    const {roomId,query,afterSeq=0,pageSize=12,purpose='research'}=request;
    if(typeof roomId!=='string'||!ID.test(roomId)||typeof query!=='string'||!TERM.test(query)
      ||!Number.isInteger(afterSeq)||afterSeq<0||afterSeq>500
      ||!Number.isInteger(pageSize)||pageSize<1||pageSize>20||purpose!=='research')
      return hold('REQUEST_SHAPE_INVALID');
    let identity;
    try{identity=await this.#session();}catch{return hold('HOST_SESSION_UNAVAILABLE');}
    if(!identityValid(identity))return hold('HOST_SESSION_UNAVAILABLE');
    const scope=Object.freeze({
      tenant:identity.tenant,account:identity.account,principal:identity.principal,
      rightsEpoch:identity.rightsEpoch,roomId,mode:'WORK',purpose,afterSeq,pageSize
    });
    let admission;
    try{admission=await this.#admission(scope);}catch{return hold('ACCESS_UNAVAILABLE');}
    if(!samePrincipal(admission,scope)||admission.allow!==true||admission.epoch!==scope.rightsEpoch
      ||typeof admission.leaseId!=='string'||!ID.test(admission.leaseId))return hold('ACCESS_UNAVAILABLE');
    const lease=Object.freeze({tenant:admission.tenant,account:admission.account,principal:admission.principal,
      leaseId:admission.leaseId,epoch:admission.epoch,allow:true});
    let page;
    try{page=await this.#readPage(scope,lease);}catch{return hold('SOURCE_UNAVAILABLE');}
    // Re-bind the requesting session AFTER the potentially slow host read.
    let fresh;
    try{fresh=await this.#session();}catch{return hold('ACCESS_UNAVAILABLE');}
    if(!identityValid(fresh)||!samePrincipal(fresh,scope)||fresh.rightsEpoch!==scope.rightsEpoch)
      return hold('ACCESS_UNAVAILABLE');

    let hits=[],bytes=0,last=afterSeq,scannedWindow;
    try{
      if(!isObject(page)||!Array.isArray(page.rows)||page.rows.length>pageSize
        ||typeof page.hasMore!=='boolean'||!Number.isInteger(page.nextAfterSeq)
        ||page.nextAfterSeq<afterSeq||page.nextAfterSeq>500
        ||(page.rows.length===0&&page.hasMore===true))return hold('SOURCE_UNAVAILABLE');
      const needle=foldASCII(query);
      for(const row of page.rows){
        if(!isObject(row)||row.tenant!==scope.tenant||row.account!==scope.account
          ||row.roomId!==roomId||row.kind!=='WORK'||!isPositiveSeq(row.seq)||row.seq<=last
          ||typeof row.body!=='string'||typeof row.bodySHA256!=='string'||!HASH.test(row.bodySHA256))
          return hold('SOURCE_UNAVAILABLE');
        last=row.seq;
        const bodyBytes=utf8length(row.body);bytes+=bodyBytes;
        if(bodyBytes>MAX_BODY_BYTES||bytes>MAX_PAGE_BYTES||sha(row.body)!==row.bodySHA256)
          return hold('SOURCE_UNAVAILABLE');
        const offset=foldASCII(row.body).indexOf(needle);
        if(offset!==-1)hits.push({roomId,seq:row.seq,reason:'DIRECT_FULL_BODY_SUBSTRING_MATCH',
          sourceBodySHA256:row.bodySHA256,matchOffsetUtf16:offset,
          matchOffsetUtf8:utf8length(row.body.slice(0,offset)),
          renderedDomOffset:null,rendererSourceMapRequired:true});
      }
      if(page.nextAfterSeq!==last)return hold('SOURCE_UNAVAILABLE');
      // Bind the receipt to the validated page before awaiting host egress.
      // The callback may reuse or mutate its original page object.
      scannedWindow={roomId,afterSeq,nextAfterSeq:last,hasMore:page.hasMore,
        recordsScanned:page.rows.length,bodyBytesScanned:bytes,
        coverage:'FULL_BODIES_FOR_RETURNED_ROWS_ONLY',
        fullRoomCoverageProven:false,sourceWindowNotGlobalConclusion:true};
    }catch{return hold('SOURCE_UNAVAILABLE');}

    // This check MUST be implemented by a host that owns actual current rights.
    // A separate host atomic check at response egress is still required.
    let release;
    try{release=await this.#egress(scope,lease);}catch{return hold('ACCESS_UNAVAILABLE');}
    if(!samePrincipal(release,scope)||release.allow!==true||release.leaseId!==lease.leaseId||release.epoch!==lease.epoch)
      return hold('ACCESS_UNAVAILABLE');
    return {
      schema:WORK_SEARCH_SCHEMA,
      status:hits.length?'DIRECT_MATCHES_IN_AUTHORIZED_PAGE':'NO_MATCH_IN_SCANNED_PAGE_NOT_GLOBAL_ABSENCE',
      matched:hits,
      scannedWindow,
      hostAuthenticated:false,rightsVerified:false,
      rightsProof:'HOST_CALLBACK_REPORTED_NOT_ATTESTED',
      privateContentReturned:false,postPerformed:false,canonEffect:'NONE'
    };
  }
}
