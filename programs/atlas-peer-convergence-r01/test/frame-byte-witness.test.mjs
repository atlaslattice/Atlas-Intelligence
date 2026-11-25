import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {HSN,ARIADNE_SHA256} from '../../atlas-geometry-one-r38/src/addresses.mjs';
import {inspectBinaryFrame,guardPointerIncarnations,ORDERED_HSN_DIGEST} from '../src/frame-byte-witness.mjs';
import {createPointerCompanion} from '../src/pointer-companion.mjs';
const sha=x=>createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const vals=()=>{const x=Array.from({length:1728},(_,i)=>1728-i);x[1700]=0;return x};
const embedding=()=>Array.from({length:384},(_,i)=>i/384);
const bind=()=>({requestId:'r03',querySha256:'a'.repeat(64),sourceId:'src1',sourceSha256:'b'.repeat(64),
 sourceEdition:'evidence-synthetic-v1',modelSha256:'c'.repeat(64),headSha256:'e'.repeat(64),
 issuer:'issued-stub',tenant:'owner',principal:'tester',rightsEpoch:'epoch1',requiredSetSha256:'d'.repeat(64),
 scope:'WORK',purpose:'WORK_INSPECTION',scoreEncoding:'f64le',embeddingEncoding:'f64le'});
const root=(b=bind(),scores=vals(),k=10)=>({schema:'atlas.geometry-one.root/v1',status:'INSPECTION_CANDIDATE_ONLY',
  sourceScope:'WORK',canDeploy:false,releaseAuthorized:false,tenant:b.tenant,rightsEpoch:b.rightsEpoch,
  sourcePins:{registrySha256:ARIADNE_SHA256,modelSha256:b.modelSha256,sourceSha256:b.sourceSha256},
  lineage:{sourceEdition:b.sourceEdition,issuerClaim:b.issuer},topology:[12,12,12],
  frameDigest:sha({requestId:b.requestId,modelSha256:b.modelSha256,sourceSha256:b.sourceSha256,querySha256:b.querySha256,scores}),
  baseline:{hits:Array.from({length:1728},(_,i)=>i).sort((a,z)=>scores[z]-scores[a]||a-z).slice(0,k).map(i=>({index:i,hsn:HSN[i],score:scores[i]}))}});
const call=(o={})=>{const b=bind(),s=vals(),e=embedding();return inspectBinaryFrame({root:root(b,s),binding:b,scores:s,embedding:e,...o})};
const positive=()=>{const r=call();assert.equal(r.status,'LOCAL_MATCHED_FRAME_CUSTODY_ONLY',r.reason);return r};
test('one original 12x12x12 address set stays intact',()=>assert.equal(HSN.length,1728));
test('original HSN digest stays stable independently of display aliases',()=>assert.match(ORDERED_HSN_DIGEST,/^[0-9a-f]{64}$/));
test('one frame produces a local binary witness only',()=>{const a=positive();assert.equal(a.scoreCount,1728);assert.equal(a.embeddingDimensions,384);assert.equal(a.releaseAuthorized,false)});
test('one witness adds zero neural or network calls',()=>assert.equal(positive().modelCallsAdded,0));
test('head digest is part of scope',()=>{const a=positive(),b=call({binding:{...bind(),headSha256:'f'.repeat(64)}});assert.notEqual(a.fullFrameSha256,b.fullFrameSha256)});
test('different principal has distinct frame scope but same underlying score SHA',()=>{const a=positive(),b=call({binding:{...bind(),principal:'p2'}});assert.equal(a.scoreSha256,b.scoreSha256);assert.notEqual(a.fullFrameSha256,b.fullFrameSha256)});
test('embedding changed at hidden dimension changes frame proof',()=>{const e=embedding();e[383]+=0.0005;const b=call({embedding:e});assert.notEqual(positive().fullFrameSha256,b.fullFrameSha256)});
test('score change outside top-k holds even though top-k identical',()=>{const s=vals();s[1700]=-2;assert.equal(call({scores:s}).status,'HOLD')});
test('signed zero inside hidden score passes old JSON but changes new binary proof',()=>{const s=vals();s[1700]=-0;const b=call({scores:s});assert.equal(b.status,'LOCAL_MATCHED_FRAME_CUSTODY_ONLY');assert.equal(b.legacyJsonFrameDigest,positive().legacyJsonFrameDigest);assert.notEqual(b.scoreSha256,positive().scoreSha256)});
test('pinned expected byte digest blocks hidden signed zero',()=>{const s=vals();s[1700]=-0;assert.equal(call({scores:s,expectedFullFrameSha256:positive().fullFrameSha256}).status,'HOLD')});
test('changed source edition held',()=>{assert.equal(call({binding:{...bind(),sourceEdition:'changed'}}).status,'HOLD')});
test('source SHA drift held',()=>{assert.equal(call({binding:{...bind(),sourceSha256:'a'.repeat(64)}}).status,'HOLD')});
test('model SHA drift held',()=>{assert.equal(call({binding:{...bind(),modelSha256:'a'.repeat(64)}}).status,'HOLD')});
test('unapproved nonwork scope held',()=>{assert.equal(call({binding:{...bind(),scope:'PLAY'}}).status,'HOLD')});
test('wrong ontology SHA held',()=>{const r=root();r.sourcePins.registrySha256='a'.repeat(64);assert.equal(call({root:r}).status,'HOLD')});
test('wrong rights epoch held',()=>{const r=root();r.rightsEpoch='other';assert.equal(call({root:r}).status,'HOLD')});
test('foreign head source model remains source-only without authority',()=>{const r=positive();assert.equal(r.selectedHostVerified,false);assert.equal(r.requiredSetIndependentlyComplete,false)});
test('sparse score array held without getter execution',()=>{const s=vals();delete s[10];assert.equal(call({scores:s}).status,'HOLD')});
test('nonfinite hidden score held',()=>{const s=vals();s[1700]=Infinity;assert.equal(call({scores:s}).status,'HOLD')});
test('non-number scalar held',()=>{const s=vals();s[1700]=true;assert.equal(call({scores:s}).status,'HOLD')});
test('extra field in binding held',()=>{assert.equal(call({binding:{...bind(),isAdmin:true}}).status,'HOLD')});
test('binding getter never called',()=>{let touches=0;const b=bind();Object.defineProperty(b,'tenant',{enumerable:true,get(){touches++;throw Error('BAD')}});assert.equal(call({binding:b}).status,'HOLD');assert.equal(touches,0)});
test('root Proxy never released',()=>{assert.equal(call({root:new Proxy(root(),{})}).status,'HOLD')});
test('score Proxy never released',()=>{assert.equal(call({scores:new Proxy(vals(),{})}).status,'HOLD')});
test('f32 only accepts exactly representable values',()=>{assert.equal(call({binding:{...bind(),scoreEncoding:'f32le'}}).status,'LOCAL_MATCHED_FRAME_CUSTODY_ONLY');const s=vals();s[1700]=0.1;assert.equal(call({binding:{...bind(),scoreEncoding:'f32le'},scores:s}).status,'HOLD')});
test('embedding float32 only accepts exactly representable values',()=>{assert.equal(call({binding:{...bind(),embeddingEncoding:'f32le'}}).status,'HOLD');const e=embedding().map(Math.fround);const r=call({embedding:e,binding:{...bind(),embeddingEncoding:'f32le'}});assert.equal(r.status,'LOCAL_MATCHED_FRAME_CUSTODY_ONLY')});
test('subnormal f64 stays distinct',()=>{const s=vals();s[1700]=Number.MIN_VALUE;const r=call({scores:s});assert.equal(r.status,'HOLD');const alt=root(bind(),s);const good=call({root:alt,scores:s});assert.equal(good.status,'LOCAL_MATCHED_FRAME_CUSTODY_ONLY')});
test('head source is not itself an issuer signature',()=>assert.equal(positive().selectedHostVerified,false));
test('primary identity remains HSN, never a bare Yijing/GF7 label',()=>{const r=positive();assert.equal(r.primaryIdentity,'ORIGINAL_ARIADNE_HSN');assert.equal(r.symbolicEditionRequired,true)});
test('expected correct digest independently checkable',()=>{const a=positive();assert.equal(call({expectedFullFrameSha256:a.fullFrameSha256}).status,'LOCAL_MATCHED_FRAME_CUSTODY_ONLY')});
const ev=(sequence,action='UPSERT',prev=null,extra={})=>({eventId:'event'+sequence,sequence,action,pointerId:'ptr1',sourceId:'src1',familyId:'family1',sourceEdition:'v1',sourceSha256:'1'.repeat(64),rightsEpochSha256:'3'.repeat(64),hsn:'H01.S01.N01',locatorKind:'PUBLIC_METADATA',locatorRef:'logical1',priorSourceSha256:prev,...extra});
test('pointer guard allows idempotent exact replay',()=>{const j=guardPointerIncarnations(createPointerCompanion());j.append(ev(1));assert.equal(j.append(ev(1)).status,'NO_CHANGE_EXACT_REPLAY')});
test('pointer withdrawal tombstones same logical pointer forever in this journal',()=>{const j=guardPointerIncarnations(createPointerCompanion());j.append(ev(1));j.append(ev(2,'WITHDRAW','1'.repeat(64)));assert.equal(j.tombstoneCount(),1);assert.throws(()=>j.append(ev(3)),/WITHDRAWN_POINTER_ID_REUSE/)});
test('new logical ID after withdrawal may be recorded',()=>{const j=guardPointerIncarnations(createPointerCompanion());j.append(ev(1));j.append(ev(2,'WITHDRAW','1'.repeat(64)));assert.equal(j.append(ev(3,'UPSERT',null,{pointerId:'ptr2'})).status,'LOCAL_METADATA_COMMITTED')});
test('changed bytes under same event ID held',()=>{const j=guardPointerIncarnations(createPointerCompanion());j.append(ev(1));assert.throws(()=>j.append(ev(1,'UPSERT',null,{locatorRef:'different'})),/EVENT_COLLISION/)});
test('pointer root with getter refuses without invoking it',()=>{let n=0;const x=ev(1);Object.defineProperty(x,'sourceId',{enumerable:true,get(){n++;throw Error('HACK')}});const j=guardPointerIncarnations(createPointerCompanion());assert.throws(()=>j.append(x));assert.equal(n,0)});
test('malicious toJSON object cannot execute in event digest',()=>{let n=0;const x=ev(1);x.locatorRef={toJSON(){n++;return 'evil'}};const j=guardPointerIncarnations(createPointerCompanion());assert.throws(()=>j.append(x),/UNTRUSTED_EVENT_FIELDS/);assert.equal(n,0)});
test('preserved prior pointer release still local mock only',async()=>{const j=guardPointerIncarnations(createPointerCompanion());j.append(ev(1));const root={status:'INSPECTION_CANDIDATE_ONLY',frameDigest:'f'.repeat(64),sourcePins:{registrySha256:ARIADNE_SHA256,sourceSha256:'1'.repeat(64),modelSha256:'2'.repeat(64)}};const review={status:'LOCAL_PEER_CONVERGENCE_REVIEW_ONLY',frameDigest:root.frameDigest,sourceSha256:'1'.repeat(64),modelSha256:'2'.repeat(64),originalCandidateHsn:['H01.S01.N01']};const p=j.prepare({root,review,authorize:async()=>true});const result=await p.release();assert.equal(result.status,'LOCAL_POINTERS_ONLY');assert.equal(result.hostRightsVerified,false)});
