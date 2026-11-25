export type Operation = 'status' | 'search' | 'node' | 'episodes' | 'evaluation';
export interface SourceRef { id: string; version: string; sha256: string; uri: string }
export interface ItemRef { id: string; sourceId: string; textSha256: string }
export interface CanonicalItemRef extends ItemRef {
  sourceVersion: string; sourceSha256: string; sourceUri: string;
  excerptSha256: string; excerptTruncated: boolean;
}
export interface SourceManifest {
  sources: SourceRef[];
  /** Trusted export from the pinned corpus; required for corpus search. */
  items?: CanonicalItemRef[];
}
export interface PinIdentity { workspaceId: string; registrySha256: string; configSha256: string; corpusSha256: string | null; checkpointSha256: string | null }
export interface Provenance extends PinIdentity { sourceRefs: SourceRef[]; itemRefs: ItemRef[] }
export interface WorkResult { provenance: Provenance; [key: string]: unknown }
export interface CallOptions { signal?: AbortSignal }
export interface Backend { execute(operation: Operation, args: Record<string, unknown>, options?: CallOptions): Promise<WorkResult>; close?(): Promise<void> }
export interface PolicyCheck { action: 'READ' | 'RETURN'; kind: 'SERVICE' | 'SOURCE' | 'ITEM'; operation: Operation; owner: string; workspaceId: string; ref: SourceRef | ItemRef | null }
/** A source-only review contract; real host must independently bind and attest use/return authority. */
export interface InferenceUseCheck { purpose: 'INFERENCE_USE'; phase: 'BEFORE_COMPUTE' | 'AFTER_COMPUTE'; kind: 'SOURCE';
  operation: Operation; owner: string; workspaceId: string; ref: SourceRef }
export interface FinalReturnCheck { operation: Operation; owner: string; workspaceId: string;
  sourceRefs: SourceRef[]; itemRefs: ItemRef[]; pinIdentity: PinIdentity; purposePolicy: 'STRICT_SOURCE_ONLY' }
export interface Gateway extends Backend {
  status(args?: Record<string, never>, options?: CallOptions): Promise<WorkResult>;
  search(args: {query: string; limit: number; target: 'corpus' | 'nodes'}, options?: CallOptions): Promise<WorkResult>;
  node(args: {hsn: string}, options?: CallOptions): Promise<WorkResult>;
  episodes(args: {limit: number; offset: number}, options?: CallOptions): Promise<WorkResult>;
  evaluation(args?: Record<string, never>, options?: CallOptions): Promise<WorkResult>;
  close(): Promise<void>;
  stats(): {pending: number; closed: boolean; operations: Operation[]; hostedRegistration: false};
}
export function createWorkLearningGateway(options: {backend: Backend; owner: string; workspaceId: string;
  authorize(check: PolicyCheck): boolean | Promise<boolean>; verifyPins(): PinIdentity | Promise<PinIdentity>;
  sourceManifest: SourceRef[] | SourceManifest; timeoutMs?: number; maxPending?: number; maxResultBytes?: number;
  /** LEGACY preserves prior behavior; STRICT_SOURCE_ONLY requires host-injected hooks, not live policy proof. */
  purposePolicy?: 'LEGACY' | 'STRICT_SOURCE_ONLY';
  authorizeInferenceUse?: (check: InferenceUseCheck) => boolean | Promise<boolean>;
  hostOwnedFinalReturnSync?: (check: FinalReturnCheck) => boolean}): Gateway;
export function createFilePinVerifier(options: {files: {path: string; sha256: string}[]; identity: PinIdentity; maxFileBytes?: number}): () => Promise<PinIdentity>;
export function createPythonBackend(options: {workspace: string; moduleRoot: string; expectedConfigSha256: string;
  pythonExecutable?: string; configPath?: string; timeoutMs?: number; maxPending?: number; maxPendingBytes?: number;
  maxResponseBytes?: number; shutdownGraceMs?: number}): Backend & {stats(): Record<string, unknown>};
export interface ResponsesFunctionTool { type: 'function'; name: string; description: string; strict: true; parameters: Record<string, unknown> }
export function createResponsesTools(): readonly ResponsesFunctionTool[];
export function dispatchResponsesFunctionCall(gateway: Gateway, call: {type: 'function_call'; call_id: string; name: string; arguments: string}, options?: CallOptions): Promise<{type: 'function_call_output'; call_id: string; output: string}>;
export function runResponsesWorkLearning(options?: {enabled?: boolean; client?: {responses: {create(request: unknown, options?: CallOptions): Promise<any>}};
  gateway?: Gateway; model?: string; input?: string | unknown[]; instructions?: string; maxResponses?: number;
  maxToolCalls?: number; maxOutputTokens?: number; maxHistoryBytes?: number; signal?: AbortSignal}): Promise<Record<string, unknown>>;
export const MCP_PROTOCOL_VERSION: string;
export function createMcpTools(): unknown[];
export function createMcpRouter(options: {gateway: Gateway}): (message: unknown, options?: CallOptions) => Promise<unknown>;
export function runMcpStdio(options: {gateway: Gateway; input?: AsyncIterable<Uint8Array | string>; output?: any;
  maxFrameBytes?: number; signal?: AbortSignal; closeOnEnd?: boolean}): Promise<{frames: number; hostedRegistration: false}>;
export function openMcpConfiguration(path: string): Promise<Gateway>;
export function authorizedResultMetadata(result: WorkResult): {operation: Operation; owner: string; workspaceId: string; purposePolicy: 'LEGACY' | 'STRICT_SOURCE_ONLY'; provenanceDigest: string};
export function toGraphFabricPart(result: WorkResult): Record<string, unknown>;
export function composeAtlasGraphFabric(result: WorkResult, options: {composeSelectedGraph: Function; authorize: Function}): Promise<Record<string, unknown>>;
export function toMeta145Evidence(result: WorkResult): Record<string, unknown>;
export function attachMeta145Context(result: WorkResult, circuit: {status(): {sourceSHA256: string}; resolve(hsn: string): unknown}): Record<string, unknown>;
export type Consumer = Pick<Gateway, 'status' | 'search' | 'node' | 'episodes' | 'evaluation'>;
export function createAtlasConsumers(gateway: Gateway): {atlasIntelligence: Consumer; atlasgpt: Consumer; swarmchat: Consumer; hostedRegistration: false; modelTrainingPerformed: false};
export function createProviderPlugin(options: {name: string; enabled?: boolean; invoke?: Function}): {name: string; enabled: boolean; invoke(input: unknown, options?: unknown): Promise<unknown>};
export const VERSION: string;
export const OPERATIONS: readonly Operation[];
export const TOOL_DEFINITIONS: readonly unknown[];
export class WorkLearningError extends Error { code: string; constructor(code: string, message?: string) }
export function parseStrictJson(text: string, maxBytes?: number): unknown;
export function validateArguments(operation: Operation, input: unknown): Readonly<Record<string, unknown>>;

/** Prepare review-only source references from owner-pinned pretrained results. No source text or rights grant. */
export function stageMicaEvidence(input: Record<string, unknown>): Record<string, unknown>;
export function prepareTrainingLabel(ref: Record<string, unknown>, trusted: Record<string, unknown>): Record<string, unknown>;
