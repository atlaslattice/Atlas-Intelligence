import test,{before} from 'node:test';import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';import {gunzipSync} from 'node:zlib';
import {createExcellenceProgram} from '../excellence-program.mjs';
import {compressedPlan,publishedProgram} from '../excellence-plan-data.mjs';
import {ARIADNE_SHA} from '../meta145-native-source-port.mjs';
import {createMeta145HorizonReview} from '../meta145-horizon-review.mjs';
const report={schema:'atlas.meta145.horizon-synthesis/v1',source_sha256:ARIADNE_SHA,node_count:1728,sphere_count:144,house_count:12,
  domain_nodes:1008,meta_nodes:720,simulated_node_years_per_campaign:1728,campaign_repetitions_symbolic:1728,
  explicit_numeric_steps_completed:2985984,symbolic_virtual_steps_computed_via_exact_exponentiation:5159780352,
  fictional_years_not_elapsed_time:true,original_hsn_years_or_expertise_not_claimed:true,
  read_only_peer_messages_considered:20,local_synthesis_cycles_performed:20,independently_authenticated_peer_turns:0,
  peer_reply_count_from_this_compiler:0,expert_reviews:0,scientific_crosswalks_accepted:0,canon_changed:false,
  host_deployed:false,model_weights_retrained:false,upstream_source_copied:false,new_1728_live_autonomous_researchers:0,
  sha256:'a'.repeat(64),node_chain_head_sha256:'b'.repeat(64),spheres_root_sha256:'c'.repeat(64),
  houses_root_sha256:'d'.repeat(64),peer_cycles_hash:'e'.repeat(64)};
const raw=x=>Buffer.from(JSON.stringify(x));const sha=x=>createHash('sha256').update(x).digest('hex');
let program;
before(async()=>program=await createExcellenceProgram(gunzipSync(Buffer.from(compressedPlan.gzip_base64,'base64')),publishedProgram.planSha256));
const port=x=>createMeta145HorizonReview(program,raw(x),sha(raw(x)));

test('exact SHA-pinned numerical horizon receipt is source-only',()=>{
  const p=port(report).status();assert.equal(p.nodeCount,1728);assert.equal(p.localReviewCycles,20);
  assert.equal(p.independentPeerTurns,0);assert.equal(p.hosted,false);
});
test('externally expected digest mismatch rejected',()=>assert.throws(()=>createMeta145HorizonReview(program,raw(report),'0'.repeat(64)),/SOURCE_RECEIPT_PIN_MISMATCH/));
test('missing trusted expected digest rejected',()=>assert.throws(()=>createMeta145HorizonReview(program,raw(report),null),/INDEPENDENT_SOURCE_PIN_REQUIRED/));
test('numeric explicit steps cannot be promoted to 5 billion executed',()=>assert.throws(()=>port({...report,explicit_numeric_steps_completed:5159780352}),/MISLEADING_YEAR_OR_EXECUTION_COUNT/));
test('symbolic repeats cannot be presented as real elapsed years',()=>assert.throws(()=>port({...report,fictional_years_not_elapsed_time:false}),/MISLEADING_YEAR_OR_EXECUTION_COUNT/));
test('fake peer turns blocked even with rehashed source',()=>assert.throws(()=>port({...report,independently_authenticated_peer_turns:20}),/FORGED_PEER_EXCHANGE/));
test('fake hosted deployment blocked even with rehashed source',()=>assert.throws(()=>port({...report,host_deployed:true}),/FORGED_SCIENCE_OR_HOST_STATUS/));
test('fake CANON and scientific acceptance blocked',()=>assert.throws(()=>port({...report,canon_changed:true,scientific_crosswalks_accepted:100}),/FORGED_SCIENCE_OR_HOST_STATUS/));
test('cross coordinate proposal remains separate source and work namespaces',()=>{
  const p=port(report);const r=p.prepareReview({hsn:'H05.S05.N03',taskId:'EX.W05.C03.P01',roomId:'meta-work-only'});
  assert.equal(r.status,'PREPARED_NOT_POSTED');assert.equal(r.relationship,'PROPOSED_METHOD_REVIEW_NOT_SAME_AS');
  assert.equal(r.executionAuthorized,false);assert.equal(r.posted,false);assert.equal(r.peerReplyCount,0);
});
test('protected mode rejected',()=>assert.throws(()=>port(report).prepareReview({hsn:'H01.S01.N01',taskId:'EX.W01.C01.P01',roomId:'work-only',mode:'IMAGINE'}),/PRIVATE_MODE_BLOCKED/));
test('invalid HSN and fake EX ID rejected',()=>{
  const p=port(report);assert.throws(()=>p.prepareReview({hsn:'H00.S00.N00',taskId:'EX.W01.C01.P01',roomId:'work-only'}),/HSN_ADDRESS_INVALID/);
  assert.throws(()=>p.prepareReview({hsn:'H01.S01.N01',taskId:'EX.W99.C01.P01',roomId:'work-only'}),/EX_ENGINEERING_ADDRESS_INVALID/);
});
test('private nested report cannot be contaminated through status reference',()=>{
  const p=port(report);const s=p.status();s.status='HOSTED_VERIFIED';assert.equal(p.status().hosted,false);
});
test('source authoring cannot replace official Excellence program object',()=>{
  assert.throws(()=>createMeta145HorizonReview({descriptor:()=>program.descriptor()},raw(report),sha(raw(report))),/OFFICIAL_VERIFIED_EXCELLENCE_REQUIRED/);
});
