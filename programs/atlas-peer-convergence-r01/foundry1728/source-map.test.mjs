import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hsnFromIndex,indexFromHsn,makeOriginalWorkMap,ARIADNE_SHA,EXPLORER_SHA} from './source-map.mjs';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
test('all 1728 original coordinates round-trip',()=>{
 const ids=new Set();
 for(let i=0;i<1728;i++){const id=hsnFromIndex(i);ids.add(id);assert.equal(indexFromHsn(id),i)}
 assert.equal(ids.size,1728);
});
test('H00 and malformed HSN held',()=>{
 for(const hsn of ['H00.S00.N00','H13.S01.N01','H01.S13.N01','H01.S01.N13','H1.S1.N1'])
  assert.throws(()=>indexFromHsn(hsn));
});
test('boolean and out-of-range ordinal held',()=>{
 for(const x of [true,false,-1,1728,1.5,NaN])assert.throws(()=>hsnFromIndex(x));
});
// The real source is private. Offline owners may set both variables to
// exact authorized local files; their absence is an explicit SKIP not PASS.
const ownerRegistry=process.env.ATLAS_R37_ORIGINAL_REGISTRY;
const ownerExplorer=process.env.ATLAS_R37_ORIGINAL_EXPLORER;
let source=null;
try{if(ownerRegistry&&ownerExplorer)source={registryBytes:readFileSync(ownerRegistry),explorerBytes:readFileSync(ownerExplorer)}}catch{}
test('owner source pin and all 1728 original Work jobs',{skip:!source},()=>{
 assert.equal(sha(source.registryBytes),ARIADNE_SHA);
 assert.equal(sha(source.explorerBytes),EXPLORER_SHA);
 const result=makeOriginalWorkMap(source);
 assert.equal(result.orders.length,1728);assert.equal(result.domainNodes,1008);
 assert.equal(result.methodNodes,720);assert.equal(result.orders[1727].id,'H12.S12.N12');
 assert.equal(result.semanticAccepted,false);assert.equal(result.releaseAuthorized,false);
});
test('altered registry bytes fail before parsing',{skip:!source},()=>{
 const changed=Buffer.from(source.registryBytes);changed[11]^=1;
 assert.throws(()=>makeOriginalWorkMap({...source,registryBytes:changed}),/ORIGINAL_SOURCE_PIN_MISMATCH/);
});
test('altered Explorer bytes fail before parsing',{skip:!source},()=>{
 const changed=Buffer.from(source.explorerBytes);changed[25]^=1;
 assert.throws(()=>makeOriginalWorkMap({...source,explorerBytes:changed}),/ORIGINAL_SOURCE_PIN_MISMATCH/);
});
test('exact original inputs never grant deployment',{skip:!source},()=>{
 const r=makeOriginalWorkMap(source);
 assert.equal(r.modelCalls,0);assert.equal(r.authorityEffect,'NONE');
 assert.ok(r.orders.every(x=>!x.hostedIntegrationVerified&&!x.sourceValidation?.releaseAuthorized));
});