import test from 'node:test';
import assert from 'node:assert/strict';
import * as H07 from '../kernels/H07.mjs';
import * as H08 from '../kernels/H08.mjs';
import * as H09 from '../kernels/H09.mjs';
import * as H10 from '../kernels/H10.mjs';
import * as H11 from '../kernels/H11.mjs';
import * as H12 from '../kernels/H12.mjs';
import {snapshot} from '../kernels/b-support.mjs';

const modules=[H07,H08,H09,H10,H11,H12];
test('JSON snapshot rejects sparse arrays disguised by extra enumerable properties',()=>{
  const disguised=Array(1);disguised.extra='x';assert.throws(()=>snapshot(disguised),/exact dense integer/);
  const dense=['x'];dense.extra='y';assert.throws(()=>snapshot(dense),/exact dense integer/);
  const leadingZero=['x'];leadingZero['00']='y';assert.throws(()=>snapshot(leadingZero),/exact dense integer/);
  assert.throws(()=>snapshot(Array(2)),/Sparse arrays/);assert.deepEqual(snapshot(['x',null]),['x',null]);
});
for(const kernel of modules){
  test(`${kernel.descriptor.houseId}: independent scan and indexed queries agree over varied seeded workloads`,()=>{
    for(const [seed,size] of [[1,1],[7,23],[719,180]]){
      const {dataset,requests}=kernel.fixture(seed,size),prepared=kernel.prepare(dataset);
      for(const request of requests){const expected=kernel.reference(dataset,request);assert.deepEqual(kernel.referenceQuery(prepared,request),expected);assert.deepEqual(kernel.query(prepared,request),expected);}
    }
  });
  test(`${kernel.descriptor.houseId}: prepared state and returned values resist caller mutation and forged handles`,()=>{
    const {dataset,requests}=kernel.fixture(51,30),original=structuredClone(dataset),prepared=kernel.prepare(dataset),request=requests[0],expected=kernel.reference(original,request);
    for(const key of Object.keys(dataset))delete dataset[key];
    assert.deepEqual(kernel.query(prepared,request),expected);
    const returned=kernel.query(prepared,request);returned.injected='caller mutation';
    for(const [key,value] of Object.entries(returned))if(Array.isArray(value))value.splice(0,value.length);
    assert.deepEqual(kernel.query(prepared,request),expected);
    assert.throws(()=>kernel.query({...prepared},request),/genuine prepared instance/);
    assert.throws(()=>kernel.referenceQuery({},request),/genuine prepared instance/);
  });
  test(`${kernel.descriptor.houseId}: accessors and nonfinite data fail without executing user getters`,()=>{
    const {dataset,requests}=kernel.fixture(43,6);let read=false;
    Object.defineProperty(dataset,'trick',{enumerable:true,get(){read=true;throw Error('should never execute');}});
    assert.throws(()=>kernel.prepare(dataset),/Accessors/);assert.equal(read,false);
    const fresh=kernel.fixture(9,5),prepared=kernel.prepare(fresh.dataset),request={...fresh.requests[0]};
    Object.defineProperty(request,'trick',{enumerable:true,get(){read=true;return true;}});
    assert.throws(()=>kernel.query(prepared,request),/Accessors/);assert.equal(read,false);
    assert.throws(()=>kernel.prepare({bad:Infinity}),/Nonfinite/);
  });
}

test('H07: proposing or starting does not fulfill a commitment; unobserved completion stays pending',()=>{
  const dataset={commitments:[{id:'a',owner:'owner',budget:5}],events:[{id:'p',taskId:'a',kind:'PROPOSED',units:0,observed:true},{id:'s',taskId:'a',kind:'STARTED',units:0,observed:true},{id:'c',taskId:'a',kind:'COST',units:8,observed:true},{id:'end',taskId:'a',kind:'COMPLETED',units:0,observed:false}]};
  const result=H07.query(H07.prepare(dataset),{});
  assert.equal(result.entries[0].recordedCompletion,false);assert.equal(result.entries[0].state,'STARTED');assert.equal(result.entries[0].remaining,-3);assert.equal(result.entries[0].overBudget,true);assert.deepEqual(result.unfulfilled,['a']);assert.equal(result.entries[0].unverifiedOutcomeEvents,1);assert.equal(result.outcomeEvidenceAuthenticated,false);
});
test('H07: observed records yield reconciled accounts but do not authenticate the producer',()=>{
  const dataset={commitments:[{id:'a',owner:'owner',budget:10}],events:[{id:'s',taskId:'a',kind:'STARTED',units:0,observed:true},{id:'c',taskId:'a',kind:'COST',units:3,observed:true},{id:'end',taskId:'a',kind:'COMPLETED',units:0,observed:true}]};
  const result=H07.reference(dataset,{taskIds:['a']});assert.equal(result.entries[0].recordedCompletion,true);assert.deepEqual(result.unfulfilled,[]);assert.equal(result.reportedTotalSpent,3);assert.equal(result.hostExecutionStarted,false);assert.equal(result.outcomeEvidenceAuthenticated,false);
  assert.throws(()=>H07.prepare({...dataset,events:[...dataset.events,dataset.events[0]]}),/duplicate event/);
  assert.throws(()=>H07.query(H07.prepare(dataset),{taskIds:['missing']}),/Unknown selected/);
});
test('H07: contradictory observed outcomes or completion without a start remain unfulfilled',()=>{
  const commitments=[{id:'a',owner:'owner',budget:10}],start={id:'s',taskId:'a',kind:'STARTED',units:0,observed:true},complete={id:'c',taskId:'a',kind:'COMPLETED',units:0,observed:true},failed={id:'f',taskId:'a',kind:'FAILED',units:0,observed:true};
  for(const events of [[complete],[start,complete,failed],[start,failed,complete]]){
    const d={commitments,events},p=H07.prepare(d),result=H07.query(p,{});assert.equal(result.entries[0].state,'CONFLICTED');assert.equal(result.entries[0].recordedCompletion,false);assert.ok(result.entries[0].unresolvedTransitions>0);assert.deepEqual(result.unfulfilled,['a']);assert.deepEqual(result,H07.referenceQuery(p,{}));
  }
});

test('H08: longest literal forms, Unicode spans, ambiguity and unknowns round-trip exactly',()=>{
  const dataset={grammarVersion:'v1',namespace:'glyph',lexicon:[{surface:'a',type:'LETTER',meanings:['a']},{surface:'ab',type:'PAIR',meanings:['first','second']},{surface:'🪿',type:'ICON',meanings:['goose']},{surface:'é',type:'LETTER',meanings:['accented']} ]};
  const request={grammarVersion:'v1',namespace:'glyph',text:'ab🪿éé?'};
  const result=H08.query(H08.prepare(dataset),request);
  assert.deepEqual(result.tokens.map(t=>[t.surface,t.start,t.end]),[['ab',0,2],['🪿',2,4],['e',4,5],['́',5,6],['é',6,7],['?',7,8]]);
  assert.equal(result.tokens[0].ambiguous,true);assert.equal(result.tokens[2].type,'UNKNOWN');assert.equal(result.tokens.map(t=>t.surface).join(''),request.text);assert.equal(result.semanticCertaintyClaimed,false);
});
test('H08: grammar mismatch, empty symbols and duplicate spellings are refused',()=>{
  const {dataset,requests}=H08.fixture(1,2),prepared=H08.prepare(dataset);
  assert.throws(()=>H08.query(prepared,{...requests[0],namespace:'other'}),/Grammar or namespace/);
  assert.throws(()=>H08.prepare({...dataset,lexicon:[...dataset.lexicon,dataset.lexicon[0]]}),/Duplicate/);
  assert.throws(()=>H08.prepare({...dataset,lexicon:[{surface:'',type:'X',meanings:['x']}]}),/surface/);
});
test('H08: expansion-heavy outputs are rejected incrementally rather than accumulated or truncated',()=>{
  const dataset={grammarVersion:'v1',namespace:'expanded',lexicon:[{surface:'a',type:'SYMBOL',meanings:Array.from({length:32},(_,i)=>String(i).padStart(2,'0')+'x'.repeat(158))}]};
  const prepared=H08.prepare(dataset),request={grammarVersion:'v1',namespace:'expanded',text:'a'.repeat(1000)};
  assert.throws(()=>H08.query(prepared,request),/786432-byte bound/);
  assert.throws(()=>H08.referenceQuery(prepared,request),/786432-byte bound/);
  assert.throws(()=>H08.reference(dataset,request),/786432-byte bound/);
  const small=H08.query(prepared,{...request,text:'aaaa'});assert.equal(small.tokens.length,4);assert.ok(new TextEncoder().encode(JSON.stringify(small)).byteLength<=H08.descriptor.outputBoundBytes);
});

test('H09: formal conjunction closure is exact, with cycles terminating and types preserved',()=>{
  const propositions=['a','b','c','d'].map(id=>({id,relationshipType:'MATHEMATICAL_RELATION',evidenceRefs:[]}));
  const dataset={propositions,rules:[{id:'ab-c',antecedents:['a','b'],consequent:'c'},{id:'c-d',antecedents:['c'],consequent:'d'},{id:'d-c',antecedents:['d'],consequent:'c'}]},prepared=H09.prepare(dataset);
  assert.deepEqual(H09.query(prepared,{assumptions:['a']}).derived,[]);
  const result=H09.query(prepared,{assumptions:['b','a']});assert.deepEqual(result.derived,['c','d']);assert.deepEqual(result.satisfiedRuleIds,['ab-c','c-d','d-c']);assert.equal(result.empiricalTruthEstablished,false);
});
test('H09: correlations and analogies cannot derive exact identity or formal conclusions',()=>{
  const dataset={propositions:[{id:'corr',relationshipType:'STATISTICAL_CORRELATION',evidenceRefs:['e']},{id:'analogy',relationshipType:'GENERATIVE_ANALOGY',evidenceRefs:[]},{id:'identity',relationshipType:'EXACT_IDENTITY',evidenceRefs:[]},{id:'formal',relationshipType:'MATHEMATICAL_RELATION',evidenceRefs:[]}],rules:[{id:'bad1',antecedents:['corr'],consequent:'identity'},{id:'bad2',antecedents:['analogy'],consequent:'formal'}]};
  const result=H09.query(H09.prepare(dataset),{assumptions:['corr','analogy']});assert.deepEqual(result.derived,[]);assert.equal(result.unsupportedRules.length,2);assert.deepEqual(result.facts.map(f=>f.relationshipType),['GENERATIVE_ANALOGY','STATISTICAL_CORRELATION']);
  assert.throws(()=>H09.prepare({...dataset,rules:[{id:'missing',antecedents:['absent'],consequent:'formal'}]}),/unbound rule/);
});

const communicationFixture=()=>({messages:[{id:'parent',author:'a',room:'r',audiences:['team'],replyTo:null,fields:{body:'Original'},observed:true},{id:'draft',author:'b',room:'r',audiences:['team'],replyTo:'parent',fields:{body:'Reply',source:'evidence',privateNote:'secret fixture'},observed:false}],fieldPolicies:[{room:'r',audience:'team',allowedFields:['body','source']}]});
test('H10: candidate projection preserves attribution and excludes unpermitted fields without claiming delivery',()=>{
  const request={messageId:'draft',room:'r',audience:'team'},result=H10.query(H10.prepare(communicationFixture()),request);
  assert.deepEqual(result.candidate.fields,{body:'Reply',source:'evidence'});assert.deepEqual(result.checkedReplyParents,['parent']);assert.equal(result.candidate.author,'b');assert.equal(result.delivered,false);assert.equal(result.status,'PREPARED_NOT_DELIVERED');assert.equal(result.hostAuthorizationVerified,false);
});
test('H10: unobserved, cross-room, wrong-audience or cyclic reply parents hold the preparation',()=>{
  const request={messageId:'draft',room:'r',audience:'team'};
  for(const [change,reason] of [[d=>d.messages[0].observed=false,'UNOBSERVED_REPLY_PARENT'],[d=>d.messages[0].room='other','REPLY_PARENT_SCOPE_MISMATCH'],[d=>d.messages[0].audiences=['other'],'REPLY_PARENT_SCOPE_MISMATCH'],[d=>d.messages[0].replyTo='draft','CYCLIC_REPLY_CHAIN']]){
    const d=communicationFixture();change(d);assert.equal(H10.query(H10.prepare(d),request).reason,reason);assert.equal(H10.reference(d,request).reason,reason);
  }
});

const rightsFixture=()=>({policyRevision:'v1',resources:[{id:'resource',retentionUntil:100}],grants:[{id:'grant',principal:'p',resourceId:'resource',actions:['read','reuse'],purposes:['research'],notBefore:10,expiresAt:80}]});
const rightsRequest=()=>({principal:'p',resourceId:'resource',action:'read',purpose:'research',now:50,currentPolicyRevision:'v1',revokedGrantIds:[],revokedResourceIds:[]});
test('H11: revocation after a successful check is observed on the same prepared snapshot',()=>{
  const prepared=H11.prepare(rightsFixture()),request=rightsRequest();assert.equal(H11.query(prepared,request).decision,'ELIGIBLE_UNDER_SUPPLIED_POLICY');
  request.revokedGrantIds=['grant'];const denied=H11.query(prepared,request);assert.equal(denied.decision,'HOLD');assert.equal(denied.reason,'NO_CURRENT_GRANT');assert.equal(denied.hostAuthorizationGranted,false);assert.equal(denied.returnPerformed,false);
  request.revokedGrantIds=[];request.revokedResourceIds=['resource'];assert.equal(H11.query(prepared,request).reason,'RESOURCE_REVOKED');
});
test('H11: time, purpose, policy revision and retention are checked at every query',()=>{
  const prepared=H11.prepare(rightsFixture());
  for(const [changes,reason] of [[{now:9},'NO_CURRENT_GRANT'],[{now:80},'NO_CURRENT_GRANT'],[{purpose:'unrelated'},'NO_CURRENT_GRANT'],[{currentPolicyRevision:'v2'},'STALE_POLICY_SNAPSHOT'],[{now:100},'RETENTION_EXPIRED']]){
    const r={...rightsRequest(),...changes};assert.equal(H11.query(prepared,r).reason,reason);assert.deepEqual(H11.query(prepared,r),H11.referenceQuery(prepared,r));
  }
  assert.equal(H11.query(prepared,{...rightsRequest(),now:100}).retentionActionDue,true);
  assert.throws(()=>H11.query(prepared,{...rightsRequest(),now:true}),/bounded integer/);
});

const workerFixture=()=>({planVersion:'plan1',tasks:[{id:'a',cost:3,dependsOn:[],capability:'compute',authorityExpiresAt:100},{id:'b',cost:4,dependsOn:['a'],capability:'compute',authorityExpiresAt:100},{id:'c',cost:2,dependsOn:[],capability:'io',authorityExpiresAt:100}]});
const workerRequest=()=>({completedIds:[],remainingBudget:4,maxTasks:3,now:50,grantedCapabilities:['compute','io'],communicationAvailable:true,stateKnown:true});
test('H12: proposed predecessors are never treated as completed; cost and task limits remain bounded',()=>{
  const p=H12.prepare(workerFixture()),result=H12.query(p,workerRequest());assert.deepEqual(result.proposals.map(x=>x.id),['a']);assert.equal(result.spentIfExecuted,3);assert.equal(result.remainingIfExecuted,1);assert.equal(result.executionStarted,false);assert.equal(result.durableCheckpointPersisted,false);
  const next=H12.query(p,{...workerRequest(),completedIds:['a'],remainingBudget:6});assert.deepEqual(next.proposals.map(x=>x.id),['b','c']);
  assert.deepEqual(H12.query(p,{...workerRequest(),maxTasks:0}).proposals,[]);
});
test('H12: cycles, inconsistent checkpoints, expired scope and uncertain state cannot expand the plan',()=>{
  const d=workerFixture();d.tasks[0].dependsOn=['b'];assert.throws(()=>H12.prepare(d),/acyclic/);
  const p=H12.prepare(workerFixture());
  assert.equal(H12.query(p,{...workerRequest(),completedIds:['b']}).reason,'INCONSISTENT_COMPLETION');
  assert.equal(H12.query(p,{...workerRequest(),communicationAvailable:false}).reason,'COMMUNICATION_UNAVAILABLE');
  assert.equal(H12.query(p,{...workerRequest(),stateKnown:false}).reason,'STATE_UNCERTAIN');
  assert.deepEqual(H12.query(p,{...workerRequest(),now:100}).proposals,[]);
  assert.deepEqual(H12.query(p,{...workerRequest(),grantedCapabilities:[]}).proposals,[]);
});
