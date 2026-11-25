/** Full peer-source integration test. Requires the exact three PR directories.
 * Not credited as passing until executed against the checked-out branch. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createGeometryOne} from '../../atlas-geometry-one-r38/src/fabric.mjs';
import {ARIADNE_SHA256} from '../../atlas-geometry-one-r38/src/addresses.mjs';
import {sha256, MANIFEST_SCHEMA} from '../../required-closure/required-closure.mjs';
import {inspectWithRealPeers} from '../src/connect-real-peers.mjs';
const q='1'.repeat(64),source='2'.repeat(64),model='3'.repeat(64),runtime='4'.repeat(64),policy='5'.repeat(64),result='6'.repeat(64);
const raw=Array.from({length:1728},(_,i)=>1728-i);
const request={requestId:'demo1',tenant:'t1',logicalTarget:'one-neural-result',contractVersion:'1',querySha256:q,sourceId:'original1',sourceSha256:source,sourceEdition:'v1',modelSha256:model,registrySha256:ARIADNE_SHA256,scope:'WORK',purpose:'INFERENCE',subject:'original source context'};
function anchoredClosure(objection='RESOLVED'){
 const selection={requestSha256:q,resultSha256:result,modelSha256:model,runtimeSha256:runtime,sourceSha256:source,sourceEdition:'v1',deliveryPurpose:'INFERENCE'}, selectionSha=sha256(selection);
 const component={id:'component1',selectionSha256:selectionSha,state:'PASS'};
 const obj={id:'objection1',selectionSha256:selectionSha,state:objection};
 const use={id:'use1',selectionSha256:selectionSha,purpose:'INFERENCE',decision:'ALLOW',sourceSha256:source,sourceEdition:'v1'};
 const observed={components:[component],dependencies:[],receipts:[],objections:[obj],uses:[use]};
 const required=Object.fromEntries(Object.entries(observed).map(([k,values])=>[k,values.map(v=>({id:v.id,sha256:sha256(v)}))]));
 const manifest={schema:MANIFEST_SCHEMA,selection,policySha256:policy,required};
 return {trustedAnchor:{manifestSha256:sha256(manifest),selectionSha256:selectionSha,policySha256:policy},manifest,observed};
}
async function fixture(){
 const sys=createGeometryOne({gateway: async()=>({schema:'atlas.geometry-one.issued/v1',requestId:request.requestId,querySha256:q,sourceId:'original1',sourceSha256:source,sourceEdition:'v1',modelSha256:model,registrySha256:ARIADNE_SHA256,method:'NEURAL_ONLY',fallbackUsed:false,issuer:'local-synthetic',scores:raw.slice()}),rights:async()=>({allow:true,epoch:'synthetic-epoch'}),requiredClosure:async()=>({status:'PINNED_COMPLETE_FOR_REVIEW',releaseAuthorized:false,authorityEffect:'NONE'})});
 const root=await sys.inspect(request,{k:10,alpha:0});
 assert.equal(root.status,'INSPECTION_CANDIDATE_ONLY');
 return {root,rawScores:raw.slice(),candidateScores:raw.slice(),queryBinding:{requestId:request.requestId,querySha256:q,modelSha256:model,sourceSha256:source},closureInput:anchoredClosure(),errorBound:0,topK:10};
}
test('full literal peer modules produce one-frame review only',async()=>{
 const result=inspectWithRealPeers(await fixture());
 assert.equal(result.status,'LOCAL_PEER_CONVERGENCE_REVIEW_ONLY');
 assert.equal(result.originalCandidateCount,10);
 assert.equal(result.modelCalls,0);
 assert.equal(result.releaseAuthorized,false);
 assert.equal(result.requiredSetIndependentlyComplete,false);
});
test('open required objection prevents review',async()=>{
 const value=await fixture();value.closureInput=anchoredClosure('OPEN');
 assert.equal(inspectWithRealPeers(value).status,'HOLD');
});
test('changed candidate ranking cannot be promoted',async()=>{
 const value=await fixture();value.candidateScores[0]=-1;
 assert.equal(inspectWithRealPeers(value).status,'HOLD');
});
test('rebound issuer/source tuple cannot match frame',async()=>{
 const value=await fixture();value.queryBinding.sourceSha256=q;
 assert.equal(inspectWithRealPeers(value).status,'HOLD');
});
