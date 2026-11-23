import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fingerprint64,cutItems,planEvolution,verifyEvolution,planCompletion,SOURCE_BLOB} from '../scripts/atlas_source_cascade.mjs';

const snapshot=JSON.parse(readFileSync(new URL('../docs/ops/ATLAS_GITHUB_OPEN_SOURCE_CUT_20261122.json',import.meta.url),'utf8'));
const synthetic={
  observed_date:'2026-11-22',coverage:'SOURCE_SEARCH_SNAPSHOT_NOT_CLOSED_OR_COMPLETED',
  issues:[
    {repository:'atlaslattice/Atlas-Intelligence',type:'issue',number:1,
      title:'Synthetic first issue',url:'https://github.com/atlaslattice/Atlas-Intelligence/issues/1'},
    {repository:'atlaslattice/noosphere-archive',type:'issue',number:2,
      title:'Synthetic second issue',url:'https://github.com/atlaslattice/noosphere-archive/issues/2'}
  ],
  prs:[
    {repository:'atlaslattice/Atlas-Intelligence',type:'pull_request',number:3,
      title:'Synthetic third PR',url:'https://github.com/atlaslattice/Atlas-Intelligence/pull/3'}
  ]
};
const copy=x=>JSON.parse(JSON.stringify(x));

test('historical source cut is 278 unique issues plus 162 unique PRs',()=>{
  const rows=cutItems(snapshot);
  assert.equal(rows.length,440);
  assert.equal(new Set(rows.map(x=>x.url)).size,440);
  assert.equal(snapshot.observed_date,'2026-11-22');
});
test('source version is pinned to the reviewed Git blob',()=>assert.equal(SOURCE_BLOB,'165a59bfeefbeeeaf314b1db8b071e8f8de3f6af'));
test('100 candidate review additions first, then 1000',()=>{
  const r=planEvolution(snapshot);
  assert.equal(r.pilot_rows.length,100);
  assert.equal(r.expansion_rows.length,1000);
  assert.equal(r.summary.total_steps,1100);
});
test('all 1100 review requirements are unique',()=>{
  const r=planEvolution(snapshot),rows=[...r.pilot_rows,...r.expansion_rows];
  assert.equal(new Set(rows.map(x=>x.item_key+'/'+x.review_stage)).size,1100);
});
test('every transition depends on immediately preceding checkpoint',()=>{
  const r=planEvolution(snapshot),rows=[...r.pilot_rows,...r.expansion_rows];
  rows.forEach((x,i)=>{
    assert.equal(x.previous_ordinal,i);
    assert.equal(x.ordinal,i+1);
    assert.equal(x.previous_checksum64,i?rows[i-1].checksum64:r.initial_checksum64);
  });
});
test('phase boundary links pilot to expansion',()=>{
  const r=planEvolution(snapshot);
  assert.equal(r.expansion_rows[0].previous_checksum64,r.pilot_checkpoint64);
});
test('stage 2 and stage 3 depend on prior per-item review stage',()=>{
  const r=planEvolution(snapshot),rows=[...r.pilot_rows,...r.expansion_rows],positions=new Map();
  for(const row of rows){
    const n=positions.get(row.item_key)||0;
    assert.equal(row.previous_item_ordinal,n);
    positions.set(row.item_key,row.ordinal);
  }
});
test('440/440 source, 440/440 rights and 220/440 acceptance requests',()=>{
  const c=planEvolution(snapshot).summary.review_gate_counts;
  assert.deepEqual(c,{source:440,rights:440,acceptance:220});
});
test('all 440 distinct historic items receive at least a source request',()=>{
  assert.equal(planEvolution(snapshot).summary.distinct_items_touched,440);
});
test('does not invent current status, approval, host action or completion',()=>{
  const r=planEvolution(snapshot),rows=[...r.pilot_rows,...r.expansion_rows];
  assert.equal(r.summary.verified_current_statuses,0);
  assert.equal(r.summary.real_pr_merges,0);
  assert.equal(r.summary.real_work_messages,0);
  assert.ok(rows.every(x=>x.evidence_status==='UNVERIFIED_REQUEST_NOT_COMPLETED'));
  assert.ok(rows.every(x=>x.item_current_state==='NOT_REFRESHED'&&x.canon_effect==='NONE'&&x.external_effects===0));
});
test('running twice is deterministic and replay valid',()=>{
  const a=planEvolution(snapshot),b=planEvolution(snapshot);
  assert.equal(JSON.stringify(a),JSON.stringify(b));
  assert.equal(verifyEvolution(snapshot,a).valid,true);
});
test('pilot and expansion expected checkpoints match stored receipts',()=>{
  const r=planEvolution(snapshot);
  assert.equal(r.pilot_checkpoint64,'a948570f2487761f');
  assert.equal(r.final_checkpoint64,'b03d9322902e100a');
});
test('tampered status is detected',()=>{
  const r=planEvolution(snapshot);
  r.expansion_rows[0].evidence_status='PASS';
  assert.equal(verifyEvolution(snapshot,r).valid,false);
});
test('tampered predecessor chain is detected',()=>{
  const r=planEvolution(snapshot);
  r.expansion_rows[44].previous_checksum64='0000000000000000';
  assert.equal(verifyEvolution(snapshot,r).valid,false);
});
test('duplicate issue URLs refuse source cut',()=>{
  const s=copy(synthetic);
  s.issues.push(copy(s.issues[0]));
  assert.throws(()=>cutItems(s),/DUPLICATE_SOURCE_URL/);
});
test('mismatched URL type/number refuses source cut',()=>{
  const s=copy(synthetic);
  s.prs[0].url='https://github.com/atlaslattice/Atlas-Intelligence/issues/3';
  assert.throws(()=>cutItems(s),/SOURCE_URL_ID_MISMATCH/);
});
test('source cut must explicitly say historical not completed',()=>{
  const s=copy(synthetic);s.coverage='COMPLETE';
  assert.throws(()=>cutItems(s),/SOURCE_CUT_COVERAGE/);
});
test('out-of-bounds 1100 requests refuse unsafe small source',()=>{
  assert.throws(()=>planEvolution(synthetic),/CASCADE_BOUNDS_OR_SOURCE_INVALID/);
});
test('three items permit a valid two-step small cascade',()=>{
  const p=planEvolution(synthetic,{pilot:1,expansion:1});
  assert.equal(p.summary.total_steps,2);
  assert.equal(verifyEvolution(synthetic,p).valid,true);
});
test('source input is not mutated',()=>{
  const s=copy(synthetic),before=JSON.stringify(s);
  planEvolution(s,{pilot:1,expansion:1});
  assert.equal(JSON.stringify(s),before);
});
test('negative/unknown source scope is rejected',()=>{
  const s=copy(synthetic);s.issues[0].type='private_play';
  assert.throws(()=>cutItems(s),/INVALID_SOURCE_RECORD/);
});
test('full 1320 review gate capacity remains bounded and replayable',()=>{
  const p=planEvolution(snapshot,{pilot:100,expansion:1220});
  assert.equal(p.summary.total_steps,1320);
  assert.deepEqual(p.summary.review_gate_counts,{source:440,rights:440,acceptance:440});
  assert.equal(p.summary.remaining_unrequested_review_gates,0);
  assert.equal(verifyEvolution(snapshot,p).valid,true);
});
test('noncryptographic fingerprint never substitutes for signed evidence',()=>{
  assert.match(fingerprint64('source'),/^[a-f0-9]{16}$/);
  const p=planEvolution(synthetic,{pilot:1,expansion:1});
  assert.equal(p.summary.rights_or_canon_grants,0);
});

test('supplementary 220 candidate gates inherit the 1100-step root unchanged',()=>{
  const base=planEvolution(snapshot);
  const finish=planCompletion(snapshot,base);
  assert.equal(finish.completion_steps.length,220);
  assert.equal(finish.total_step_count,1320);
  assert.equal(finish.completion_steps[0].previous_checksum64,base.final_checkpoint64);
  assert.equal(finish.parent_checkpoint64,'b03d9322902e100a');
  assert.equal(finish.final_checkpoint64,'32d8fcce0ee6cd28');
});
test('complete review-requirement coverage is balanced across 440 source items',()=>{
  const end=planCompletion(snapshot);
  assert.deepEqual(end.coverage,{source:440,rights:440,acceptance:440});
  assert.equal(end.complete_candidate_gate_matrix,true);
  assert.equal(end.actual_prs_merged,0);
  assert.equal(end.actual_issues_closed,0);
  assert.equal(end.approval_granted,false);
});
test('completion rejects a falsified 1100 source chain',()=>{
  const r=planEvolution(snapshot);
  r.pilot_rows[7].checksum64='0000000000000000';
  assert.throws(()=>planCompletion(snapshot,r),/BASE_1100_REPLAY_HOLD/);
});
test('full 1320 record keys are unique even across the optional continuation',()=>{
  const r=planEvolution(snapshot);
  const extra=planCompletion(snapshot,r);
  const rows=[...r.pilot_rows,...r.expansion_rows,...extra.completion_steps];
  assert.equal(new Set(rows.map(x=>x.item_key+'/'+x.review_stage)).size,1320);
});
