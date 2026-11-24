import test,{before} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {createExcellenceProgram} from '../excellence-program.mjs';
import {compressedPlan,publishedProgram} from '../excellence-plan-data.mjs';
import {createMeta145Hierarchy180Bridge} from '../meta145-hierarchy180.mjs';
const SOURCE='07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6';
const POLICY=['ROUND_ROBIN','EVIDENCE_FIRST','NOVELTY_FIRST','DISSENT_FIRST','BALANCED','COST_AWARE'];
const hash=b=>createHash('sha256').update(b).digest('hex');
const canonical=x=>Array.isArray(x)?'['+x.map(canonical).join(',')+']':x&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}':JSON.stringify(x);
const stamp=x=>hash(Buffer.from(canonical(x)));
const raw=x=>Buffer.from(JSON.stringify(x));
let program;
before(async()=>program=await createExcellenceProgram(gunzipSync(Buffer.from(compressedPlan.gzip_base64,'base64')),publishedProgram.planSha256));
function fixtures(){
 const p=POLICY.map((name,i)=>({policy:name,trainScore:[200,220,250,210,230,240][i],holdoutScore:[100,120,115,105,130,110][i],costUnits:180,auditedSyntheticIssues:20,syntheticScopeHolds:0,childAttentionCounts:Array(12).fill(15)}));
 const meta={schema:'atlas.hsn.hierarchy180/v1.0',tier:'META145',id:'META145',sourceSha256:SOURCE,children:Array.from({length:12},(_,i)=>'H'+String(i+1).padStart(2,'0')),childrenReceiptRoot:'a'.repeat(64),chosenPolicy:'NOVELTY_FIRST',policySelection:'TRAIN_FIRST_120_YEARS_ONLY',policyAlternatives:p,yearCount:180,trainingYears:120,heldoutYears:60,yearlySelected:Array.from({length:180},()=>[100,200,300,2,1,1,1,400,0,900]),authorityEffect:'NONE',hosted:false,scientificValidation:false,genuinePeerTurns:0,modelCalls:0,status:'EXECUTED_SYNTHETIC_META145_PERSPECTIVE'};
 meta.receiptSha256=stamp(meta);
 const counts=total=>Object.fromEntries(POLICY.map((x,i)=>[x,i===0?total:0]));
 const summary={schema:'atlas.hsn.hierarchy180.campaign/v1',sourceSha256:SOURCE,source:{ariadneSha256:SOURCE,v09MetaRoot:'25fd969eb015b731e1d4fa3d357fab4d8c7da5c87773a07c4b5b08f9463d03e1',v09RecordRoot:'b'.repeat(64),sourceScope:'ORIGINAL_V07_EXACT_OWNER_PRIVATE'},status:'FULL_SOURCE_LOCAL_SIMULATION_NOT_HOSTED',yearsPerSimulation:180,selectionYears:120,heldoutYears:60,simulations:1885,sixPoliciesEach:6,selectedTrajectoryYearSteps:339300,actualCandidatePolicyYearSteps:2035800,simulationCounts:{NODE:1728,SPHERE:144,HOUSE:12,META145:1},nodeSelectedPolicyCounts:counts(1728),sphereSelectedPolicyCounts:counts(144),houseSelectedPolicyCounts:counts(12),originalNodePositions:1728,originalDomainPositions:1008,originalMethodPositions:720,acceptedScientificEdges:0,independentlyVerifiedWorkRights:false,hostedEndToEndPass:0,actualResidentModelTurns:0,modelWeightsUpdated:false,canonChanged:false,privateLeisureHarvested:false,rightsGate:'HOLD_CURRENT_PUBLISHER_READ_RETURN_AND_CI',selectionMethod:'TRAIN_ONLY_MAXIMUM_DECLARED_SYNTHETIC_UTILITY_NOT_GLOBAL_OPTIMUM',benchmarkClaim:'NO_HARDWARE_PERFORMANCE_CLAIM',nodeRoot:'c'.repeat(64),sphereRoot:'d'.repeat(64),houseRoot:'e'.repeat(64),metaRoot:meta.receiptSha256,metaSelectedPolicy:'NOVELTY_FIRST',metaTrainScore:250,metaHeldoutScore:115,metaRoundRobinHeldoutScore:100,metaHeldoutWinnerFromAllPolicies:'BALANCED'};
 summary.receiptSha256=stamp(summary);
 return {summary,meta};
}
function bridge(summary,meta){const a=raw(summary),b=raw(meta);return createMeta145Hierarchy180Bridge(program,a,hash(a),b,hash(b));}
function invalid(mutator,regex){const f=fixtures();mutator(f);assert.throws(()=>bridge(f.summary,f.meta),regex);}

test('official program admits pinned 1885-entry source-only hierarchy',()=>{const {summary,meta}=fixtures();const b=bridge(summary,meta);const s=b.status();assert.equal(s.simulations,1885);assert.equal(s.yearsEach,180);assert.equal(s.actualSyntheticPolicyYearSteps,2035800);assert.equal(s.chosenTrainingPolicy,'NOVELTY_FIRST');assert.equal(s.hosted,false);});
test('status copy cannot mutate source',()=>{const f=fixtures(),b=bridge(f.summary,f.meta);const x=b.status();x.hosted=true;assert.equal(b.status().hosted,false);});
test('one annual display is synthetic, not historical truth',()=>{const b=bridge(...Object.values(fixtures()));const r=b.inspectYear(180);assert.equal(r.year,180);assert.equal(r.signal.unresolvedSyntheticCount,2);assert.equal(r.hostAuthenticated,false);assert.throws(()=>b.inspectYear(181),/YEAR_INVALID/)});
test('all six policies and heldout limitations remain inspectable',()=>{const f=fixtures(),b=bridge(f.summary,f.meta);const a=b.comparePolicies();assert.equal(a.length,6);assert.equal(a.find(x=>x.selected).policy,'NOVELTY_FIRST');assert.ok(a.some(x=>x.heldoutSyntheticScore>115));});
test('forged implementation host score denied even with separately rehashed source',()=>{invalid(f=>{f.summary.hostedEndToEndPass=1;f.summary.receiptSha256=stamp(Object.fromEntries(Object.entries(f.summary).filter(([k])=>k!=='receiptSha256')))},/FORGED_HOST_OR_KNOWLEDGE_PROGRESS/)});
test('false CANON and private harvest claims denied',()=>{invalid(f=>{f.summary.canonChanged=true},/FORGED_HOST_OR_KNOWLEDGE_PROGRESS/);invalid(f=>{f.summary.privateLeisureHarvested=true},/FORGED_HOST_OR_KNOWLEDGE_PROGRESS/)});
test('incorrect totals and years denied',()=>{invalid(f=>{f.summary.simulations=1728},/HIERARCHY_COUNT_INVALID/);invalid(f=>{f.summary.yearsPerSimulation=1000000},/HIERARCHY_COUNT_INVALID/)});
test('fake science, wrong roles and fake model turns denied',()=>{invalid(f=>{f.summary.acceptedScientificEdges=12},/FORGED_HOST_OR_KNOWLEDGE_PROGRESS/);invalid(f=>{f.summary.originalMethodPositions=600},/FORGED_HOST_OR_KNOWLEDGE_PROGRESS/);invalid(f=>{f.summary.actualResidentModelTurns=20},/FORGED_HOST_OR_KNOWLEDGE_PROGRESS/)});
test('source pin independent of report contents',()=>{const f=fixtures();const a=raw(f.summary),b=raw(f.meta);assert.throws(()=>createMeta145Hierarchy180Bridge(program,a,'0'.repeat(64),b,hash(b)),/OPERATOR_SHA_MISMATCH/);});
test('unsupported global optimum phrasing denied',()=>{invalid(f=>{f.summary.selectionMethod='PROVEN_GLOBAL_OPTIMUM'},/UNSUPPORTED_OPTIMALITY_CLAIM/)});
test('tampering with policy choice cannot use future',()=>{invalid(f=>{f.meta.chosenPolicy='BALANCED'},/HOLDOUT_LEAK_OR_WRONG_TRAIN_WINNER/)});
test('changed year arrays cannot pass original root',()=>{invalid(f=>{f.meta.yearlySelected[179][3]=100},/META145_RECEIPT_ROOT_INVALID/)});
test('fake descendant House positions denied',()=>{invalid(f=>{f.meta.children[0]='H09'},/HOUSE_LINEAGE_INVALID/)});
test('fake nonofficial program denied',()=>{const f=fixtures(),a=raw(f.summary),b=raw(f.meta);assert.throws(()=>createMeta145Hierarchy180Bridge({descriptor:()=>program.descriptor()},a,hash(a),b,hash(b)),/OFFICIAL_EXCELLENCE_PROGRAM_REQUIRED/)});
test('never posts to Work and never conflates HSN and EX task identity',()=>{const f=fixtures(),b=bridge(f.summary,f.meta);const p=b.prepareWorkCandidate({hsn:'H05.S05.N03',taskId:'EX.W05.C03.P01',roomId:'source-review'});assert.equal(p.status,'PREPARED_NOT_POSTED');assert.equal(p.workPosted,false);assert.equal(p.actualModelTurns,0);assert.equal(p.issuerVerified,false);assert.match(p.relation,/NOT_SAME_AS/)});
test('protected modes and invalid coordinates denied',()=>{const f=fixtures(),b=bridge(f.summary,f.meta);assert.throws(()=>b.prepareWorkCandidate({hsn:'H05.S05.N03',taskId:'EX.W05.C03.P01',roomId:'source-review',mode:'PALACE'}),/PRIVATE_MODE_PROTECTED/);assert.throws(()=>b.prepareWorkCandidate({hsn:'H00.S01.N01',taskId:'EX.W05.C03.P01',roomId:'source-review'}),/HSN_COORDINATE_INVALID/)});
