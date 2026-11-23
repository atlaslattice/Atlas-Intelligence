/** Versioned Atlas ONE v2 workflow. A review state is not an agent verdict. */
import {AriadneRegistry,prepareResearch,digest,Hold,requireValid,isObject} from './index.mjs';
import {AtomicJournal} from './journal.mjs';
const STAGES=['PREPARED','SOURCE_MAPPED','EVIDENCE_TRACED','COUNTER_REVIEW_REQUESTED','REVIEW_REQUIRED'];
export class AtlasOneEngine {
  constructor({registry,journal}={}){
    requireValid(registry instanceof AriadneRegistry && journal instanceof AtomicJournal,'ENGINE_SOURCE_OR_JOURNAL_UNVERIFIED');
    this.registry=registry;this.journal=journal;
  }
  run(input){const packet=prepareResearch(input,this.registry);const runId=packet.caseId;
    for(const step of STAGES){let detail;
      if(step==='PREPARED')detail={packetSHA256:packet.packetSHA256,sourceEdition:this.registry.edition};
      else if(step==='SOURCE_MAPPED')detail={nodes:packet.nodes.map(n=>({hsn:n.coordinate,sha256:n.sourceNodeSHA256}))};
      else if(step==='EVIDENCE_TRACED')detail={citations:packet.papers.map(x=>({id:x.id,url:x.url,status:x.status}))};
      else if(step==='COUNTER_REVIEW_REQUESTED')detail={falsifierSHA256:digest(packet.falsifier),reviewer:'INDEPENDENT_REVIEW_NOT_PERFORMED'};
      else detail={status:'HOLD_NO_INDEPENDENT_REVIEW',experiment:'NOT_EXECUTED',canonical:false,performanceGain:'NOT_MEASURED'};
      this.journal.record({runId,inputDigest:packet.packetSHA256,step,detail,requestId:'stage:'+step.toLowerCase()});
    }
    const run=this.journal.inspect(runId);
    return {schema:'atlas.one.result/v2',caseId:runId,packetSHA256:packet.packetSHA256,steps:run.events.length,head:run.head,
      status:'REVIEW_REQUIRED',sourceEdition:this.registry.edition,originalRegistrySHA256:this.registry.digest,
      workEnvelope:prepareWorkEnvelope(packet),hostRightsVerified:false,sourceOnly:true,canPublish:false,canonEffect:'NONE'};
  }
}
export function prepareWorkEnvelope(packet){
  requireValid(isObject(packet)&&packet.schema==='atlas.one.research/v2'&&packet.review==='CANDIDATE_NOT_ADJUDICATED'&&packet.authorityEffect==='NONE','WORK_PACKET_INVALID');
  const content={schema:'atlas.one.swarmchat-work-envelope/v2',kind:'RESEARCH_CANDIDATE',caseId:packet.caseId,packetSHA256:packet.packetSHA256,
    sourceEdition:packet.provenance.edition,sourceSHA256:packet.provenance.originalSourceSHA256,
    hsn:packet.nodes.map(n=>({coordinate:n.coordinate,sourceNodeSHA256:n.sourceNodeSHA256})),paperRefs:packet.papers.map(p=>({id:p.id,url:p.url,status:p.status})),
    review:'NOT_ADJUDICATED',experiment:'NOT_EXECUTED',origin:'LOCAL_WORK_ONLY',hostRelease:'NOT_VERIFIED',returnRights:'HOST_RECHECK_REQUIRED',
    residentIdentity:'SELF_DECLARED_ONLY',noPrivateModeImport:true,posted:false,canonEffect:'NONE'};
  return {...content,envelopeSHA256:digest(content)};
}
export const stageNames=()=>[...STAGES];
