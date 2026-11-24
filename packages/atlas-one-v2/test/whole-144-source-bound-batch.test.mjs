import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {buildWhole144Program} from '../src/whole-144.mjs';
import {proposeSourceBoundCandidateGraph as single,proposeSourceBoundCandidateBatch as batch} from '../src/whole-144-compounding.mjs';

const program=buildWhole144Program();
const clone=value=>JSON.parse(JSON.stringify(value));
// Synthetic source records only. The batch API compares supplied pins; it does
// not prove that these mock records belong to the original registry.
function fixture(all=false){
  const tasks=all?program.tasks:program.tasks.slice(0,3);
  const records=tasks.flatMap(task=>task.nodeSlots.map(nodeId=>({namespace:'synthetic.batch',
    edition:program.sourceEdition,nodeId,
    recordSha256:createHash('sha256').update('SYNTHETIC '+nodeId).digest('hex'),
    kind:Number(nodeId.slice(5,7))<=7?'DOMAIN_SPECIALIZATION':'EPISTEMIC_META',
    registrySha256:program.sourceDigest,label:'Synthetic repeated label'})));
  const pin=r=>Object.fromEntries(Object.entries(r).filter(([key])=>key!=='label'));
  const inputs=tasks.map(task=>{
    const rows=records.filter(r=>task.nodeSlots.includes(r.nodeId));
    return {mode:'WORK',projectReviewContext:'IRON_EMPIRE_FICTION',
      bindings:rows.map(r=>({candidateId:task.id,node:pin(r)})),
      links:[{from:pin(rows[0]),to:pin(rows[1]),relation:'REVIEW_CANDIDATE',
        sourceRefs:['synthetic:batch-review-source'],dissentRefs:['synthetic:still-unreviewed'],
        rationale:'This synthetic candidate remains unreviewed and conveys no authority.'}]};
  });
  return {index:{namespace:'synthetic.batch',edition:program.sourceEdition,
    registrySha256:program.sourceDigest,records},inputs};
}
function held(result,reason){assert.equal(result.status,'HOLD');if(reason)assert.equal(result.reason,reason);}

test('144 ordered Sphere requests retain all 1,728 bindings and exact individual receipts',()=>{
  const f=fixture(true),result=batch(program,f.index,f.inputs);
  assert.equal(result.status,'SOURCE_BOUND_BATCH_CANDIDATE_ONLY');
  assert.equal(result.requestCount,144);assert.equal(result.candidateGraphCount,144);assert.equal(result.heldRequestCount,0);
  assert.deepEqual(result.results,f.inputs.map(input=>single(program,f.index,input)));
  assert.equal(result.results.reduce((n,r)=>n+r.nodeCount,0),1728);
  assert.equal(new Set(result.results.flatMap(r=>r.nodes.map(n=>n.node.nodeId))).size,1728);
  assert.equal(result.sourceOriginalBytesVerified,false);assert.equal(result.scientificEndorsement,false);
  assert.equal(result.semanticEquivalencesEstablished,0);assert.equal(result.verifiedGains,0);
  assert.equal(result.rightsVerified,false);assert.equal(result.hostedVerified,false);
  assert.equal(result.canPublish,false);assert.equal(result.authorityEffect,'NONE');assert.equal(result.canonEffect,'NONE');
});

test('one full 1,728-node request retains the single API receipt and every typed link',()=>{
  const f=fixture(true),input={mode:'WORK',bindings:f.inputs.flatMap(x=>x.bindings),links:f.inputs.flatMap(x=>x.links)};
  const result=batch(program,f.index,[input]);
  assert.equal(result.status,'SOURCE_BOUND_BATCH_CANDIDATE_ONLY');
  assert.deepEqual(result.results,[single(program,f.index,input)]);
  assert.equal(result.results[0].nodeCount,1728);assert.equal(result.results[0].linkCount,144);
});

test('a bad middle request retains its exact HOLD and cannot hide or reorder adjacent results',()=>{
  const f=fixture();f.inputs[1].bindings[0].node.recordSha256='f'.repeat(64);
  const result=batch(program,f.index,f.inputs);
  assert.equal(result.status,'SOURCE_BOUND_BATCH_WITH_HOLDS');
  assert.equal(result.candidateGraphCount,2);assert.equal(result.heldRequestCount,1);
  assert.deepEqual(result.results,f.inputs.map(input=>single(program,f.index,input)));
  held(result.results[1],'CANDIDATE_SOURCE_BINDING_INVALID');
});

for(const [field,value] of [['namespace','foreign.batch'],['edition','v0.8'],['nodeId','H12.S12.N12'],
  ['recordSha256','e'.repeat(64)],['kind','EPISTEMIC_META'],['registrySha256','a'.repeat(64)]]){
  test(`each request rechecks ${field} after an earlier valid request`,()=>{
    const f=fixture(),bad=clone(f.inputs[0]);bad.bindings[0].node[field]=value;
    const inputs=[f.inputs[0],bad,f.inputs[2]],result=batch(program,f.index,inputs);
    assert.deepEqual(result.results,inputs.map(input=>single(program,f.index,input)));
    assert.equal(result.status,'SOURCE_BOUND_BATCH_WITH_HOLDS');held(result.results[1]);
  });
}

test('each private mode and invalid project context remains a per-request HOLD',()=>{
  const f=fixture(),inputs=['PLAY','SOCIAL','IMAGINE','DREAM','QUIET','BRAIN','PALACE'].map(mode=>({...f.inputs[0],mode}));
  inputs.push({...f.inputs[0],projectReviewContext:'SCIENTIFICALLY_VERIFIED'});
  const result=batch(program,f.index,inputs);
  assert.equal(result.heldRequestCount,8);assert.equal(result.candidateGraphCount,0);
  assert.deepEqual(result.results,inputs.map(input=>single(program,f.index,input)));
});

test('unknown keys, prevalidated caches and authority claims are never accepted',()=>{
  const f=fixture(),inputs=['prevalidated','cache','hostApproved','scientificEndorsement'].map(key=>({...f.inputs[0],[key]:true}));
  const result=batch(program,f.index,inputs);
  assert.equal(result.heldRequestCount,4);assert.deepEqual(result.results,inputs.map(input=>single(program,f.index,input)));
  held(batch(program,{...f.index,prevalidated:true},f.inputs),'SOURCE_BOUND_SCOPE_INVALID');
});

test('a forged extra argument cannot supply the private single-call validation context',()=>{
  const f=fixture();let reads=0;
  const forged={get index(){reads++;return f.index;},known:new Map(),tasks:new Map()};
  held(single(program,{...f.index,edition:'v0.8'},f.inputs[0],forged),'SOURCE_BOUND_SCOPE_INVALID');
  const badProgram=clone(program);badProgram.verifiedNodeGains=1;
  held(single(badProgram,f.index,f.inputs[0],forged),'PROGRAM_UNVERIFIED');
  assert.equal(reads,0);
});

test('boxed program identity fields cannot masquerade as detached primitive metadata',()=>{
  const f=fixture();
  for(const field of ['programDigest','sourceEdition','sourceDigest']){
    for(const freeze of [false,true]){
      const boxed=new String(program[field]),modified=clone(program);
      modified[field]=freeze?Object.freeze(boxed):boxed;
      held(batch(modified,f.index,f.inputs),'PROGRAM_UNVERIFIED');
    }
  }
  const valid=batch(program,f.index,f.inputs);
  assert.equal(typeof valid.programDigest,'string');
  assert.equal(typeof valid.sourcePin.edition,'string');assert.equal(typeof valid.sourcePin.registrySha256,'string');
  assert.equal(valid.status,'SOURCE_BOUND_BATCH_CANDIDATE_ONLY');
});

test('source index and program are freshly checked on every batch invocation',()=>{
  const f=fixture(),mutableProgram=clone(program);
  assert.equal(batch(mutableProgram,f.index,f.inputs).status,'SOURCE_BOUND_BATCH_CANDIDATE_ONLY');
  f.index.records[0].recordSha256='c'.repeat(64);
  held(batch(mutableProgram,f.index,f.inputs).results[0],'CANDIDATE_SOURCE_BINDING_INVALID');
  mutableProgram.tasks[0].nodeSlots[0]='H12.S12.N12';
  held(batch(mutableProgram,f.index,f.inputs),'PROGRAM_UNVERIFIED');
});

test('invalid shared scope, records and program keep the single API HOLD reasons',()=>{
  for(const edit of [f=>{f.index.edition='v0.8';},f=>{f.index.registrySha256='a'.repeat(64);},
    f=>{f.index.records=[];},f=>{f.index.records.push({...f.index.records[0]});},
    f=>{f.index.records[0].kind='EPISTEMIC_META';}]){
    const f=fixture();edit(f);
    assert.deepEqual(batch(program,f.index,f.inputs),single(program,f.index,f.inputs[0]));
  }
  const f=fixture(),bad=clone(program);bad.verifiedNodeGains=1;
  assert.deepEqual(batch(bad,f.index,f.inputs),single(bad,f.index,f.inputs[0]));
});

test('getters and forged iterators fail closed without executing their bodies',()=>{
  const f=fixture();let invoked=0;
  Object.defineProperty(f.inputs[1].bindings[0].node,'recordSha256',{get(){invoked++;return 'a'.repeat(64);}});
  const result=batch(program,f.index,f.inputs);
  held(result.results[1]);assert.equal(result.results[0].status,'SOURCE_BOUND_CANDIDATE_ONLY');assert.equal(invoked,0);
  const requests=[f.inputs[0]];requests[Symbol.iterator]=function*(){invoked++;yield f.inputs[0];};
  held(batch(program,f.index,requests),'SOURCE_BOUND_BATCH_COLLECTION_INVALID');assert.equal(invoked,0);
});

test('empty, sparse, oversized and symbol-bearing batch containers are rejected',()=>{
  const f=fixture(),sparse=[f.inputs[0],f.inputs[1]];delete sparse[0];
  const symbol=[f.inputs[0]];symbol[Symbol('cache')]=true;
  for(const inputs of [[],sparse,Array(145).fill(f.inputs[0]),symbol,null])
    held(batch(program,f.index,inputs),'SOURCE_BOUND_BATCH_COLLECTION_INVALID');
});

test('aggregate binding and link budgets hold the whole batch rather than truncating it',()=>{
  const f=fixture(true),all={mode:'WORK',bindings:f.inputs.flatMap(x=>x.bindings),links:[]};
  held(batch(program,f.index,[all,{mode:'WORK',bindings:[f.inputs[0].bindings[0]],links:[]}]),'SOURCE_BOUND_BATCH_BUDGET_EXCEEDED');
  const a={...f.inputs[0],links:Array(6912).fill(f.inputs[0].links[0])};
  held(batch(program,f.index,[a,f.inputs[1]]),'SOURCE_BOUND_BATCH_BUDGET_EXCEEDED');
});

test('unselected endpoints, duplicate bindings and authority relations remain individual HOLDs',()=>{
  const f=fixture(),inputs=[clone(f.inputs[0]),clone(f.inputs[1]),clone(f.inputs[2])];
  inputs[0].links[0].to=clone(f.inputs[1].bindings[0].node);
  inputs[1].bindings.push(clone(inputs[1].bindings[0]));inputs[2].links[0].relation='SAME_AS';
  const result=batch(program,f.index,inputs);
  assert.equal(result.heldRequestCount,3);assert.deepEqual(result.results,inputs.map(input=>single(program,f.index,input)));
});

test('mutating any caller object after return cannot change a batch receipt',()=>{
  const f=fixture(),mutableProgram=clone(program),result=batch(mutableProgram,f.index,f.inputs),before=JSON.stringify(result);
  f.index.records[0].recordSha256='f'.repeat(64);f.index.namespace='foreign.batch';
  f.inputs[0].bindings[0].node.nodeId='H12.S12.N12';f.inputs[0].links[0].sourceRefs[0]='synthetic:changed';
  mutableProgram.tasks[0].nodeSlots[0]='H12.S12.N12';
  assert.equal(JSON.stringify(result),before);
  const visit=value=>{if(value&&typeof value==='object'){assert.equal(Object.isFrozen(value),true);for(const child of Object.values(value))visit(child);}};
  visit(result);
});

test('batch order is intentional and graph digests remain permutation-stable within each request',()=>{
  const f=fixture(),forward=batch(program,f.index,f.inputs);
  f.inputs.reverse();for(const input of f.inputs){input.bindings.reverse();input.links.reverse();}f.index.records.reverse();
  const reverse=batch(program,f.index,f.inputs);
  assert.deepEqual(reverse.results.map(x=>x.graphDigest),forward.results.map(x=>x.graphDigest).reverse());
  assert.notEqual(reverse.batchDigest,forward.batchDigest);
});
