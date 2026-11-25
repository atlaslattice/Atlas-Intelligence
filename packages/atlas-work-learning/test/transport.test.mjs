import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {createPythonBackend, createFilePinVerifier, openMcpConfiguration} from '../src/index.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const REGISTRY = '07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6';
async function processFixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'atlas-work-transport-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  const moduleRoot = join(root, 'python'), module = join(moduleRoot, 'atlas_work_learning');
  await mkdir(module, {recursive: true});
  const configBytes = JSON.stringify({workspaceId: 'process-fixture', owner: 'fixture-owner'});
  const configPath = join(root, 'config.json'); await writeFile(configPath, configBytes);
  const expectedConfigSha256 = hash(configBytes);
  const identity = {workspaceId: 'process-fixture', registrySha256: REGISTRY, configSha256: expectedConfigSha256,
    corpusSha256: 'b'.repeat(64), checkpointSha256: 'c'.repeat(64)};
  const source = {id: 'fixture-source', version: 'v1', sha256: 'd'.repeat(64), uri: 'urn:atlas:test:source'};
  const provenance = {...identity, sourceRefs: [source], itemRefs: []};
  const program = `import json,sys,time,os\npin=json.loads(${JSON.stringify(JSON.stringify(provenance))})\nfor line in sys.stdin:\n m=json.loads(line)\n q=m['arguments'].get('query','')\n if q=='stall': time.sleep(1)\n if q=='badjson':\n  print('not-json',flush=True);continue\n r={'status':'SYNTHETIC_PROTOCOL_FIXTURE','operation':m['operation'],'hits':[], 'apiKeyInherited':bool(os.environ.get('OPENAI_API_KEY')), 'provenance':pin}\n if q=='large':r['padding']='x'*4096\n print(json.dumps({'id':m['id'],'ok':True,'result':r}),flush=True)\n`;
  await writeFile(join(module, '__init__.py'), ''); await writeFile(join(module, '__main__.py'), program);
  const files = [{path: configPath, sha256: expectedConfigSha256}, {path: join(module, '__main__.py'), sha256: hash(program)}];
  const serverConfig = {schema: 'atlas.work-learning.local-mcp-config/v1', owner: 'fixture-owner', workspaceId: identity.workspaceId,
    workspace: root, moduleRoot, pythonExecutable: 'python3', expectedConfigSha256, sourceManifest: {sources: [source]},
    pins: {identity, files}, allowOperations: ['status', 'search', 'node', 'episodes', 'evaluation']};
  const serverPath = join(root, 'mcp-server.json'); await writeFile(serverPath, JSON.stringify(serverConfig));
  return {root, moduleRoot, expectedConfigSha256, configPath, identity, files, serverPath};
}

test('Python NDJSON bridge executes a real isolated process and shuts down without inherited API credentials', async t => {
  const f = await processFixture(t), backend = createPythonBackend({workspace: f.root, moduleRoot: f.moduleRoot, expectedConfigSha256: f.expectedConfigSha256});
  t.after(() => backend.close());
  const output = await backend.execute('status', {});
  assert.equal(output.operation, 'status'); assert.equal(output.apiKeyInherited, false);
  assert.equal(backend.stats().pending, 0); assert.equal(backend.stats().automaticRestarts, 0);
  const pid = backend.stats().pid; await backend.close();
  assert.throws(() => process.kill(pid, 0), error => error.code === 'ESRCH');
});

test('Python bridge rejects drifted configuration before process spawn', async t => {
  const f = await processFixture(t); await writeFile(f.configPath, '{}');
  const backend = createPythonBackend({workspace: f.root, moduleRoot: f.moduleRoot, expectedConfigSha256: f.expectedConfigSha256});
  t.after(() => backend.close());
  await assert.rejects(backend.execute('status', {}), error => error.code === 'CONFIG_PIN_MISMATCH');
  assert.equal(backend.stats().started, false);
});

test('queue bounds and deadline terminate a stalled backend without restart', async t => {
  const f = await processFixture(t), backend = createPythonBackend({workspace: f.root, moduleRoot: f.moduleRoot,
    expectedConfigSha256: f.expectedConfigSha256, maxPending: 1, timeoutMs: 100});
  t.after(() => backend.close());
  const first = backend.execute('search', {query: 'stall', target: 'corpus', limit: 1});
  const held = assert.rejects(first, error => error.code === 'BACKEND_TIMEOUT');
  await assert.rejects(backend.execute('status', {}), error => error.code === 'QUEUE_FULL');
  await held; assert.equal(backend.stats().closed, true);
  await assert.rejects(backend.execute('status', {}), error => error.code === 'BACKEND_CLOSED');
});

test('caller cancellation terminates pending Python work and cleans up the child', async t => {
  const f = await processFixture(t), backend = createPythonBackend({workspace: f.root, moduleRoot: f.moduleRoot,
    expectedConfigSha256: f.expectedConfigSha256, timeoutMs: 5000});
  t.after(() => backend.close());
  const controller = new AbortController();
  const pending = backend.execute('search', {query: 'stall', target: 'corpus', limit: 1}, {signal: controller.signal});
  const held = assert.rejects(pending, error => error.code === 'REQUEST_CANCELLED');
  const timer = setTimeout(() => controller.abort(), 40);
  await held; clearTimeout(timer); const pid = backend.stats().pid;
  await backend.close(); assert.equal(backend.stats().pending, 0);
  if (pid) assert.throws(() => process.kill(pid, 0), error => error.code === 'ESRCH');
});

test('request-byte queue bounds reject excess payload before backend spawn', async t => {
  const f = await processFixture(t), backend = createPythonBackend({workspace: f.root, moduleRoot: f.moduleRoot,
    expectedConfigSha256: f.expectedConfigSha256, maxPendingBytes: 1024});
  t.after(() => backend.close());
  await assert.rejects(backend.execute('search', {query: 'x'.repeat(2048), target: 'corpus', limit: 1}), error => error.code === 'QUEUE_FULL');
  assert.equal(backend.stats().started, false);
});

test('malformed and oversized Python responses are terminal protocol failures', async t => {
  const f = await processFixture(t);
  for (const query of ['badjson', 'large']) {
    const backend = createPythonBackend({workspace: f.root, moduleRoot: f.moduleRoot, expectedConfigSha256: f.expectedConfigSha256, maxResponseBytes: 1024});
    t.after(() => backend.close());
    await assert.rejects(backend.execute('search', {query, target: 'corpus', limit: 1}));
    assert.equal(backend.stats().closed, true); assert.equal(backend.stats().pending, 0);
    await backend.close();
  }
});

test('file pins are checked on repeated reads and changes are withheld', async t => {
  const f = await processFixture(t), verify = createFilePinVerifier({files: f.files, identity: f.identity});
  assert.deepEqual(await verify(), f.identity);
  await writeFile(f.configPath, '{"changed":true}');
  await assert.rejects(verify(), error => error.code === 'SOURCE_PIN_MISMATCH');
});

test('trusted exported MCP configuration opens the same provenance-checked gateway', async t => {
  const f = await processFixture(t), gateway = await openMcpConfiguration(f.serverPath); t.after(() => gateway.close());
  assert.equal((await gateway.status()).provenance.workspaceId, f.identity.workspaceId);
  await writeFile(f.serverPath, '{}');
  await assert.rejects(gateway.status(), error => error.code === 'SOURCE_PIN_MISMATCH');
});

test('actual MCP stdio executable completes initialize/list/call/ping with JSON-only stdout', async t => {
  const f = await processFixture(t);
  const child = spawn(process.execPath, [fileURLToPath(new URL('../src/mcp-stdio.mjs', import.meta.url)), '--config', f.serverPath], {stdio: ['pipe', 'pipe', 'pipe'], shell: false});
  t.after(() => { if (child.exitCode === null) child.kill('SIGKILL'); });
  let stdout = '', stderr = ''; child.stdout.on('data', value => { stdout += value; }); child.stderr.on('data', value => { stderr += value; });
  const finished = new Promise((resolve, reject) => { child.once('close', resolve); child.once('error', reject); });
  child.stdin.end([
    {jsonrpc: '2.0', id: 1, method: 'initialize', params: {protocolVersion: '2025-11-25', capabilities: {}, clientInfo: {name: 'test', version: '1'}}},
    {jsonrpc: '2.0', method: 'notifications/initialized'},
    {jsonrpc: '2.0', id: 2, method: 'tools/list'},
    {jsonrpc: '2.0', id: 3, method: 'tools/call', params: {name: 'atlas_work_learning_status', arguments: {}}},
    {jsonrpc: '2.0', id: 4, method: 'ping'}
  ].map(value => JSON.stringify(value)).join('\n') + '\n');
  const timer = setTimeout(() => child.kill('SIGKILL'), 5000);
  const code = await finished; clearTimeout(timer);
  assert.equal(code, 0, stderr); assert.equal(stderr, '');
  const responses = stdout.trim().split('\n').map(JSON.parse);
  assert.deepEqual(responses.map(value => value.id), [1, 2, 3, 4]);
  assert.equal(responses[1].result.tools.length, 5);
  assert.equal(responses[2].result.isError, false);
  assert.equal(responses[2].result.structuredContent.provenance.configSha256, f.expectedConfigSha256);
});
