import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {runProjectionWorkBurst,PINS} from '../integrations/workburst-bridge.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const inputs=resolve(root,'integrations/native_projection_inputs.json');
const source=resolve(root,'inputs/ariadne_v07_atlas.json');
const catalog=resolve(root,'peer-inputs/next144-civilizational-capabilities.json');
const config={workBurstModulePath:process.env.ATLAS_WORK_BURST_MODULE||resolve(root,'../atlas-parent-checkout/packages/atlas-one-v2/src/work-burst.mjs'),
 next144ModulePath:resolve(root,'peer-inputs/next144.mjs'),modeIngressModulePath:resolve(root,'integrations/reused-mode-ingress.mjs')};
const present=[inputs,source,catalog,...Object.values(config)].every(existsSync);
const sha=x=>createHash('sha256').update(x).digest('hex');
const canonical=x=>Array.isArray(x)?'['+x.map(canonical).join(',')+']':x!==null&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}':JSON.stringify(x);
let all;
function options(rows){return {...config,registryBytes:readFileSync(source),catalogBytes:readFileSync(catalog),envelopeBytes:Buffer.from(JSON.stringify(rows))};}
function selected(platform='ATLAS'){all??=JSON.parse(readFileSync(inputs));return structuredClone(all.find(x=>x.payload.platform===platform));}
function repin(e){e.payloadSha256=sha(canonical(e.payload));return e;}
function check(name,fn){test(name,{skip:!present},fn);}

test('public synthetic registry cannot bypass original-byte trust',async()=>{
 await assert.rejects(runProjectionWorkBurst({registryBytes:Buffer.from('{"nodes":[]}'),catalogBytes:Buffer.from('{}'),
  envelopeBytes:Buffer.from('[]'),workBurstModulePath:'must-not-be-loaded.mjs',next144ModulePath:'missing.mjs',
  modeIngressModulePath:'missing.mjs'}),/ORIGINAL_BYTES_REQUIRED/);
});
test('native dependency pins cannot be changed through exported object',()=>{
 assert.equal(Object.isFrozen(PINS),true);
 assert.throws(()=>{PINS.registry='f'.repeat(64);},TypeError);
});

check('all 6912 projections use actual existing Work Burst and R02 ingress',async()=>{
 all=JSON.parse(readFileSync(inputs));const r=await runProjectionWorkBurst(options(all));
 assert.equal(r.projectionsChecked,6912);assert.equal(r.nativeBurstInvocations,72);assert.equal(r.uniqueNodes,1728);
 assert.equal(r.proposedSourceWorkInitiatives,104);assert.equal(r.protectedOptionalSourceInitiatives,40);
 assert.equal(r.hostVerified,false);assert.equal(r.distinctModelVisits,0);assert.equal(r.originalR02IngressReused,true);
 assert.equal(r.inputSha256,sha(options(all).envelopeBytes));assert.deepEqual(r.runIds,['native-validation']);assert.deepEqual(r.passIds,[12]);
});
for(const [name,mutate] of [
 ['source role',e=>e.payload.identity.sourceRole='EPISTEMIC_META'],
 ['original record declaration',e=>e.payload.identity.declaredSourceRecordSha256='f'.repeat(64)],
 ['recomputed original record',e=>e.payload.identity.computedOriginalRecordSha256='f'.repeat(64)],
 ['extra private identity body',e=>e.payload.identity.privateBody='private'],
 ['false semantic acceptance',e=>e.payload.semanticAcceptance=true],
 ['false model visits',e=>e.payload.actualModelVisits=1728],
 ['false hosted authentication',e=>e.payload.hostAuthenticated=true],
 ['private source body',e=>e.payload.sourceBodyImported=true],
 ['borrowed proposal initiative',e=>e.payload.initiative='N144-01-01'],
 ['unknown payload body',e=>e.payload.body='private'],
 ['false source mode',e=>e.payload.sourceProposalSuggestedMode='QUIET'],
 ['wrong namespace',e=>e.payload.identity.namespace='IRON-HIST'],
 ['unbound run',e=>e.payload.runId='someone-else'],
 ['false receipt model status',e=>e.state='HOSTED'],
 ['scope used as authority',e=>e.payload.scopeMatch={reason:'EXCLUSION_TEXT_ONLY',affirmativeTokenHits:0,exclusionTokenHits:1,semanticAcceptance:true,authorityEffect:'NONE'}],
 ])check('rejects rehashed '+name,async()=>{let e=selected();mutate(e);repin(e);await assert.rejects(runProjectionWorkBurst(options([e])));});
check('rejects duplicated request IDs before execution',async()=>{const e=selected();await assert.rejects(runProjectionWorkBurst(options([e,e])));});
check('rejects source bytes mutation',async()=>{const o=options([selected()]);o.registryBytes=Buffer.concat([o.registryBytes,Buffer.from(' ')]);await assert.rejects(runProjectionWorkBurst(o));});
check('rejects foreign Work Burst dependency',async()=>{const o=options([selected()]);o.workBurstModulePath=config.next144ModulePath;await assert.rejects(runProjectionWorkBurst(o));});
check('rejects source fiction pin mutation',async()=>{const e=selected('IRON_EMPIRE');e.payload.fiction.source.sha256='f'.repeat(64);repin(e);await assert.rejects(runProjectionWorkBurst(options([e])));});
check('rejects fictional scene body',async()=>{const e=selected('IRON_EMPIRE');e.payload.fiction.scene='private';repin(e);await assert.rejects(runProjectionWorkBurst(options([e])));});
check('optional initiative node remains independent authorized-review candidate',async()=>{
 all??=JSON.parse(readFileSync(inputs));const e=all.find(x=>x.payload.sourceProposalSuggestedMode!=='WORK');
 const r=await runProjectionWorkBurst(options([e]));assert.equal(r.projectionsChecked,1);assert.equal(r.hostVerified,false);
});
