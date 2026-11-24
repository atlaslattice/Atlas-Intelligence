import test from 'node:test';
import assert from 'node:assert/strict';
import {INNOVATIONS,ORIGINAL_SHA256,runInnovation,prepareWorkCandidate} from '../src/innovations.mjs';
import {syntheticFixture} from '../src/synthetic-fixtures.mjs';
const H='H03.S06.N02';
const run=id=>runInnovation(id,syntheticFixture(id,H));
test('exactly twenty distinct stable innovations',()=>{
 assert.equal(INNOVATIONS.length,20);
 assert.equal(new Set(INNOVATIONS.map(x=>x.id)).size,20);
 assert.deepEqual(INNOVATIONS.map(x=>x.id),Array.from({length:20},(_,i)=>'I'+String(i+1).padStart(2,'0')));
});
for(const {id,title} of INNOVATIONS){
 test(`${id} ${title} synthetic positive`,()=>{const v=run(id);assert.equal(v.state,'LOCAL_SYNTHETIC_CANDIDATE',JSON.stringify(v));assert.equal(v.operatorId,id);assert.equal(v.authorityEffect,'NONE');assert.equal(v.hostVerified,false);assert.equal(v.externalEffects,0);assert.equal(v.scientificAcceptance,false);});
 test(`${id} ${title} malformed input HOLD`,()=>assert.equal(runInnovation(id, {nonexistent:[]}).state,'HOLD'));
}
test('I01 preserves incompatible facets',()=>assert.equal(run('I01').data.facets.VALUE[0],'community-voice'));
test('I02 unknown is not falsity',()=>assert.ok(run('I02').data.missing.includes('independent-study')));
test('I03 preprint does not become independent',()=>assert.equal(run('I03').data.declaredRootCount,2));
test('I04 injected clock exposes review due',()=>assert.ok(run('I04').data.reviewDue.includes('source-A')));
test('I05 keeps both contradictory witness IDs',()=>assert.equal(run('I05').data.contradictions[0].witnessIds.CHALLENGES[0],'reading-B'));
test('I06 cross-house common token is not SAME_AS',()=>assert.equal(run('I06').data.candidates[0].relation,'LEXICAL_ECOTONE_REVIEW_ONLY'));
test('I07 finds bounded cross-house path with method',()=>assert.equal(run('I07').data.path.length,3));
test('I08 binds lens to subject',()=>assert.equal(run('I08').data.subject,H));
test('I09 requires independent semantic witness',()=>assert.ok(run('I09').data.missingPrerequisites.includes('semanticWitness')));
test('I10 never maps an orphan by selecting it',()=>assert.equal(run('I10').data.nextUnmapped,H));
test('I11 falsifier prompts are not executed',()=>assert.equal(run('I11').data.testsRun,0));
test('I12 synthetic robustness is not empirical',()=>assert.equal(run('I12').data.measuredRobustness,false));
test('I13 rights cannot be bought with benefits',()=>assert.ok(run('I13').data.excludedForRights.includes('C')));
test('I14 repeated objection is not independent support',()=>assert.equal(run('I14').data.deduplicatedRepeats,1));
test('I15 single withdrawal flips fragile synthetic consensus',()=>assert.equal(run('I15').data.fragileWhenRemoved.length,2));
test('I16 reversal is inverse of topological forward',()=>assert.deepEqual(run('I16').data.rollbackDraft,['revert-proposal','drop-local-view']));
test('I17 source coverage without source-body harvesting',()=>assert.equal(run('I17').data.sourceTextHarvested,false));
test('I18 includes wrong private mode for negative tests only',()=>assert.ok(run('I18').data.mutants.some(x=>x.case==='PRIVATE_MODE')));
test('I19 field order changes are shape-equivalent',()=>assert.equal(run('I19').data.sameCanonicalWire,true));
test('I20 selects across at least two Houses',()=>assert.equal(run('I20').data.housesRepresented,2));
test('I07 graph with missing method cannot claim a path',()=>{const f=syntheticFixture('I07',H);f.nodes=f.nodes.filter(x=>x.kind!=='EPISTEMIC_META');f.links=[];assert.equal(runInnovation('I07',f).state,'LOCAL_SYNTHETIC_CANDIDATE');assert.equal(runInnovation('I07',f).data.path,null)});
test('I16 cyclic steps HOLD',()=>assert.equal(runInnovation('I16',{steps:[{id:'a',rollback:'undo-a',requires:['b']},{id:'b',rollback:'undo-b',requires:['a']}]}).state,'HOLD'));
test('I17 under-budget cannot silently cover all claims',()=>{const f=syntheticFixture('I17',H);f.budget=1;assert.equal(runInnovation('I17',f).data.uncoveredClaims.length,3)});
test('I19 detects divergent structures',()=>{const f=syntheticFixture('I19',H);f.representations[1].payload.coordinate='H01.S01.N01';assert.equal(runInnovation('I19',f).data.sameCanonicalWire,false)});
test('I20 excludes nonvolunteers',()=>{const f=syntheticFixture('I20',H);f.cases[1].voluntary=false;assert.equal(runInnovation('I20',f).data.reviewCandidates.length,1)});
test('source-only pointer never attests hosted rights',()=>{const p=prepareWorkCandidate({id:'I20',coordinate:H,sourceDigest:ORIGINAL_SHA256});assert.equal(p.state,'PREPARED_NOT_SENT');assert.equal(p.readRightsVerified,false);assert.equal(p.returnRightsVerified,false)});
test('protected mode cannot be imported into Work',()=>assert.equal(prepareWorkCandidate({id:'I20',coordinate:H,sourceDigest:ORIGINAL_SHA256,originMode:'PALACE'}).state,'HOLD'));
test('founder coordinate is not one of the 1728',()=>assert.equal(prepareWorkCandidate({id:'I01',coordinate:'H00.S00.N00',sourceDigest:ORIGINAL_SHA256}).state,'HOLD'));
test('invalid source digest is HOLD',()=>assert.equal(prepareWorkCandidate({id:'I01',coordinate:H,sourceDigest:'a'.repeat(64)}).state,'HOLD'));
test('untrusted operator cannot be executed',()=>assert.equal(runInnovation('SYSTEM_SHELL',{command:'rm -rf /'}).state,'HOLD'));
test('prototype cannot claim world novelty as verified status',()=>assert.ok(INNOVATIONS.every(x=>x.status==='LOCAL_PROTOTYPE_NOT_INDEPENDENTLY_VALIDATED')));
test('raw body never enters Work lab',()=>assert.deepEqual(runInnovation('I02',{required:['A'],observed:[],body:'private fixture'}),{state:'HOLD',code:'NO_PRIVATE_INPUT',authorityEffect:'NONE',externalEffects:0}));
test('nested secret denied without echo',()=>{const r=runInnovation('I01',{facets:[],settings:{secret:'NEVER_ECHO_SYNTHETIC'}});assert.equal(r.state,'HOLD');assert.ok(!JSON.stringify(r).includes('NEVER_ECHO_SYNTHETIC'))});
test('circular caller input held without any mutation',()=>{const r={};r.x=r;assert.equal(runInnovation('I01',r).state,'HOLD')});
test('I07 forged domain-lens type does not qualify',()=>{const x=syntheticFixture('I07',H);x.nodes[2].kind='DOMAIN_SPECIALIZATION';assert.equal(runInnovation('I07',x).state,'HOLD')});
test('I08 cannot rotate domain Sphere as a method lens',()=>{const x=syntheticFixture('I08',H);x.lenses=['H01.S01.N01'];assert.equal(runInnovation('I08',x).state,'HOLD')});
test('I19 nested key reorder remains wire-equivalent',()=>{const x={representations:[{name:'A',payload:{root:{a:1,b:2}}},{name:'B',payload:{root:{b:2,a:1}}}]};assert.equal(runInnovation('I19',x).data.sameCanonicalWire,true)});
test('caller-invented non-Work mode is denied',()=>assert.equal(runInnovation('I01',{facets:[],originMode:'UNCLASSIFIED'}).state,'HOLD'));
import {negativeFixture} from '../src/adversarial-fixtures.mjs';
for(const {id} of INNOVATIONS){
 test(`${id} rejects targeted adversarial mutation`,()=>{
  const packet=negativeFixture(id,H);const v=runInnovation(id,packet);assert.equal(v.state,'HOLD',JSON.stringify(v));
  assert.equal(v.externalEffects,0);
 });
}
import {composeInnovationCircuit,meta145InnovationRollup} from '../src/compositor.mjs';
test('compositor preserves twenty distinct operator receipts',()=>{const c=composeInnovationCircuit(H);assert.equal(c.completedSyntheticOperators,20);assert.equal(c.gate,'REVIEW_REQUIRED_SOURCE_ONLY');assert.equal(c.actualModelCalls,0);assert.equal(c.actualScienceAcceptance,false);assert.equal(c.workCandidate.state,'PREPARED_NOT_SENT')});
test('compositor refuses H00 symbolic root as knowledge Node',()=>assert.equal(composeInnovationCircuit('H00.S00.N00').state,'HOLD'));
test('compositor preserves unresolved dissent and missing evidence',()=>{const c=composeInnovationCircuit(H);assert.ok(c.dissentObjectionsUnresolved>0);assert.ok(c.unresolvedEvidenceNeeds>0)});
test('meta145 rejects an incomplete cardinality',()=>assert.equal(meta145InnovationRollup([composeInnovationCircuit(H)]).state,'HOLD'));
test('meta145 accepts 1728 distinct synthetic source coordinates without granting science',()=>{
 const all=[];for(let h=1;h<=12;h++)for(let s=1;s<=12;s++)for(let n=1;n<=12;n++)all.push(composeInnovationCircuit(`H${String(h).padStart(2,'0')}.S${String(s).padStart(2,'0')}.N${String(n).padStart(2,'0')}`));
 const r=meta145InnovationRollup(all);assert.equal(r.nodeCount,1728);assert.equal(r.distinctSpheres,144);assert.equal(r.distinctHouses,12);assert.equal(r.scientificEdgesAccepted,0);assert.equal(r.genuineMacroTurns,0);
});
test('meta145 duplicate coordinate cannot earn extra credit',()=>{
 const a=Array(1728).fill(composeInnovationCircuit(H));assert.equal(meta145InnovationRollup(a).state,'HOLD');
});

test('META145 detects modified per-node synthetic receipt',()=>{
 const all=[];for(let h=1;h<=12;h++)for(let s=1;s<=12;s++)for(let n=1;n<=12;n++)all.push(composeInnovationCircuit(`H${String(h).padStart(2,'0')}.S${String(s).padStart(2,'0')}.N${String(n).padStart(2,'0')}`));
 all[0]={...all[0],unresolvedEvidenceNeeds:0};
 const verdict=meta145InnovationRollup(all);assert.equal(verdict.state,'HOLD');assert.equal(verdict.reason,'SYNTHETIC_RECEIPT_TAMPERED');
});
test('getter cannot change value during source validation',()=>{
 let calls=0;const a={facets:[]};Object.defineProperty(a,'originMode',{enumerable:true,get(){calls++;return calls===1?'WORK':'PALACE'}});
 assert.equal(runInnovation('I01',a).state,'HOLD');assert.equal(calls,0);
});
test('private nonenumerable field cannot hide from DTO boundary',()=>{
 const x={facets:[]};Object.defineProperty(x,'body',{value:'NEVER_ECHO',enumerable:false});
 const v=runInnovation('I01',x);assert.equal(v.state,'HOLD');assert.ok(!JSON.stringify(v).includes('NEVER_ECHO'));
});
test('array side keys cannot pass DTO cloning',()=>{
 const x={required:['A'],observed:[]};x.required.hidden='PSEUDO_PRIVATE';assert.equal(runInnovation('I02',x).state,'HOLD');
});
test('revoked proxy does not throw from dispatcher',()=>{const q=Proxy.revocable({facets:[]},{});q.revoke();assert.equal(runInnovation('I01',q.proxy).state,'HOLD');});
test('hostile ownKeys proxy is held, not executed',()=>{
 const p=new Proxy({facets:[]},{ownKeys(){throw Error('BAD_PROXY');}});assert.equal(runInnovation('I01',p).state,'HOLD');
});
test('untrusted accessor denied on Work port',()=>{
 let called=0;const p={id:'I01',coordinate:'H03.S06.N02',sourceDigest:ORIGINAL_SHA256};Object.defineProperty(p,'originMode',{enumerable:true,get(){called++;return 'WORK';}});
 assert.equal(prepareWorkCandidate(p).state,'HOLD');assert.equal(called,0);
});
test('prototype keys are not trusted Work inputs',()=>{
 const x={facets:[]};Object.defineProperty(x,'__proto__',{value:{admin:true},enumerable:true});assert.equal(runInnovation('I01',x).state,'HOLD');
});
test('ordinary Work fixtures still pass after detached copy',()=>assert.equal(runInnovation('I01',syntheticFixture('I01','H03.S06.N02')).state,'LOCAL_SYNTHETIC_CANDIDATE'));
