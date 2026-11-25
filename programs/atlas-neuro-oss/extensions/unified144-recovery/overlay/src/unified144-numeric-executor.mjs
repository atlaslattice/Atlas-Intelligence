/** Explicit local, finite, read-only Python bridge for the ONE optional module.
 * Trusted host configuration only; no input-selected paths, code or trainers.
 * No provider credentials are forwarded. This is not hosted execution attestation.
 */
import {createHash} from 'node:crypto';
import {lstatSync, readFileSync} from 'node:fs';
import {resolve, isAbsolute} from 'node:path';
import {spawn} from 'node:child_process';
import {types} from 'node:util';
import {captureData, deepFreeze, parseStrictJson, requireCondition, WorkLearningError,
  bindAbort, unbindAbort, signalAborted} from './contracts.mjs';

const PORT_SHA256 = '903aa310b50ace255e1ecfea47e975368672651371b3381197d5a66d044e2bb8';
const SHA = value => createHash('sha256').update(value).digest('hex');
const INTEGER = (x, lo, hi) => Number.isSafeInteger(x) && x >= lo && x <= hi;
const OUTPUT_KEYS = ['schema', 'operation', 'subjectResultSha256', 'catalogSha256', 'featureId',
  'value', 'optimizerUpdates', 'modelCalls', 'executingRuntimeAttested', 'featureWholeImplemented'];

export function createAtlasUnified144NumericExecutor(options) {
  requireCondition(!types.isProxy(options) && options !== null && typeof options === 'object'
    && !Array.isArray(options), 'UNIFIED144_EXECUTOR_CONFIGURATION');
  const descriptors = Object.getOwnPropertyDescriptors(options);
  const allowed = ['portPath', 'kernelRoot', 'pythonExecutable', 'timeoutMs', 'maxPending'];
  requireCondition(Reflect.ownKeys(options).every(key => typeof key === 'string' && allowed.includes(key)),
    'UNIFIED144_EXECUTOR_CONFIGURATION');
  const config = {};
  for (const [key, property] of Object.entries(descriptors)) {
    requireCondition(property.enumerable && Object.hasOwn(property, 'value'), 'UNIFIED144_EXECUTOR_CONFIGURATION');
    config[key] = property.value;
  }
  requireCondition(typeof config.portPath === 'string' && isAbsolute(config.portPath)
    && typeof config.kernelRoot === 'string' && isAbsolute(config.kernelRoot), 'UNIFIED144_EXECUTOR_FIXED_PATHS');
  const portPath = resolve(config.portPath), kernelRoot = resolve(config.kernelRoot);
  const pythonExecutable = config.pythonExecutable ?? 'python3';
  requireCondition(typeof pythonExecutable === 'string' && pythonExecutable.length > 0
    && pythonExecutable.length <= 4096 && !pythonExecutable.includes('\0'), 'UNIFIED144_INTERPRETER');
  const timeoutMs = config.timeoutMs ?? 5000, maxPending = config.maxPending ?? 2;
  requireCondition(INTEGER(timeoutMs, 100, 10_000) && INTEGER(maxPending, 1, 4), 'UNIFIED144_EXECUTOR_BUDGET');
  let pending = 0, processesStarted = 0, processAttempts = 0;

  function capturedPort() {
    const stat = lstatSync(portPath);
    requireCondition(stat.isFile() && !stat.isSymbolicLink() && stat.size <= 131_072, 'UNIFIED144_PORT_SOURCE');
    const bytes = readFileSync(portPath);
    requireCondition(SHA(bytes) === PORT_SHA256, 'UNIFIED144_PORT_SOURCE_CHANGED');
    return bytes.toString('utf8');
  }
  capturedPort();

  async function invoke(rawRequest, {signal} = {}) {
    requireCondition(!signalAborted(signal), 'REQUEST_CANCELLED');
    const request = deepFreeze(captureData(rawRequest, {maxBytes: 65_536, maxNodes: 50_000, maxDepth: 30}));
    const stdin = JSON.stringify(request);
    requireCondition(Buffer.byteLength(stdin) <= 65_536, 'UNIFIED144_INPUT_BOUNDS');
    const source = capturedPort();
    requireCondition(pending < maxPending, 'UNIFIED144_EXECUTOR_BUSY');
    // Execute exactly the verified capture. __file__ is a trusted fixed host
    // path used only to locate the separately pinned corpus-audit source.
    const bootstrap = `__file__ = ${JSON.stringify(portPath)}\n__name__ = 'atlas_unified144_numeric_bridge'\nexec(compile(${JSON.stringify(source)}, __file__, 'exec'))\nsys.path.append(${JSON.stringify(kernelRoot)})\nraise SystemExit(main())`;
    pending++;
    return await new Promise((resolveResult, rejectResult) => {
      let child, timer, failed = false, closed = false, stdoutBytes = 0, stderrBytes = 0;
      const stdout = [], stderr = [];
      const fail = code => {
        if (failed || closed) return;
        failed = true;
        if (child && child.exitCode === null) child.kill('SIGKILL');
        rejectResult(new WorkLearningError(code));
      };
      const onAbort = () => fail('REQUEST_CANCELLED');
      try {
        processAttempts++;
        child = spawn(pythonExecutable, ['-I', '-B', '-S', '-c', bootstrap], {shell: false,
          env: {PATH: process.env.PATH ?? '/usr/bin:/bin'}, stdio: ['pipe', 'pipe', 'pipe']});
      } catch {
        pending--; closed = true; rejectResult(new WorkLearningError('UNIFIED144_PROCESS_START')); return;
      }
      bindAbort(signal, onAbort);
      timer = setTimeout(() => fail('UNIFIED144_PROCESS_TIMEOUT'), timeoutMs);
      child.once('spawn', () => {processesStarted++;});
      child.on('error', () => fail('UNIFIED144_PROCESS_START'));
      child.stdin.on('error', () => fail('UNIFIED144_PROCESS_INPUT'));
      child.stdout.on('data', data => {
        stdoutBytes += data.length;
        if (stdoutBytes > 1_048_576) fail('UNIFIED144_OUTPUT_BOUNDS'); else stdout.push(data);
      });
      child.stderr.on('data', data => {
        stderrBytes += data.length;
        if (stderrBytes > 65_536) fail('UNIFIED144_ERROR_BOUNDS'); else stderr.push(data);
      });
      child.on('close', code => {
        closed = true; pending--; clearTimeout(timer); unbindAbort(signal, onAbort);
        if (failed) return;
        if (signalAborted(signal)) {rejectResult(new WorkLearningError('REQUEST_CANCELLED')); return;}
        if (code !== 0) {rejectResult(new WorkLearningError('UNIFIED144_NUMERIC_REQUEST_REJECTED')); return;}
        try {
          const output = parseStrictJson(Buffer.concat(stdout).toString('utf8'), 1_048_576);
          requireCondition(output?.schema === 'atlas.oss144.numeric-output/v1'
            && Object.keys(output).length === OUTPUT_KEYS.length && OUTPUT_KEYS.every(key => Object.hasOwn(output, key))
            && output.operation === request.operation && output.subjectResultSha256 === request.subjectResultSha256
            && output.catalogSha256 === request.catalogSha256 && output.featureId === request.featureId
            && output.optimizerUpdates === 0 && output.modelCalls === 0 && output.executingRuntimeAttested === false
            && output.featureWholeImplemented === false,
          'UNIFIED144_NUMERIC_CONTRACT');
          resolveResult(deepFreeze(output));
        } catch {rejectResult(new WorkLearningError('UNIFIED144_NUMERIC_CONTRACT'));}
      });
      if (signalAborted(signal)) onAbort();
      child.stdin.end(stdin);
    });
  }
  return Object.freeze({invoke,
    describe: () => Object.freeze({kind: 'EXPLICIT_LOCAL_READ_ONLY_EXECUTOR', portSha256: PORT_SHA256,
      providerCalls: 0, optimizerUpdates: 0, modelCalls: 0, executingRuntimeAttested: false, maxPending, timeoutMs}),
    stats: () => Object.freeze({pending, processesStarted, processAttempts})});
}
