/**
 * Demonstrates an A1/A2/B local fixture and the distinct USE vs RETURN gates.
 * There is no inference, corpus, private content or host-side authorization.
 */
import {stageNeuralEvidenceReview} from '../src/neural-integration-seam.mjs';
import {evaluateCorpusCoverage} from '../src/corpus-coverage-preflight.mjs';
const sha=n=>n.toString(16).padStart(64,'0');
const release={releaseSha256:sha(101),encoderRevision:'5c38ec7c405ec4b44b94cc5a9bb96e735b38267a',indexGeneration:sha(202),ontologyEdition:'Ariadne v0.7'};
const records=[
 {id:'A1',source:'sa1',root:'origin-a',polarity:'supports',score:.97},
 {id:'A2',source:'sa2',root:'origin-a',polarity:'supports',score:.95},
 {id:'B',source:'sb',root:'origin-b',polarity:'contradicts',score:.72},
].map((x,i)=>({...x,recordSha256:sha(300+i),vectorDigest:sha(400+i)}));
const byId=new Map(records.map(r=>[r.id,r]));
const ranked=records.map(r=>({documentId:r.id,sourceId:r.source,recordSha256:r.recordSha256,
 recordRevision:1,vectorDigest:r.vectorDigest,score:r.score,route:'neural',retrievalGeneration:release.indexGeneration}));
function hostWithRights({forbidUse=[],forbidDisclosure=[]}={}){
 const useDenied=new Set(forbidUse),disclosureDenied=new Set(forbidDisclosure);
 return {
  async verifiedInfluencingSources(){return {indexGeneration:release.indexGeneration,
   influenceCoverage:'COMPLETE_VERIFIED',scoreDependence:'INDEPENDENT_PER_ITEM_VERIFIED',
   sources:records.map(r=>({sourceId:r.source,sourceRevision:1,sourceSha256:sha(500+records.indexOf(r)),rightsEpoch:7}))};},
  async currentInferenceUse(sourceId,sourceRevision){return {sourceId,sourceRevision,rightsEpoch:7,
   allowed:!useDenied.has(sourceId),purpose:'INFERENCE_USE'};},
  async lookup(documentId){const r=byId.get(documentId);return r?{
   documentId:r.id,sourceId:r.source,recordSha256:r.recordSha256,recordRevision:1,
   vectorDigest:r.vectorDigest,rightsEpoch:7,retrievalGeneration:release.indexGeneration,
   status:'CURRENT',familyId:r.root,familyVerified:true,polarity:r.polarity,
   dissentRefs:r.id==='B'?['A1']:[]}:null;},
  async currentReturnRights(documentId,sourceId){return {allowed:!disclosureDenied.has(documentId),epoch:7};},
  async currentDisclosureReturn(documentId,sourceId){return {sourceId,recordRevision:1,rightsEpoch:7,
   purpose:'DISCLOSURE_RETURN',allowed:!disclosureDenied.has(documentId)};},
 };
}
const config={ranked,trustedRelease:release,observedRelease:{...release},maxReturned:10};
const baseline=await stageNeuralEvidenceReview({...config,host:hostWithRights()});
const offResult=await stageNeuralEvidenceReview({...config,ranked:ranked.slice(0,1),host:hostWithRights({forbidUse:['sb']})});
const quoteDenied=await stageNeuralEvidenceReview({...config,ranked:ranked.slice(0,1),host:hostWithRights({forbidDisclosure:['B']})});
const unavailableCorpus=evaluateCorpusCoverage({storageState:'STORAGE_HOLD'});
if(baseline.status!=='LOCAL_REVIEW_CANDIDATE'||baseline.independentFamilyCount!==2
 ||offResult.status!=='HOLD_HOST_BOUNDARY_UNVERIFIED'
 ||quoteDenied.status!=='LOCAL_REVIEW_CANDIDATE'
 ||unavailableCorpus.status!=='HOLD_COVERAGE_OR_RIGHTS')process.exitCode=1;
process.stdout.write(JSON.stringify({schema:'atlas.mica.demo/v1',
 baseline,offResultUseRevoked:offResult.status,uncitedQuoteDenied:quoteDenied.status,
 corpusStatus:unavailableCorpus.status,modelCalls:0,trainingPerformed:false,
 hostedVerified:false,warning:'Synthetic mock callbacks, no real MICA serving integration'},null,2)+'\n');
