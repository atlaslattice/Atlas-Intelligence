/** Public, source-qualified ports. Source bytes and the optional local runtime are caller-owned. */
import {snapshot,canonical,fingerprint} from '../civilization-r01/runtime/json.mjs';

export const ARIADNE_SOURCE=Object.freeze({namespace:'ARIADNE_HSN',edition:'ariadne-reader/v0.7',
  sha256:'07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6'});
export const CONTEXT_INTEGRATION_SCHEMA='atlas.source-qualified-context/v1';
const NODE=/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/;
const ID=/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,99}$/;
const verifiedSources=new WeakSet();
const require_=(ok,code)=>{if(!ok)throw Object.assign(new Error(code),{code});};
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const copy=x=>snapshot(x,{maxBytes:2*1024*1024,maxDepth:32,maxItems:100000});
const hold=(status,reason)=>({schema:'atlas.quality-context/v1',status,reason,payload:null,
  contextText:null,hostAuthorized:false,modelInvoked:false});

/** Construct an address only. This function alone does not establish source availability. */
export function ariadneNodeReference(coordinate){
  require_(typeof coordinate==='string'&&NODE.test(coordinate),'ARIADNE_NODE_COORDINATE_REQUIRED');
  return {...ARIADNE_SOURCE,coordinate};
}

export function validateAriadneReference(value){
  const ref=copy(value);
  require_(plain(ref)&&Object.keys(ref).sort().join(',')==='coordinate,edition,namespace,sha256',
    'ARIADNE_QUALIFIED_REFERENCE_REQUIRED');
  require_(ref.namespace===ARIADNE_SOURCE.namespace&&ref.edition===ARIADNE_SOURCE.edition&&
    ref.sha256===ARIADNE_SOURCE.sha256&&typeof ref.coordinate==='string'&&NODE.test(ref.coordinate),
    'ARIADNE_REFERENCE_SOURCE_MISMATCH');
  return ref;
}

/** Hash exact supplied bytes before parsing. No download, private corpus bundle or ordinal crosswalk. */
export async function createAriadneSourceAdapter(sourceBytes){
  let bytes;
  try{bytes=Uint8Array.prototype.slice.call(sourceBytes);}catch{throw Error('ARIADNE_BYTES_REQUIRED');}
  require_(bytes.length>0&&bytes.length<=8*1024*1024,'ARIADNE_SOURCE_BYTE_BOUND');
  require_(await fingerprint(bytes)===ARIADNE_SOURCE.sha256,'ARIADNE_SOURCE_DIGEST_MISMATCH');
  const source=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  require_(Object.keys(source.nodes??{}).length===1728&&Object.keys(source.spheres??{}).length===144&&
    Object.keys(source.houses??{}).length===12,'ARIADNE_SOURCE_CENSUS_MISMATCH');
  const adapter=Object.freeze({
    descriptor:()=>({...ARIADNE_SOURCE,counts:{houses:12,spheres:144,nodes:1728},
      verification:'EXACT_SUPPLIED_BYTES_MATCH_PIN',hostAuthorized:false,semanticCrosswalkAccepted:false}),
    node(reference){const ref=validateAriadneReference(reference),node=source.nodes[ref.coordinate];
      require_(node?.id===ref.coordinate,'ARIADNE_NODE_NOT_IN_SOURCE');return copy(node);},
    ancestry(reference){const node=this.node(reference),sphere=source.spheres[node.parent],house=source.houses[sphere?.parent];
      require_(sphere&&house,'ARIADNE_ANCESTRY_MISSING');return copy({node,sphere,house});}
  });
  verifiedSources.add(adapter);return adapter;
}

/** Optional owner-injected local module. This is local isolation, not host authentication. */
export function createAtlasContextAdapter({source,runtime,scope}={}){
  require_(verifiedSources.has(source),'VERIFIED_ARIADNE_SOURCE_ADAPTER_REQUIRED');
  require_(runtime?.ariadne?.sourceSha256===ARIADNE_SOURCE.sha256&&
    typeof runtime?.atlasgpt?.prepareContext==='function','COMPATIBLE_LOCAL_ATLAS_RUNTIME_REQUIRED');
  const bound=copy(scope);
  require_(plain(bound)&&Object.keys(bound).sort().join(',')==='mode,ownerId,projectId'&&bound.mode==='WORK'&&
    typeof bound.ownerId==='string'&&ID.test(bound.ownerId)&&typeof bound.projectId==='string'&&ID.test(bound.projectId),
    'LOCAL_WORK_SCOPE_REQUIRED');
  let closed=false;
  const open=()=>require_(!closed,'CONTEXT_ADAPTER_CLOSED');
  const invoke=runtime.atlasgpt.prepareContext.bind(runtime.atlasgpt);
  return Object.freeze({
    descriptor(){return {schema:CONTEXT_INTEGRATION_SCHEMA,source:source.descriptor(),scope:copy(bound),
      status:closed?'CLOSED':'CALLER_INJECTED_LOCAL_RUNTIME',hostAuthenticated:false,automaticPosts:false,
      providerCallsByAdapter:0,ownsRuntimeLifecycle:false};},
    async prepareContext(input){
      open();const packet=copy(input);
      require_(plain(packet)&&Object.keys(packet).every(k=>['references','domainSubject','request'].includes(k)),
        'QUALIFIED_CONTEXT_PACKET_REQUIRED');
      const {references,domainSubject=null,request}=packet;
      require_(Array.isArray(references)&&references.length>=1&&references.length<=144&&plain(request),
        'QUALIFIED_CONTEXT_PACKET_REQUIRED');
      require_(!Object.hasOwn(request,'requiredNodeIds')&&!Object.hasOwn(request,'domainSubjectId'),
        'BARE_CONTEXT_COORDINATES_FORBIDDEN');
      const current=request.scope;
      if(!plain(current)||current.ownerId!==bound.ownerId||current.projectId!==bound.projectId||current.mode!==bound.mode||
        Object.keys(current).sort().join(',')!=='mode,ownerId,projectId,revision'||!Number.isSafeInteger(current.revision)||
        current.revision<0||request.expectedRevision!==current.revision)return hold('SCOPE_HOLD','CURRENT_BOUND_SCOPE_REQUIRED');
      const budget=Object.hasOwn(request,'budget')?request.budget:{maxUtf8Bytes:65536,reserveBytes:4096};
      require_(plain(budget)&&Number.isSafeInteger(budget.maxUtf8Bytes)&&budget.maxUtf8Bytes>=1&&
        budget.maxUtf8Bytes<=16*1024*1024&&Number.isSafeInteger(budget.reserveBytes)&&budget.reserveBytes>=0&&
        budget.reserveBytes<budget.maxUtf8Bytes,'CONTEXT_BYTE_BUDGET_INVALID');
      const nodes=references.map(ref=>source.node(ref)),ids=[...new Set(nodes.map(node=>node.id))];
      const subject=domainSubject===null?null:source.node(domainSubject);
      const methods=nodes.filter(node=>node.kind==='EPISTEMIC_META');
      if(methods.length&&!subject)return hold('NEEDS_SUBJECT','METHOD_DOMAIN_SUBJECT_REQUIRED');
      if(subject&&subject.kind!=='DOMAIN_SPECIALIZATION')return hold('NEEDS_SUBJECT','DOMAIN_SUBJECT_REQUIRED');
      if(methods.length){
        const subjectHouse=source.ancestry(domainSubject).house.id;
        if(methods.some(node=>source.ancestry(ariadneNodeReference(node.id)).house.id!==subjectHouse))
          return hold('NEEDS_SUBJECT','METHOD_SUBJECT_SAME_SOURCE_HOUSE_REQUIRED');
      }
      // The callback owns this separate copy. Its mutations must not rewrite the validation baseline.
      const delegated=copy({...request,requiredNodeIds:ids,domainSubjectId:subject?.id??null});
      const result=copy(await invoke(delegated));open();
      require_(result.schema==='atlas.quality-context/v1'&&result.hostAuthorized===false&&result.modelInvoked===false,
        'RUNTIME_CONTEXT_BOUNDARY_MISMATCH');
      if(!['CONTEXT_READY','CONTEXT_READY_WITH_CONFLICTS'].includes(result.status)){
        require_(result.payload===null&&result.contextText===null,'RUNTIME_HOLD_MUST_NOT_RELEASE_CONTEXT');return result;
      }
      const payload=result.payload,expectedIds=[...new Set([...ids,...(subject?[subject.id]:[])])].sort();
      require_(plain(payload)&&canonical(payload.scope)===canonical(current)&&payload.domainSubjectId===(subject?.id??null),
        'RUNTIME_SCOPE_OR_SUBJECT_MISMATCH');
      require_(Array.isArray(payload.sourceEvidence)&&payload.sourceEvidence.length===expectedIds.length&&
        canonical(payload.sourceEvidence.map(n=>n.coordinate).sort())===canonical(expectedIds),'RUNTIME_SOURCE_CENSUS_MISMATCH');
      for(const row of payload.sourceEvidence){
        const original=source.node(ariadneNodeReference(row.coordinate));
        require_(row.registrySha256===ARIADNE_SOURCE.sha256&&
          row.sourceNodeSha256===original.source_record_sha256&&row.sourceEdition==='Ariadne v0.7'&&
          row.scopeStatus===original.scope_status&&row.house===original.parent.slice(0,3)&&row.sphere===original.parent&&
          row.semanticAcceptance===false&&row.authorityEffect==='NONE'&&
          ['name','definition','includes','excludes','kind'].every(key=>row[key]===original[key]),'RUNTIME_SOURCE_FIDELITY_MISMATCH');
      }
      require_(payload.task?.id===request.task?.id&&payload.task?.query===request.task?.query&&
        canonical(payload.task?.requiredConstraints)===canonical(request.task?.requiredConstraints)&&
        canonical(payload.task?.preferences)===canonical(request.task?.preferences)&&
        result.quality?.discardedEssentialRecords===0,'RUNTIME_TASK_CONSTRAINTS_MISMATCH');
      require_(result.contextText===canonical(payload)&&await fingerprint(result.contextText)===result.contextDigest,
        'RUNTIME_CONTEXT_DIGEST_MISMATCH');open();
      require_(typeof result.stablePrefix?.text==='string'&&result.stablePrefix.text.length>0&&
        await fingerprint(result.stablePrefix.text)===result.stablePrefix.sha256,'RUNTIME_PREFIX_DIGEST_MISMATCH');open();
      const encoder=new TextEncoder();
      const contextBytes=encoder.encode(result.contextText).byteLength,prefixBytes=encoder.encode(result.stablePrefix.text).byteLength;
      const utf8Bytes=contextBytes+prefixBytes;
      require_(utf8Bytes+budget.reserveBytes<=budget.maxUtf8Bytes,'RUNTIME_CONTEXT_BYTE_BUDGET_EXCEEDED');
      const accounting={utf8Bytes,contextBytes,prefixBytes,maxUtf8Bytes:budget.maxUtf8Bytes,reserveBytes:budget.reserveBytes,
        remainingBytes:budget.maxUtf8Bytes-budget.reserveBytes-utf8Bytes,basis:'UTF8_BYTES_NOT_MODEL_TOKENS',
        modelTokenCount:null,providerTokenLimitVerified:false};
      require_(plain(result.accounting)&&Object.entries(accounting).every(([key,value])=>result.accounting[key]===value),
        'RUNTIME_BYTE_ACCOUNTING_MISMATCH');
      return result;
    },
    close(){closed=true;}
  });
}
