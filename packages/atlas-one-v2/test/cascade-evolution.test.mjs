import test from 'node:test';
import assert from 'node:assert/strict';
import {evolve,verifyLedger,verifyCumulative,reviewSyntheticCandidate,mutationCoverage,
 FAMILIES,GENESIS,STAGE1,STAGE2,TOTAL} from '../src/cascade-evolution.mjs';

let full,oneHundred,expanded;
const base=()=>({tenant:'synthetic-atlas',principal:'selfdeclared-test-only',room:'synthetic-work-room',
  mode:'WORK',purpose:'REVIEW_ONLY',coordinate:'H01.S01.N01',sourceEdition:'synthetic-hsn-v1',
  sourceDigest:'dbaf5f738996f904bd60a85f1bbf9ef697e34f77c722a9776389c5a457543933',
  rightsRead:'HOST_NOT_CHECKED',rightsReturn:'HOST_NOT_CHECKED',consent:'NO_RELEASE_GRANT',
  noHarvest:false,canon:false,deployment:false,rawBody:null,replayCount:0,epoch:0});
// Source digest of the positive fixture is derived in the implementation; a
// pinned wrong digest must never pass, even when 64 hex digits look credible.
const deny=(x)=>assert.deepEqual(reviewSyntheticCandidate(x),{status:'HOLD',
 reason:'SOURCE_SCOPE_NOT_ACCEPTED',authorityEffect:'NONE',canExecute:false,
 canPublish:false,workPosted:false,hostAttested:false});

test('malformed top-level inputs all yield constant-shaped HOLD',()=>{
  for(const x of [null,undefined,[],42,'work',false,{},new Date(),Object.create(null)])deny(x);
});
test('caller assertions, private bodies and shape upgrades fail closed',()=>{
  for(const [key,value] of [['mode','PALACE'],['mode','PLAY'],['mode','QUIET'],
    ['purpose','PUBLISH'],['canon',true],['deployment',true],['rawBody','NO_COPY'],
    ['rightsRead','REVOKED'],['rightsReturn','REVOKED'],['consent','GRANTED'],
    ['tenant','different'],['principal','claimed-admin'],['epoch',900]])deny({...base(),[key]:value});
  deny({...base(),hostAttested:true});deny({...base(),somePrivateModeBody:{a:1}});
});
test('non-string coordinates, unknown hosts and edition aliases deny',()=>{
  for(const coordinate of [null,3,[],{},'H13.S01.N01','H01.S13.N01','H01.S01.N13','H1.S01.N01'])deny({...base(),coordinate});
});
test('no source or private material is echoed on failure',()=>{
  const x=reviewSyntheticCandidate({...base(),rawBody:'SYNTHETIC_PRIVATE_DO_NOT_COPY'});
  assert.equal(JSON.stringify(x).includes('SYNTHETIC_PRIVATE'),false);
  assert.equal(x.canExecute,false);
});
test('the sixteen test mutants are all individually distinguishable',()=>{
  assert.equal(FAMILIES.length,16);
  assert.equal(new Set(FAMILIES).size,16);
});
test('non-posted local evolution: 100 distinct inherited cases',async()=>{
  oneHundred=await evolve({steps:STAGE1});
  assert.equal(oneHundred.status,'TESTED_LOCAL_SYNTHETIC_ONLY');
  assert.equal(oneHundred.totalLocalSteps,100);
  assert.equal(oneHundred.cumulativeControlExecutions,10100);
  assert.equal(oneHundred.mutationCoverage.killed,16);
  assert.equal(oneHundred.mutationCoverage.total,16);
  assert.equal(verifyLedger(oneHundred.ledger).ok,true);
  assert.equal(oneHundred.ledger[0].previousHead,GENESIS);
  assert.equal(oneHundred.ledger.at(-1).phase,'PRIMARY_100');
  assert.ok(Object.values(oneHundred.houseCoverage).every(n=>n>0));
  assert.equal(oneHundred.actualPeerPosts,0);
  assert.equal(oneHundred.modelTurnsPerformed,0);
  assert.equal(oneHundred.voluntaryPrivateSlotsPerformed,0);
});
test('then 1000 *descendants* inherit all first-100 receipts, no reset',async()=>{
  expanded=await evolve({previous:oneHundred.ledger,steps:STAGE2});
  assert.equal(expanded.status,'TESTED_LOCAL_SYNTHETIC_ONLY');
  assert.equal(expanded.stepsPerformed,1000);
  assert.equal(expanded.totalLocalSteps,TOTAL);
  assert.equal(expanded.firstHundredHead,oneHundred.head);
  assert.equal(expanded.ledger[100].previousHead,oneHundred.head);
  assert.equal(expanded.ledger[100].phase,'DESCENDANT_1000');
  assert.equal(expanded.cumulativeControlExecutions,1211100);
  assert.equal(new Set(expanded.ledger.map(x=>x.coordinate)).size,1100);
  assert.ok(Object.values(expanded.houseCoverage).every(n=>n>=90));
  assert.ok(expanded.ledger.every(x=>x.hostVerified===false&&x.brokerPosts===0&&x.modelTurns===0));
  assert.equal(expanded.mutationCoverage.killed,16);
  assert.equal(verifyLedger(expanded.ledger).ok,true);
});
test('one-shot 1100 yields identical causal ledger to 100→1000 replay',async()=>{
  full=await evolve({steps:TOTAL});
  assert.equal(full.status,'TESTED_LOCAL_SYNTHETIC_ONLY');
  assert.equal(full.head,expanded.head);
  assert.equal(full.firstHundredHead,oneHundred.head);
  assert.deepEqual(full.ledger,expanded.ledger);
});
test('tampering in a prior generation rejects resume and proof',async()=>{
  const wrong=structuredClone(oneHundred.ledger);wrong[31].coordinate='H12.S12.N12';
  assert.equal(verifyLedger(wrong).ok,false);
  assert.equal((await evolve({previous:wrong,steps:1})).status,'HOLD');
});
test('missing, reordered, duplicated and status-promoted steps reject',()=>{
  const x=oneHundred.ledger;
  const cases=[x.slice(1),[x[1],x[0]], [...x,x.at(-1)],
    x.map((a,i)=>i===8?{...a,hostVerified:true}:a),
    x.map((a,i)=>i===19?{...a,status:'HOSTED_VERIFIED'}:a),
    x.map((a,i)=>i===22?{...a,modelTurns:1}:a)];
  for(const altered of cases)assert.equal(verifyLedger(altered).ok,false);
});
test('bounds and non-JSON requests cannot create fictional completions',async()=>{
  for(const steps of [-1,0,1101,1.3,Infinity,'100',NaN]){
    assert.equal((await evolve({steps})).status,'HOLD');
  }
  assert.equal((await evolve({previous:expanded.ledger,steps:1})).status,'HOLD');
});
test('complete mutation coverage is impossible without all 16 families',()=>{
  assert.equal(mutationCoverage([{coordinate:'H01.S01.N01',family:'TENANT'}]).killed,1);
  assert.equal(mutationCoverage([]).killed,0);
});
test('cumulative verifier rejects untrusted case type or family',()=>{
  assert.equal(verifyCumulative(null).ok,false);
  assert.equal(verifyCumulative([{}]).ok,false);
  assert.equal(verifyCumulative([{coordinate:'H01.S01.N01',family:'NOT_A_FAMILY'}]).ok,false);
});
test('proxy getters and malformed verification inputs deny without exceptions',async()=>{
  const poison=new Proxy({}, {ownKeys(){throw Error('NO_ECHO_SECRET')}});
  deny(poison);
  assert.equal(verifyLedger([poison]).ok,false);
  assert.equal(verifyCumulative([{get coordinate(){throw Error('NO_ECHO_SECRET')}}]).ok,false);
  assert.equal((await evolve({previous:[poison],steps:1})).status,'HOLD');
});
test('forged digest and untrusted mode are not accepted as local proof',()=>{
  for(const x of [{...base(),sourceDigest:'f'.repeat(64)}, {...base(),mode:'SOCIAL'},
    {...base(),rightsReturn:'VERIFIED_BY_CALLER'}])deny(x);
});
test('local positive never means external approval',()=>{
  const r=reviewSyntheticCandidate(base());
  assert.equal(r.status,'PREPARED_LOCAL_ONLY');
  assert.notEqual(r.status,'HOSTED_VERIFIED');
  assert.equal(r.canExecute,false);
  assert.equal(r.canPublish,false);
});
