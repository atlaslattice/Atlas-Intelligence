import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reviewRankStability} from '../src/rank-stability.mjs';
const peer=JSON.parse(readFileSync(new URL('../evidence/peer_rank_cases.json',import.meta.url),'utf8'));
function testCase(x){return reviewRankStability({ids:x.ids,baseline:x.baseline,candidate:x.candidate,errorBound:x.bound,k:x.k});}
for(const x of peer.cases){test('peer R01: '+x.name,()=>{
  const got=testCase(x);
  assert.equal(got.status,x.expectedJs);
  assert.deepEqual(got.baselineIds,x.expectedBaseline);
  assert.deepEqual(got.candidateIds,x.expectedCandidate);
  assert.equal(got.releaseAuthorized,false);
  assert.equal(got.errorBoundIndependentlyVerified,false);
});}
for(let h=0;h<12;h++)for(let s=0;s<12;s++){
  test(`synthetic coordinate H${h+1} S${s+1} stable/near-tie controls`,()=>{
    const n=1728,ids=Array.from({length:n},(_,i)=>`H${String(Math.floor(i/144)+1).padStart(2,'0')}.S${String(Math.floor(i/12)%12+1).padStart(2,'0')}.N${String(i%12+1).padStart(2,'0')}`);
    const base=Array.from({length:n},(_,i)=>-i/128);
    const candidate=base.map((v,i)=>v+(i%2?0.00001:-0.00001));
    const r=reviewRankStability({ids,baseline:base,candidate,errorBound:0.00002,k:(h*12+s)%25+1});
    assert.equal(r.status,'STABLE_ON_SUPPLIED_SCORES');
    assert.equal(r.releaseAuthorized,false);
    const t=base.slice();t[0]=t[1];
    assert.equal(reviewRankStability({ids,baseline:t,candidate:t.slice(),errorBound:0,k:1}).status,'HOLD_NEAR_TIE');
  });
}
test('original geometry #372 near-tie cancellation ranks are held',()=>{
  const x={ids:['H01.S01.N01','H01.S01.N02','H01.S01.N03'],baseline:[1.000000000000001,1,0],candidate:[1,1.000000000000001,0],errorBound:2e-15,k:1};
  assert.equal(reviewRankStability(x).status,'HOLD_RANK_CHANGED');
});
test('strict boundary tie holds even when rank order agrees',()=>{
  const x={ids:['a','b','c'],baseline:[3,2,2],candidate:[3,2,2],errorBound:0,k:2};
  const r=reviewRankStability(x);assert.equal(r.status,'HOLD_NEAR_TIE');assert.deepEqual(r.unsafePairs,[['b','c']]);
});
test('a claimed error bound cannot independently certify host safety',()=>{
  const x={ids:['a','b'],baseline:[3,1],candidate:[3,1],errorBound:0,k:1};
  const r=reviewRankStability(x);assert.equal(r.status,'STABLE_ON_SUPPLIED_SCORES');
  assert.equal(r.errorBoundIndependentlyVerified,false);assert.equal(r.hostedExecutionVerified,false);
});
test('untrusted root getter, Proxy and extra fields are held without invocation',()=>{
  const f={ids:['a'],baseline:[1],candidate:[1],errorBound:0,k:1};
  let called=0;Object.defineProperty(f,'ids',{enumerable:true,get(){called++;throw Error('getter');}});
  assert.equal(reviewRankStability(f).status,'HOLD_INVALID_INPUT');assert.equal(called,0);
  assert.equal(reviewRankStability(new Proxy(f,{})).status,'HOLD_INVALID_INPUT');
  assert.equal(reviewRankStability({ids:['a'],baseline:[1],candidate:[1],errorBound:0,k:1,releaseAuthorized:true}).status,'HOLD_INVALID_INPUT');
});
test('sparse, accessor, duplicate identity, bad numeric, too many entries hold',()=>{
  const f={ids:['a','b'],baseline:[2,1],candidate:[2,1],errorBound:0,k:1};
  assert.equal(reviewRankStability({...f,ids:new Array(2)}).status,'HOLD_INVALID_INPUT');
  const a=[2,1];Object.defineProperty(a,'0',{enumerable:true,get(){throw Error('getter');}});
  assert.equal(reviewRankStability({...f,baseline:a}).status,'HOLD_INVALID_INPUT');
  assert.equal(reviewRankStability({...f,ids:['a','a']}).status,'HOLD_INVALID_INPUT');
  assert.equal(reviewRankStability({...f,baseline:[Infinity,1]}).status,'HOLD_INVALID_INPUT');
  assert.equal(reviewRankStability({...f,baseline:new Array(1729).fill(1)}).status,'HOLD_INVALID_INPUT');
});
test('claimed bound violation held and output deeply immutable',()=>{
 const x={ids:['a','b'],baseline:[3,1],candidate:[2,1],errorBound:.1,k:1};
 const r=reviewRankStability(x);assert.equal(r.status,'HOLD_BOUND_VIOLATION');
 assert.throws(()=>{r.baselineIds[0]='fake';},TypeError);
 const near=reviewRankStability({ids:['a','b'],baseline:[1,1],candidate:[1,1],errorBound:0,k:1});
 assert.throws(()=>{near.unsafePairs[0][0]='c';},TypeError);
});
