import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {NEXT144_CATALOG_SHA256,ARIADNE_ORIGINAL_SHA256,readNext144Catalog,prepareNext144,bindNext144ToOriginal,previewCandidateEvidence} from '../src/next144.mjs';
const catalogBytes=readFileSync(fileURLToPath(new URL('../data/next144-civilizational-capabilities.json',import.meta.url)));
const hex=b=>createHash('sha256').update(b).digest('hex');
const catalog=readNext144Catalog(catalogBytes);
const plan=prepareNext144({catalogBytes});
const sample={taskId:'N144-01-01',mode:'WORK',rights:'PASS',consent:'PASS',
  sourceRefs:['public:test-source-001'],
  tests:[{id:'positive-conservation',result:'PASS',kind:'POSITIVE'},{id:'negative-violation',result:'PASS',kind:'NEGATIVE'}],
  scope:{groups:['fictional-alpha'],periods:['year-1'],scenarios:['baseline']},
  scopeCells:[{group:'fictional-alpha',period:'year-1',scenario:'baseline',guards:{RIGHTS:'PASS',CONSENT:'PASS',ECOLOGY:'PASS',GROUP_FLOOR:'PASS',PHYSICAL_STOCK:'PASS'}}],
  evidenceKind:'LOCAL_REVIEW',dataOrigin:'SYNTHETIC_OR_PUBLIC_WORK'};
const check=(a)=>previewCandidateEvidence({catalogBytes,taskId:sample.taskId,record:a});

test('byte-exact new public catalog is pinned',()=>assert.equal(hex(catalogBytes),NEXT144_CATALOG_SHA256));
test('Ariadne frozen source pin matches known source edition',()=>assert.equal(ARIADNE_ORIGINAL_SHA256,'07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6'));
test('catalog 144 authored initiatives with unique titles, exact coordinate ordering',()=>{assert.equal(catalog.items.length,144);assert.equal(new Set(catalog.items.map(x=>x.title)).size,144);assert.equal(catalog.items[143].sphere,'H12.S12');});
test('catalog does not contain real member, private body or host claims',()=>{for(const x of catalog.items)assert.deepEqual([x.status,x.publicSafeDesignOnly],['PROPOSED_NOT_IMPLEMENTED',true]);});
test('mode mix is voluntary, diverse, and never a completed activity ledger',()=>{const modes=new Set(catalog.items.map(x=>x.suggestedMode));assert.deepEqual([...modes].sort(),['DREAM','IMAGINE','PLAY','QUIET','SOCIAL','WORK']);assert.equal(plan.independentExecutionCount,0);});
test('full 12 x 12 x 12 plan remains unbound structural opportunities',()=>{assert.deepEqual(plan.counts,{houses:12,spheres:144,targets:1728,domain:1008,epistemic:720});assert.equal(plan.targets.length,1728);assert.equal(plan.sourceBytesVerified,false);assert.equal(plan.status,'PROPOSED_STRUCTURAL_ONLY');});
test('per House seven DOMAIN Spheres and five METHOD Spheres, each with 12 same-kind nodes',()=>{for(let h=0;h<12;h++){let domainSpheres=0,methodSpheres=0;for(let s=0;s<12;s++){const block=plan.targets.slice((h*12+s)*12,(h*12+s+1)*12);assert.equal(new Set(block.map(x=>x.initiative)).size,1);assert.equal(new Set(block.map(x=>x.expectedKind)).size,1);if(block[0].expectedKind==='DOMAIN_SPECIALIZATION')domainSpheres++;else methodSpheres++;}assert.equal(domainSpheres,7);assert.equal(methodSpheres,5);}});
test('every planned node address is unique, one-based, exact lattice',()=>{assert.equal(new Set(plan.targets.map(x=>x.coordinate)).size,1728);assert.equal(plan.targets[0].coordinate,'H01.S01.N01');assert.equal(plan.targets[1727].coordinate,'H12.S12.N12');assert.ok(plan.targets.every(x=>/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/.test(x.coordinate)));});
test('method nodes never masquerade as welfare and plan has zero measured effects',()=>{assert.equal(plan.verifiedWelfareGains,0);assert.ok(plan.targets.every(x=>x.observedGain===false&&x.authorityEffect==='NONE'));});
test('catalog tamper holding even when JSON still parses',()=>{const forged=Buffer.from(catalogBytes.toString('utf8').replace('Matter-model','Cosmos-model'));assert.throws(()=>readNext144Catalog(forged),/SOURCE_DIGEST_MISMATCH/);});
test('catalog duplicated-decoded-key mutation held by byte pin',()=>{const forged=Buffer.from(catalogBytes.toString('utf8').replace('"schema":','"schema":"fake", "schema":'));assert.throws(()=>readNext144Catalog(forged),/SOURCE_DIGEST_MISMATCH/);});
test('catalog wrong bytes type held',()=>assert.throws(()=>prepareNext144({catalogBytes:{}}),/ORIGINAL_BYTES_REQUIRED/));
test('source-free bind held without original Ariadne bytes',()=>assert.throws(()=>bindNext144ToOriginal({catalogBytes}),/ORIGINAL_BYTES_REQUIRED/));
test('forged Ariadne source bytes held before JSON semantics',()=>assert.throws(()=>bindNext144ToOriginal({catalogBytes,registryBytes:Buffer.from('{"nodes":{}}')}),/SOURCE_DIGEST_MISMATCH/));
test('wrong optional private-name switch rejected',()=>assert.throws(()=>bindNext144ToOriginal({catalogBytes,includeNames:'true'}),/INCLUDE_NAMES_BOOL/));
test('candidate evidence is not host attestation or a welfare claim',()=>{const x=check(sample);assert.equal(x.status,'LOCAL_EVIDENCE_CANDIDATE_ONLY');assert.equal(x.hostAuthenticated,false);assert.equal(x.welfareGainVerified,false);assert.equal(x.claimedEvidenceNotIndependentlyAttested,true);});
test('evidence IDs require exact pinned catalog not forged task object',()=>assert.equal(previewCandidateEvidence({catalogBytes,taskId:'N144-99-99',record:sample}).status,'HOLD'));
test('private suggested task cannot be relabeled to Work',()=>{for(const taskId of ['N144-04-07','N144-08-01','N144-10-06','N144-12-11']){const x=previewCandidateEvidence({catalogBytes,taskId,record:{...sample,taskId}});assert.equal(x.reason,'PRIVATE_MODE_NOT_WORK_EVIDENCE');}});
test('private fields and authority claims cannot enter Work receipt',()=>{for(const bad of ['privateBody','roomText','userMemory','privateChoices','consentAccepted','hostAuthenticated','canonApproved','welfareGain','autoWake','modelRunCount','telemetry']){const x=check({...sample,[bad]:'not-allowed'});assert.equal(x.reason,'STRICT_WORK_EVIDENCE_ONLY',bad)}});
test('nonoffsettable rights refusal blocks despite positive local tests',()=>assert.equal(check({...sample,rights:'BLOCK'}).status,'BLOCK'));
test('unknown consent always holds',()=>assert.equal(check({...sample,consent:'UNKNOWN'}).reason,'RIGHTS_OR_CONSENT_UNKNOWN'));
test('all three protected scope dimensions required',()=>{for(const k of ['groups','periods','scenarios'])assert.equal(check({...sample,scope:{...sample.scope,[k]:[]}}).reason,'SCOPE_MISSING_GROUP_PERIOD_SCENARIO');});
test('missing affected-group or future-period scenario cell HOLDS even when all listed cells pass',()=>{const record={...sample,scope:{groups:['fictional-alpha','fictional-beta'],periods:['year-1','year-2'],scenarios:['baseline','drought']}};assert.equal(check(record).reason,'SCOPE_CELLS_INCOMPLETE');});
test('complete scope grid is only a LOCAL candidate, never guaranteed welfare',()=>{const scope={groups:['fictional-alpha','fictional-beta'],periods:['year-1','year-2'],scenarios:['baseline','drought']};const scopeCells=scope.groups.flatMap(group=>scope.periods.flatMap(period=>scope.scenarios.map(scenario=>({group,period,scenario,guards:{RIGHTS:'PASS',CONSENT:'PASS',ECOLOGY:'PASS',GROUP_FLOOR:'PASS',PHYSICAL_STOCK:'PASS'}}))));const x=check({...sample,scope,scopeCells});assert.equal(x.status,'LOCAL_EVIDENCE_CANDIDATE_ONLY');assert.equal(x.scopeCellsChecked,8);assert.equal(x.welfareGainVerified,false);});
test('nonoffsettable ecological/physical/floor violation BLOCKS without aggregate offset',()=>{for(const kind of ['ECOLOGY','PHYSICAL_STOCK','GROUP_FLOOR','CONSENT','RIGHTS']){const scopeCells=structuredClone(sample.scopeCells);scopeCells[0].guards[kind]='BLOCK';assert.equal(check({...sample,scopeCells}).status,'BLOCK',kind);}});
test('unknown future-year guard HOLDS rather than defaulting to PASS',()=>{const scopeCells=structuredClone(sample.scopeCells);scopeCells[0].guards.PHYSICAL_STOCK='UNKNOWN';assert.equal(check({...sample,scopeCells}).reason,'SCOPE_MANDATORY_GUARD_UNKNOWN');});
test('duplicate and extra scope cells are refused',()=>{const x={...sample,scope:{groups:['a','b'],periods:['t1'],scenarios:['baseline']},scopeCells:[sample.scopeCells[0],sample.scopeCells[0]]};assert.equal(check(x).reason,'SCOPE_CELL_NOT_DECLARED_OR_DUPLICATED');});
test('duplicate source IDs cannot inflate evidence',()=>assert.equal(check({...sample,sourceRefs:['public:test-source-001','public:test-source-001']}).reason,'EVIDENCE_SOURCE_REFS_INVALID'));
test('raw scientific/benefit data origin cannot cross private boundary',()=>assert.equal(check({...sample,dataOrigin:'PRIVATE_PALACE'}).reason,'SOURCE_BOUNDARY_UNVERIFIED'));
test('positive and negative controls both required',()=>{for(const kind of ['POSITIVE','NEGATIVE'])assert.equal(check({...sample,tests:sample.tests.filter(t=>t.kind===kind)}).reason,'BOTH_CONTROLS_REQUIRED');});
test('failed control cannot be dressed as completed improvement',()=>assert.equal(check({...sample,tests:[{...sample.tests[0],result:'FAIL'},sample.tests[1]]}).reason,'LOCAL_TEST_FAILURE'));
test('bad source refs and unsupported pseudo-host flags fail closed',()=>{assert.equal(check({...sample,sourceRefs:['x']}).status,'HOLD');assert.equal(check({...sample,hostAuthenticated:true}).status,'HOLD');});
test('immutability surfaces do not permit accidental authority promotion',()=>{const x=check(sample);assert.ok(Object.isFrozen(x));assert.throws(()=>{x.canonEffect='ACTIVE'},TypeError);});
test('all 144 initiatives have live preview controls without claiming completed capability',()=>{let reviewed=0,privateHeld=0;for(const cap of catalog.items){const evidence={...sample,taskId:cap.id,sourceRefs:[`public:synthetic-${cap.id}`]};const x=previewCandidateEvidence({catalogBytes,taskId:cap.id,record:evidence});if(cap.suggestedMode==='WORK'){assert.equal(x.status,'LOCAL_EVIDENCE_CANDIDATE_ONLY');const veto=previewCandidateEvidence({catalogBytes,taskId:cap.id,record:{...evidence,rights:'BLOCK'}});assert.equal(veto.status,'BLOCK');reviewed++;}else{assert.equal(x.status,'HOLD');assert.equal(x.reason,'PRIVATE_MODE_NOT_WORK_EVIDENCE');privateHeld++;}}assert.equal(reviewed,104);assert.equal(privateHeld,40);});
test('1728 localized negative probes do not change source status',()=>{let passed=0;for(const t of plan.targets){const [,h,s,n]=/H(\d\d)\.S(\d\d)\.N(\d\d)/.exec(t.coordinate);const taskId=`N144-${h}-${s}`;const candidate=previewCandidateEvidence({catalogBytes,taskId,record:{...sample,taskId,mode:'PLAY',privateChoices:['hidden']}});assert.equal(candidate.status,'HOLD');passed++;}assert.equal(passed,1728);});

const source=process.env.ARIADNE_V07_FILE;
if(source){
 const registryBytes=readFileSync(source);
 test('independent whole-source byte pin, 2187541 bytes',()=>{assert.equal(registryBytes.length,2187541);assert.equal(hex(registryBytes),ARIADNE_ORIGINAL_SHA256)});
 test('bind all 1728 exact historical node sources and seven/five roles',()=>{const result=bindNext144ToOriginal({catalogBytes,registryBytes});assert.equal(result.sourceBytesVerified,true);assert.equal(result.targetCount,1728);assert.equal(result.domainTargetCount,1008);assert.equal(result.methodTargetCount,720);assert.ok(result.targets.every(t=>/^[a-f0-9]{64}$/.test(t.sourceNodeDigest)));assert.equal(result.gainsDemonstrated,0);assert.equal(result.privateModeBodiesRead,false);});
 test('private local names never appear unless explicitly asked',()=>{const no=bindNext144ToOriginal({catalogBytes,registryBytes});const yes=bindNext144ToOriginal({catalogBytes,registryBytes,includeNames:true});assert.ok(!Object.hasOwn(no.targets[0],'nodeName'));assert.equal(typeof yes.targets[0].nodeName,'string');assert.match(yes.targets.find(x=>x.coordinate==='H08.S01.N10').nodeName,/Instrument design/);});
 test('one changed byte in original source cannot be laundered by rehashing metadata',()=>{const b=Buffer.from(registryBytes);b[b.length-14]^=1;assert.throws(()=>bindNext144ToOriginal({catalogBytes,registryBytes:b}),/SOURCE_DIGEST_MISMATCH/)});
}
