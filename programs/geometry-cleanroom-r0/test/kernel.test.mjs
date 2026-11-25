import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {SIDE,SPHERE_COUNT,NODE_COUNT,ARIADNE_SHA256,RELATION_KINDS,encodeAddress,linearIndex,decodeIndex,decodeAddress,addressIndex,originalAddresses,inspectCrosswalk,tensorMass,sparseTopK,flatReference} from '../src/geometry.mjs';
import {createGeometryKernel} from '../src/kernel.mjs';
const digest=s=>createHash('sha256').update(s).digest('hex');
const D={query:digest('original-request'),model:digest('selected-model-placeholder'),source:digest('local-fixture-source'),crosswalk:digest('source-edition-crosswalk')};
const request=Object.freeze({requestId:'sample-one',querySha256:D.query,sourceId:'synthetic-source',sourceSha256:D.source,sourceEdition:'synthetic-v1',purpose:'INFERENCE',k:5,scope:'WORK'});
const scores=(peak=0)=>Array.from({length:NODE_COUNT},(_,i)=>i===peak?10:Math.sin(i*0.13)-0.1*i/NODE_COUNT);
function environment(opts={}) {
  let calls=0; const phases=[];
  const gateway={async request(payload){calls++;if(opts.rejectGateway)throw Error('temporary');return {schema:'atlas.neural.issued/v1',method:'neural',fallbackUsed:false,issuer:'canonical-gateway',modelSha256:D.model,registrySha256:ARIADNE_SHA256,querySha256:payload.querySha256,sourceId:request.sourceId,sourceSha256:D.source,sourceEdition:request.sourceEdition,scores:scores(opts.peak??0),...opts.page};}};
  const policy=async value=>{phases.push(value.phase);if(opts.throwPhase===value.phase)throw Error('host failed');return {decision:opts.denyPhase===value.phase?'DENY':'ALLOW',epoch:opts.driftPhase===value.phase?'changed-epoch':'epoch-one'};};
  const reviewClosure=async()=>Object.hasOwn(opts,'closure')?opts.closure:{status:'MATCHED_PINNED_METADATA',releaseAuthorized:false,authorityEffect:'NONE'};
  const core=createGeometryKernel({gateway,policy,reviewClosure,crosswalks:opts.crosswalks??[]});
  return {core,phases,calls:()=>calls};
}
const change=(req,props)=>({...req,...props});
// 144 precise structural assertions. They execute the full tensor path (not
// merely enumerate the addresses) using only explicitly synthetic scores.
for(let h=1;h<=12;h++)for(let s=1;s<=12;s++){
  test(`H${h}.S${s} spatial routing and original coordinate preservation`,async()=>{
    const target=linearIndex(h,s,1);const e=environment({peak:target});
    const ans=await e.core.run(request);
    assert.equal(ans.status,'PREPARED_NOT_HOSTED');
    assert.equal(ans.result.candidates[0].hsn,encodeAddress(h,s,1));
    assert.equal(ans.result.candidates[0].score,10);
    assert.equal(ans.result.candidates[0].house,h);
    assert.equal(ans.result.candidates[0].sphere,s);
    assert.equal(ans.result.lattice.positions,NODE_COUNT);
    assert.equal(ans.result.lattice.houses.length,12);
    assert.equal(ans.result.lattice.spheres.length,144);
    assert.deepEqual(e.phases,['READ','USE','RETURN']);
    assert.equal(e.calls(),1);
    assert.equal(ans.neuralCalls,1);
    assert.strictEqual(ans.consumers.atlasOne,ans.consumers.swarmchat);
    assert.strictEqual(ans.consumers.atlasgpt,ans.consumers.atlasIntelligence);
    assert.strictEqual(ans.consumers.atlasOne,ans.result);
    assert.equal(ans.result.releaseAuthorized,false);
    assert.equal(ans.result.trainingEligible,false);
  });
}
// 12 x 12 negative structural mutations against the same frozen fixture.
const failures=[
  {name:'fallback',page:{fallbackUsed:true},reason:'FOREIGN_OR_FALLBACK_RESULT'},
  {name:'lexical',page:{method:'lexical'},reason:'FOREIGN_OR_FALLBACK_RESULT'},
  {name:'hybrid',page:{method:'hybrid'},reason:'FOREIGN_OR_FALLBACK_RESULT'},
  {name:'wrong-model-pin',page:{modelSha256:'unknown'},reason:'FOREIGN_OR_FALLBACK_RESULT'},
  {name:'wrong-source-pin',page:{sourceSha256:digest('other')},reason:'SOURCE_MISMATCH'},
  {name:'wrong-source-edition',page:{sourceEdition:'synthetic-v2'},reason:'SOURCE_MISMATCH'},
  {name:'wrong-registry-pin',page:{registrySha256:digest('other-registry')},reason:'FOREIGN_OR_FALLBACK_RESULT'},
  {name:'wrong-query-pin',page:{querySha256:digest('other-query')},reason:'FOREIGN_OR_FALLBACK_RESULT'},
  {name:'short-score-tensor',page:{scores:scores().slice(0,-1)},reason:'WRONG_NEURAL_SHAPE'},
  {name:'NaN-score',page:{scores:Object.assign(scores(),{144:NaN})},reason:'UNSAFE_NEURAL_SCORES'},
  {name:'Infinity-score',page:{scores:Object.assign(scores(),{144:Infinity})},reason:'UNSAFE_NEURAL_SCORES'},
  {name:'wrong-issuer',page:{issuer:''},reason:'FOREIGN_OR_FALLBACK_RESULT'}
];
for(let h=1;h<=12;h++)for(const scenario of failures){
  test(`H${h} rejects ${scenario.name} before producing a shared result`,async()=>{
    const e=environment({peak:linearIndex(h,1,1),page:scenario.page});
    const ans=await e.core.run(request);
    assert.equal(ans.status,'HOLD');assert.equal(ans.reason,scenario.reason);
    assert.equal(ans.releaseAuthorized,false);assert.equal(e.calls(),1);
  });
}
test('entire original coordinate space roundtrips bijectively',()=>{
  assert.equal(new Set(originalAddresses).size,1728);
  for(let i=0;i<NODE_COUNT;i++){
    const p=decodeIndex(i);
    assert.equal(addressIndex(p.hsn),i);
    assert.equal(decodeAddress(p.hsn).index,i);
  }
  assert.equal(originalAddresses[0],'H01.S01.N01');
  assert.equal(originalAddresses[1727],'H12.S12.N12');
});
test('no unsupported 0,13, float or noncanonical HSN',()=>{
  for(const v of ['H00.S01.N01','H1.S01.N01','H13.S01.N01','H01.S00.N01','H01.S01.N13','H01.S01.N01-extra'])assert.throws(()=>decodeAddress(v));
  for(const v of [1728,-1,1.5,NaN])assert.throws(()=>decodeIndex(v));
  for(const v of [0,13,1.5,NaN])assert.throws(()=>linearIndex(v,1,1));
});
test('sparse heap equals full flat sort on twelve seeded activation shapes, all tie values',()=>{
  for(let seed=0;seed<12;seed++){
    const data=Array.from({length:NODE_COUNT},(_,i)=>Math.round(Math.sin((seed+1)*i*0.017)*31)/31);
    for(const k of [1,2,5,12,32,144,1728]){
      const heap=sparseTopK(data,k).hits,ref=flatReference(data,k);
      assert.deepEqual(heap,ref);
    }
  }
});
test('stable tensor mass normalization, not calibrated confidence',()=>{
  const m=tensorMass(scores());
  assert.ok(Math.abs(m.houseMass.reduce((a,b)=>a+b,0)-1)<1e-12);
  assert.ok(Math.abs(m.sphereMass.reduce((a,b)=>a+b,0)-1)<1e-12);
  for(const v of [...m.houseMass,...m.sphereMass])assert.ok(Number.isFinite(v));
  const m2=tensorMass(new Array(NODE_COUNT).fill(-100000));
  assert.ok(Math.abs(m2.houseMass[0]-1/12)<1e-12);
});
test('typed independent crosswalk does not infer same-index identity',async()=>{
  const c={system:'electronic',edition:'v2',sourceSha256:D.crosswalk,externalCoordinate:'001',relationKind:'GENERATIVE_ANALOGY',hsn:'H01.S01.N01',reviewStatus:'PROPOSED'};
  const x=inspectCrosswalk(c);assert.equal(x.relationKind,'GENERATIVE_ANALOGY');assert.equal(x.reviewStatus,'PROPOSED');assert.equal(x.authorityEffect,'NONE');
  const e=environment({crosswalks:[c]});const res=await e.core.run(request);
  assert.equal(res.result.views.graph.typedCrosswalks.length,1);
  assert.equal(res.result.views.graph.typedCrosswalks[0].reviewStatus,'PROPOSED');
  assert.equal(res.result.views.graph.typedCrosswalks[0].externalCoordinate,'001');
  assert.equal(res.result.views.graph.authorityEffect,'NONE');
});
test('all ten canonical relationship kinds are retained as candidate metadata',()=>{
  assert.equal(RELATION_KINDS.length,10);
  assert.ok(RELATION_KINDS.includes('MYTHOLOGICAL_ASSOCIATION'));
  assert.ok(RELATION_KINDS.includes('PHYSICAL_PROPERTY'));
  assert.ok(RELATION_KINDS.includes('CONTRADICTS'));
});
test('mode and scope cannot silently import private Imagine/Palace/Play content',async()=>{
  const e=environment();for(const scope of ['PLAY','IMAGINE','SOCIAL','PALACE','QUIET']){
    const ans=await e.core.run(change(request,{scope}));assert.equal(ans.status,'HOLD');
  }
  assert.equal(e.calls(),0);
});
test('unknown request fields or purpose TRAINING hold before model',async()=>{
  const e=environment();
  assert.equal((await e.core.run({...request,providerKey:'secret'})).status,'HOLD');
  assert.equal((await e.core.run(change(request,{purpose:'TRAINING'}))).status,'HOLD');
  assert.equal(e.calls(),0);
});
test('READ denial/exception denies before neural invocation',async()=>{
  for(const option of [{denyPhase:'READ'},{throwPhase:'READ'}]){
    const e=environment(option),ans=await e.core.run(request);assert.equal(ans.status,'HOLD');assert.equal(e.calls(),0);
  }
});
test('USE and RETURN denials or epoch changes hold after one call',async()=>{
  for(const phase of ['USE','RETURN'])for(const key of ['denyPhase','driftPhase','throwPhase']){
    const e=environment({[key]:phase}),ans=await e.core.run(request);assert.equal(ans.status,'HOLD');assert.equal(e.calls(),1);
    assert.equal(ans.releaseAuthorized,false);
  }
});
test('citations need a separate disclosure grant after inference',async()=>{
  const e=environment({denyPhase:'DISCLOSE'}),ans=await e.core.run(change(request,{purpose:'CITATION'}));
  assert.equal(ans.status,'HOLD');assert.equal(ans.reason,'DISCLOSURE_DENIED_OR_DRIFTED');
  assert.deepEqual(e.phases,['READ','USE','DISCLOSE']);
});
test('required evidence held or fraudulent release cannot be converted to a grant',async()=>{
  for(const closure of [null,{status:'HOLD_METADATA',releaseAuthorized:false,authorityEffect:'NONE'},{status:'MATCHED_PINNED_METADATA',releaseAuthorized:true,authorityEffect:'NONE'}]){
    const e=environment({closure});const ans=await e.core.run(request);assert.equal(ans.status,'HOLD');assert.equal(e.calls(),1);
  }
});
test('synthetic gateway errors are held; no fallback call',async()=>{
  const e=environment({rejectGateway:true}),ans=await e.core.run(request);
  assert.equal(ans.status,'HOLD');assert.equal(e.calls(),1);
});
test('synthetic suite cannot imply actual users, residents, weights or hosted execution',async()=>{
  const e=environment(),ans=await e.core.run(request);
  for(const k of ['releaseAuthorized','trainingEligible','sourceRightsAttested','participantIdentityVerified','hostedExecutionVerified','observedQualityGain'])assert.equal(ans.result[k],false);
  assert.equal(ans.result.views.council.status,'NOT_EXECUTED');
  assert.equal(ans.result.views.e145.execution,'NOT_AUTHORIZED');
  assert.equal(ans.result.views.memory.kind,'EPHEMERAL_METADATA_ONLY');
});
test('malformed and missing top-level requests HOLD, never trigger gateway',async()=>{
  const e=environment();
  for(const bad of [null,undefined,3,'secret',[],Object.create(null)]){
    const ans=await e.core.run(bad);assert.equal(ans.status,'HOLD');assert.equal(ans.releaseAuthorized,false);
  }
  assert.equal(e.calls(),0);
});
test('malicious request getters are never invoked',async()=>{
  const e=environment();let calls=0;
  const hostile={...request};Object.defineProperty(hostile,'querySha256',{enumerable:true,get(){calls++;throw Error('getter was called');}});
  const ans=await e.core.run(hostile);assert.equal(ans.status,'HOLD');assert.equal(calls,0);assert.equal(e.calls(),0);
});
test('malicious request Proxy traps are never invoked',async()=>{
  const e=environment();let calls=0;
  const hostile=new Proxy({...request},{get(target,key){calls++;return Reflect.get(target,key)}});
  const ans=await e.core.run(hostile);assert.equal(ans.status,'HOLD');assert.equal(calls,0);assert.equal(e.calls(),0);
});
test('malicious source score array accessors are not evaluated',async()=>{
  const v=scores();let calls=0;
  Object.defineProperty(v,'17',{enumerable:true,get(){calls++;throw Error('score accessor');}});
  const e=environment({page:{scores:v}});const ans=await e.core.run(request);
  assert.equal(ans.status,'HOLD');assert.equal(calls,0);assert.equal(e.calls(),1);
});
test('untrusted neural response root accessor never fires',async()=>{
  const e=environment();let calls=0;
  const result={...request,method:'neural'};Object.defineProperty(result,'schema',{enumerable:true,get(){calls++;throw Error('bad page');}});
  const separateGateway={async request(){return result;}};
  const core=createGeometryKernel({gateway:separateGateway,policy:async()=>({decision:'ALLOW',epoch:'1'}),reviewClosure:async()=>({status:'MATCHED_PINNED_METADATA',releaseAuthorized:false,authorityEffect:'NONE'})});
  const out=await core.run(request);assert.equal(out.status,'HOLD');assert.equal(calls,0);
});
test('malicious policy response cannot impersonate an authority epoch',async()=>{
  const core=createGeometryKernel({gateway:{async request(){throw Error('should not run');}},policy:async()=>new Proxy({decision:'ALLOW',epoch:'good'},{}),reviewClosure:async()=>({status:'MATCHED_PINNED_METADATA',releaseAuthorized:false,authorityEffect:'NONE'})});
  assert.equal((await core.run(request)).status,'HOLD');assert.equal(core.stats().calls,0);
});
test('malicious closure getter cannot become an authorization result',async()=>{
  let getterCalls=0;
  const core=createGeometryKernel({gateway:{async request(p){return {schema:'atlas.neural.issued/v1',method:'neural',fallbackUsed:false,issuer:'canonical-gateway',modelSha256:D.model,registrySha256:ARIADNE_SHA256,querySha256:p.querySha256,sourceId:request.sourceId,sourceSha256:D.source,sourceEdition:request.sourceEdition,scores:scores()};}},policy:async()=>({decision:'ALLOW',epoch:'same'}),reviewClosure:async()=>{const x={releaseAuthorized:false,authorityEffect:'NONE'};Object.defineProperty(x,'status',{enumerable:true,get(){getterCalls++;throw Error('getter');}});return x;}});
  const out=await core.run(request);assert.equal(out.status,'HOLD');assert.equal(getterCalls,0);
});
test('shared views and protocol receipts cannot be mutated after preparation',async()=>{
  const e=environment();const r=(await e.core.run(request)).result;
  assert.throws(()=>{r.candidates[0].hsn='OTHER';},TypeError);
  assert.throws(()=>{r.lattice.houses[0]=999;},TypeError);
  assert.throws(()=>{r.views.council.status='VOTED';},TypeError);
  assert.equal(r.source.registrySha256,ARIADNE_SHA256);
});
// Independent round-C acceptance across all 144 structural Spheres.
// Exact ranking parity plus tight numerical tolerance, no quality claim.
test('synthesis C agrees with B and flat control across all original sphere slices',async()=>{
  const {fusedTensorSelect}=await import('../src/fused.mjs');
  for(let h=1;h<=12;h++)for(let s=1;s<=12;s++){
    const target=linearIndex(h,s,1);
    const v=Array.from({length:NODE_COUNT},(_,i)=>Math.sin(i*(h+s)*0.007)+Math.cos(i*.03)*0.15);
    v[target]+=7;
    const b=sparseTopK(v,12),m=tensorMass(v),c=fusedTensorSelect(v,12),a=flatReference(v,12);
    assert.deepEqual(c.selection.hits,b.hits);
    assert.deepEqual(c.selection.hits,a);
    assert.equal(c.selection.comparisons,b.comparisons);
    assert.equal(c.passes,2);
    for(let i=0;i<12;i++)assert.ok(Math.abs(c.mass.houseMass[i]-m.houseMass[i])<1e-12);
    for(let i=0;i<144;i++)assert.ok(Math.abs(c.mass.sphereMass[i]-m.sphereMass[i])<1e-12);
    assert.ok(Math.abs(c.mass.normalizerLog-m.normalizerLog)<1e-12);
  }
});
test('fused online logsumexp is stable at astronomical logits',async()=>{
  const {fusedTensorSelect}=await import('../src/fused.mjs');
  for(const shift of [1e8,-1e8]){
    const x=new Array(NODE_COUNT).fill(shift);x[1100]+=7;
    const y=fusedTensorSelect(x,5);
    assert.equal(y.selection.hits[0].index,1100);
    assert.ok(Math.abs(y.mass.houseMass.reduce((a,b)=>a+b,0)-1)<1e-12);
    assert.ok(Math.abs(y.mass.normalizerLog-tensorMass(x).normalizerLog)<1e-6);
  }
});
test('fused refuses NaN or missing scores before returning partial aggregation',async()=>{
  const {fusedTensorSelect}=await import('../src/fused.mjs');
  for(const val of [NaN,Infinity,-Infinity,undefined,null]){
    const scores=new Array(NODE_COUNT).fill(0);scores[144]=val;
    assert.throws(()=>fusedTensorSelect(scores,10));
  }
});
test('original DOMAIN/METHOD labels are never inferred from HSN positions',async()=>{
  const e=environment();const r=(await e.core.run(request)).result;
  assert.equal(r.candidates[0].knowledgeKind,'UNVERIFIED');
  assert.equal(r.candidates[0].knowledgeKindAuthority,'HOST_CLAIM_NOT_ATTESTED');
});
test('source-declared DOMAIN/METHOD role metadata stays non-authoritative',async()=>{
  const opts={gateway:{async request(p){return {schema:'atlas.neural.issued/v1',method:'neural',fallbackUsed:false,issuer:'canonical-gateway',modelSha256:D.model,registrySha256:ARIADNE_SHA256,querySha256:p.querySha256,sourceId:request.sourceId,sourceSha256:D.source,sourceEdition:request.sourceEdition,scores:scores(0)};}},policy:async()=>({decision:'ALLOW',epoch:'epoch-one'}),reviewClosure:async()=>({status:'MATCHED_PINNED_METADATA',releaseAuthorized:false,authorityEffect:'NONE'}),roleRecords:[{hsn:'H01.S01.N01',kind:'EPISTEMIC_METHOD',sourceRecordSha256:digest('role-source'),registrySha256:ARIADNE_SHA256}]};
  const kernel=createGeometryKernel(opts),r=(await kernel.run(request)).result;
  assert.equal(r.candidates[0].knowledgeKind,'EPISTEMIC_METHOD');
  assert.equal(r.candidates[0].knowledgeKindAuthority,'HOST_CLAIM_NOT_ATTESTED');
  assert.equal(r.releaseAuthorized,false);
});
test('role metadata cannot silently reclassify foreign source, duplicate HSN or unknown kind',()=>{
  const base={hsn:'H01.S01.N01',kind:'DOMAIN_SPECIALIZATION',sourceRecordSha256:digest('role'),registrySha256:ARIADNE_SHA256};
  const opts={gateway:{request(){throw Error('not invoked')}},policy(){return {decision:'ALLOW',epoch:'e'}},reviewClosure(){return {status:'MATCHED_PINNED_METADATA',releaseAuthorized:false,authorityEffect:'NONE'}}};
  for(const row of [{...base,registrySha256:digest('wrong')},{...base,kind:'GOD_IDENTITY'},{...base,hsn:'H13.S01.N01'}])assert.throws(()=>createGeometryKernel({...opts,roleRecords:[row]}));
  assert.throws(()=>createGeometryKernel({...opts,roleRecords:[base,base]}));
});
test('hostile crosswalk getter or Proxy cannot execute during clean-sheet source admission',()=>{
  const row={system:'other-system',edition:'r1',sourceSha256:digest('foreign-source'),externalCoordinate:'A',relationKind:'SEMANTIC_CANDIDATE',hsn:'H01.S01.N01',reviewStatus:'PROPOSED'};
  let called=0;Object.defineProperty(row,'hsn',{enumerable:true,get(){called++;throw Error('hijack')}});
  assert.throws(()=>inspectCrosswalk(row));assert.equal(called,0);
  assert.throws(()=>inspectCrosswalk(new Proxy({system:'proxy-probe'},{get(){called++;throw Error('proxy')}})));
  assert.equal(called,0);
});
test('hostile role-record and crosswalk array proxies hold before any processing',()=>{
  const fake={gateway:{async request(){throw Error('must never call')}},policy(){return {decision:'ALLOW',epoch:'none'}},reviewClosure(){return {status:'MATCHED_PINNED_METADATA',releaseAuthorized:false,authorityEffect:'NONE'}}};
  const hostile=new Proxy([], {get(){throw Error('array trap')}});
  assert.throws(()=>createGeometryKernel({...fake,roleRecords:hostile}));
  assert.throws(()=>createGeometryKernel({...fake,crosswalks:hostile}));
});
