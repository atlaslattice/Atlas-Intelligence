import {test} from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verifyNodeWaveDigest,prepareFourSystemCascade} from '../src/twelvefold-port.mjs';
// A publisher/researcher may supply a local authorized full-source compilation.
// Never embed private source into the public package or fetch it remotely.
const path=process.env.ATLAS_TWELVEFOLD_WAVE_JSONL;
test('independent Node hashes of 20,736 Python-compiled source packets', {skip: !path},()=>{
 const lines=readFileSync(path,'utf8').trim().split('\n');assert.equal(lines.length,20736);
 let count=0;
 for(const line of lines){
   const p=JSON.parse(line);const result=verifyNodeWaveDigest(p);
   assert.equal(result.status,'LOCAL_PACKET_HASH_REPRODUCED',`${p.wave}:${p.nodeId} ${result.reason||''}`);
   const cascade=prepareFourSystemCascade(p);
   assert.equal(cascade.status,'CANDIDATE_NOT_POSTED');assert.equal(cascade.hostedDeployment,'NOT_PERFORMED');
   count++;
 }
 assert.equal(count,20736);
});