import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {buildWhole144Program} from '../src/whole-144.mjs';
import {proposeCompoundingGraph,proposeSourceBoundCandidateGraph} from '../src/whole-144-compounding.mjs';

// Explicit synthetic source-index fixtures; no private registry labels or bytes.
// Matching mock record pins is NOT authentication of the original registry.
const program=buildWhole144Program();
const h=i=>String(i).padStart(2,'0');
function fixture(){
  const ids=['H01.S01.N01',...Array.from({length:12},(_,i)=>`H${h(i+1)}.S08.N01`)];
  const records=ids.map(nodeId=>({namespace:'synthetic.ariadne',edition:program.sourceEdition,nodeId,
    recordSha256:createHash('sha256').update('SYNTHETIC RECORD '+nodeId).digest('hex'),
    kind:nodeId.includes('.S01.')?'DOMAIN_SPECIALIZATION':'EPISTEMIC_META',
    registrySha256:program.sourceDigest,label:'Repeated synthetic topic'}));
  const pin=record=>Object.fromEntries(Object.entries(record).filter(([k])=>k!=='label'));
  const index={namespace:'synthetic.ariadne',edition:program.sourceEdition,
    registrySha256:program.sourceDigest,records};
  const bindings=records.map(r=>({candidateId:`W144-${r.nodeId.slice(0,3)}-${r.nodeId.slice(4,7)}`,node:pin(r)}));
  const links=records.slice(1).map(r=>({from:pin(records[0]),to:pin(r),relation:'LEXICAL_CANDIDATE',
    sourceRefs:['synthetic:authorized-work-index'],dissentRefs:['synthetic:unreviewed-semantic-match'],
    rationale:'Repeated labels prompt review only; they do not establish semantic equivalence.'}));
  return {index,input:{mode:'WORK',bindings,links},pin};
}
const run=f=>proposeSourceBoundCandidateGraph(program,f.index,f.input);
const hold=x=>{assert.equal(x.status,'HOLD');assert.equal(x.verifiedGains,0);assert.equal(x.authorityEffect,'NONE');};
test('13 identical labels retain 13 exact source identities and positional planning IDs',()=>{
  const f=fixture(),r=run(f);assert.equal(r.status,'SOURCE_BOUND_CANDIDATE_ONLY');assert.equal(r.nodeCount,13);
  assert.equal(new Set(r.nodes.map(n=>n.node.nodeId)).size,13);assert.equal(r.linkCount,12);
  assert.equal(r.labelsUsedForIdentity,false);assert.equal(r.sourceOriginalBytesVerified,false);
  assert.ok(r.nodes.every(n=>n.sourceSemanticMatch==='UNMAPPED'&&n.candidateId.startsWith('W144-')));
  assert.ok(r.nodes.every(n=>!('label' in n.node)));
});
test('changing labels cannot change identity or graph digest',()=>{
  const a=fixture(),b=fixture();b.index.records.forEach((r,i)=>r.label='Different synthetic title '+i);
  assert.equal(run(a).graphDigest,run(b).graphDigest);
});
test('input permutations preserve source-bound graph digest',()=>{
  const a=fixture(),b=fixture();b.index.records.reverse();b.input.bindings.reverse();b.input.links.reverse();
  assert.equal(run(a).graphDigest,run(b).graphDigest);
});
for(const [field,value] of [['namespace','foreign.ariadne'],['edition','v0.8'],['nodeId','H12.S12.N12'],
    ['recordSha256','f'.repeat(64)],['kind','EPISTEMIC_META'],['registrySha256','e'.repeat(64)]]){
  test(`endpoint substitution in ${field} is held`,()=>{const f=fixture();f.input.bindings[0].node[field]=value;hold(run(f));});
}
test('independent index edition mismatch is held',()=>{const f=fixture();f.index.edition='v0.8';hold(run(f));});
test('independent index registry mismatch is held',()=>{const f=fixture();f.index.registrySha256='1'.repeat(64);hold(run(f));});
test('source record substitution is detected against the endpoint',()=>{
  const f=fixture();f.index.records[0].recordSha256='2'.repeat(64);hold(run(f));
});
test('role is Sphere-based and not a node-position inference',()=>{
  const f=fixture();f.index.records[0].nodeId='H01.S01.N08';
  f.input.bindings[0].node.nodeId='H01.S01.N08';f.input.links.forEach(l=>l.from.nodeId='H01.S01.N08');
  const r=run(f);assert.equal(r.status,'SOURCE_BOUND_CANDIDATE_ONLY');
  assert.equal(r.nodes.find(n=>n.node.nodeId==='H01.S01.N08').node.kind,'DOMAIN_SPECIALIZATION');
});
test('a coherently wrong kind on the same Sphere is refused',()=>{
  const f=fixture();f.index.records[0].kind='EPISTEMIC_META';f.input.bindings[0].node.kind='EPISTEMIC_META';
  f.input.links.forEach(l=>l.from.kind='EPISTEMIC_META');hold(run(f));
});
test('binding cannot silently change its existing positional candidate',()=>{
  const f=fixture();f.input.bindings[0].candidateId='W144-H12-S12';hold(run(f));
});
test('duplicate record and duplicate binding both hold',()=>{
  const a=fixture(),b=fixture();a.index.records.push({...a.index.records[0]});
  b.input.bindings.push({...b.input.bindings[0]});hold(run(a));hold(run(b));
});
test('a link to an unselected endpoint holds',()=>{const f=fixture();f.input.bindings.pop();hold(run(f));});
test('links require all exact endpoint fields',()=>{const f=fixture();delete f.input.links[0].from.registrySha256;hold(run(f));});
test('SAME_AS and REQUIRES cannot be inferred from a lexical candidate',()=>{
  for(const relation of ['SAME_AS','REQUIRES','SUPPORTS','METHOD_TRANSFER']){
    const f=fixture();f.input.links[0].relation=relation;hold(run(f));
  }
});
test('explicit review-candidate links retain dissent and zero authority',()=>{
  const f=fixture();f.input.links[0].relation='REVIEW_CANDIDATE';const r=run(f);
  assert.equal(r.status,'SOURCE_BOUND_CANDIDATE_ONLY');assert.ok(r.links.some(l=>l.relation==='REVIEW_CANDIDATE'));
  assert.ok(r.links.every(l=>l.dissentRefs[0]==='synthetic:unreviewed-semantic-match'));
  assert.equal(r.canPublish,false);assert.equal(r.scientificEndorsement,false);assert.equal(r.actualResidentAssignments,0);
});
test('Iron Empire context remains fiction without changing source role',()=>{
  const f=fixture();f.input.projectReviewContext='IRON_EMPIRE_FICTION';const r=run(f);
  assert.equal(r.status,'SOURCE_BOUND_CANDIDATE_ONLY');assert.equal(r.evidenceModality,'FICTION_REVIEW');
  assert.equal(r.scientificEndorsement,false);assert.equal(r.nodes[0].node.kind,'DOMAIN_SPECIALIZATION');
  assert.equal(r.verifiedGains,0);assert.equal(r.rightsVerified,false);assert.equal(r.canonEffect,'NONE');
});
test('private modes and attempted scientific promotion are held',()=>{
  for(const mode of ['PLAY','SOCIAL','IMAGINE','DREAM','QUIET','BRAIN','PALACE']){const f=fixture();f.input.mode=mode;hold(run(f));}
  const f=fixture();f.input.projectReviewContext='SCIENTIFICALLY_VERIFIED';hold(run(f));
});
test('unknown keys and authority fields are not discarded',()=>{
  for(const edit of [f=>{f.input.sourceBody='forbidden synthetic field';},f=>{f.index.privateModes=[];},
      f=>{f.input.bindings[0].node.label='not an endpoint identifier';},
      f=>{f.input.links[0].hostApproved=true;},f=>{f.index.records[0].canPublish=true;}]){
    const f=fixture();edit(f);hold(run(f));
  }
});
test('source-pin getters are rejected without invocation',()=>{
  const f=fixture();let n=0;Object.defineProperty(f.input.bindings[0].node,'recordSha256',{get(){n++;return 'a'.repeat(64);}});
  hold(run(f));assert.equal(n,0);
});
test('unknown symbol keys and custom array iterators are held',()=>{
  const a=fixture(),b=fixture();a.input[Symbol('hidden')]=true;
  b.input.bindings[Symbol.iterator]=function*(){yield b.input.bindings[0];};hold(run(a));hold(run(b));
});
test('sparse collections, null context, null links and malformed text hold',()=>{
  for(const edit of [f=>{delete f.input.bindings[2];},f=>{f.input.projectReviewContext=null;},
      f=>{f.input.links=null;},f=>{f.input.links[0].rationale='invalid\ud800'.repeat(3);}]){
    const f=fixture();edit(f);hold(run(f));
  }
});
test('outputs keep immutable nested identities, links and dissent pins',()=>{
  const r=run(fixture());for(const value of [r,r.sourcePin,r.nodes,r.nodes[0],r.nodes[0].node,
    r.links,r.links[0],r.links[0].from,r.links[0].sourceRefs,r.links[0].dissentRefs])assert.equal(Object.isFrozen(value),true);
});
test('input mutation after return cannot rewrite a source-bound receipt',()=>{
  const f=fixture(),r=run(f),before=JSON.stringify(r);f.input.bindings[0].node.nodeId='H12.S12.N12';
  f.input.links[0].sourceRefs[0]='synthetic:changed';f.index.records[0].label='changed';assert.equal(JSON.stringify(r),before);
});
test('legacy graph contract remains strict and positional',()=>{
  const f=fixture();const link={fromId:'W144-H01-S01',toId:'W144-H02-S08',relation:'SUPPORTS',mode:'WORK',
    sourceRefs:['synthetic:legacy'],rationale:'Legacy positional review still requires explicit review.'};
  assert.equal(proposeCompoundingGraph(program,[link]).status,'RELATIONSHIP_REVIEW_CANDIDATE');
  hold(proposeCompoundingGraph(program,[{...link,from:f.input.bindings[0].node}]));
});
