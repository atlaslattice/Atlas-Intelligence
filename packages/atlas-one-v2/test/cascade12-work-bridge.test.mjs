import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareNodeCandidate,prepareBurstPage,sanitizeNodeForWork,REGISTRY_SHA,SCHEMA} from '../src/cascade12-work-bridge.mjs';
const DIG='a'.repeat(64),P='b'.repeat(64),C='c'.repeat(64);
const make=()=>({cycle:'R09',coordinate:'H01.S01.N01',sourceEdition:'Ariadne v0.7',
 sourceDigest:DIG,sourceRole:'DOMAIN_SPECIALIZATION',mode:'WORK',candidateDigest:C,
 previousDigest:P,sourceInitiative:'N144-01-01',stageGate:'SOURCE_PIN',authorityEffect:'NONE',
 completedActualVisits:0,hostVerified:false,sourceOnly:true});
const pin=()=>({coordinate:'H01.S01.N01',registrySha256:REGISTRY_SHA,sourceDigest:DIG,
 candidateDigest:C,previousDigest:P});
const result=(p=make(),e=pin())=>prepareNodeCandidate(p,e);
test('01 Work positive is prepared, not dispatched',()=>{const r=result();assert.equal(r.status,'PREPARED_FOR_EXISTING_LOCAL_WORK_BURST');assert.equal(r.canDispatch,false)});
test('02 schema stable',()=>assert.equal(result().schema,SCHEMA));
test('03 exact id and operator shape',()=>{const r=result();assert.equal(r.task.id,'r09-h01-s01-n01');assert.equal(r.task.operator,'LOCAL_CIVILIZATION_REVIEW')});
test('04 cannot impersonate host identity',()=>assert.equal(result().permissionState,'HOST_MUST_INDEPENDENTLY_VERIFY'));
test('05 no external effects',()=>assert.equal(result().canPublish,false));
test('06 mode: optional Play explicitly held',()=>assert.equal(result({...make(),mode:'PLAY'}).status,'HOLD_PROTECTED_OPTIONAL_MODE'));
test('07 mode: Dream held',()=>assert.equal(result({...make(),mode:'DREAM'}).status,'HOLD_PROTECTED_OPTIONAL_MODE'));
test('08 mode: Imagine held',()=>assert.equal(result({...make(),mode:'IMAGINE'}).status,'HOLD_PROTECTED_OPTIONAL_MODE'));
test('09 source digest mismatch held',()=>assert.equal(result(make(),{...pin(),sourceDigest:'d'.repeat(64)}).status,'HOLD_SOURCE_OR_RIGHTS'));
test('10 wrong H00 denied',()=>assert.equal(result({...make(),coordinate:'H00.S01.N01'}).status,'HOLD_SOURCE_OR_RIGHTS'));
test('11 fake cycle denied',()=>assert.equal(result({...make(),cycle:'R21'}).status,'HOLD_SOURCE_OR_RIGHTS'));
test('12 span final cycle accepted',()=>assert.equal(result({...make(),cycle:'R20',stageGate:'RELEASE'}).status,'PREPARED_FOR_EXISTING_LOCAL_WORK_BURST'));
test('13 initiative id tamper rejected',()=>assert.equal(result({...make(),sourceInitiative:'N144-12-01'}).status,'HOLD_SOURCE_OR_RIGHTS'));
test('14 wrong source role held',()=>assert.equal(result({...make(),sourceRole:'EPISTEMIC_META'}).status,'HOLD_SOURCE_OR_RIGHTS'));
test('15 host status cannot be self-proclaimed',()=>assert.equal(result({...make(),hostVerified:true}).status,'HOLD_SOURCE_OR_RIGHTS'));
test('16 no completed visits claimed',()=>assert.equal(result({...make(),completedActualVisits:1}).status,'HOLD_SOURCE_OR_RIGHTS'));
test('17 CANON effect forbidden',()=>assert.equal(result({...make(),authorityEffect:'CANON'}).status,'HOLD_SOURCE_OR_RIGHTS'));
test('18 malformed hash denied',()=>assert.equal(result({...make(),candidateDigest:'oops'}).status,'HOLD_SOURCE_OR_RIGHTS'));
test('19 unknown fields denied',()=>assert.equal(result({...make(),secret:'private'}).status,'HOLD_SOURCE_OR_RIGHTS'));
test('20 getter hostile denied without invoking',()=>{let called=0;const x=make();Object.defineProperty(x,'mode',{enumerable:true,get(){called++;return 'WORK'}});assert.equal(result(x).status,'HOLD_SOURCE_OR_RIGHTS');assert.equal(called,0)});
test('21 symbol-keyed fields denied',()=>{let x=make();x[Symbol('secret')]=1;assert.equal(result(x).status,'HOLD_SOURCE_OR_RIGHTS')});
test('22 arrays denied',()=>assert.equal(prepareNodeCandidate([],pin()).status,'HOLD_SOURCE_OR_RIGHTS'));
test('23 pin getters denied',()=>{let p=pin();let called=0;Object.defineProperty(p,'sourceDigest',{enumerable:true,get(){called++;return DIG}});assert.equal(result(make(),p).status,'HOLD_SOURCE_OR_RIGHTS');assert.equal(called,0)});
test('24 duplicate node batch rejects',()=>assert.equal(prepareBurstPage([make(),make()],[pin(),pin()]).status,'HOLD_SOURCE_OR_RIGHTS'));
test('25 batch normal selects existing burst',()=>{const r=prepareBurstPage([make()],[pin()]);assert.equal(r.status,'PREPARED_BATCH_LOCAL_ONLY');assert.equal(r.existingBurstPlan.tasks.length,1)});
test('26 batch optional excluded but preserved count',()=>{const r=prepareBurstPage([make(),{...make(),mode:'SOCIAL'}],[pin(),pin()]);assert.equal(r.preparedCount,1);assert.equal(r.protectedCount,1)});
test('27 all optional cannot dispatch',()=>assert.equal(prepareBurstPage([{...make(),mode:'QUIET'}],[pin()]).status,'HOLD_ALL_OPTIONAL_OR_INVALID'));
test('28 max batch cap holds',()=>assert.equal(prepareBurstPage(Array(97).fill(make()),Array(97).fill(pin())).status,'HOLD_SOURCE_OR_RIGHTS'));
test('29 empty batch held',()=>assert.equal(prepareBurstPage([],[]).status,'HOLD_SOURCE_OR_RIGHTS'));
test('30 foreign registry held',()=>assert.equal(result(make(),{...pin(),registrySha256:'d'.repeat(64)}).status,'HOLD_SOURCE_OR_RIGHTS'));
test('31 current meta sphere accepts typed meta role',()=>{const p={...make(),coordinate:'H01.S08.N01',sourceInitiative:'N144-01-08',sourceRole:'EPISTEMIC_META'};assert.equal(result(p,{...pin(),coordinate:p.coordinate}).status,'PREPARED_FOR_EXISTING_LOCAL_WORK_BURST')});
test('32 meta incorrectly domain rejects',()=>{const p={...make(),coordinate:'H01.S08.N01',sourceInitiative:'N144-01-08'};assert.equal(result(p,{...pin(),coordinate:p.coordinate}).status,'HOLD_SOURCE_OR_RIGHTS')});
test('33 basic sanitization excludes fiction',()=>{const x={coordinate:'H01.S01.N01',cycle:'R09',packetDigest:C,previousCyclePacketDigest:P,source:{recordSha256:DIG,registrySha256:REGISTRY_SHA,sourceRole:'DOMAIN_SPECIALIZATION',sphereTaskRef:'N144-01-01'},status:'PLANNED_NOT_EXECUTED',completedMacroturnVisits:0,stageGate:'SOURCE_PIN',suggestedMode:'WORK',ironEmpireScene:{privateText:'NO_EXPORT'}};const y=sanitizeNodeForWork(x);assert.equal(y.cycle,'R09');assert.equal(JSON.stringify(y).includes('NO_EXPORT'),false)});
test('34 sanitized positive prepares',()=>{const x={coordinate:'H01.S01.N01',cycle:'R09',packetDigest:C,previousCyclePacketDigest:P,source:{recordSha256:DIG,registrySha256:REGISTRY_SHA,sourceRole:'DOMAIN_SPECIALIZATION',sphereTaskRef:'N144-01-01'},status:'PLANNED_NOT_EXECUTED',completedMacroturnVisits:0,stageGate:'SOURCE_PIN',suggestedMode:'WORK'};const p=sanitizeNodeForWork(x);assert.equal(result(p).status,'PREPARED_FOR_EXISTING_LOCAL_WORK_BURST')});

test('35 stage-gate suffix injection refused',()=>assert.equal(result({...make(),stageGate:'SOURCE_PIN_HACK'}).status,'HOLD_SOURCE_OR_RIGHTS'));
