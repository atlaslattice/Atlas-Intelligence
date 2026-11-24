/** Portable, read-only source adapter for the existing Atlas ONE / SwarmChat hosts.
 * This module never runs task action strings, posts messages, changes canon, or
 * converts a planned step into evidence. The Python ledger owns execution state.
 */
export const EXCELLENCE_SCHEMA = 'atlas.excellence.plan.v1';
export const EXCELLENCE_PROGRAM_ID = 'ATLAS-EXCELLENCE-1728-20261123';
export const ARIADNE_SOURCE_SHA256 = '07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6';
export const CANON_DECISION_ID = 'ATLAS-UHM-CANON-20261123-001';
const SHA = /^[a-f0-9]{64}$/;
const TASK = /^EX\.W(0[1-9]|1[0-2])\.C(0[1-9]|1[0-2])\.P(0[1-9]|1[0-2])$/;
const ROOM = /^[A-Za-z0-9_-]{3,80}$/;
const MAX_BYTES = 48 * 1024 * 1024;
const verifiedPrograms = new WeakSet();
export const isVerifiedProgram = value => verifiedPrograms.has(value);
const obj = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const fail = code => { throw Object.assign(new TypeError(code), {code}); };
const require_ = (ok, code) => { if (!ok) fail(code); };
const copy = value => JSON.parse(JSON.stringify(value));
const freeze = value => { if (value && typeof value === 'object') { for (const item of Object.values(value)) freeze(item); Object.freeze(value); } return value; };
const pad = n => String(n).padStart(2, '0');
const ids = (values, expected, code) => {
  require_(Array.isArray(values) && values.length === expected.length && new Set(values).size === values.length, code);
  const given = new Set(values); require_(expected.every(id => given.has(id)), code);
};
const assertText = (value, code, max = 2048) => require_(typeof value === 'string' && value.trim() && value.length <= max, code);

export async function sha256Bytes(value) {
  require_(typeof value === 'string' || value instanceof Uint8Array, 'PLAN_BYTES_REQUIRED');
  if (typeof value === 'string') require_(value.length <= MAX_BYTES, 'PLAN_TOO_LARGE');
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  require_(bytes.byteLength <= MAX_BYTES, 'PLAN_TOO_LARGE');
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

/** Structural validation is not proof of the semantic merit of the planned work. */
export function validateExcellencePlan(plan) {
  require_(obj(plan) && plan.schema === EXCELLENCE_SCHEMA && plan.program_id === EXCELLENCE_PROGRAM_ID, 'PLAN_IDENTITY_INVALID');
  require_(Number.isSafeInteger(plan.revision) && plan.revision > 0 && plan.status === 'PLANNED' && plan.engineering_namespace === 'EX1728', 'PLAN_STATUS_INVALID');
  const workstreams = Array.from({length:12}, (_,w) => `EX.W${pad(w+1)}`);
  const capabilities = workstreams.flatMap(w => Array.from({length:12}, (_,c) => `${w}.C${pad(c+1)}`));
  const phases = Array.from({length:12}, (_,p) => `P${pad(p+1)}`);
  require_(Array.isArray(plan.workstreams) && Array.isArray(plan.capabilities) && Array.isArray(plan.phases), 'PLAN_CATALOG_MISSING');
  ids(plan.workstreams.map(w => w?.id), workstreams, 'WORKSTREAM_COVERAGE_INVALID');
  ids(plan.capabilities.map(c => c?.id), capabilities, 'CAPABILITY_COVERAGE_INVALID');
  ids(plan.phases.map(p => p?.id), phases, 'PHASE_COVERAGE_INVALID');
  const expectedTaskIds = capabilities.flatMap(c => phases.map(p => `${c}.${p}`));
  require_(Array.isArray(plan.tasks), 'TASKS_MISSING');
  ids(plan.tasks.map(t => t?.id), expectedTaskIds, 'TASK_COVERAGE_INVALID');
  require_(obj(plan.source_pins) && Object.keys(plan.source_pins).length > 0 && Object.keys(plan.source_pins).length <= 4096, 'SOURCE_PINS_INVALID');
  for (const [key, value] of Object.entries(plan.source_pins)) {
    assertText(key, 'SOURCE_ID_INVALID', 500);
    require_(!['__proto__','prototype','constructor'].includes(key) && typeof value === 'string' && SHA.test(value), 'SOURCE_PIN_INVALID');
  }
  require_(Object.values(plan.source_pins).includes(ARIADNE_SOURCE_SHA256), 'ARIADNE_SOURCE_PIN_MISSING');
  require_(obj(plan.integrity) && plan.integrity.algorithm === 'sha256', 'INTEGRITY_DESCRIPTOR_INVALID');
  for (const key of ['catalog_sha256','phases_sha256','source_inventory_sha256']) require_(typeof plan.integrity[key] === 'string' && SHA.test(plan.integrity[key]), 'INTEGRITY_DESCRIPTOR_INVALID');
  const coverage = plan.coverage;
  require_(obj(coverage) && coverage.ariadne_source_sha256 === ARIADNE_SOURCE_SHA256 && coverage.ordinal_identity_implied === false && coverage.semantic_crosswalk_status === 'SOURCE_REVIEW_REQUIRED', 'ARIADNE_SCOPE_INVALID');
  const houses = Array.from({length:12}, (_,h) => `H${pad(h+1)}`);
  const spheres = houses.flatMap(h => Array.from({length:12}, (_,s) => `${h}.S${pad(s+1)}`));
  const nodes = spheres.flatMap(s => Array.from({length:12}, (_,n) => `${s}.N${pad(n+1)}`));
  ids(coverage.ariadne_house_ids, houses, 'ARIADNE_HOUSE_COVERAGE_INVALID');
  ids(coverage.ariadne_sphere_ids, spheres, 'ARIADNE_SPHERE_COVERAGE_INVALID');
  ids(coverage.ariadne_node_ids, nodes, 'ARIADNE_NODE_COVERAGE_INVALID');
  require_(obj(plan.canon_reference) && plan.canon_reference.decision_id === CANON_DECISION_ID, 'CANON_REFERENCE_INVALID');
  const macro = plan.macroturn_policy;
  require_(obj(macro) && macro.work_numerator === 1 && macro.work_denominator === 3 && macro.genuine_macroturns_completed === 0, 'MACROTURN_SCOPE_INVALID');
  const taskSet = new Set(expectedTaskIds), indegree = new Map(), outgoing = new Map(expectedTaskIds.map(id => [id, []]));
  for (const task of plan.tasks) {
    require_(obj(task) && TASK.test(task.id) && task.status === 'PLANNED', 'TASK_STATUS_INVALID');
    const [,w,c,p] = task.id.match(TASK);
    require_(task.workstream_id === `EX.W${w}` && task.capability_id === `EX.W${w}.C${c}` && task.phase_id === `P${p}`, 'TASK_COORDINATE_INVALID');
    require_(obj(task.engineering_coordinate) && task.engineering_coordinate.workstream === Number(w) && task.engineering_coordinate.capability === Number(c) && task.engineering_coordinate.phase === Number(p), 'TASK_COORDINATE_INVALID');
    for (const key of ['title','objective','action','artifact']) assertText(task[key], 'TASK_TEXT_INVALID', 20000);
    require_(Array.isArray(task.depends_on) && task.depends_on.length <= 1727 && new Set(task.depends_on).size === task.depends_on.length && task.depends_on.every(id => id !== task.id && taskSet.has(id)), 'TASK_DEPENDENCY_INVALID');
    require_(Array.isArray(task.source_refs) && task.source_refs.length > 0 && new Set(task.source_refs).size === task.source_refs.length && task.source_refs.every(id => Object.hasOwn(plan.source_pins, id)), 'TASK_SOURCE_REFERENCE_INVALID');
    for (const key of ['acceptance','negative_cases','metrics','write_resources']) require_(Array.isArray(task[key]), 'TASK_ACCEPTANCE_CONTRACT_INVALID');
    require_(task.acceptance.length > 0 && task.negative_cases.length > 0, 'TASK_ACCEPTANCE_CONTRACT_INVALID');
    require_(obj(task.required_checks) && ['IMPLEMENTED','VERIFIED','INTEGRATED'].every(stage => Array.isArray(task.required_checks[stage]) && task.required_checks[stage].length > 0 && task.required_checks[stage].every(id => typeof id === 'string' && id.startsWith(task.id + ':'))), 'TASK_EVIDENCE_CONTRACT_INVALID');
    indegree.set(task.id, task.depends_on.length);
    for (const id of task.depends_on) outgoing.get(id).push(task.id);
  }
  const queue = expectedTaskIds.filter(id => indegree.get(id) === 0); let cursor = 0;
  while (cursor < queue.length) for (const id of outgoing.get(queue[cursor++])) {
    indegree.set(id, indegree.get(id) - 1); if (indegree.get(id) === 0) queue.push(id);
  }
  require_(queue.length === 1728, 'TASK_DEPENDENCY_CYCLE');
  return Object.freeze({valid:true,plannedSteps:1728,engineeringCapabilities:144,engineeringWorkstreams:12,engineeringPhases:12,ariadneNodes:1728,ariadneSpheres:144,ariadneHouses:12,semanticCrosswalkAccepted:false});
}

/** Exact byte digest comes from the integrating source manifest, not the JSON itself. */
export async function createExcellenceProgram(planBytes, expectedSha256) {
  require_(typeof expectedSha256 === 'string' && SHA.test(expectedSha256), 'EXPECTED_PLAN_DIGEST_REQUIRED');
  const actualSha256 = await sha256Bytes(planBytes);
  require_(actualSha256 === expectedSha256, 'PLAN_DIGEST_MISMATCH');
  const text = typeof planBytes === 'string' ? planBytes : new TextDecoder('utf-8', {fatal:true}).decode(planBytes);
  let parsed; try { parsed = JSON.parse(text); } catch { fail('PLAN_JSON_INVALID'); }
  const validation = validateExcellencePlan(parsed), plan = freeze(parsed);
  const byId = new Map(plan.tasks.map(t => [t.id, t]));
  const searchable = plan.tasks.map(task => ({task, tokens:`${task.id} ${task.title} ${task.objective} ${task.action}`.toLowerCase()}));
  const taskById = id => { require_(typeof id === 'string' && byId.has(id), 'TASK_UNKNOWN'); return byId.get(id); };
  const descriptor = () => ({schema:'atlas.excellence.integration-status.v1',programId:plan.program_id,revision:plan.revision,planSha256:actualSha256,
    status:'PLANNED_PROGRAM_SOURCE_VERIFIED',...validation,implementedSteps:0,verifiedSteps:0,integratedSteps:0,
    taskStateSource:'PLANNED_MANIFEST_ONLY_USE_PYTHON_LEDGER_FOR_EXECUTION_STATE',canonDecisionReference:CANON_DECISION_ID,
    canonChanged:false,authorityEffect:'NONE',hostPermissionGranted:false,workPosted:false,genuineMacroturnsCompleted:0,modelWeightsUpdated:false,
    automaticBackgroundRuns:false,ariadneSourceSha256:ARIADNE_SOURCE_SHA256,ordinalIdentityImplied:false,
    macroturnPolicy:{workNumerator:1,workDenominator:3,nonWorkModesRemainSeparate:true},
    meta145:{engineeringCapabilities:144,originalSpherePerspectives:144,houseReviews:12,metaBuildOrdinal:145,gainsIntegrated:0,readiness:'REQUIRES_EXECUTION_EVIDENCE'}});
  const program = Object.freeze({
    descriptor,
    task(id) { return copy(taskById(id)); },
    query(options = {}) {
      require_(obj(options) && Object.keys(options).every(k => ['text','workstream','phase','offset','limit'].includes(k)), 'QUERY_OPTIONS_INVALID');
      const {text = '', workstream, phase, offset = 0, limit = 24} = options;
      require_(typeof text === 'string' && text.length <= 160 && Number.isSafeInteger(offset) && offset >= 0 && offset <= 1728 && Number.isSafeInteger(limit) && limit >= 1 && limit <= 144, 'QUERY_BOUNDS_INVALID');
      require_(workstream === undefined || plan.workstreams.some(w => w.id === workstream), 'QUERY_WORKSTREAM_INVALID');
      require_(phase === undefined || plan.phases.some(p => p.id === phase), 'QUERY_PHASE_INVALID');
      const terms = text.toLowerCase().trim().split(/\s+/).filter(Boolean);
      const selected = searchable.filter(({task,tokens}) => (!workstream || task.workstream_id === workstream) && (!phase || task.phase_id === phase) && terms.every(term => tokens.includes(term)));
      return {schema:'atlas.excellence.task-page.v1',planSha256:actualSha256,total:selected.length,offset,limit,hasMore:offset + limit < selected.length,tasks:selected.slice(offset,offset+limit).map(x => copy(x.task)),status:'PLANNED',queryMeaning:'LITERAL_FILTER_NOT_SEMANTIC_ACCEPTANCE'};
    },
    ready(options = {}) {
      require_(obj(options) && Object.keys(options).every(k => k === 'limit'), 'READY_OPTIONS_INVALID');
      const limit = options.limit ?? 24; require_(Number.isSafeInteger(limit) && limit >= 1 && limit <= 144, 'READY_BOUNDS_INVALID');
      const roots = plan.tasks.filter(t => t.depends_on.length === 0);
      return {schema:'atlas.excellence.initial-ready.v1',planSha256:actualSha256,status:'INITIAL_PLAN_ROOTS_ONLY',total:roots.length,tasks:roots.slice(0,limit).map(copy),executionAuthorized:false,completionClaimsAccepted:false};
    },
    prepareWorkTask(taskId, {roomId,mode = 'WORK'} = {}) {
      require_(mode === 'WORK' && typeof roomId === 'string' && ROOM.test(roomId), 'WORK_SCOPE_REQUIRED');
      const task = taskById(taskId);
      return {schema:'atlas.excellence.work-handoff.v1',status:'PREPARED_NOT_POSTED',roomId,mode,programId:plan.program_id,planSha256:actualSha256,
        task:{id:task.id,title:task.title,objective:task.objective,dependsOn:[...task.depends_on],requiredChecks:copy(task.required_checks)},
        sourcePins:copy(plan.source_pins),canonDecisionReference:CANON_DECISION_ID,ariadneSourceSha256:ARIADNE_SOURCE_SHA256,
        engineeringCoordinateIsKnowledgeIdentity:false,sourceBodiesIncluded:false,workPosted:false,executionAuthorized:false,hostAuthenticated:false,
        nextRequirement:'CURRENT_WORK_HOST_RIGHTS_AND_PYTHON_LEDGER_DEPENDENCY_CHECK'};
    }
  });
  verifiedPrograms.add(program);
  return program;
}

/** Optional inspection through the publisher's existing WorkHostPort.
 * Even a successful injected callback is a report, not independent authentication.
 */
export function createExcellenceWorkBridge(program, hostPort) {
  require_(program && verifiedPrograms.has(program) && hostPort && typeof hostPort.query === 'function', 'EXISTING_PROGRAM_AND_WORK_HOST_PORT_REQUIRED');
  const deny = reason => ({schema:'atlas.excellence.work-source-inspection.v1',status:'HOLD',reason,data:null,bodyReturned:false,hostAuthenticated:false,rightsAtReturnIndependentlyVerified:false,workPosted:false,executionAuthorized:false});
  return Object.freeze({async inspect({taskId,roomId,seq,mode = 'WORK'} = {}) {
    if (mode !== 'WORK' || !Number.isSafeInteger(seq) || seq < 1 || seq > 500) return deny('WORK_SOURCE_SELECTION_REQUIRED');
    let prepared; try { prepared = program.prepareWorkTask(taskId,{roomId,mode}); } catch { return deny('PLAN_TASK_OR_ROOM_INVALID'); }
    let response; try { response = await hostPort.query({roomId,sourceSeqs:[seq],purpose:'research'}); } catch { return deny('HOST_SOURCE_QUERY_FAILED'); }
    if (response?.status !== 'HOST_REPORTED_READ_RETURN_RECHECKED_SOURCE_ONLY' || response?.data?.sourceCount !== 1 || !Array.isArray(response?.data?.references) || response.data.references.length !== 1) return deny('HOST_SOURCE_POINTER_REQUIRED');
    const ref = response.data.references[0];
    if (ref.roomId !== roomId || ref.seq !== seq || typeof ref.sourceSHA256 !== 'string' || !SHA.test(ref.sourceSHA256)) return deny('HOST_SOURCE_POINTER_MISMATCH');
    return {schema:'atlas.excellence.work-source-inspection.v1',status:'HOST_CALLBACK_REPORTED_SOURCE_POINTER_NOT_ATTESTED',
      data:{programId:EXCELLENCE_PROGRAM_ID,planSha256:prepared.planSha256,taskId,roomId,seq,sourceMessageSha256:ref.sourceSHA256},
      bodyReturned:false,hostAuthenticated:false,rightsAtReturnIndependentlyVerified:false,workPosted:false,executionAuthorized:false};
  }});
}
