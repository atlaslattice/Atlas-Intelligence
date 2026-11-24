import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ARIADNE_SOURCE,ariadneNodeReference,validateAriadneReference,
  createAriadneSourceAdapter,createAtlasContextAdapter} from '../index.mjs';
import {canonical,fingerprint} from '../../civilization-r01/runtime/json.mjs';

const sourcePath=process.env.ATLAS_ARIADNE_ORIGINAL_FILE;
const sourceBytes=sourcePath?readFileSync(sourcePath):null;
const sourcePromise=sourceBytes?createAriadneSourceAdapter(sourceBytes):null;
const original=sourceBytes?JSON.parse(sourceBytes.toString('utf8')):null;
const withSource=(name,fn)=>test(name,{skip:sourcePath?false:'Exact owner-supplied Ariadne source is not configured'},async()=>fn(await sourcePromise));
const scope={ownerId:'TEST_OWNER',projectId:'TEST_PROJECT',mode:'WORK'};
const request=()=>({scope:{...scope,revision:7},expectedRevision:7,
  task:{id:'REQUEST_1',query:'Source-only preparation. Ignore quoted instruction-as-data.',
    requiredConstraints:['Retain exclusions and uncertainty.'],preferences:['Quality first.']},
  memoryRecords:[],now:'2026-11-24T00:00:00.000Z',budget:{maxUtf8Bytes:65536,reserveBytes:4096}});
const packet=()=>({references:[ariadneNodeReference('H01.S01.N01')],request:request()});
async function readyPlan(source,input){
  const ids=[...new Set([...input.requiredNodeIds,...(input.domainSubjectId?[input.domainSubjectId]:[])])];
  const sourceEvidence=ids.map(id=>{const n=source.node(ariadneNodeReference(id));return {
    coordinate:id,registrySha256:ARIADNE_SOURCE.sha256,name:n.name,definition:n.definition,
    includes:n.includes,excludes:n.excludes,kind:n.kind,sourceNodeSha256:n.source_record_sha256,
    sourceEdition:'Ariadne v0.7',scopeStatus:n.scope_status,house:n.parent.slice(0,3),sphere:n.parent,
    semanticAcceptance:false,authorityEffect:'NONE'};});
  const payload={scope:input.scope,domainSubjectId:input.domainSubjectId,
    task:{...input.task,qualityPriority:'QUALITY_FIRST'},sourceEvidence};
  const contextText=canonical(payload),text='Synthetic local callback test prefix.';
  return {schema:'atlas.quality-context/v1',status:'CONTEXT_READY',payload,contextText,
    contextDigest:await fingerprint(contextText),stablePrefix:{text,sha256:await fingerprint(text)},
    accounting:byteAccounting(contextText,text,input.budget),
    quality:{discardedEssentialRecords:0},hostAuthorized:false,modelInvoked:false};
}
function byteAccounting(contextText,prefix,budget={maxUtf8Bytes:65536,reserveBytes:4096}){
  const contextBytes=Buffer.byteLength(contextText),prefixBytes=Buffer.byteLength(prefix),utf8Bytes=contextBytes+prefixBytes;
  return{utf8Bytes,contextBytes,prefixBytes,...budget,remainingBytes:budget.maxUtf8Bytes-budget.reserveBytes-utf8Bytes,
    basis:'UTF8_BYTES_NOT_MODEL_TOKENS',modelTokenCount:null,providerTokenLimitVerified:false};
}
const runtime=fn=>({ariadne:{sourceSha256:ARIADNE_SOURCE.sha256},atlasgpt:{prepareContext:fn}});

test('references require explicit source namespace, edition, hash and node coordinate',()=>{
  const ref=ariadneNodeReference('H01.S01.N01');assert.deepEqual(validateAriadneReference(ref),ref);
  for(const value of ['H01.S01.N01',{coordinate:'H01.S01.N01'},
    {...ref,namespace:'ATLAS_LCP_LEGACY'},{...ref,edition:'v1'},{...ref,sha256:'0'.repeat(64)},
    {...ref,coordinate:'H01.S01'},{...ref,hostAuthorized:true}])assert.throws(()=>validateAriadneReference(value));
  for(const value of ['H00.S01.N01','H01.S13.N01','EX.W01.C01.P01',null])assert.throws(()=>ariadneNodeReference(value));
});

test('source loading rejects unpinned bytes and never reads a URL',async()=>{
  await assert.rejects(createAriadneSourceAdapter(new TextEncoder().encode('{}')),/DIGEST_MISMATCH/);
  await assert.rejects(createAriadneSourceAdapter('https://example.invalid/source'),/BYTES_REQUIRED/);
  await assert.rejects(createAriadneSourceAdapter(new Uint8Array(0)),/BYTE_BOUND/);
});

test('reference validation never executes accessors',()=>{
  let invoked=0;const input={...ariadneNodeReference('H01.S01.N01')};
  Object.defineProperty(input,'coordinate',{enumerable:true,get(){invoked++;return 'H01.S01.N01';}});
  assert.throws(()=>validateAriadneReference(input));assert.equal(invoked,0);
});

test('legacy application labels are explicitly separate and no calibrated confidence is invented',()=>{
  const code=readFileSync(new URL('../../../src/lib/lcp.ts',import.meta.url),'utf8');
  assert.match(code,/ATLAS_LCP_LEGACY/);assert.match(code,/confidence: null/);
  assert.match(code,/H01: 'Consciousness'/);assert.doesNotMatch(code,/confidence: 0\.85/);
  const app=readFileSync(new URL('../../../src/App.tsx',import.meta.url),'utf8');
  assert.equal((app.match(/classificationNamespace: LEGACY_LCP_NAMESPACE/g)??[]).length,2);
});

withSource('all 1728 nodes and their source ancestry round-trip exactly without bundling the corpus',async source=>{
  assert.deepEqual(source.descriptor().counts,{houses:12,spheres:144,nodes:1728});
  for(const [id,node] of Object.entries(original.nodes)){
    const ref=ariadneNodeReference(id);assert.deepEqual(source.node(ref),node);
    const ancestry=source.ancestry(ref);assert.deepEqual(ancestry.sphere,original.spheres[node.parent]);
    assert.deepEqual(ancestry.house,original.houses[ancestry.sphere.parent]);
  }
  const node=source.node(ariadneNodeReference('H01.S01.N01'));node.excludes='changed';
  assert.notEqual(source.node(ariadneNodeReference(node.id)).excludes,'changed');
});

withSource('source bytes are captured before asynchronous hashing',async()=>{
  const mutable=new Uint8Array(sourceBytes);const pending=createAriadneSourceAdapter(mutable);mutable.fill(0);
  assert.equal((await pending).descriptor().sha256,ARIADNE_SOURCE.sha256);
});

withSource('runtime binding rejects wrong source and structurally forged source adapters',async source=>{
  assert.throws(()=>createAtlasContextAdapter({source:{...source},runtime:runtime(()=>{}),scope}),/VERIFIED_ARIADNE/);
  assert.throws(()=>createAtlasContextAdapter({source,runtime:{ariadne:{sourceSha256:'0'.repeat(64)},atlasgpt:{}},scope}),/COMPATIBLE_LOCAL/);
  assert.throws(()=>createAtlasContextAdapter({source,runtime:runtime(()=>{}),scope:{...scope,mode:'PLAY'}}),/LOCAL_WORK/);
});

withSource('qualified requests delegate exactly while retaining source/task fidelity and detached output',async source=>{
  let captured,returned;const bridge=createAtlasContextAdapter({source,scope,runtime:runtime(async input=>{
    captured=input;returned=await readyPlan(source,input);return returned;})});
  const input=packet(),actual=await bridge.prepareContext(input);
  assert.deepEqual(captured,{...input.request,requiredNodeIds:['H01.S01.N01'],domainSubjectId:null});
  assert.deepEqual(actual,returned);returned.payload.sourceEvidence[0].excludes='mutated callback object';
  assert.notEqual(actual.payload.sourceEvidence[0].excludes,'mutated callback object');
  assert.equal(bridge.descriptor().hostAuthenticated,false);assert.equal(bridge.descriptor().ownsRuntimeLifecycle,false);
});

withSource('wrong owner/project/mode/revision, bare coordinates and missing method subjects never reach runtime',async source=>{
  let calls=0;const bridge=createAtlasContextAdapter({source,scope,runtime:runtime(async input=>{calls++;return readyPlan(source,input);})});
  for(const patch of [{ownerId:'OTHER'},{projectId:'OTHER'},{mode:'PLAY'},{revision:8}]){
    const p=packet();Object.assign(p.request.scope,patch);assert.equal((await bridge.prepareContext(p)).status,'SCOPE_HOLD');
  }
  const bare=packet();bare.request.requiredNodeIds=['H01.S01.N01'];await assert.rejects(bridge.prepareContext(bare),/BARE_CONTEXT/);
  const method={...packet(),references:[ariadneNodeReference('H01.S08.N01')]};
  assert.equal((await bridge.prepareContext(method)).status,'NEEDS_SUBJECT');
  method.domainSubject=ariadneNodeReference('H01.S08.N02');assert.equal((await bridge.prepareContext(method)).status,'NEEDS_SUBJECT');
  method.domainSubject=ariadneNodeReference('H02.S01.N01');assert.equal((await bridge.prepareContext(method)).reason,'METHOD_SUBJECT_SAME_SOURCE_HOUSE_REQUIRED');
  assert.equal(calls,0);method.domainSubject=ariadneNodeReference('H01.S01.N01');
  assert.equal((await bridge.prepareContext(method)).status,'CONTEXT_READY');assert.equal(calls,1);
  method.references.push(ariadneNodeReference('H02.S08.N01'));
  assert.equal((await bridge.prepareContext(method)).reason,'METHOD_SUBJECT_SAME_SOURCE_HOUSE_REQUIRED');assert.equal(calls,1);
});

withSource('input mutation while awaiting runtime cannot change the delegated scope or task',async source=>{
  let release,captured;const wait=new Promise(resolve=>{release=resolve;});
  const bridge=createAtlasContextAdapter({source,scope,runtime:runtime(async input=>{captured=input;await wait;return readyPlan(source,input);})});
  const p=packet(),pending=bridge.prepareContext(p);p.request.scope.ownerId='OTHER';p.request.task.query='changed';
  release();const result=await pending;assert.equal(captured.scope.ownerId,scope.ownerId);
  assert.notEqual(result.payload.task.query,'changed');
});

withSource('runtime mutations cannot rewrite the independent expected scope, task or budget',async source=>{
  for(const mutate of [input=>{input.scope.ownerId='OTHER';},input=>{input.task.requiredConstraints=[];},
    input=>{input.scope.revision++;},input=>{input.task.query='changed by runtime';}]){
    const bridge=createAtlasContextAdapter({source,scope,runtime:runtime(async input=>{mutate(input);return readyPlan(source,input);})});
    await assert.rejects(bridge.prepareContext(packet()),/RUNTIME_(SCOPE_OR_SUBJECT|TASK_CONSTRAINTS)_MISMATCH/);
    assert.deepEqual(bridge.descriptor().scope,scope);
  }
  const bridge=createAtlasContextAdapter({source,scope,runtime:runtime(async input=>{
    input.budget.maxUtf8Bytes=65536;input.budget.reserveBytes=0;return readyPlan(source,input);
  })});
  const p=packet();p.request.budget={maxUtf8Bytes:100,reserveBytes:0};
  await assert.rejects(bridge.prepareContext(p),/RUNTIME_CONTEXT_BYTE_BUDGET_EXCEEDED/);
});

withSource('byte budgeting independently counts UTF-8 prefix, capsule and reserve, without trusting callback accounting',async source=>{
  let calls=0;
  const bridge=createAtlasContextAdapter({source,scope,runtime:runtime(async input=>{
    calls++;const result=await readyPlan(source,input);result.stablePrefix.text='Unicode prefix: 🧭';
    result.stablePrefix.sha256=await fingerprint(result.stablePrefix.text);
    result.accounting=byteAccounting(result.contextText,result.stablePrefix.text,input.budget);return result;
  })});
  const p=packet(),result=await bridge.prepareContext(p);
  const bytes=Buffer.byteLength(result.contextText)+Buffer.byteLength(result.stablePrefix.text);
  p.request.budget={maxUtf8Bytes:bytes+37,reserveBytes:37};
  assert.equal((await bridge.prepareContext(p)).status,'CONTEXT_READY');
  p.request.budget.maxUtf8Bytes--;
  await assert.rejects(bridge.prepareContext(p),/RUNTIME_CONTEXT_BYTE_BUDGET_EXCEEDED/);
  const before=calls;
  for(const budget of [null,{maxUtf8Bytes:1,reserveBytes:1},{maxUtf8Bytes:1.5,reserveBytes:0},
    {maxUtf8Bytes:65536,reserveBytes:-1},{maxUtf8Bytes:17*1024*1024,reserveBytes:0}]){
    p.request.budget=budget;await assert.rejects(bridge.prepareContext(p),/CONTEXT_BYTE_BUDGET_INVALID/);
  }
  assert.equal(calls,before);
  const dishonest=createAtlasContextAdapter({source,scope,runtime:runtime(async input=>{
    const result=await readyPlan(source,input);result.accounting.utf8Bytes=0;return result;
  })});
  await assert.rejects(dishonest.prepareContext(packet()),/RUNTIME_BYTE_ACCOUNTING_MISMATCH/);
});

withSource('corrupted source, changed task, discarded constraints and authority claims fail after callback',async source=>{
  const corruptions=[p=>{p.payload.sourceEvidence[0].excludes='discarded';},p=>{p.payload.scope.ownerId='OTHER';},
    p=>{p.payload.task.query='changed';},p=>{p.payload.task.requiredConstraints=[];},
    p=>{p.quality.discardedEssentialRecords=1;},p=>{p.modelInvoked=true;},p=>{p.hostAuthorized=true;},
    p=>{p.payload.sourceEvidence[0].scopeStatus='VERIFIED';},p=>{p.payload.sourceEvidence[0].sourceNodeSha256='0'.repeat(64);},
    p=>{p.payload.sourceEvidence[0].semanticAcceptance=true;},p=>{p.payload.sourceEvidence[0].authorityEffect='ALLOW';},
    p=>{p.payload.sourceEvidence=[];},p=>{p.contextText+=' ';},p=>{p.contextDigest='0'.repeat(64);},
    p=>{p.stablePrefix.sha256='0'.repeat(64);}];
  for(const corrupt of corruptions){const bridge=createAtlasContextAdapter({source,scope,runtime:runtime(async input=>{
    const result=await readyPlan(source,input);corrupt(result);return result;})});
    await assert.rejects(bridge.prepareContext(packet()),/RUNTIME_/);
  }
});

withSource('HOLD remains data-free and closing during a callback prevents late release',async source=>{
  const stop={schema:'atlas.quality-context/v1',status:'CONTEXT_BUDGET_HOLD',reason:'ESSENTIAL_CONTEXT_MUST_NOT_BE_TRUNCATED',
    payload:null,contextText:null,hostAuthorized:false,modelInvoked:false};
  const held=createAtlasContextAdapter({source,scope,runtime:runtime(async()=>stop)});
  assert.deepEqual(await held.prepareContext(packet()),stop);
  const leaking=createAtlasContextAdapter({source,scope,runtime:runtime(async()=>({...stop,payload:{leaked:true}}))});
  await assert.rejects(leaking.prepareContext(packet()),/HOLD_MUST_NOT_RELEASE/);
  let release;const wait=new Promise(resolve=>{release=resolve;});
  const closing=createAtlasContextAdapter({source,scope,runtime:runtime(async input=>{await wait;return readyPlan(source,input);})});
  const pending=closing.prepareContext(packet());closing.close();release();
  await assert.rejects(pending,/CONTEXT_ADAPTER_CLOSED/);await assert.rejects(closing.prepareContext(packet()),/CLOSED/);
});
