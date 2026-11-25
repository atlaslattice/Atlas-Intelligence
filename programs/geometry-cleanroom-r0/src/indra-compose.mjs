/** R34: Peer PR66 ONE existing kernel result -> exact PR67 twelve Work views.
 * Source-only; no second gateway, neural call, rights issuer, or byte egress.
 */
import {types as utilTypes} from 'node:util';
import {HSN,ARIADNE_SHA256,EDITION,decode} from '../peer_r38/addresses.mjs';
import {projectTwelve} from '../peer_r38/ports.mjs';
const HEX=/^[a-f0-9]{64}$/;
const VALID=new Set(HSN);
const hold=()=>Object.freeze({status:'HOLD',releaseAuthorized:false,authorityEffect:'NONE'});
const dense=(x,n)=>{
  if(!Array.isArray(x)||utilTypes.isProxy(x)||x.length!==n)throw Error('SHAPE');
  const d=Object.getOwnPropertyDescriptors(x);
  if(Reflect.ownKeys(d).length!==n+1)throw Error('SPARSE');
  return Array.from({length:n},(_,i)=>{
    if(!d[String(i)]||!Object.hasOwn(d[String(i)],'value'))throw Error('ACCESSOR');
    return d[String(i)].value;
  });
};
export async function composeIssuedGeometry(kernel,request,{candidateEdges=[],methodSubject=''}={}){
  try{
    if(!kernel||typeof kernel.run!=='function'||!request||utilTypes.isProxy(request)||typeof request!=='object')return hold();
    const req={...request};
    if(req.scope!=='WORK'||!['INFERENCE','CITATION'].includes(req.purpose)||
       !HEX.test(req.querySha256)||!HEX.test(req.sourceSha256)||
       !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(req.sourceEdition)||
       !Number.isInteger(req.k)||req.k<1||req.k>1728)return hold();
    // The PR66 kernel owns the existing READ, USE, closure, and RETURN checks.
    const issued=await kernel.run(Object.freeze(req));
    if(issued?.status!=='PREPARED_NOT_HOSTED'||issued.neuralCalls!==1||
       issued.result?.releaseAuthorized!==false||issued.result?.trainingEligible!==false)return hold();
    const x=issued.result,s=x.source,l=x.lattice;
    if(s.registrySha256!==ARIADNE_SHA256||s.requestSha256!==req.querySha256||
       s.sourceSha256!==req.sourceSha256||s.sourceEdition!==req.sourceEdition||
       !HEX.test(s.modelSha256)||l.positions!==1728||dense(l.shape,3).join(',')!=='12,12,12')return hold();
    const hits=dense(x.candidates,req.k).map(v=>{
      if(!VALID.has(v.hsn)||!Number.isFinite(v.score)||v.sourceSha256!==req.sourceSha256||
         v.sourceEdition!==req.sourceEdition)throw Error('HIT');
      return Object.freeze({hsn:v.hsn,score:v.score});
    });
    if(new Set(hits.map(v=>v.hsn)).size!==hits.length)return hold();
    // The evidence source edition is NOT the Ariadne ontology edition.
    if(hits.some(v=>decode(v.hsn).s>=8)&&!methodSubject)return hold();
    const house=dense(l.houses,12),sphere=dense(l.spheres,144);
    for(const group of [house,sphere]){
      if(group.some(v=>!Number.isFinite(v)||v<0||v>1)||Math.abs(group.reduce((a,b)=>a+b,0)-1)>1e-8)return hold();
    }
    // Caller graph proposals cannot be treated as reviewed evidence or training.
    if(!Array.isArray(candidateEdges)||utilTypes.isProxy(candidateEdges)||candidateEdges.length>256)return hold();
    const edges=candidateEdges.map(e=>{
      if(!e||utilTypes.isProxy(e)||e.scope!=='WORK'||e.review!=='UNREVIEWED'||
         !VALID.has(e.src)||!HEX.test(e.sourceSha256)||typeof e.sourceUrl!=='string'||
         !e.sourceUrl.startsWith('https://')||typeof e.dst!=='string'||e.canTrain===true)return null;
      return Object.freeze({src:e.src,dst:e.dst,scope:'WORK',review:'UNREVIEWED',
        sourceSha256:e.sourceSha256,sourceUrl:e.sourceUrl});
    });
    if(edges.some(e=>e===null))return hold();
    const views=projectTwelve({hits,masses:{house,sphere},frameDigest:null,
      request:{registrySha256:ARIADNE_SHA256,modelSha256:s.modelSha256}},edges);
    return Object.freeze({schema:'atlas.indra.compose/v1',status:'PREPARED_NOT_HOSTED',
      shape:Object.freeze([12,12,12]),nodes:1728,spheres:144,houses:12,geometryMandatory:true,
      ontologyEdition:EDITION,evidenceSourceEdition:req.sourceEdition,
      ports:views,fullScoreFrameDigest:null,fullFrameDigestVerified:false,
      modelCalls:1,consumers:Object.freeze({atlasGPT:x,swarmChat:x,atlasONE:x}),
      sourceRightsAttested:false,atomicEgressVerified:false,trainingEligible:false,
      releaseAuthorized:false,authorityEffect:'NONE'});
  }catch{return hold();}
}
