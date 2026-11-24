import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {buildWhole144Program} from '../src/whole-144.mjs';
import {proposeSourceBoundCandidateGraph} from '../src/whole-144-compounding.mjs';
import {proposeScopeMatchedCandidateGraph} from '../src/whole-144-scope-ingress.mjs';
import {prepareSourceScopeEvidence,originalNodePin,scopeDigest,snapshotScopeInput,
 SCOPE_NAMESPACE,SCOPE_EDITION,SCOPE_REGISTRY_SHA256,R02_MATCHER_SHA256} from '../src/source-scope-evidence.mjs';
import {searchSource} from '../src/source-scope-navigation.mjs';

const program=buildWhole144Program(); // The ACTUAL complete 144-task parent program, never a stub.
const sourcePath=process.env.ARIADNE_V07_FILE;
const raw=sourcePath?readFileSync(sourcePath):null;
const source=raw?JSON.parse(raw):null;
const id='H01.S01.N01';
const candidateId=nodeId=>`W144-${nodeId.slice(0,3)}-${nodeId.slice(4,7)}`;
const binding=nodeId=>({candidateId:candidateId(nodeId),node:originalNodePin(source.nodes[nodeId])});
const request=(query=id,nodeIds=[id])=>({mode:'WORK',query,bindings:nodeIds.map(binding)});
const run=req=>proposeScopeMatchedCandidateGraph(program,raw,req);
const ownerTest=(name,fn)=>test(name,{skip:!raw?'Requires explicitly supplied original bytes through ARIADNE_V07_FILE':false},fn);
const held=result=>{assert.equal(result.status,'HOLD');assert.equal(result.dispatchAllowed,false);assert.equal(result.semanticPlacementEligible,false);};

test('the unmodified full 144-task parent fits the bounded inert snapshot',()=>{
 const copy=snapshotScopeInput(program);
 assert.equal(copy.tasks.length,144);
 assert.equal(Buffer.byteLength(JSON.stringify(program)),82659);
 assert.equal(JSON.stringify(copy),JSON.stringify(program));
});
test('matcher bytes are exactly the recovered scheduled R02 module',()=>{
 const bytes=readFileSync(new URL('../src/source-scope-navigation.mjs',import.meta.url));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),R02_MATCHER_SHA256);
});
test('synthetic source bytes cannot claim the original registry pin',()=>{
 const r=prepareSourceScopeEvidence(Buffer.from('{"nodes":{}}'),{query:id,nodeIds:[id]});
 held(r);assert.equal(r.reason,'ORIGINAL_SOURCE_PIN_MISMATCH');
});
test('spoofed byte-array prototypes cannot execute iterators and oversized bytes hold before copying',()=>{
 let calls=0;
 for(const prototype of [Uint8Array.prototype,Buffer.prototype]){
  const fake=Object.create(prototype);
  Object.defineProperty(fake,Symbol.iterator,{get(){calls++;return function*(){yield 123;yield 125;};}});
  const r=prepareSourceScopeEvidence(fake,{query:id,nodeIds:[id]});held(r);
  assert.equal(r.reason,'ORIGINAL_SOURCE_BYTES_REQUIRED');
 }
 assert.equal(calls,0);
 const oversized=prepareSourceScopeEvidence(Buffer.alloc(3*1024*1024+1),{query:id,nodeIds:[id]});
 held(oversized);assert.equal(oversized.reason,'ORIGINAL_SOURCE_BYTES_LIMIT');
});
test('scope flags and host assertions cannot be supplied by the caller',()=>{
 for(const field of ['scopeMatch','semanticAcceptance','hostedVerified','scopeEvidence']){
  const r=prepareSourceScopeEvidence(Buffer.from('{}'),{query:id,nodeIds:[id],[field]:true});
  held(r);assert.equal(r.reason,'SCOPE_QUERY_INVALID');
 }
});
test('query getters and proxies are rejected without invoking user code',()=>{
 let calls=0;
 const input={nodeIds:[id]};Object.defineProperty(input,'query',{enumerable:true,get(){calls++;return id;}});
 held(prepareSourceScopeEvidence(Buffer.from('{}'),input));
 const proxy=new Proxy({query:id,nodeIds:[id]},{ownKeys(){calls++;return ['query','nodeIds'];},getPrototypeOf(){calls++;return Object.prototype;}});
 held(prepareSourceScopeEvidence(Buffer.from('{}'),proxy));assert.equal(calls,0);
});
test('query cap measures serialized UTF-8 bytes and rejects malformed text',()=>{
 for(const query of ['é'.repeat(1025),'\ud800','bad\u0000query']){
  const r=prepareSourceScopeEvidence(Buffer.from('{}'),{query,nodeIds:[id]});
  held(r);assert.equal(r.reason,'SCOPE_QUERY_INVALID');
 }
});
test('duplicate out-of-range noncanonical sparse and oversized node lists hold',()=>{
 const sparse=[];sparse.length=1;
 for(const nodeIds of [[id,id],['H13.S01.N01'],['h01.s01.n01'],sparse,Array(129).fill(id)])
  held(prepareSourceScopeEvidence(Buffer.from('{}'),{query:id,nodeIds}));
});
test('unknown ingress flags and optional private modes cannot enter the existing candidate API',()=>{
 for(const input of [{mode:'PLAY',query:id,bindings:[]},{mode:'WORK',query:id,bindings:[],dispatch:true}])
  held(proposeScopeMatchedCandidateGraph(program,Buffer.from('{}'),input));
});
test('parent-program getters are rejected before legacy validation',()=>{
 let calls=0;const p={};Object.defineProperty(p,'status',{enumerable:true,get(){calls++;return program.status;}});
 held(proposeScopeMatchedCandidateGraph(p,Buffer.from('{}'),{mode:'WORK',query:id,bindings:[]}));
 assert.equal(calls,0);
});

ownerTest('actual original registry plus exact identity reaches ONLY existing unreviewed candidate ingress',()=>{
 const r=run(request());assert.equal(r.status,'SOURCE_SCOPE_CANDIDATE_ONLY');
 assert.equal(r.candidateGraph.status,'SOURCE_BOUND_CANDIDATE_ONLY');
 assert.equal(r.scopeEvidence.records[0].scopeMatch,'IDENTITY_ONLY');
 assert.equal(r.scopeEvidence.source.registrySha256,SCOPE_REGISTRY_SHA256);
 assert.equal(r.sourceOriginalBytesVerified,true);
 assert.equal(r.candidateGraph.sourceOriginalBytesVerified,false); // Existing inner API still compares caller pins only.
 assert.equal(r.candidateGraph.nodes[0].sourceSemanticMatch,'UNMAPPED');
 assert.equal(r.semanticPlacementEligible,false);assert.equal(r.semanticAcceptance,false);assert.equal(r.dispatchAllowed,false);
 assert.equal(r.workModeEligibility,'NOT_EVALUATED');assert.equal(r.rightsVerified,false);assert.equal(r.implementedTasks,0);
});
ownerTest('baseline identity-only ingress omits the exclusion reason; additive path preserves it and holds',()=>{
 const b=binding(id),node=source.nodes[id];
 const index={namespace:SCOPE_NAMESPACE,edition:SCOPE_EDITION,registrySha256:SCOPE_REGISTRY_SHA256,records:[b.node]};
 const baseline=proposeSourceBoundCandidateGraph(program,index,{mode:'WORK',bindings:[b],links:[]});
 assert.equal(baseline.status,'SOURCE_BOUND_CANDIDATE_ONLY');
 assert.equal(baseline.sourceNodeSemantics,'UNREVIEWED'); // This was never a semantic approval bypass.
 assert.equal(Object.hasOwn(baseline,'scopeEvidence'),false);
 const r=run(request(node.excludes));held(r);
 assert.equal(r.scopeEvidence.records[0].scopeMatch,'EXCLUSION_TEXT_ONLY');
 assert.deepEqual(r.scopeEvidence.records[0].matchedFields,['excludes']);
 assert.equal(Object.hasOwn(r,'candidateGraph'),false);
});
ownerTest('affirmative source text supports a candidate but never a semantic placement',()=>{
 const r=run(request(source.nodes[id].definition));assert.equal(r.status,'SOURCE_SCOPE_CANDIDATE_ONLY');
 assert.equal(r.scopeEvidence.records[0].scopeMatch,'AFFIRMATIVE_TEXT_ONLY');
 assert.equal(r.semanticPlacementEligible,false);assert.equal(r.candidateGraph.semanticEquivalencesEstablished,0);
});
ownerTest('mixed source and exclusion matches preserve both fields and hold ingress',()=>{
 const r=run(request(source.nodes[id].name));held(r);
 assert.equal(r.scopeEvidence.records[0].scopeMatch,'MIXED_SCOPE_TEXT');
 assert.ok(r.scopeEvidence.records[0].matchedFields.includes('excludes'));
 assert.ok(r.scopeEvidence.records[0].matchedFields.includes('name'));
});
ownerTest('browse and no-match evidence cannot silently enter candidate ingress',()=>{
 const browse=run(request(''));held(browse);assert.equal(browse.scopeEvidence.records[0].scopeMatch,'BROWSE_ONLY');
 assert.equal(browse.scopeEvidence.queryMatchedRecords,0);
 const absent=run(request('synthetic_r03_absent_query_739d7f032a'));held(absent);
 assert.equal(absent.scopeEvidence.records[0].scopeMatch,null);assert.equal(absent.scopeEvidence.records[0].reason,'NO_MATCH');
});
ownerTest('query source is recomputed; an affirmative receipt cannot be replayed for an exclusion query',()=>{
 const a=run(request(source.nodes[id].definition));
 const b=run(request(source.nodes[id].excludes));held(b);
 assert.notEqual(a.scopeEvidence.query.queryDigest,b.scopeEvidence.query.queryDigest);
 const injected=request(source.nodes[id].excludes);injected.scopeEvidence=a.scopeEvidence;
 held(run(injected));
});
ownerTest('record digest, declared digest and matched fields bind the whole original node separately',()=>{
 const r=run(request()),e=r.scopeEvidence.records[0],n=source.nodes[id];
 assert.equal(e.localRecordDigest,scopeDigest(n));assert.equal(e.node.recordSha256,scopeDigest(n));
 assert.equal(e.sourceDeclaredRecordDigest,n.source_record_sha256);
 assert.equal(e.sourceDeclaredRecordHashRecipeIndependentlyVerified,false);
 assert.equal(e.sourceScopeStatus,n.scope_status);assert.equal(e.lens,n.lens);
 assert.equal(r.scopeEvidence.searchScope.completeLatticeSearchClaimed,false);
 const serialized=JSON.stringify(r);assert.ok(!serialized.includes(n.definition));assert.ok(!serialized.includes(n.excludes));
});
ownerTest('mutated raw registry bytes cannot be rescued with recomputed node pins',()=>{
 const altered=structuredClone(source);altered.nodes[id].definition+=' synthetic altered source';
 const req=request();req.bindings[0].node=originalNodePin(altered.nodes[id]);
 const r=proposeScopeMatchedCandidateGraph(program,Buffer.from(JSON.stringify(altered)),req);held(r);
 assert.equal(r.reason,'ORIGINAL_SOURCE_PIN_MISMATCH');
});
ownerTest('source-pin substitutions and cross-HSN bindings hold at the correct existing boundary',()=>{
 for(const [field,value] of [['recordSha256','0'.repeat(64)],['namespace','synthetic.ariadne'],['edition','v0.8'],['kind','EPISTEMIC_META'],['registrySha256','0'.repeat(64)]]){
  const req=request();req.bindings[0].node={...req.bindings[0].node,[field]:value};
  const r=run(req);held(r);assert.equal(r.reason,'SCOPE_INGRESS_NODE_PIN_MISMATCH');
 }
 const req=request();req.bindings[0].candidateId='W144-H02-S01';
 const r=run(req);held(r);assert.equal(r.existingIngressReason,'CANDIDATE_SOURCE_BINDING_INVALID');
});
ownerTest('epistemic identity retains lens, role and the still-required subject',()=>{
 const nodeId='H01.S08.N01',r=run(request(nodeId,[nodeId]));
 assert.equal(r.status,'SOURCE_SCOPE_CANDIDATE_ONLY');
 const e=r.scopeEvidence.records[0];assert.equal(e.sourceRole,'EPISTEMIC_META');assert.equal(e.lens,'M01');
 assert.equal(e.subjectRequirement,'EXPLICIT_SUBJECT_STILL_REQUIRED');assert.equal(e.semanticPlacementEligible,false);
});
ownerTest('existing typed links and dissent survive the scope gate without becoming approvals',()=>{
 let selected=null;
 for(const token of source.nodes[id].definition.match(/[A-Za-z]{5,}/g)??[]){
  const positive=searchSource(source.nodes,token,{limit:128}).results.filter(r=>r.scopeMatch==='AFFIRMATIVE_TEXT_ONLY');
  if(positive.length>=2){selected={query:token,ids:positive.slice(0,2).map(r=>r.nodeId)};break;}
 }
 assert.ok(selected,'Original source must provide this bounded affirmative control');
 const req=request(selected.query,selected.ids);
 req.links=[{from:req.bindings[0].node,to:req.bindings[1].node,relation:'REVIEW_CANDIDATE',
  sourceRefs:['synthetic:source-scope-control'],dissentRefs:['synthetic:semantic-interpretation-unresolved'],
  rationale:'The local lexical overlap invites a source-specific review and retains unresolved alternatives.'}];
 const r=run(req);assert.equal(r.status,'SOURCE_SCOPE_CANDIDATE_ONLY');
 assert.deepEqual(r.candidateGraph.links[0].dissentRefs,req.links[0].dissentRefs);
 assert.equal(r.candidateGraph.links[0].epistemicStatus,'UNREVIEWED_CANDIDATE');
 assert.equal(r.candidateGraph.sourceNodeSemantics,'UNREVIEWED');
 req.links[0].relation='SAME_AS';held(run(req));
});
ownerTest('stable return and receipt digest bind exact query bytes and remain immutable',()=>{
 const r=run(request()),e=r.scopeEvidence.records[0];
 assert.equal(e.stableReturn,`#node=${id}&source=${SCOPE_REGISTRY_SHA256}`);
 assert.equal(e.queryDigest,createHash('sha256').update(id,'utf8').digest('hex'));
 const {receiptDigest,...unsigned}=r.scopeEvidence;assert.equal(receiptDigest,scopeDigest(unsigned));
 assert.throws(()=>{e.semanticAcceptance=true;},TypeError);
 assert.throws(()=>{e.matchedFields.push('excludes');},TypeError);
});
