import {captureData, deepFreeze, definitionForName, parseStrictJson, publicError, requireCondition,
  TOOL_DEFINITIONS, WorkLearningError} from './contracts.mjs';

/** Responses API shape: flat function fields, strict schemas and no credentials. */
export function createResponsesTools() {
  return deepFreeze(TOOL_DEFINITIONS.map(({name, description, parameters}) => ({type: 'function', name,
    description, parameters: captureData(parameters), strict: true})));
}
export async function dispatchResponsesFunctionCall(gateway, rawCall, options = {}) {
  const call = captureData(rawCall, {maxBytes: 20_480, maxDepth: 8, maxNodes: 128});
  requireCondition(call?.type === 'function_call' && typeof call.call_id === 'string'
    && /^[A-Za-z0-9_-]{1,200}$/.test(call.call_id), 'INVALID_FUNCTION_CALL');
  let output;
  try {
    const definition = definitionForName(call.name);
    requireCondition(definition, 'UNKNOWN_TOOL', 'Unknown read-only Work tool.');
    const args = parseStrictJson(call.arguments);
    output = {ok: true, result: await gateway.execute(definition.operation, args, options)};
  } catch (error) { output = {ok: false, error: publicError(error)}; }
  return deepFreeze({type: 'function_call_output', call_id: call.call_id, output: JSON.stringify(output)});
}

/** Explicitly enabled injected-client runner. It never discovers keys or imports a provider SDK. */
export async function runResponsesWorkLearning({enabled = false, client, gateway, model, input,
  instructions, maxResponses = 6, maxToolCalls = 20, maxOutputTokens = 2048,
  maxHistoryBytes = 8_388_608, signal} = {}) {
  if (enabled !== true) return deepFreeze({status: 'PROVIDER_DISABLED', providerCalls: 0, toolCalls: 0});
  requireCondition(client && typeof client.responses?.create === 'function' && gateway && typeof gateway.execute === 'function', 'INJECTED_CLIENT_REQUIRED');
  requireCondition(typeof model === 'string' && model.length > 0 && model.length <= 160, 'MODEL_REQUIRED');
  requireCondition(Number.isSafeInteger(maxResponses) && maxResponses >= 1 && maxResponses <= 16
    && Number.isSafeInteger(maxToolCalls) && maxToolCalls >= 0 && maxToolCalls <= 100
    && Number.isSafeInteger(maxOutputTokens) && maxOutputTokens >= 1 && maxOutputTokens <= 32_768
    && Number.isSafeInteger(maxHistoryBytes) && maxHistoryBytes >= 1024 && maxHistoryBytes <= 32_000_000, 'RESPONSE_BOUNDS');
  let history = typeof input === 'string' ? [{role: 'user', content: input}] : captureData(input, {maxBytes: maxHistoryBytes});
  requireCondition(Array.isArray(history) && history.length > 0, 'RESPONSE_INPUT');
  requireCondition(instructions === undefined || (typeof instructions === 'string' && instructions.length <= 16_384), 'RESPONSE_INSTRUCTIONS');
  const tools = createResponsesTools(), callIds = new Set(); let providerCalls = 0, toolCalls = 0;
  for (let step = 0; step < maxResponses; step++) {
    if (signal?.aborted) throw new WorkLearningError('REQUEST_CANCELLED');
    requireCondition(Buffer.byteLength(JSON.stringify(history)) <= maxHistoryBytes, 'RESPONSE_HISTORY_BOUNDS');
    const request = {model, input: captureData(history, {maxBytes: maxHistoryBytes}), tools, store: false,
      parallel_tool_calls: false, max_output_tokens: maxOutputTokens,
      ...(instructions === undefined ? {} : {instructions})};
    providerCalls++;
    const response = await client.responses.create(request, signal ? {signal} : undefined);
    requireCondition(response && Array.isArray(response.output), 'RESPONSE_FORMAT');
    const output = captureData(response.output, {maxBytes: maxHistoryBytes});
    const calls = output.filter(item => item.type === 'function_call');
    // All output items, including reasoning items, must travel with their tool-call outputs.
    history.push(...output);
    if (!calls.length) return {status: 'COMPLETED', providerCalls, toolCalls, response,
      hostedToolsRegistered: false, modelTrainingPerformed: false};
    requireCondition(toolCalls + calls.length <= maxToolCalls, 'TOOL_CALL_BUDGET');
    for (const call of calls) {
      requireCondition(typeof call.call_id === 'string' && !callIds.has(call.call_id), 'DUPLICATE_TOOL_CALL');
      callIds.add(call.call_id); toolCalls++;
      history.push(await dispatchResponsesFunctionCall(gateway, call, {signal}));
    }
  }
  return {status: 'RESPONSE_BUDGET_EXHAUSTED', providerCalls, toolCalls,
    hostedToolsRegistered: false, modelTrainingPerformed: false};
}
