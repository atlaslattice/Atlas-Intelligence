import {spawn} from 'node:child_process';
import {isAbsolute, join} from 'node:path';
import {StringDecoder} from 'node:string_decoder';
import {parseStrictJson, requireCondition, SHA256, validateArguments, WorkLearningError} from './contracts.mjs';
import {createFilePinVerifier} from './gateway.mjs';

/** Fixed owner-local Python protocol. No shell, automatic retries, restart or network client. */
export function createPythonBackend({workspace, expectedConfigSha256, moduleRoot, pythonExecutable = 'python3',
  configPath = join(workspace ?? '', 'config.json'), timeoutMs = 30_000, maxPending = 16,
  maxPendingBytes = 262_144, maxResponseBytes = 4_194_304, shutdownGraceMs = 500} = {}) {
  requireCondition(isAbsolute(workspace ?? '') && isAbsolute(moduleRoot ?? '') && isAbsolute(configPath)
    && SHA256.test(expectedConfigSha256 ?? '') && typeof pythonExecutable === 'string' && pythonExecutable.length > 0, 'PYTHON_CONFIGURATION');
  requireCondition(Number.isSafeInteger(timeoutMs) && timeoutMs >= 10 && timeoutMs <= 120_000
    && Number.isSafeInteger(maxPending) && maxPending >= 1 && maxPending <= 128
    && Number.isSafeInteger(maxPendingBytes) && maxPendingBytes >= 1024 && maxPendingBytes <= 8_388_608
    && Number.isSafeInteger(maxResponseBytes) && maxResponseBytes >= 1024 && maxResponseBytes <= 16_777_216
    && Number.isSafeInteger(shutdownGraceMs) && shutdownGraceMs >= 10 && shutdownGraceMs <= 5000, 'PYTHON_BOUNDS');
  let child = null, startPromise = null, closed = false, failure = null, serial = 0, pendingBytes = 0;
  let stdoutBuffer = '', stderrBytes = 0, receiveChain = Promise.resolve(), closePromise = null, queuedResponses = 0;
  const pending = new Map(), decoder = new StringDecoder('utf8');
  let childExit = Promise.resolve();
  const configVerifier = createFilePinVerifier({files: [{path: configPath, sha256: expectedConfigSha256}], identity: {}, maxFileBytes: 1_048_576});
  async function checkConfig() {
    try { await configVerifier(); }
    catch { throw new WorkLearningError('CONFIG_PIN_MISMATCH', 'The pinned backend configuration changed or is unavailable.'); }
  }
  function settle(id, error, result) {
    const request = pending.get(id); if (!request) return;
    pending.delete(id); pendingBytes -= request.bytes; clearTimeout(request.timer);
    request.signal?.removeEventListener('abort', request.abort);
    if (error) request.reject(error); else request.resolve(result);
  }
  function terminate(error) {
    if (!failure) failure = error;
    closed = true;
    for (const id of [...pending.keys()]) settle(id, failure);
    if (child && child.exitCode === null && child.signalCode === null) {
      child.stdin.destroy(); child.kill('SIGTERM');
      const timer = setTimeout(() => { if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL'); }, shutdownGraceMs);
      timer.unref();
    }
  }
  async function receive(line) {
    if (closed) return;
    try {
      const message = parseStrictJson(line, maxResponseBytes);
      requireCondition(message && typeof message.id === 'string' && pending.has(message.id)
        && typeof message.ok === 'boolean', 'BACKEND_PROTOCOL');
      await checkConfig();
      if (closed) return;
      if (message.ok) {
        requireCondition(Object.hasOwn(message, 'result'), 'BACKEND_PROTOCOL');
        settle(message.id, null, message.result);
      } else {
        const code = typeof message.error?.code === 'string' && /^[A-Z0-9_]{1,80}$/.test(message.error.code) ? message.error.code : 'ERROR';
        const error = new WorkLearningError('BACKEND_' + code, 'The local Python service withheld the requested result.');
        if (/PIN|DRIFT|TAMPER|SOURCE_CHANGED/.test(code)) terminate(error); else settle(message.id, error);
      }
    } catch (error) { terminate(error instanceof WorkLearningError ? error : new WorkLearningError('BACKEND_PROTOCOL')); }
  }
  function consume(chunk) {
    if (closed) return;
    stdoutBuffer += decoder.write(chunk);
    let newline;
    while ((newline = stdoutBuffer.indexOf('\n')) !== -1) {
      const line = stdoutBuffer.slice(0, newline).replace(/\r$/, ''); stdoutBuffer = stdoutBuffer.slice(newline + 1);
      if (Buffer.byteLength(line) > maxResponseBytes) { terminate(new WorkLearningError('BACKEND_RESPONSE_BOUNDS')); return; }
      if (!line) { terminate(new WorkLearningError('BACKEND_PROTOCOL')); return; }
      if (++queuedResponses > maxPending) { terminate(new WorkLearningError('BACKEND_RESPONSE_QUEUE')); return; }
      receiveChain = receiveChain.then(() => receive(line)).finally(() => { queuedResponses--; });
    }
    if (Buffer.byteLength(stdoutBuffer) > maxResponseBytes) terminate(new WorkLearningError('BACKEND_RESPONSE_BOUNDS'));
  }
  async function start() {
    if (closed) throw failure ?? new WorkLearningError('BACKEND_CLOSED');
    if (startPromise) return startPromise;
    startPromise = (async () => {
      await checkConfig();
      if (closed) throw failure ?? new WorkLearningError('BACKEND_CLOSED');
      const environment = {PATH: process.env.PATH ?? '/usr/bin:/bin', LANG: 'C.UTF-8', PYTHONPATH: moduleRoot,
        PYTHONUNBUFFERED: '1', PYTHONDONTWRITEBYTECODE: '1', OPENBLAS_NUM_THREADS: '1', OMP_NUM_THREADS: '1'};
      child = spawn(pythonExecutable, ['-m', 'atlas_work_learning', 'serve', '--workspace', workspace,
        '--expected-config-sha256', expectedConfigSha256], {cwd: moduleRoot, env: environment, shell: false, stdio: ['pipe', 'pipe', 'pipe']});
      childExit = new Promise(resolve => child.once('close', resolve));
      child.stdout.on('data', consume);
      child.stderr.on('data', chunk => { stderrBytes += chunk.length; });
      child.stdin.on('error', () => terminate(new WorkLearningError('BACKEND_TRANSPORT')));
      child.on('error', () => terminate(new WorkLearningError('BACKEND_START_FAILED')));
      child.on('close', () => {
        if (!closed || pending.size) terminate(new WorkLearningError('BACKEND_EXITED'));
      });
      await new Promise((resolve, reject) => {
        child.once('spawn', resolve);
        child.once('error', () => reject(new WorkLearningError('BACKEND_START_FAILED')));
      });
    })().catch(error => { terminate(error); throw error; });
    return startPromise;
  }
  async function execute(operation, input, {signal} = {}) {
    const args = validateArguments(operation, input);
    requireCondition(!closed, 'BACKEND_CLOSED');
    if (signal?.aborted) throw new WorkLearningError('REQUEST_CANCELLED');
    const id = 'awl-' + (++serial), payload = JSON.stringify({id, operation, arguments: args}) + '\n';
    const bytes = Buffer.byteLength(payload);
    requireCondition(pending.size < maxPending && pendingBytes + bytes <= maxPendingBytes, 'QUEUE_FULL');
    return new Promise((resolve, reject) => {
      const abort = () => terminate(new WorkLearningError('REQUEST_CANCELLED'));
      const timer = setTimeout(() => terminate(new WorkLearningError('BACKEND_TIMEOUT')), timeoutMs);
      pending.set(id, {resolve, reject, timer, bytes, signal, abort}); pendingBytes += bytes;
      signal?.addEventListener('abort', abort, {once: true});
      (async () => {
        try {
          await start(); await checkConfig();
          if (closed || !pending.has(id)) return;
          child.stdin.write(payload, error => { if (error) terminate(new WorkLearningError('BACKEND_TRANSPORT')); });
        } catch (error) { terminate(error instanceof WorkLearningError ? error : new WorkLearningError('BACKEND_TRANSPORT')); }
      })();
    });
  }
  function close() {
    if (closePromise) return closePromise;
    closePromise = (async () => {
      closed = true;
      for (const id of [...pending.keys()]) settle(id, new WorkLearningError('BACKEND_CLOSED'));
      if (!child) return;
      child.stdin.end();
      const timer = setTimeout(() => child.kill('SIGTERM'), shutdownGraceMs);
      const killTimer = setTimeout(() => child.kill('SIGKILL'), shutdownGraceMs * 2);
      try { await childExit; } finally { clearTimeout(timer); clearTimeout(killTimer); }
    })();
    return closePromise;
  }
  return Object.freeze({execute, close, stats: () => ({started: child !== null, closed, pending: pending.size,
    pendingBytes, queuedResponses, stderrBytes, pid: child?.pid ?? null, automaticRestarts: 0})});
}
