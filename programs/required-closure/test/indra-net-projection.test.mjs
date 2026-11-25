import test from 'node:test';
import assert from 'node:assert/strict';
import {projectIndraNet,INDRA_SCHEMA} from '../indra-net-projection.mjs';
import {sha256,MANIFEST_SCHEMA} from '../required-closure.mjs';
const H=n=>n.toString(16).padStart(64,'0');
const copy=x=>structuredClone(x);
const hsn=(h,s,n)=>`H${String(h).padStart(2,'0')}.S${String(s).padStart(2,'0')}.N${String(n).padStart(2,'0')}`;
const KINDS=['NEURAL_VIEW','NEURAL_VIEW','GRAPH_VIEW','META_VIEW'];
const IDS=['atlasOne','swarmchat','graphFabric','meta145'];
function fixture(house=1){
  const source={schema:'atlas.indra-net.prepared-source/v1',scope:'WORK',operation:'search',primaryMethod:'neural',fallbackUsed:false,
    requestSha256:H(house),resultSha256:H(100+house),issuerSha256:H(150+house),modelSha256:H(200+house),
    runtimeSha256:H(300+house),sourceSha256:H(400+house),sourceEdition:`atlas-source-H${house}`,
    rightsEpochSha256:H(500+house),deliveryPurpose:'CITATION',hsns:[hsn(house,1,1),hsn(house,1,2)]};
  const consumers=IDS.map((id,i)=>({schema:'atlas.indra-net.consumer-receipt/v1',id,kind:KINDS[i],
    observation:'SYNTHETIC_FIXTURE',scope:'WORK',requestSha256:source.requestSha256,
    resultSha256:source.resultSha256,issuerSha256:source.issuerSha256,modelSha256:source.modelSha256,
    runtimeSha256:source.runtimeSha256,sourceSha256:source.sourceSha256,sourceEdition:source.sourceEdition,
    rightsEpochSha256:source.rightsEpochSha256,hsns:[source.hsns[i%2]]}));
  const selection={requestSha256:source.requestSha256,resultSha256:source.resultSha256,
    modelSha256:source.modelSha256,runtimeSha256:source.runtimeSha256,sourceSha256:source.sourceSha256,
    sourceEdition:source.sourceEdition,deliveryPurpose:source.deliveryPurpose};
  const selSha=sha256(selection);
  const rows=(ids,state)=>ids.map(id=>({id,selectionSha256:selSha,state}));
  const rights=(id,purpose)=>({id,selectionSha256:selSha,purpose,decision:'ALLOW',
    sourceSha256:source.sourceSha256,sourceEdition:source.sourceEdition});
  const observed={components:rows(IDS,'PASS'),dependencies:rows(['dep-1'],'PASS'),receipts:rows(['pass','negative-control-cleared'],'PASS'),
    objections:rows(['original-dissent-resolved'],'RESOLVED'),uses:[rights('use-inference','INFERENCE'),rights('use-disclosure','DISCLOSURE')]};
  const required={};
  for(const family of ['components','dependencies','receipts','objections','uses'])required[family]=observed[family].map(x=>({id:x.id,sha256:sha256(x)}));
  const manifest={schema:MANIFEST_SCHEMA,selection,policySha256:H(800+house),required};
  const trustedAnchor={manifestSha256:sha256(manifest),selectionSha256:selSha,policySha256:manifest.policySha256};
  return {source,consumers,closure:{manifest,observed,trustedAnchor}};
}
const status=x=>projectIndraNet(x).status;
const held=(x,label)=>assert.equal(status(x),'HOLD_CONTEXT',label);
for(let h=1;h<=12;h++){
  test(`House ${h} input projection keeps original addressed identity and authority NONE`,()=>{
    const r=projectIndraNet(fixture(h));assert.equal(r.status,'CONSISTENT_METADATA_ONLY');
    assert.equal(r.schema,INDRA_SCHEMA);assert.equal(r.consumerCount,4);assert.equal(r.addressedNodeCount,2);
    assert.equal(r.projectedEdgeCount,4);assert.ok(r.edges.every(e=>e.relation==='CLAIMS_CONSUMPTION_OF_SHARED_RESULT'));
    for(const key of ['releaseAuthorized','trainingEligible','modelUpdated','hostedExecutionVerified','gatewayBrandVerified',
      'observationIndependentlyVerified','crossHostParityVerified','semanticAcceptance','fullCorpusIndexed',
      'sourceRightsAttested','requiredSetIndependentlyComplete','newRetriever','newComposer'])assert.equal(r[key],false);
    assert.equal(r.authorityEffect,'NONE');
  });
}
const mutations=[
  ['request identity',f=>f.consumers[1].requestSha256=H(900)],
  ['result identity',f=>f.consumers[1].resultSha256=H(901)],
  ['issuer identity',f=>f.consumers[1].issuerSha256=H(902)],
  ['model identity',f=>f.consumers[1].modelSha256=H(903)],
  ['runtime identity',f=>f.consumers[1].runtimeSha256=H(904)],
  ['source identity',f=>f.consumers[1].sourceSha256=H(905)],
  ['same text different source edition',f=>f.consumers[1].sourceEdition+='-v2'],
  ['rights-epoch identity',f=>f.consumers[1].rightsEpochSha256=H(906)],
  ['non-neural fallback',f=>f.source.fallbackUsed=true],
  ['private Play leakage',f=>f.consumers[1].scope='PLAY'],
  ['unissued address',f=>f.consumers[1].hsns=[hsn(12,12,12)]],
  ['missing required adverse evidence',f=>f.closure.observed.receipts.pop()],
];
for(let h=1;h<=12;h++)for(const [label,mutate] of mutations){
  test(`H${h}: ${label} holds without new retrieval or authority`,()=>{const f=fixture(h);mutate(f);held(f,label)});
}
test('all 1728 canonical identities are accepted as addresses, not semantic claims',()=>{
  const f=fixture();f.source.hsns=[];
  for(let h=1;h<=12;h++)for(let s=1;s<=12;s++)for(let n=1;n<=12;n++)f.source.hsns.push(hsn(h,s,n));
  const r=projectIndraNet(f);assert.equal(r.status,'CONSISTENT_METADATA_ONLY');
  assert.equal(r.addressedNodeCount,1728);assert.equal(r.projectedEdgeCount,4);
});
test('metadata-only review cannot be turned into a training authorization',()=>{
  const f=fixture();f.source.deliveryPurpose='TRAINING';f.closure.manifest.selection.deliveryPurpose='TRAINING';
  held(f);
});
test('unresolved objection retains its original negative disposition',()=>{
  const f=fixture();f.closure.observed.objections[0].state='OPEN';held(f);
});
test('missing consumer does not silently pass a pinned required set',()=>{
  const f=fixture();f.consumers.pop();
  // Explicit manifest required rows still include the missing client; adapter
  // itself additionally requires matching IDs, see next regression.
  const result=projectIndraNet(f);assert.equal(result.status,'HOLD_CONTEXT');
});
test('caller-supplied forged manifest never becomes independently complete or release-authorized',()=>{
  const f=fixture();const c=projectIndraNet(f);assert.equal(c.status,'CONSISTENT_METADATA_ONLY');
  assert.equal(c.requiredSetIndependentlyComplete,false);assert.equal(c.releaseAuthorized,false);
});
test('a reused public coordinate without matching source epoch holds',()=>{
  const f=fixture();f.source.rightsEpochSha256=H(999);held(f);
});
test('duplicate consumer IDs fail rather than imply two independent reviews',()=>{
  const f=fixture();f.consumers.push(copy(f.consumers[0]));held(f);
});
test('unrecognized HSN is never silently renumbered',()=>{
  const f=fixture();f.source.hsns.push('H13.S01.N01');held(f);
});
test('unknown source data and private excerpts cannot be projected into Work',()=>{
  const f=fixture();f.source.excerpt='private Palace content';held(f);
});
test('root getters, Proxy, null and nonfinite source data hold without running code',()=>{
  let invoked=0;const a=fixture();Object.defineProperty(a,'source',{enumerable:true,get(){invoked++;throw Error('injected')}});
  held(a);assert.equal(invoked,0);
  const b=new Proxy(fixture(),{get(t,k){invoked++;return Reflect.get(t,k)}});held(b);assert.equal(invoked,0);
  held(null);const c=fixture();c.source.modelSha256=NaN;held(c);
});
test('immutable projected edges cannot be repurposed as canon writes',()=>{
  const r=projectIndraNet(fixture());assert.equal(r.status,'CONSISTENT_METADATA_ONLY');
  assert.throws(()=>{r.edges[0].relation='CANON_APPROVED'},TypeError);
});
test('one receiver can be proposed without impersonating a participating resident',()=>{
  const f=fixture();f.consumers[1].observation='PROPOSED_NOT_EXECUTED';const r=projectIndraNet(f);
  assert.equal(r.status,'CONSISTENT_METADATA_ONLY');assert.equal(r.consumers[1].reportedObservation,'PROPOSED_NOT_EXECUTED');
  assert.equal(r.hostedExecutionVerified,false);
});
