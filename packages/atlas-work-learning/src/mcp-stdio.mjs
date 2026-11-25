#!/usr/bin/env node
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createWorkLearningGateway, createFilePinVerifier} from './gateway.mjs';
import {createPythonBackend} from './python-bridge.mjs';
import {runMcpStdio} from './mcp.mjs';
import {OPERATIONS, parseStrictJson, requireCondition} from './contracts.mjs';

/** Trusted operator configuration, not an MCP argument or caller-selected workspace. */
export async function openMcpConfiguration(path) {
  const configPath = resolve(path), bytes = await readFile(configPath);
  const config = parseStrictJson(bytes.toString('utf8'), 32_000_000);
  const allowed = ['schema', 'owner', 'workspaceId', 'workspace', 'moduleRoot', 'expectedConfigSha256',
    'pythonExecutable', 'sourceManifest', 'pins', 'allowOperations', 'timeoutMs'];
  requireCondition(Object.keys(config).every(key => allowed.includes(key))
    && config.schema === 'atlas.work-learning.local-mcp-config/v1', 'MCP_CONFIG_SCHEMA');
  requireCondition(Array.isArray(config.allowOperations) && config.allowOperations.length > 0
    && config.allowOperations.every(operation => OPERATIONS.includes(operation)), 'MCP_CONFIG_POLICY');
  requireCondition(Array.isArray(config.pins?.files) && config.pins.files.length > 0, 'MCP_CONFIG_PINS');
  requireCondition(config.pins.identity?.workspaceId === config.workspaceId
    && config.pins.identity?.configSha256 === config.expectedConfigSha256, 'MCP_CONFIG_IDENTITY');
  const allowedOperations = new Set(config.allowOperations);
  const verifyPins = createFilePinVerifier({files: [...config.pins.files,
    {path: configPath, sha256: createHash('sha256').update(bytes).digest('hex')}], identity: config.pins.identity});
  await verifyPins();
  const backend = createPythonBackend({workspace: config.workspace, moduleRoot: config.moduleRoot,
    expectedConfigSha256: config.expectedConfigSha256, ...(config.pythonExecutable ? {pythonExecutable: config.pythonExecutable} : {}),
    ...(config.timeoutMs ? {timeoutMs: config.timeoutMs} : {})});
  return createWorkLearningGateway({backend, owner: config.owner, workspaceId: config.workspaceId,
    sourceManifest: config.sourceManifest, verifyPins,
    ...(config.timeoutMs ? {timeoutMs: config.timeoutMs} : {}),
    authorize: check => check.owner === config.owner && check.workspaceId === config.workspaceId
      && allowedOperations.has(check.operation) && ['READ', 'RETURN'].includes(check.action)});
}

export async function main(argv = process.argv.slice(2)) {
  requireCondition(argv.length === 2 && argv[0] === '--config', 'MCP_CONFIG_ARGUMENT');
  const gateway = await openMcpConfiguration(argv[1]), controller = new AbortController();
  const stop = () => { controller.abort(); process.stdin.destroy(); };
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
  try { return await runMcpStdio({gateway, signal: controller.signal}); }
  finally { process.removeListener('SIGINT', stop); process.removeListener('SIGTERM', stop); await gateway.close(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(() => { process.stderr.write('ATLAS_WORK_LEARNING_MCP_WITHHELD\n'); process.exitCode = 1; });
}
