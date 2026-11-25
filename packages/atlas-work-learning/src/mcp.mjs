import {StringDecoder} from 'node:string_decoder';
import {captureData, definitionForName, parseStrictJson, plainObject, publicError, requireCondition,
  TOOL_DEFINITIONS, VERSION, WorkLearningError} from './contracts.mjs';

export const MCP_PROTOCOL_VERSION = '2025-11-25';
export function createMcpTools() {
  return TOOL_DEFINITIONS.map(({name, description, parameters}) => ({name, description,
    inputSchema: captureData(parameters), annotations: {readOnlyHint: true, destructiveHint: false,
      idempotentHint: true, openWorldHint: false}}));
}
const error = (id, code, message) => ({jsonrpc: '2.0', id, error: {code, message}});
const reply = (id, result) => ({jsonrpc: '2.0', id, result});
const requestId = id => typeof id === 'string' || (typeof id === 'number' && Number.isSafeInteger(id));

/** Explicit supported subset: initialize, initialized notification, ping, tools/list and tools/call. */
export function createMcpRouter({gateway} = {}) {
  requireCondition(gateway && typeof gateway.execute === 'function', 'GATEWAY_REQUIRED');
  let initialized = false, ready = false;
  return async function route(raw, {signal} = {}) {
    let message;
    try { message = captureData(raw, {maxBytes: 32_768, maxDepth: 12, maxNodes: 1024}); }
    catch { return error(null, -32600, 'Invalid request'); }
    if (!plainObject(message) || message.jsonrpc !== '2.0' || typeof message.method !== 'string'
      || (Object.hasOwn(message, 'id') && !requestId(message.id))
      || (message.params !== undefined && !plainObject(message.params))) return error(null, -32600, 'Invalid request');
    const {id, method} = message, params = message.params ?? {};
    if (id === undefined) {
      if (method === 'notifications/initialized' && initialized) ready = true;
      return null;
    }
    if (method === 'ping') return reply(id, {});
    if (method === 'initialize') {
      if (initialized) return error(id, -32600, 'Already initialized');
      if (typeof params.protocolVersion !== 'string' || !plainObject(params.capabilities)
        || !plainObject(params.clientInfo) || typeof params.clientInfo.name !== 'string'
        || typeof params.clientInfo.version !== 'string') return error(id, -32602, 'Invalid initialization');
      initialized = true;
      return reply(id, {protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: {tools: {listChanged: false}}, serverInfo: {name: 'atlas-work-learning', version: VERSION},
        instructions: 'Five read-only owner-local operations. Training and writes are available only through the explicit local CLI.'});
    }
    if (!initialized || !ready) return error(id, -32002, 'Initialization required');
    if (method === 'tools/list') {
      if (params.cursor !== undefined) return error(id, -32602, 'No additional tools page');
      return reply(id, {tools: createMcpTools()});
    }
    if (method === 'tools/call') {
      const definition = definitionForName(params.name);
      if (!definition || !plainObject(params.arguments ?? {})) return error(id, -32602, 'Invalid tool call');
      try {
        const result = await gateway.execute(definition.operation, params.arguments ?? {}, {signal});
        return reply(id, {content: [{type: 'text', text: JSON.stringify(result)}], structuredContent: result, isError: false});
      } catch (failure) {
        const held = {ok: false, error: publicError(failure)};
        return reply(id, {content: [{type: 'text', text: JSON.stringify(held)}], structuredContent: held, isError: true});
      }
    }
    return error(id, -32601, 'Method not found');
  };
}

function write(output, value) {
  return new Promise((resolve, reject) => output.write(JSON.stringify(value) + '\n', failure => failure ? reject(failure) : resolve()));
}

/** Sequential bounded NDJSON transport; stdout contains JSON-RPC frames only. */
export async function runMcpStdio({gateway, input = process.stdin, output = process.stdout,
  maxFrameBytes = 32_768, signal, closeOnEnd = true} = {}) {
  requireCondition(Number.isSafeInteger(maxFrameBytes) && maxFrameBytes >= 1024 && maxFrameBytes <= 1_048_576, 'MCP_FRAME_BOUNDS');
  const route = createMcpRouter({gateway}), decoder = new StringDecoder('utf8');
  let buffered = '', frames = 0;
  async function line(value) {
    if (Buffer.byteLength(value) > maxFrameBytes) throw new WorkLearningError('MCP_FRAME_BOUNDS');
    if (!value.trim()) return;
    let message;
    try { message = parseStrictJson(value, maxFrameBytes); }
    catch { await write(output, error(null, -32700, 'Parse error')); return; }
    const result = await route(message, {signal}); frames++;
    if (result !== null) await write(output, result);
  }
  try {
    for await (const chunk of input) {
      if (signal?.aborted) break;
      requireCondition(Buffer.byteLength(chunk) <= maxFrameBytes * 4, 'MCP_CHUNK_BOUNDS');
      buffered += typeof chunk === 'string' ? chunk : decoder.write(chunk);
      let end;
      while ((end = buffered.indexOf('\n')) !== -1) {
        const current = buffered.slice(0, end).replace(/\r$/, ''); buffered = buffered.slice(end + 1);
        await line(current);
      }
      requireCondition(Buffer.byteLength(buffered) <= maxFrameBytes, 'MCP_FRAME_BOUNDS');
    }
    buffered += decoder.end();
    if (buffered.trim() && !signal?.aborted) await line(buffered);
    return {frames, hostedRegistration: false};
  } finally { if (closeOnEnd) await gateway.close?.(); }
}
