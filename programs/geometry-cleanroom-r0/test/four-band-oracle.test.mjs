import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fourBandDenseOracle} from '../src/four-band-oracle.mjs';
const archival=JSON.parse(readFileSync(new URL('../evidence/peer_extreme_four_band_falsifier.json',import.meta.url),'utf8'));
function fixture(j,g){
 const score=new Array(1728).fill(-1000);score[0]=0;score[j]=-g;
 const values=Array.from({length:1728},(_,i)=>[i===j?1:0]);
 const bias=new Array(4).fill(-1000);bias[0]=-g;bias[j<12?1:j<144?2:3]=0;
 return {scores:score,values,bias,mask:new Array(1728).fill(true),target:0};
}
for(const row of archival.cases){test(`peer extreme #382/#385 j${row.j} gap${row.gap} dense reference`,()=>{
 const val=fourBandDenseOracle(fixture(row.j,row.gap));
 assert.equal(val.status,'NUMERIC_REFERENCE_ONLY');assert.ok(Math.abs(val.vector[0]-row.oracle)<1e-12);
 assert.ok(Math.abs(row.r03Original-row.oracle)>1e-4); // deliberately retain peer predecessor failure
 assert.ok(Math.abs(row.r42Independent-row.oracle)<1e-12);
 assert.equal(val.releaseAuthorized,false);
});}
test('peer #385 sphere subtraction case remains valid in stable dense oracle',()=>{
 const f=fixture(1,40);f.scores=new Array(1728).fill(-40);f.scores[0]=0;
 f.values=Array.from({length:1728},(_,i)=>[i>=1&&i<=11?1:0]);f.bias=[-100,0,-100,-100];
 const val=fourBandDenseOracle(f);assert.equal(val.status,'NUMERIC_REFERENCE_ONLY');assert.ok(Math.abs(val.vector[0]-1)<1e-9);
});
test('all denied arithmetic mask returns explicit EMPTY, never permission',()=>{
 const f=fixture(1,40);f.mask.fill(false);const val=fourBandDenseOracle(f);
 assert.equal(val.status,'EMPTY_NUMERIC_MASK');assert.deepEqual(val.vector,[0]);assert.equal(val.rightsChecked,false);
});
test('reject hostile root, Proxy, signed-inference flags and nonfinite tensor',()=>{
 const f=fixture(1,40);let calls=0;Object.defineProperty(f,'scores',{enumerable:true,get(){calls++;throw Error('accessor');}});
 assert.equal(fourBandDenseOracle(f).status,'HOLD_INVALID_NUMERIC_INPUT');assert.equal(calls,0);
 assert.equal(fourBandDenseOracle(new Proxy(fixture(1,40),{})).status,'HOLD_INVALID_NUMERIC_INPUT');
 assert.equal(fourBandDenseOracle({...fixture(1,40),inferenceUse:true}).status,'HOLD_INVALID_NUMERIC_INPUT');
 const g=fixture(1,40);g.scores[77]=Infinity;assert.equal(fourBandDenseOracle(g).status,'HOLD_INVALID_NUMERIC_INPUT');
});
test('per-target band grouping differs self/sphere/house/other without extra neural query',()=>{
 for(const j of [1,12,144]){const f=fixture(j,40);const val=fourBandDenseOracle(f);assert.ok(Math.abs(val.vector[0]-.5)<1e-12);assert.equal(val.modelUpdated,false);}
});
