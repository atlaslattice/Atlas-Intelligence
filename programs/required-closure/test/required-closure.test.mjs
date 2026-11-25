import test from 'node:test';
import assert from 'node:assert/strict';
import {sha256,MANIFEST_SCHEMA,reviewRequiredClosure,canonical} from '../required-closure.mjs';
const H=x=>x.toString(16).padStart(64,'0');
const FAMILIES=['components','dependencies','receipts','objections','uses'];
function fixture(house=1,purpose='CITATION') {
  const sourceSha=H(200+house),sourceEdition=`edition-H${String(house).padStart(2,'0')}`;
  const selection={requestSha256:H(house),resultSha256:H(100+house),modelSha256:H(300+house),
    runtimeSha256:H(400+house),sourceSha256:sourceSha,sourceEdition,deliveryPurpose:purpose};
  const selectionSha256=sha256(selection);
  const row=(id,state)=>({id,selectionSha256,state});
  const uses=(id,purpose,decision='ALLOW')=>({id,selectionSha256,purpose,decision,sourceSha256:sourceSha,sourceEdition});
  const observed={
    components:[row(`H${house}-c1`,'PASS')],
    dependencies:[row(`H${house}-d1`,'PASS')],
    receipts:[row(`H${house}-r1`,'PASS'),row(`H${house}-r2`,'PASS')],
    objections:[row(`H${house}-o1`,'RESOLVED')],
    uses:[uses(`H${house}-u1`,'INFERENCE'),uses(`H${house}-u2`,'DISCLOSURE')]
  };
  return repin({selection,observed});
}
function repin({selection,observed}){
  const required={}; for(const family of FAMILIES) required[family]=observed[family].map(row=>({id:row.id,sha256:sha256(row)}));
  const manifest={schema:MANIFEST_SCHEMA,selection,policySha256:H(600),required};
  const trustedAnchor={manifestSha256:sha256(manifest),selectionSha256:sha256(selection),policySha256:manifest.policySha256};
  return {manifest,observed,trustedAnchor};
}
function copy(x){return structuredClone(x);}
function status(x){return reviewRequiredClosure(x).status;}
function has(x,code){return reviewRequiredClosure(x).diagnostics.some(d=>d.code===code);}
for(let house=1;house<=12;house++){
  test(`H${house}: pinned nominal required closure is a metadata match (NOT release)`,()=>{
    const result=reviewRequiredClosure(fixture(house));
    assert.equal(result.status,'MATCHED_PINNED_METADATA');
    assert.equal(result.releaseAuthorized,false);
    assert.equal(result.requiredSetIndependentlyComplete,false);
    assert.equal(result.trainingEligible,false);
    assert.equal(result.authorityEffect,'NONE');
  });
}
// Twelve adversarial classes times twelve independently parameterized source editions:
// 144 genuinely executed fixture controls, not 144 semantic ontology acceptances.
const mutations=[
  {name:'omitted-required-component', run:f=>{f.observed.components=[];}},
  {name:'omitted-required-dependency', run:f=>{f.observed.dependencies=[];}},
  {name:'omitted-required-receipt', run:f=>{f.observed.receipts.pop();}},
  {name:'omitted-open-objection-record', run:f=>{f.observed.objections=[];}},
  {name:'omitted-required-right', run:f=>{f.observed.uses.pop();}},
  {name:'tampered-component-status',run:f=>{f.observed.components[0].state='FAIL';}},
  {name:'tampered-negative-receipt',run:f=>{f.observed.receipts[0].state='HOLD';}},
  {name:'wrong-source-edition',run:f=>{f.observed.uses[0].sourceEdition+='-changed';}},
  {name:'pinned-unresolved-objection',run:f=>{f.observed.objections[0].state='OPEN';Object.assign(f,repin({selection:f.manifest.selection,observed:f.observed}));}},
  {name:'pinned-denied-inference',run:f=>{f.observed.uses[0].decision='DENY';Object.assign(f,repin({selection:f.manifest.selection,observed:f.observed}));}},
  {name:'caller-reduced-required-set',run:f=>{f.manifest.required.receipts.pop();}},
  {name:'undeclared-extra-negative',run:f=>{f.observed.receipts.push({id:'unauthorized-negative',selectionSha256:sha256(f.manifest.selection),state:'FAIL'});}}
];
for(let house=1;house<=12;house++)for(const {name,run} of mutations){
  test(`H${house}: ${name} fails closed`,()=>{const f=copy(fixture(house));run(f);assert.equal(status(f),'HOLD_METADATA');});
}
test('untrusted policy epoch held, even with same data',()=>{
  const f=fixture();f.trustedAnchor.policySha256=H(999);
  assert.ok(has(f,'INVALID_OR_UNTRUSTED_INPUT'));
});
test('source/request revision cannot be silently replaced',()=>{
  const f=fixture();f.manifest.selection.requestSha256=H(777);
  assert.equal(status(f),'HOLD_METADATA');
});
test('no inference purpose from inspection-only permissions',()=>{
  const f=fixture();f.observed.uses=[{...f.observed.uses[0],purpose:'INSPECTION'}];
  const g=repin({selection:f.manifest.selection,observed:f.observed}); assert.ok(has(g,'INFERENCE_USE_MISSING'));
});
test('inference-only purpose does not require disclosure',()=>{
  const f=fixture(1,'INFERENCE');f.observed.uses=[f.observed.uses[0]];
  assert.equal(status(repin({selection:f.manifest.selection,observed:f.observed})),'MATCHED_PINNED_METADATA');
});
test('citations require explicit disclosure, not inference alone',()=>{
  const f=fixture();f.observed.uses=[f.observed.uses[0]];
  assert.ok(has(repin({selection:f.manifest.selection,observed:f.observed}),'DISCLOSURE_USE_MISSING'));
});
test('training stays held even if a training purpose is granted',()=>{
  const f=fixture(1,'TRAINING');f.observed.uses.push({...f.observed.uses[0],id:'train-use',purpose:'TRAINING'});
  assert.ok(has(repin({selection:f.manifest.selection,observed:f.observed}),'TRAINING_OUT_OF_SCOPE'));
});
test('revoked right independently pinned still holds',()=>{
  const f=fixture();f.observed.uses[1].decision='REVOKED';
  assert.ok(has(repin({selection:f.manifest.selection,observed:f.observed}),'RIGHTS_NOT_ALLOWED'));
});
test('historical negative cannot be hidden from required receipt list',()=>{
  const f=fixture(); f.observed.receipts[1].state='FAIL'; const pinned=repin({selection:f.manifest.selection,observed:f.observed});
  assert.equal(status(pinned),'HOLD_METADATA');
  pinned.observed.receipts.pop();
  assert.ok(has(pinned,'MISSING_REQUIRED'));
});
test('same text with a different edition changes selection digest',()=>{
  const f=fixture();const original=sha256(f.manifest.selection);f.manifest.selection.sourceEdition+='-v2';
  assert.notEqual(sha256(f.manifest.selection),original); assert.equal(status(f),'HOLD_METADATA');
});
test('unknown record field or sparse array is not accepted',()=>{
  const f=fixture();f.observed.components[0].identityClaim='human';assert.equal(status(f),'HOLD_METADATA');
  const g=fixture();g.observed.components=new Array(1);assert.ok(has(g,'INVALID_OR_UNTRUSTED_INPUT'));
});
test('getter, Proxy, cycles, non-finite number are rejected',()=>{
  const a=fixture();Object.defineProperty(a.observed.components[0],'state',{get(){throw Error('getter called')},enumerable:true});
  assert.ok(has(a,'INVALID_OR_UNTRUSTED_INPUT'));
  const b=fixture();b.observed.receipts=new Proxy(b.observed.receipts,{});assert.ok(has(b,'INVALID_OR_UNTRUSTED_INPUT'));
  const c=fixture();c.observed.components[0].cycle=c.observed.components[0];assert.ok(has(c,'INVALID_OR_UNTRUSTED_INPUT'));
  const d=fixture();d.observed.receipts[0].n=Infinity;assert.ok(has(d,'INVALID_OR_UNTRUSTED_INPUT'));
});
test('canonical order-independent with no precision/NaN loophole',()=>{
  assert.equal(sha256({a:1,b:{x:2,y:3}}),sha256({b:{y:3,x:2},a:1}));
  assert.throws(()=>canonical({x:NaN}));
  assert.throws(()=>canonical({x:0.123456789}));
});
test('witness that independently trusted required closure is essential',()=>{
  const f=fixture();f.manifest.required.objections=[];
  assert.equal(status(f),'HOLD_METADATA');
  // If the caller is allowed to forge its own new anchor, software can only
  // check internal consistency; this MUST NOT be used as host authorization.
  const counterfeit={...f,trustedAnchor:{...f.trustedAnchor,manifestSha256:sha256(f.manifest)}};
  assert.equal(status(counterfeit),'HOLD_METADATA'); // undeclared objection still present
  counterfeit.observed.objections=[];
  assert.equal(status(counterfeit),'MATCHED_PINNED_METADATA');
  assert.equal(reviewRequiredClosure(counterfeit).requiredSetIndependentlyComplete,false);
  assert.equal(reviewRequiredClosure(counterfeit).releaseAuthorized,false);
});
