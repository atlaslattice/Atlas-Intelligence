import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {inspectOmega6,reviewScopes144} from '../src/omega6-one-issued-union.mjs';
import {makeDualIssuedGeometry} from '../src/dual-issued-geometry.mjs';
import {inspectConvergence} from '../src/peer-convergence.mjs';
import {HSN,ARIADNE_SHA256} from '../../atlas-geometry-one-r38/src/addresses.mjs';
const D=s=>createHash('sha256').update(s).digest('hex');
const F=s=>{const b=Buffer.alloc(8*1728);s.forEach((x,i)=>b.writeDoubleLE(x,8*i));return D(Buffer.concat([Buffer.from('atlas.f64le.ordered-scores/v1\0'),b]));};
function topK(scores,k){return scores.map((score,index)=>({hsn:HSN[index],index,score})).sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,k)}
function omega5Fixture({house=1,sphere=1}={}){
 const fullScores=Array.from({length:1728},(_,i)=>-1000-i);
 const idx=(house-1)*144+(sphere-1)*12;
 for(let j=0;j<12;j++)fullScores[idx+j]=12-j;
 fullScores[1300]=0; // signed-zero distinction outside top12
 const sourceSha256='b'.repeat(64),modelSha256='c'.repeat(64),querySha256='d'.repeat(64),requestId='req-omega5',rightsEpoch='epoch-1',tenant='atlas',principal='owner';
 const frameDigest=D(JSON.stringify({requestId,modelSha256,sourceSha256,querySha256,scores:fullScores}));
 const baseline={hits:topK(fullScores,12)},sourcePins={registrySha256:ARIADNE_SHA256,sourceSha256,modelSha256};
 const root={schema:'atlas.geometry-one.root/v1',status:'INSPECTION_CANDIDATE_ONLY',sourceScope:'WORK',tenant,rightsEpoch,
  canDeploy:false,canTrain:false,releaseAuthorized:false,activationCount:1,topology:[12,12,12],sourcePins,frameDigest,
  baseline,projections:{ARIADNE:{},NEURAL_HEAD:{frameDigest},GEOMETREE:{nodes:1728,spheres:144,houses:12},GRAPH_FABRIC:{},META145:{},GLYPH:{}},
  lineage:{issuerClaim:'fixture',sourceId:'work:synthetic',sourceEdition:'work-v1'}};
 const binding={requestId,querySha256,sourceSha256,modelSha256,tenant,principal,rightsEpoch,sourceEdition:'work-v1',purpose:'WORK_INSPECTION',requiredSetSha256:'e'.repeat(64)};
 const peerRecords=[{sourceId:'peer-r05',sourceSha256:'f'.repeat(64),revision:'r05',status:'TESTED_LOCAL',objection:''}];
 const peerFns={rankReview:()=>({status:'STABLE_ON_SUPPLIED_SCORES'}),closureReview:()=>({status:'MATCHED_PINNED_METADATA',releaseAuthorized:false,authorityEffect:'NONE'}),topK};
 const convergence=inspectConvergence({root,rawScores:fullScores,candidateScores:fullScores,queryBinding:{requestId,querySha256,sourceSha256,modelSha256},closureInput:{},errorBound:0,topK:12},peerFns);
 if(convergence.status!=='LOCAL_PEER_CONVERGENCE_REVIEW_ONLY')throw Error('TEST_PEER_FIXTURE_INVALID '+convergence.reason);
 const scope=D(JSON.stringify([requestId,querySha256,sourceSha256,modelSha256,tenant,principal,rightsEpoch,'work-v1',binding.requiredSetSha256,frameDigest]));
 const pins={frameDigest,fullScoreFrameSha256:F(fullScores),bindingScopeSha256:scope,sourceSha256,modelSha256,ontologySha256:ARIADNE_SHA256,rightsEpoch,requiredSetSha256:binding.requiredSetSha256};
 return {root,convergence,peerRecords,queryBinding:binding,fullScores,pins,maxHits:12};
}

const pin=x=>x.repeat(64);
function supplied({house=1,sphere=1,encoding='f64'}={}){
 const omega5Input=omega5Fixture({house,sphere}),q=omega5Input.queryBinding;
 const issuedFrame={issuer:'fixture',modelSha256:q.modelSha256,querySha256:q.querySha256,
  sourceId:'work:synthetic',sourceSha256:q.sourceSha256,sourceEdition:q.sourceEdition,
  registrySha256:ARIADNE_SHA256,scores:encoding==='f32'?Float32Array.from(omega5Input.fullScores):Float64Array.from(omega5Input.fullScores),
  requestId:q.requestId,tenant:q.tenant,logicalTarget:'atlas-one',contractVersion:'v1',scope:'WORK',purpose:'INFERENCE'};
 const stamp={allow:true,generation:7,catalogSha256:pin('8'),historySha256:pin('9'),
  rightsEpoch:q.rightsEpoch,requiredSetSha256:q.requiredSetSha256,sourceSha256:q.sourceSha256,
  sourceEdition:q.sourceEdition,issuer:'fixture',principal:q.principal,
  modelSha256:q.modelSha256,headSha256:pin('7')};
 let calls=[];
 const state={phaseChange:null,port:async(phase)=>{calls.push(phase);if(typeof state.phaseChange==='function')return state.phaseChange(phase,{...stamp});return {...stamp};},calls};
 return {issuedFrame,omega5Input,selectedHeadSha256:pin('7'),sourcePort:state.port,state,stamp};
}
const run=x=>inspectOmega6(x);
test('actually composes PR73 original dual-issued source and original PR72 peer review',async()=>{
 const a=supplied(),r=await run(a);
 assert.equal(r.status,'LOCAL_PEER_UNION_PREPARED_NOT_RELEASED',r.reason);
 assert.equal(r.canonicalAddresses,1728);assert.equal(r.spheres,144);assert.equal(r.houses,12);
 assert.equal(r.modelCallsAdded,undefined);assert.equal(r.originalModelCallsAdded,0);
 assert.equal(r.dualIssuedFormat,'f64be');assert.equal(r.fullFrameF64LeSha256,a.omega5Input.pins.fullScoreFrameSha256);
 assert.deepEqual(a.state.calls,['READ','INFERENCE_USE','RETURN']);
});
test('original PR73 supplies two different schemas on one frozen score array',()=>{
 const x=supplied(),d=makeDualIssuedGeometry(x.issuedFrame);
 assert.equal(d.status,'PREPARED_NOT_HOSTED');assert.strictEqual(d.pr66.scores,d.pr67.scores);
 assert.equal(d.pr66.method,'neural');assert.equal(d.pr67.method,'NEURAL_ONLY');
 assert.equal(d.issuerAuthenticated,false);assert.equal(d.releaseAuthorized,false);
});
test('source and model never become authority or executable side effects',async()=>{
 const r=await run(supplied());for(const k of ['canTrain','canDeploy','canDisclose','rightsAuthenticated','closureIndependentlyComplete','transportAtomic','outputBytesReleased','hostEgressAttested','canonChanged'])assert.equal(r[k],false);
 assert.equal(r.authorityEffect,'NONE');assert.equal(r.sourceBodiesIncluded,false);
});
test('144 separate source-coordinate sphere fixtures preserve HSN structure',async()=>{
 const seen=new Set();for(let h=1;h<=12;h++)for(let s=1;s<=12;s++){
  const x=supplied({house:h,sphere:s}),r=await run(x);
  assert.equal(r.status,'LOCAL_PEER_UNION_PREPARED_NOT_RELEASED',`H${h}.S${s}: ${r.reason}`);
  seen.add(`H${h}.S${s}`);
 }assert.equal(seen.size,144);
});
test('144 prepared Sphere locations are source-labeled tasks not finished work',()=>{
 const r=reviewScopes144();assert.equal(r.length,144);assert.equal(new Set(r.map(x=>x.sphere)).size,144);
 assert.equal(r[0].sphere,'H01.S01');assert.equal(r[143].sphere,'H12.S12');
 assert.ok(r.every(x=>x.status==='PREPARED_NOT_EXECUTED'&&x.semanticAccepted===false));
});
test('F32 and F64 issuance are separate binary domains with equal representable scores',async()=>{
 const a=await run(supplied({encoding:'f64'})),b=await run(supplied({encoding:'f32'}));
 assert.equal(a.status,'LOCAL_PEER_UNION_PREPARED_NOT_RELEASED');assert.equal(b.status,a.status);
 assert.notEqual(a.dualIssuedBinaryScoreDigest,b.dualIssuedBinaryScoreDigest);
 assert.notEqual(a.joinedFrameScopeSha256,b.joinedFrameScopeSha256);
 assert.equal(b.dualIssuedFormat,'f32be');
});
test('F32 precision loss cannot be made to pass by preserving visible top12',async()=>{
 const x=supplied({encoding:'f32'});x.omega5Input.fullScores[1300]=Math.PI;
 const r=await run(x);assert.equal(r.status,'HOLD');assert.equal(r.reason,'DUAL_PEER_NUMERIC_MISMATCH');
});
test('full hidden score drift even when top12 is unchanged holds',async()=>{
 const x=supplied();x.issuedFrame.scores[1400]+=5;
 assert.equal((await run(x)).reason,'DUAL_PEER_NUMERIC_MISMATCH');
});
test('signed zero drift is observable even if ordinary JSON string is identical',async()=>{
 const x=supplied();x.issuedFrame.scores[1300]=-0;
 assert.equal(JSON.stringify(Array.from(x.issuedFrame.scores)),JSON.stringify(x.omega5Input.fullScores));
 assert.equal((await run(x)).reason,'DUAL_PEER_NUMERIC_MISMATCH');
});
test('same signed zero on BOTH peer frames is preserved and changes provenance',async()=>{
 const baseline=await run(supplied());const x=supplied();x.issuedFrame.scores[1300]=-0;x.omega5Input.fullScores[1300]=-0;x.omega5Input.pins.fullScoreFrameSha256=F(x.omega5Input.fullScores);
 const r=await run(x);assert.equal(r.status,'LOCAL_PEER_UNION_PREPARED_NOT_RELEASED',r.reason);
 assert.notEqual(r.dualIssuedBinaryScoreDigest,baseline.dualIssuedBinaryScoreDigest);
 assert.notEqual(r.fullFrameF64LeSha256,baseline.fullFrameF64LeSha256);
});
test('caller-provided checksum for a mismatched dual frame is not enough',async()=>{
 const x=supplied();x.omega5Input.pins.fullScoreFrameSha256=pin('3');
 assert.equal((await run(x)).status,'HOLD');
});
test('source port must be explicitly injected',async()=>{
 const x=supplied();delete x.sourcePort;
 assert.equal((await run(x)).reason,'HOST_SOURCE_PORT_UNBOUND');
});
test('source port READ deny stops before peer preparation',async()=>{
 const x=supplied();x.state.phaseChange=(p,s)=>p==='READ'?{...s,allow:false}:s;
 assert.equal((await run(x)).reason,'SOURCE_PORT_DENIED_OR_INVALID');
 assert.deepEqual(x.state.calls,['READ']);
});
test('source port INFERENCE_USE denial prevents even local output',async()=>{
 const x=supplied();x.state.phaseChange=(p,s)=>p==='INFERENCE_USE'?{...s,allow:false}:s;
 assert.equal((await run(x)).status,'HOLD');
});
test('source port RETURN denial withholds every result and score',async()=>{
 const x=supplied();x.state.phaseChange=(p,s)=>p==='RETURN'?{...s,allow:false}:s;
 const r=await run(x);assert.equal(r.status,'HOLD');assert.equal(r.outputBytesReleased,false);
 assert.ok(!('fullScores' in r));
});
test('source revision increases between READ and RETURN even with same visible ID — HOLD ABA',async()=>{
 const x=supplied();x.state.phaseChange=(p,s)=>p==='RETURN'?{...s,generation:s.generation+1}:s;
 assert.equal((await run(x)).reason,'POINTER_OR_SOURCE_REVISION_CHANGED');
});
test('source ID reused after withdrawal but catalog digest changed — HOLD',async()=>{
 const x=supplied();x.state.phaseChange=(p,s)=>p==='RETURN'?{...s,catalogSha256:pin('1')}:s;
 assert.equal((await run(x)).reason,'POINTER_OR_SOURCE_REVISION_CHANGED');
});
test('history chain drift with the same generation holds',async()=>{
 const x=supplied();x.state.phaseChange=(p,s)=>p==='RETURN'?{...s,historySha256:pin('1')}:s;
 assert.equal((await run(x)).reason,'POINTER_OR_SOURCE_REVISION_CHANGED');
});
test('revoked source between READ and INFERENCE_USE holds',async()=>{
 const x=supplied();x.state.phaseChange=(p,s)=>p==='INFERENCE_USE'?{...s,rightsEpoch:'epoch-2'}:s;
 assert.equal((await run(x)).reason,'SOURCE_CHANGED_DURING_INFERENCE');
});
test('required-set fingerprint changed mid-review holds',async()=>{
 const x=supplied();x.state.phaseChange=(p,s)=>p==='RETURN'?{...s,requiredSetSha256:pin('1')}:s;
 assert.equal((await run(x)).reason,'POINTER_OR_SOURCE_REVISION_CHANGED');
});
test('selected head change after READ holds before metadata return',async()=>{
 const x=supplied();x.state.phaseChange=(p,s)=>p==='RETURN'?{...s,headSha256:pin('6')}:s;
 assert.equal((await run(x)).reason,'POINTER_OR_SOURCE_REVISION_CHANGED');
});
test('selected head input mismatch to source stamp holds',async()=>{
 const x=supplied();x.selectedHeadSha256=pin('6');
 assert.equal((await run(x)).reason,'READ_SOURCE_OR_CLOSURE_DRIFT');
});
test('changed peer principal is not silently mapped to current host',async()=>{
 const x=supplied();x.state.phaseChange=(p,s)=>({...s,principal:'other'});
 assert.equal((await run(x)).reason,'READ_SOURCE_OR_CLOSURE_DRIFT');
});
test('missing original issuer match to root holds',async()=>{
 const x=supplied();x.issuedFrame.issuer='different';
 assert.equal((await run(x)).reason,'DUAL_ISSUED_SCOPE_MISMATCH');
});
test('PR73 R34 original rejects slash source edition even when R35 metadata grammar allows it',async()=>{
 const x=supplied();x.issuedFrame.sourceEdition='ariadne-reader/v0.7';
 assert.equal((await run(x)).reason,'DUAL_ISSUED_NOT_PREPARED');
});
test('cross-tenant dual-issued claim holds',async()=>{
 const x=supplied();x.issuedFrame.tenant='other';
 assert.equal((await run(x)).reason,'DUAL_ISSUED_SCOPE_MISMATCH');
});
test('H00 or wrong ontology registry is rejected by PR73',async()=>{
 const x=supplied();x.issuedFrame.registrySha256=pin('4');
 assert.equal((await run(x)).reason,'DUAL_ISSUED_NOT_PREPARED');
});
test('private-mode TRAINING use refused at original PR73 boundary',async()=>{
 const x=supplied();x.issuedFrame.purpose='TRAINING';
 assert.equal((await run(x)).reason,'DUAL_ISSUED_NOT_PREPARED');
});
test('citation purpose requires independent DISCLOSURE_RETURN check',async()=>{
 const x=supplied();x.issuedFrame.purpose='CITATION';const r=await run(x);
 assert.equal(r.status,'LOCAL_PEER_UNION_PREPARED_NOT_RELEASED',r.reason);
 assert.deepEqual(x.state.calls,['READ','INFERENCE_USE','DISCLOSURE_RETURN','RETURN']);
});
test('citation without disclosure permission holds',async()=>{
 const x=supplied();x.issuedFrame.purpose='CITATION';x.state.phaseChange=(p,s)=>p==='DISCLOSURE_RETURN'?{...s,allow:false}:s;
 assert.equal((await run(x)).reason,'SOURCE_PORT_DENIED_OR_INVALID');
});
test('peer OPEN objection cannot become a release-ready synthesis',async()=>{
 const x=supplied();x.omega5Input.peerRecords[0].objection='OPEN human disagreement';
 assert.equal((await run(x)).reason,'OPEN_PEER_OBJECTION');
});
test('missing required-set claim rejected even with all metadata otherwise matched',async()=>{
 const x=supplied();delete x.omega5Input.queryBinding.requiredSetSha256;
 assert.equal((await run(x)).status,'HOLD');
});
test('malicious getter in peer lineage is not invoked',async()=>{
 const x=supplied();let calls=0;Object.defineProperty(x.omega5Input.root.lineage,'sourceId',{enumerable:true,get(){calls++;throw Error('trap')}});
 assert.equal((await run(x)).status,'HOLD');assert.equal(calls,0);
});
test('malicious getter in source port witness is not invoked',async()=>{
 const x=supplied();let calls=0;x.state.phaseChange=(p,s)=>Object.defineProperty(s,'catalogSha256',{enumerable:true,get(){calls++;return pin('8')}});
 assert.equal((await run(x)).status,'HOLD');assert.equal(calls,0);
});
test('malicious getter in geometry topology cannot execute',async()=>{
 const x=supplied();let calls=0;Object.defineProperty(x.omega5Input.root.topology,'1',{enumerable:true,get(){calls++;return 12}});
 assert.equal((await run(x)).status,'HOLD');assert.equal(calls,0);
});
test('Proxy peer query input rejected without property get',async()=>{
 const x=supplied();let calls=0;x.omega5Input.queryBinding=new Proxy(x.omega5Input.queryBinding,{get(){calls++;throw Error('trap')}});
 assert.equal((await run(x)).status,'HOLD');assert.equal(calls,0);
});
test('input extras/body attempt rejected and no source text included',async()=>{
 const x=supplied();x.omega5Input.extraPrivateTranscript='do not disclose';
 const r=await run(x);assert.equal(r.status,'HOLD');assert.ok(!JSON.stringify(r).includes('do not disclose'));
});
test('sourcePort witness with hidden extra field is rejected',async()=>{
 const x=supplied();x.state.phaseChange=(p,s)=>({...s,authority:'I AM CANON'});
 assert.equal((await run(x)).status,'HOLD');
});
test('no fallback through another encoder on any negative case',async()=>{
 const x=supplied();x.issuedFrame.scores[0]=Infinity;const r=await run(x);
 assert.equal(r.status,'HOLD');assert.equal(r.modelCallsAdded,0);
});
test('mutating caller typed frame after completing review cannot mutate receipt',async()=>{
 const x=supplied(),r=await run(x);const sha=r.joinedFrameScopeSha256;
 x.issuedFrame.scores[0]=33333;assert.equal(r.joinedFrameScopeSha256,sha);
});
test('cross-Sphere and House ordering stays exactly 12 x 12 x 12',()=>{
 assert.equal(HSN.length,1728);assert.equal(new Set(HSN).size,1728);
 assert.equal(HSN[0],'H01.S01.N01');assert.equal(HSN[1727],'H12.S12.N12');
 const roles={domain:0,method:0};for(const id of HSN){const sphere=Number(id.slice(5,7));sphere<=7?roles.domain++:roles.method++;}
 assert.deepEqual(roles,{domain:1008,method:720});
});
