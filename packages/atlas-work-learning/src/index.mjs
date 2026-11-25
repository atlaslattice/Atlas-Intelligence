export {VERSION, OPERATIONS, TOOL_DEFINITIONS, WorkLearningError, parseStrictJson, validateArguments} from './contracts.mjs';
export {createWorkLearningGateway, createFilePinVerifier, authorizedResultMetadata} from './gateway.mjs';
export {createPythonBackend} from './python-bridge.mjs';
export {createResponsesTools, dispatchResponsesFunctionCall, runResponsesWorkLearning} from './openai.mjs';
export {MCP_PROTOCOL_VERSION, createMcpTools, createMcpRouter, runMcpStdio} from './mcp.mjs';
export {openMcpConfiguration} from './mcp-stdio.mjs';
export {toGraphFabricPart, composeAtlasGraphFabric, toMeta145Evidence, attachMeta145Context,
  createAtlasConsumers, createProviderPlugin} from './adapters.mjs';

// MICA/Atlas source-reference sidecar only; not a second retriever or host permission grant.
export {stageMicaEvidence, prepareTrainingLabel} from './pretrained-evidence-sidecar.mjs';
