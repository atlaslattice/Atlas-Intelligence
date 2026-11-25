import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createWorkLearningGateway,authorizedResultMetadata} from '../src/index.mjs';

const hash=s=>createHash('sha256').update(s).digest('hex');
const registryPin='07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6';
const pins={workspaceId:'synthetic-learned-node',registrySha256:registryPin,
  configSha256:'a'.repeat(64),corpusSha256:'b'.repeat(64),checkpointSha256:'c'.repeat(64)};
const originalRegistry={id:'ariadne:v0.7',version:'v0.7',sha256:registryPin,uri:'urn:fixture:original-registry'};
const unquotedCheckpointSource={id:'training-source-B',version:'1',sha256:hash('B source'),uri:'urn:fixture:training-B'};
const nodeArgs={hsn:'H05.S06.N12'};
const response=()=>({hsn:nodeArgs.hsn,learned_state_sha256:pins.checkpointSha256,
  representation:[.125,.5,-.25],representationStatus:'SYNTHETIC_LEARNED_STATE_NOT_SOURCE_DEFINITION',
  provenance:{...pins,sourceRefs:[{...originalRegistry}],itemRefs:[]}});

function create(t,{beforeUse=()=>true,afterUse=()=>true,disclose=()=>true,release=()=>true}={}){
 let calls=0;const checks=[];
 const gateway=createWorkLearningGateway({owner:'test-owner',workspaceId:pins.workspaceId,
  sourceManifest:{sources:[originalRegistry,unquotedCheckpointSource]},
  verifyPins:async()=>({...pins}),purposePolicy:'STRICT_SOURCE_ONLY',
  backend:{execute:async(op,args)=>{calls++;assert.equal(op,'node');assert.deepEqual(args,nodeArgs);return response();}},
  authorize:c=>{checks.push(['DISCLOSURE',c.action,c.kind,c.ref?.id??null]);return disclose(c);},
  authorizeInferenceUse:c=>{checks.push(['USE',c.phase,c.kind,c.ref.id]);return (c.phase==='BEFORE_COMPUTE'?beforeUse:afterUse)(c);},
  hostOwnedFinalReturnSync:c=>{checks.push(['FINAL','RETURN',c.operation,null]);return release(c);}});
 t.after(()=>gateway.close());return {gateway,calls:()=>calls,checks};
}

test('learned node checks every admitted possible model dependency before and after computation',async t=>{
 const f=create(t);const out=await f.gateway.node(nodeArgs);
 assert.deepEqual(out,response());assert.equal(authorizedResultMetadata(out).purposePolicy,'STRICT_SOURCE_ONLY');
 assert.equal(f.calls(),1);
 assert.deepEqual(f.checks.filter(x=>x[0]==='USE').map(x=>x[1]+':'+x[3]),[
  'BEFORE_COMPUTE:ariadne:v0.7','BEFORE_COMPUTE:training-source-B',
  'AFTER_COMPUTE:ariadne:v0.7','AFTER_COMPUTE:training-source-B']);
 assert.deepEqual(f.checks.filter(x=>x[0]==='DISCLOSURE'&&x[1]==='RETURN'&&x[2]==='SOURCE').map(x=>x[3]),['ariadne:v0.7']);
});

test('learned node does not execute when an off-result dependency lacks inference-use',async t=>{
 const f=create(t,{beforeUse:c=>c.ref.id!==unquotedCheckpointSource.id});
 await assert.rejects(f.gateway.node(nodeArgs),e=>e.code==='INFERENCE_USE_DENIED');
 assert.equal(f.calls(),0);
});

test('learned node refuses result when off-result USE is revoked during backend despite RETURN permission',async t=>{
 const f=create(t,{afterUse:c=>c.ref.id!==unquotedCheckpointSource.id});
 await assert.rejects(f.gateway.node(nodeArgs),e=>e.code==='INFERENCE_USE_DENIED');
 assert.equal(f.calls(),1);
 assert.equal(f.checks.filter(x=>x[0]==='FINAL').length,0);
});

test('learned node may pass when off-result dependency USE allowed but uncited disclosure denied',async t=>{
 const f=create(t,{disclose:c=>!(c.action==='RETURN'&&c.kind==='SOURCE'&&c.ref?.id===unquotedCheckpointSource.id)});
 const out=await f.gateway.node(nodeArgs);
 assert.deepEqual(out.response??out.representation,response().representation);
 assert.ok(!f.checks.some(x=>x[0]==='DISCLOSURE'&&x[1]==='RETURN'&&x[3]===unquotedCheckpointSource.id));
});
