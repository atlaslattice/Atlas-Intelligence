import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createPythonBackend,createWorkLearningGateway,createFilePinVerifier,toMeta145Evidence,
  toGraphFabricPart,authorizedResultMetadata} from '../src/index.mjs';

const path=process.env.ATLAS_SYNTHETIC_MCP_CONFIG;
test('source-only strict-purpose gateway through real Python neural Work Learning bridge',
 {skip:!path?'only runnable with separately authorized synthetic MCP fixture':false},async t=>{
  const config=JSON.parse(await readFile(path,'utf8'));
  assert.equal(config.schema,'atlas.work-learning.local-mcp-config/v1');
  assert.ok(config.sourceManifest.items.length>0); // independent canonical item manifest
  const backend=createPythonBackend({workspace:config.workspace,moduleRoot:config.moduleRoot,
    pythonExecutable:config.pythonExecutable,expectedConfigSha256:config.expectedConfigSha256});
  const verifyPins=createFilePinVerifier({files:config.pins.files,identity:config.pins.identity});
  const log=[];
  const gateway=createWorkLearningGateway({backend,owner:config.owner,workspaceId:config.workspaceId,
    sourceManifest:config.sourceManifest,verifyPins,purposePolicy:'STRICT_SOURCE_ONLY',
    authorize:check=>{log.push(`${check.action}:${check.kind}`);return true;},
    authorizeInferenceUse:check=>{assert.equal(check.purpose,'INFERENCE_USE');log.push(check.phase);return true;},
    hostOwnedFinalReturnSync:check=>{log.push('FINAL_SYNTHETIC');return check.sourceRefs.every(r=>typeof r.sha256==='string') && check.pinIdentity.configSha256===config.expectedConfigSha256;}});
  t.after(()=>gateway.close());
  const status=await gateway.status({});
  assert.equal(status.provenance.registrySha256,config.pins.identity.registrySha256);
  const node=await gateway.node({hsn:'H05.S06.N12'});
  assert.equal(node.hsn??node.source?.hsn??node.result?.hsn,'H05.S06.N12');
  const searched=await gateway.search({query:'water and source sustainability',limit:5,target:'corpus'});
  assert.equal(searched.target,'corpus');
  assert.equal(searched.primaryMethod,'neural');
  assert.equal(authorizedResultMetadata(searched).purposePolicy,'STRICT_SOURCE_ONLY');
  assert.ok(searched.hits.length<=5);
  assert.equal(toGraphFabricPart(searched).system,'graph_rag_byog');
  assert.equal(toMeta145Evidence(searched).semanticAccepted,false);
  assert.equal(toMeta145Evidence(searched).modelWeightsUpdatedByAdapter,false);
  assert.ok(log.includes('BEFORE_COMPUTE')&&log.includes('AFTER_COMPUTE')&&log.includes('FINAL_SYNTHETIC'));
  assert.ok(!searched.hits.some(h=>h.hostApproved===true));
});
