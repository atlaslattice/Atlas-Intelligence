import test from 'node:test';
import assert from 'node:assert/strict';
import {stageNeuralEvidenceReview as review, INTEGRATION_HOLD} from '../src/neural-integration-seam.mjs';
import {evaluateCorpusCoverage, COVERAGE_SCHEMA} from '../src/corpus-coverage-preflight.mjs';
const h=n=>n.toString(16).padStart(64,'0');
const release=()=>({releaseSha256:h(15),encoderRevision:'5c38ec7c405ec4b44b94cc5a9bb96e735b38267a',indexGeneration:h(17),ontologyEdition:'Ariadne v0.7'});
const ids=['A1','A2','B'];
function makeFixture(){
  const sources={A1:'origin-a1',A2:'origin-a2',B:'origin-b'};
  const roots={A1:'root-A',A2:'root-A',B:'root-B'};
  const pol={A1:'supports',A2:'supports',B:'contradicts'};
  const records=Object.fromEntries(ids.map((id,i)=>[id,{documentId:id,sourceId:sources[id],recordSha256:h(30+i),recordRevision:1,vectorDigest:h(70+i),rightsEpoch:3,retrievalGeneration:h(17),status:'CURRENT',familyId:roots[id],familyVerified:true,polarity:pol[id],dissentRefs:id==='B'?['A1']:[]}]));
  const ranked=ids.map((id,i)=>({documentId:id,sourceId:sources[id],recordSha256:records[id].recordSha256,recordRevision:1,vectorDigest:records[id].vectorDigest,score:[.97,.95,.72][i],route:'neural',retrievalGeneration:h(17)}));
  const deps=ids.map(id=>({sourceId:sources[id],sourceRevision:1,sourceSha256:h(90+ids.indexOf(id)),rightsEpoch:3}));
  const settings={use:{},return:{},disclosure:{},calls:[],manifest:{indexGeneration:h(17),influenceCoverage:'COMPLETE_VERIFIED',scoreDependence:'INDEPENDENT_PER_ITEM_VERIFIED',sources:deps},touch:null};
  const host={
    async verifiedInfluencingSources(){settings.calls.push('manifest');return settings.manifest;},
    async currentInferenceUse(sourceId,rev){settings.calls.push('use:'+sourceId);let allowed=settings.use[sourceId]??true;return {sourceId,sourceRevision:rev,rightsEpoch:3,purpose:'INFERENCE_USE',allowed};},
    async lookup(id){settings.calls.push('lookup:'+id);if(settings.touch)settings.touch(id,settings);return records[id];},
    async currentReturnRights(id,sourceId){settings.calls.push('return:'+id);return {allowed:settings.return[id]??true,epoch:records[id]?.rightsEpoch};},
    async currentDisclosureReturn(id,sourceId){settings.calls.push('disclose:'+id);return {sourceId,recordRevision:records[id]?.recordRevision,rightsEpoch:3,purpose:'DISCLOSURE_RETURN',allowed:settings.disclosure[id]??true};},
  };
  return {ranked,records,deps,settings,host,trustedRelease:release(),observedRelease:release()};
}
function isHold(r){assert.deepEqual(r,INTEGRATION_HOLD)}
async function run(f){return review(f)}
// Independent controls. These are tests of the reviewed mock seam, not real IAM.
test('01 three-source synthetic baseline returns only metadata',async()=>{const r=await run(makeFixture());assert.equal(r.status,'LOCAL_REVIEW_CANDIDATE');assert.equal(r.returnedRecordCount,3);assert.equal(r.dependencyCount,3);assert.equal(r.passagesReturned,0);});
test('02 ancestry duplicate counts one root',async()=>{const r=await run(makeFixture());assert.equal(r.independentFamilyCount,2)});
test('03 eligible dissent retained as a count',async()=>{const r=await run(makeFixture());assert.equal(r.dissentBearingCount,1)});
test('04 direct route labels preserved and not converted to graph',async()=>{const r=await run(makeFixture());assert.deepEqual(r.routeCounts,{neural:3,graph:0,lexical:0})});
test('05 no publishing or training grant',async()=>{const r=await run(makeFixture());assert.equal(r.canTrain,false);assert.equal(r.canPublish,false);assert.equal(r.hostVerified,false);});
test('06 wrong release digest holds',async()=>{const f=makeFixture();f.observedRelease.releaseSha256=h(121);isHold(await run(f))});
test('07 wrong model revision holds',async()=>{const f=makeFixture();f.observedRelease.encoderRevision='a'.repeat(40);isHold(await run(f))});
test('08 wrong index generation holds',async()=>{const f=makeFixture();f.observedRelease.indexGeneration=h(121);isHold(await run(f))});
test('09 absent release holds',async()=>{const f=makeFixture();delete f.trustedRelease;isHold(await run(f))});
test('10 unexpected claimed release fields hold',async()=>{const f=makeFixture();f.observedRelease.isApproved=true;isHold(await run(f))});
test('11 unknown ontology edition holds',async()=>{const f=makeFixture();f.observedRelease.ontologyEdition='Ariadne v2';isHold(await run(f))});
test('12 missing dependency manifest holds',async()=>{const f=makeFixture();f.host.verifiedInfluencingSources=async()=>null;isHold(await run(f))});
test('13 dependency coverage UNKNOWN holds',async()=>{const f=makeFixture();f.settings.manifest.influenceCoverage='UNKNOWN';isHold(await run(f))});
test('14 changed manifest generation holds',async()=>{const f=makeFixture();f.settings.manifest.indexGeneration=h(22);isHold(await run(f))});
test('15 empty dependency manifest holds',async()=>{const f=makeFixture();f.settings.manifest.sources=[];isHold(await run(f))});
test('16 duplicate dependency source IDs hold',async()=>{const f=makeFixture();f.settings.manifest.sources=[f.deps[0],f.deps[0]];isHold(await run(f))});
test('17 unknown additional dependency-use permission holds',async()=>{const f=makeFixture();f.settings.use['origin-b']=false;isHold(await run(f))});
test('18 uncited dependency disclosure-denied may pass if inference use allowed',async()=>{const f=makeFixture();f.ranked=f.ranked.slice(0,1);f.settings.disclosure.B=false;const r=await run(f);assert.equal(r.status,'LOCAL_REVIEW_CANDIDATE');assert.equal(r.dependencyCount,3)});
test('19 denied inference-use blocks even when off-result',async()=>{const f=makeFixture();f.ranked=f.ranked.slice(0,1);f.settings.use['origin-b']=false;isHold(await run(f))});
test('20 inference-use purpose must be explicit',async()=>{const f=makeFixture();f.host.currentInferenceUse=async(sourceId,sourceRevision)=>({sourceId,sourceRevision,rightsEpoch:3,purpose:'READ',allowed:true});isHold(await run(f))});
test('21 generic READ is not inference consent',async()=>{const f=makeFixture();f.host.currentInferenceUse=async()=>({allowed:true,epoch:3});isHold(await run(f))});
test('22 missing host current-use callback holds',async()=>{const f=makeFixture();delete f.host.currentInferenceUse;isHold(await run(f))});
test('23 use epoch mismatch holds',async()=>{const f=makeFixture();f.host.currentInferenceUse=async(sourceId,sourceRevision)=>({sourceId,sourceRevision,rightsEpoch:2,purpose:'INFERENCE_USE',allowed:true});isHold(await run(f))});
test('24 returned-source disclosure denial holds full page',async()=>{const f=makeFixture();f.settings.disclosure.A1=false;isHold(await run(f))});
test('25 returning revised record is held',async()=>{const f=makeFixture();f.records.A1.recordRevision=2;isHold(await run(f))});
test('26 cached vector borrowed by foreign record holds',async()=>{const f=makeFixture();f.records.A1.sourceId='foreign';isHold(await run(f))});
test('27 changed citation hash with same vector holds',async()=>{const f=makeFixture();f.records.A1.recordSha256=h(211);isHold(await run(f))});
test('28 revoked returned record causes its exclusion in postrank',async()=>{const f=makeFixture();f.records.A2.status='REVOKED';const r=await run(f);assert.equal(r.status,'LOCAL_REVIEW_CANDIDATE');assert.equal(r.returnedRecordCount,2)});
test('29 all records held produces abstention',async()=>{const f=makeFixture();for(const id of ids)f.records[id].status='REVOKED';const r=await run(f);assert.equal(r.status,'LOCAL_ABSTAIN');assert.equal(r.returnedRecordCount,0)});
test('30 revocation during review use recheck holds',async()=>{const f=makeFixture();let n=0;f.host.currentInferenceUse=async(sourceId,sourceRevision)=>({sourceId,sourceRevision,rightsEpoch:3,purpose:'INFERENCE_USE',allowed:!(sourceId==='origin-b'&&++n>1)});isHold(await run(f))});
test('31 manifest with accessors holds',async()=>{const f=makeFixture();f.settings.manifest={indexGeneration:h(17),influenceCoverage:'COMPLETE_VERIFIED',get sources(){throw Error('NO')}};isHold(await run(f))});
test('32 malformed source identifiers hold',async()=>{const f=makeFixture();f.deps[0].sourceId='some/private/path';isHold(await run(f))});
test('33 malformed source SHA holds',async()=>{const f=makeFixture();f.deps[0].sourceSha256='fake';isHold(await run(f))});
test('34 no work or model weights modified',async()=>{const r=await run(makeFixture());assert.equal(r.weightsModified,false);assert.equal(r.modelModified,false)});
test('35 candidate ranking remains deterministic over repeat fixture',async()=>{const a=await run(makeFixture()),b=await run(makeFixture());assert.deepEqual(a,b)});
test('36 no raw body/record ids emitted from receipt',async()=>{const r=await run(makeFixture());assert.equal(JSON.stringify(r).includes('origin-a1'),false);assert.equal(JSON.stringify(r).includes('recordSha256'),false)});
function goodCoverage(){return {storageState:'READY',decryptionVerified:true,fullCorpusVerified:true,providerRightsRecheckedLive:true,contentComplete:true,verifiedRegistrySha256:h(25),expectedChunkIds:['c1','c2'],readableChunkReceipts:[{chunkId:'c1',contentSha256:h(33),sourceId:'s1',familyId:'f1',sourceRevision:1,storageReceiptSha256:h(44)},{chunkId:'c2',contentSha256:h(34),sourceId:'s2',familyId:'f2',sourceRevision:1,storageReceiptSha256:h(45)}],familySplitVerified:true,sourceUseRightsVerified:true};}
test('37 complete metadata is NOT hosted training authorization',()=>{const r=evaluateCorpusCoverage(goodCoverage());assert.equal(r.status,'LOCAL_COVERAGE_METADATA_CONSISTENT');assert.equal(r.canTrain,false);assert.equal(r.hostVerified,false)});
test('38 STORAGE_HOLD blocks',()=>{const m=goodCoverage();m.storageState='STORAGE_HOLD';assert.equal(evaluateCorpusCoverage(m).status,'HOLD_COVERAGE_OR_RIGHTS')});
test('39 missing decryption blocks',()=>{const m=goodCoverage();m.decryptionVerified=false;assert.equal(evaluateCorpusCoverage(m).status,'HOLD_COVERAGE_OR_RIGHTS')});
test('40 missing content blocks',()=>{const m=goodCoverage();m.contentComplete=false;assert.equal(evaluateCorpusCoverage(m).status,'HOLD_COVERAGE_OR_RIGHTS')});
test('41 missing current source rights blocks',()=>{const m=goodCoverage();m.providerRightsRecheckedLive=false;assert.equal(evaluateCorpusCoverage(m).status,'HOLD_COVERAGE_OR_RIGHTS')});
test('42 family split missing blocks',()=>{const m=goodCoverage();m.familySplitVerified=false;assert.equal(evaluateCorpusCoverage(m).status,'HOLD_COVERAGE_OR_RIGHTS')});
test('43 missing expected chunk blocks',()=>{const m=goodCoverage();m.readableChunkReceipts.pop();assert.equal(evaluateCorpusCoverage(m).status,'HOLD_COVERAGE_OR_RIGHTS')});
test('44 duplicate chunk blocks',()=>{const m=goodCoverage();m.readableChunkReceipts[1].chunkId='c1';assert.equal(evaluateCorpusCoverage(m).status,'HOLD_COVERAGE_OR_RIGHTS')});
test('45 extra unknown metadata blocks',()=>{const m=goodCoverage();m.inferredFromInventory=248374;assert.equal(evaluateCorpusCoverage(m).status,'HOLD_COVERAGE_OR_RIGHTS')});
test('46 unpaired surrogate source id blocks',()=>{const m=goodCoverage();m.readableChunkReceipts[0].sourceId='\ud800';assert.equal(evaluateCorpusCoverage(m).status,'HOLD_COVERAGE_OR_RIGHTS')});
test('47 wrong namespace source revision blocks',()=>{const m=goodCoverage();m.readableChunkReceipts[0].sourceRevision=-1;assert.equal(evaluateCorpusCoverage(m).status,'HOLD_COVERAGE_OR_RIGHTS')});
test('48 checksum malformed blocks',()=>{const m=goodCoverage();m.readableChunkReceipts[0].storageReceiptSha256='xx';assert.equal(evaluateCorpusCoverage(m).status,'HOLD_COVERAGE_OR_RIGHTS')});
test('49 no inference rights preflight blocks',()=>{const m=goodCoverage();m.sourceUseRightsVerified=false;assert.equal(evaluateCorpusCoverage(m).status,'HOLD_COVERAGE_OR_RIGHTS')});
test('50 const no source text in coverage report',()=>{const r=evaluateCorpusCoverage(goodCoverage());assert.equal('sourceText' in r,false);assert.equal(r.sourceBodiesRead,0)});

test('51 UNKNOWN score dependence blocks selective filtering',async()=>{const f=makeFixture();f.settings.manifest.scoreDependence='UNKNOWN';isHold(await run(f))});
test('52 unexpectedly coupled scores block',async()=>{const f=makeFixture();f.settings.manifest.scoreDependence='LISTWISE';isHold(await run(f))});

test('53 bounded batch 924 dependencies uses 8 calls, not N+1',async()=>{
  const f=makeFixture(),seen=[];
  const extra=Array.from({length:921},(_,i)=>({sourceId:'extra'+String(i).padStart(4,'0'),sourceRevision:1,
    sourceSha256:h(500+i),rightsEpoch:3}));
  f.settings.manifest.sources=[...f.deps,...extra];
  f.host.currentInferenceUse=()=>{throw Error('N+1 path must not execute')};
  f.host.currentInferenceUseBatch=async part=>{
    seen.push(part.length);
    return part.map(d=>({sourceId:d.sourceId,sourceRevision:d.sourceRevision,rightsEpoch:d.rightsEpoch,
      purpose:'INFERENCE_USE',allowed:true}));
  };
  const r=await run(f);assert.equal(r.status,'LOCAL_REVIEW_CANDIDATE');
  assert.equal(r.dependencyCount,924);
  assert.deepEqual(seen,[256,256,256,156,256,256,256,156]);
});
test('54 large inventory without batch callback holds',async()=>{
  const f=makeFixture();f.settings.manifest.sources=[...f.deps,...Array.from({length:62},(_,i)=>({sourceId:'extra'+i,sourceRevision:1,sourceSha256:h(500+i),rightsEpoch:3}))];
  isHold(await run(f));
});
test('55 batch missing one decision holds',async()=>{
  const f=makeFixture();f.host.currentInferenceUseBatch=async arr=>arr.slice(1).map(d=>({sourceId:d.sourceId,sourceRevision:1,rightsEpoch:3,purpose:'INFERENCE_USE',allowed:true}));isHold(await run(f));
});
test('56 swapped batch output order holds',async()=>{
  const f=makeFixture();f.host.currentInferenceUseBatch=async arr=>arr.map(d=>({sourceId:d.sourceId,sourceRevision:1,rightsEpoch:3,purpose:'INFERENCE_USE',allowed:true})).reverse();isHold(await run(f));
});
test('57 revoked off-result batch source holds entire review',async()=>{
  const f=makeFixture();f.ranked=f.ranked.slice(0,1);
  f.host.currentInferenceUseBatch=async arr=>arr.map(d=>({sourceId:d.sourceId,sourceRevision:1,rightsEpoch:3,purpose:'INFERENCE_USE',allowed:d.sourceId!=='origin-b'}));
  isHold(await run(f));
});
test('58 batch purpose READ is not INFERENCE_USE',async()=>{
  const f=makeFixture();f.host.currentInferenceUseBatch=async arr=>arr.map(d=>({sourceId:d.sourceId,sourceRevision:1,rightsEpoch:3,purpose:'READ',allowed:true}));isHold(await run(f));
});
test('59 batch grant can change at final recheck',async()=>{
  const f=makeFixture();let n=0;
  f.host.currentInferenceUseBatch=async arr=>{n++;return arr.map(d=>({sourceId:d.sourceId,sourceRevision:1,rightsEpoch:3,purpose:'INFERENCE_USE',allowed:n===1||d.sourceId!=='origin-b'}));};
  isHold(await run(f));assert.equal(n,2);
});
