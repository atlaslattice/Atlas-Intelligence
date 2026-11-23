/** MacroTurn100 review-only regression: 100 LOCAL synthetic Work cycles.
 * One test per cycle, six checks per cycle. No model turns, private modes,
 * broker posts, consent grants, live physical stocks, or CANON authority.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateTwelveHouseReadiness} from '../src/civilizational-contract.mjs';
const impacts=Array.from({length:12},(_,i)=>({house:`H${String(i+1).padStart(2,'0')}`,state:'REVIEWED',sourceRefs:[`synthetic:macroturn-house-${i+1}`]}));
const roomRights=[{kind:'synthetic-local',state:'PASS'}];
for(let i=0;i<100;i++)test(`R1 local MacroTurn cycle ${i+1}: six independent Work checks only`,()=>{
  const start=100+i,stock={resource:`synthetic-stock-${i}`,unit:i%2?'kg':'L',opening:start,
    imports:i%7,regeneration:i%5,restoration:i%3,withdrawals:i%11,losses:i%2};
  stock.closing=stock.opening+stock.imports+stock.regeneration+stock.restoration-stock.withdrawals-stock.losses;
  const run=({impacts:imp=impacts,rights=roomRights,stocks=[stock]}={})=>
    evaluateTwelveHouseReadiness({material:true,impacts:imp,rights,stocks});
  const good=run();
  assert.equal(good.status,'REVIEW_CANDIDATE'); // 1
  assert.equal(good.authorityEffect,'NONE'); // 2
  assert.equal(run({rights:[{state:'BLOCK'}]}).status,'BLOCK'); // 3
  const field=['imports','regeneration','restoration'][i%3],bad={...stock,[field]:-1};
  bad.closing=bad.opening+bad.imports+bad.regeneration+bad.restoration-bad.withdrawals-bad.losses;
  assert.equal(run({stocks:[bad]}).reason,'RESOURCE_LEDGER_INVALID'); // 4
  assert.equal(evaluateTwelveHouseReadiness({material:false}).reason,'NONMATERIAL_REASON_REQUIRED'); // 5
  const unknown=impacts.map((v,j)=>i%12===j?{...v,state:'UNKNOWN'}:v);
  assert.equal(run({impacts:unknown}).reason,'HOUSE_EVIDENCE_UNKNOWN'); // 6
});
