import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareCollaborativeWorkReview as verify,readOnlyOntologyCoordinates,REGISTRY_SHA256} from '../src/work-review-contract.mjs';
const SHA='a'.repeat(64);
const template=()=>({
 room:{id:'atlas-lattice-neural-engineering-20261124-01',kind:'work',status:'open',headSeq:148,messageCount:148,maxMessages:500,maxPerMember:30,memberMessages:2,expiresAt:'2026-11-25T20:12:48.062Z'},
 member:{id:'gpt6-mica-neural-eval-20261124-thischat',assurance:'SELF_DECLARED',consent:'USER_INVITATION_WORK'},
 reply:{parentSeq:129,requestId:'mica-source-protocol-review-20261124-r1',referencedSeqs:[129,131,148]},
 source:{scope:'WORK',privateModeDataIncluded:false,sourceUrl:'https://github.com/atlaslattice/Atlas-Intelligence/pull/58',sourceDigest:SHA,sourceEdition:'MICA R02 draft'},
 change:{predecessor:'Current source-pinned 60-file core',addition:'Optional Work protocol audit, no new server',testableDifference:'Rejects false model-turn completions',falsifier:'A missing source or fake host acceptance is admitted'},
 hsn:{node:'H05.S11.N04',role:'EPISTEMIC_META',subject:'H05.S06.N12',registryDigest:REGISTRY_SHA256,nodeRecordDigest:SHA},
 evidence:{testStatus:'LOCAL_REVIEW_ONLY',testsRun:29,testsPassed:29,testsFailed:0,testReceiptDigest:SHA,humanReviewed:false,hostVerified:false},
 release:{edition:'ATLAS_COLLAB_V2_PROPOSAL',status:'SOURCE_ONLY_TESTED_LOCAL',permissionEffect:'NONE',canonEffect:'NONE',modelWeightsChanged:false,hostedDeployed:false},
 claims:{actuallyPosted:false,scheduledWakeCount:0,performedAgentVisits:0,peerIdentityVerified:false,semanticAccepted:false}
});
const check=(mutate)=>{let i=template();mutate(i);assert.equal(verify(i).status,'HOLD_REVIEW_NOT_ADMITTED');};
const accepted=()=>{const r=verify(template());assert.equal(r.status,'PREPARED_NOT_POSTED');assert.equal(r.canPost,false);assert.equal(r.completedMacroturns,0);assert.match(r.reviewDigest,/^[a-f0-9]{64}$/)};
test('01 reviewed Work candidate is PREPARED not POSTED',accepted);
test('02 same data identical fingerprint',()=>assert.deepEqual(verify(template()),verify(template())));
test('03 extra top-level field held',()=>check(x=>x.unsupported=1));
test('04 accessor-backed source field held without invoking getter',()=>check(x=>Object.defineProperty(x.source,'sourceUrl',{get(){throw Error('SHOULD_NOT_RUN')}})));
test('05 private data mode held',()=>check(x=>x.source.privateModeDataIncluded=true));
test('06 non-Work scope held',()=>check(x=>x.source.scope='PLAY'));
test('07 expired room state held',()=>check(x=>x.room.status='expired'));
test('08 full room held',()=>check(x=>x.room.messageCount=500));
test('09 full member quota held',()=>check(x=>x.room.memberMessages=30));
test('10 room watermark contradiction held',()=>check(x=>x.room.headSeq=130));
test('11 nonexistent parent held',()=>check(x=>x.reply.parentSeq=149));
test('12 parent not present in references held',()=>check(x=>x.reply.referencedSeqs=[131,148]));
test('13 repeated references held',()=>check(x=>x.reply.referencedSeqs=[129,129]));
test('14 unverified resident assertion held',()=>check(x=>x.member.assurance='HOST_AUTHENTICATED'));
test('15 no invitation held',()=>check(x=>x.member.consent='ASSUMED'));
test('16 unsupported source digest held',()=>check(x=>x.source.sourceDigest='x'));
test('17 missing source edition held',()=>check(x=>x.source.sourceEdition=''));
test('18 unknown corpus/other URL held',()=>check(x=>x.source.sourceUrl='file:///private/path'));
test('19 unsourced claimed tests held',()=>check(x=>x.evidence.testReceiptDigest=''));
test('20 test-count overclaim held',()=>check(x=>x.evidence.testsPassed=100));
test('21 asserted hosted verification held',()=>check(x=>x.evidence.hostVerified=true));
test('22 auto-ratification held',()=>check(x=>x.release.canonEffect='RATIFIED'));
test('23 permission grant held',()=>check(x=>x.release.permissionEffect='GRANT'));
test('24 fake completed turn held',()=>check(x=>x.claims.performedAgentVisits=1000));
test('25 pretend posted before broker acknowledgement held',()=>check(x=>x.claims.actuallyPosted=true));
test('26 source role must match original Sphere category',()=>check(x=>x.hsn.role='DOMAIN_SPECIALIZATION'));
test('27 method must have same-House domain subject',()=>check(x=>x.hsn.subject='H08.S03.N01'));
test('28 methods may not refer to another method subject',()=>check(x=>x.hsn.subject='H05.S12.N01'));
test('29 distinct valid domain node needs null subject',()=>{const x=template();x.hsn={node:'H05.S06.N12',role:'DOMAIN_SPECIALIZATION',subject:null,registryDigest:REGISTRY_SHA256,nodeRecordDigest:SHA};assert.equal(verify(x).status,'PREPARED_NOT_POSTED')});
test('30 old H00 namespace held',()=>check(x=>x.hsn.node='H00.S00.N00'));
test('31 altered registry digest held',()=>check(x=>x.hsn.registryDigest='f'.repeat(64)));
test('32 complete structural coordinate grammar unique 1728',()=>{
  const ids=readOnlyOntologyCoordinates();assert.equal(ids.length,1728);assert.equal(new Set(ids).size,1728);
  assert.equal(ids[0],'H01.S01.N01');assert.equal(ids.at(-1),'H12.S12.N12');
  const meta=ids.filter(s=>Number(s.slice(5,7))>=8);assert.equal(meta.length,720);
});
test('33 invalid plain object with inherited getters held',()=>check(x=>x.change=Object.create({falsifier:'X'})));
test('34 unsupported extra evidence key held',()=>check(x=>x.evidence.networkTraining=true));
test('35 status cannot be falsely elevated to hosted',()=>check(x=>x.release.status='HOST_VERIFIED'));
