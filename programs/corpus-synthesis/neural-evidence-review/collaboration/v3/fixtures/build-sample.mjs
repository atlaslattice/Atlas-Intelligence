import {REGISTRY_SHA256} from '../../src/work-review-contract.mjs';
const A='a'.repeat(64), B='b'.repeat(64), C='c'.repeat(64),D='d'.repeat(64);
const REQUIRED_FAMILIES=['SOURCE_INTEGRITY','INFERENCE_USE','DISCLOSURE_RETURN','REVOCATION','NONWORK_PRIVACY','HSN_IDENTITY','METHOD_SUBJECT','DISSENT','TEST_REPRODUCIBILITY','ROLLBACK','AUTHORITY','RESOURCE_BUDGET'];
function make(){
 const reviewInput={
  room:{id:'atlas-neural-synthetic-work-20261124-01',kind:'work',status:'open',headSeq:166,messageCount:166,maxMessages:500,maxPerMember:30,memberMessages:3,expiresAt:'2026-11-25T20:12:48.062Z'},
  member:{id:'synthetic-reviewer-20261124-r01',assurance:'SELF_DECLARED',consent:'USER_INVITATION_WORK'},
  reply:{parentSeq:33,requestId:'mica-collab-v3-review-20261124-r1',referencedSeqs:[33,166]},
  source:{scope:'WORK',privateModeDataIncluded:false,sourceUrl:'https://github.com/atlaslattice/Atlas-Intelligence/pull/58',sourceDigest:A,sourceEdition:'PR58-source-only'},
  change:{predecessor:'Source-bound v2 collaborative review',addition:'Concrete v3 regression comparator',testableDifference:'Rejects regressions and unsafe previously accepted input',falsifier:'A previously green safety case turns red yet comparator proposes adoption'},
  hsn:{node:'H05.S11.N04',role:'EPISTEMIC_META',subject:'H05.S06.N12',registryDigest:REGISTRY_SHA256,nodeRecordDigest:A},
  evidence:{testStatus:'LOCAL_REVIEW_ONLY',testsRun:24,testsPassed:24,testsFailed:0,testReceiptDigest:A,humanReviewed:false,hostVerified:false},
  release:{edition:'ATLAS_COLLAB_V2_PROPOSAL',status:'SOURCE_ONLY_TESTED_LOCAL',permissionEffect:'NONE',canonEffect:'NONE',modelWeightsChanged:false,hostedDeployed:false},
  claims:{actuallyPosted:false,scheduledWakeCount:0,performedAgentVisits:0,peerIdentityVerified:false,semanticAccepted:false}
 };
 const cases=REQUIRED_FAMILIES.flatMap((family,i)=>[
  {id:`p_${String(i).padStart(2,'0')}`,family,role:'POSITIVE',sourceCaseSha256:A,baseline:'PASS',candidate:'PASS',receiptSha256:B},
  {id:`n_${String(i).padStart(2,'0')}`,family,role:'NEGATIVE',sourceCaseSha256:C,baseline:i===0?'FAIL':'PASS',candidate:'PASS',receiptSha256:D}
 ]);
 const benchmark={mode:'SYNTHETIC_TEST_ONLY',environmentSha256:A,workloadSha256:B,maxP95RegressionRatio:1.1,
  pairs:Array.from({length:7},(_,i)=>({scenarioSha256:C,baselineMs:10+i,candidateMs:9+i,baselineOutputSha256:D,candidateOutputSha256:D}))};
 return {reviewInput,observedAt:'2026-11-24T21:29:00Z',baselineCodeSha256:A,candidateCodeSha256:B,
  cases,benchmark,dissent:[{id:'dissent_01',status:'OPEN',sourceUrl:'https://github.com/atlaslattice/Atlas-Intelligence/pull/58',sourceSha256:C,summary:'Host source and actual permissions still unresolved; keep this review-only.'}],revisionId:'mica-v3-reviewed-code'};
}
process.stdout.write(JSON.stringify(make(),null,2)+'\n');
