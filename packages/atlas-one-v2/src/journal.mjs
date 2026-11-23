/** Atlas ONE v2 durable local journal. No cross-host claims.
 * Append-only logical events persisted in a single atomic snapshot and protected
 * by an exclusive process lock. Lost acknowledgements remain UNCERTAIN, never retried blindly.
 */
import {openSync,closeSync,readFileSync,writeFileSync,renameSync,mkdirSync,existsSync,fsyncSync,unlinkSync,statSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {digest,canonical,Hold,requireValid,isObject} from './index.mjs';
const SHA=/^[a-f0-9]{64}$/;
const ID=/^[A-Za-z][A-Za-z0-9._:-]{2,79}$/;
const ZERO='0'.repeat(64);
// Bound adversarial or corrupt local journal files before JSON.parse or
// recursive canonicalization. These are source-candidate limits, not a claim
// about cloud/D1 storage or host policy.
const MAX_JOURNAL_RAW_BYTES=2_000_000;
const MAX_JOURNAL_NESTING=64;
function preflightJournalRaw(raw){
  requireValid(raw.length<=MAX_JOURNAL_RAW_BYTES,'JOURNAL_RAW_SIZE_LIMIT');
  let depth=0,quoted=false,escaped=false;
  // ASCII JSON structural bytes remain unambiguous in UTF-8. Ignore brackets
  // inside JSON strings, including escaped quotes and escaped backslashes.
  for(const byte of raw){
    if(quoted){
      if(escaped)escaped=false;
      else if(byte===0x5c)escaped=true;
      else if(byte===0x22)quoted=false;
      continue;
    }
    if(byte===0x22){quoted=true;continue;}
    if(byte===0x7b||byte===0x5b){
      depth++;requireValid(depth<=MAX_JOURNAL_NESTING,'JOURNAL_RAW_NESTING_LIMIT');
    }else if(byte===0x7d||byte===0x5d)depth--;
  }
}
export class AtomicJournal {
  constructor(filepath,{readOnly=false,legacyRead=false}={}) {
    requireValid(typeof filepath==='string'&&filepath.length>0,'JOURNAL_PATH_REQUIRED');
    requireValid(!legacyRead || readOnly,'LEGACY_JOURNAL_READ_ONLY_REQUIRED');
    this.file=resolve(filepath);this.lock=this.file+'.lock';this.readOnly=readOnly;this.legacyRead=legacyRead;
    // New journals are v3. Never silently rewrite old v2 receipts: their hashes
    // did not cover requestId or inputDigest, so retries could be duplicated.
    if(!readOnly){mkdirSync(dirname(this.file),{recursive:true});
      // Cold start shares the writer's exclusive lock. Recheck under lock:
      // a competing constructor must never overwrite a newly committed run.
      if(!existsSync(this.file))this.#guard(()=>{if(!existsSync(this.file))this.#atomicWrite({version:3,runs:{}});});}
    requireValid(existsSync(this.file),'JOURNAL_MISSING');this.#load();
  }
  #load(){let db,raw;
    try{
      // Refuse oversized files before allocating/read, then recheck actual
      // bytes after the read so a concurrent replacement cannot evade the cap.
      requireValid(statSync(this.file).size<=MAX_JOURNAL_RAW_BYTES,'JOURNAL_RAW_SIZE_LIMIT');
      raw=readFileSync(this.file);preflightJournalRaw(raw);
      db=JSON.parse(raw.toString('utf8'));
      // Every first-party v3 writer emits exactly canonical(db) plus one LF.
    // JSON.parse by itself discards duplicate/escaped object keys (including
    // Unicode aliases) *before* any event hash can examine them. Compare the
    // original bytes before granting even read-only journal access. Historical
    // noncanonical v3 files are quarantined for separate forensic review,
    // never rewritten or silently repaired here. v2 retains its separate
    // explicit legacyRead/readOnly policy, not this v3 writer-byte contract.
      if(db?.version===3)requireValid(raw.equals(Buffer.from(canonical(db)+'\n','utf8')),'JOURNAL_RAW_NONCANONICAL');
    }catch(error){
      // Preserve the R19 exact-byte gate's established HOLD code. JSON syntax,
      // nonfinite numbers, malicious depth and byte limits otherwise surface
      // as one controlled journal corruption HOLD, not a raw RangeError or
      // generic NONCANONICAL_VALUE. The untouched bytes remain forensic input.
      if(error instanceof Hold&&error.code==='JOURNAL_RAW_NONCANONICAL')throw error;
      const hold=new Hold('JOURNAL_CORRUPT');
      Object.defineProperty(hold,'forensicCause',{value:error,enumerable:false});
      throw hold;
    }
    requireValid(isObject(db)&&(db.version===2||db.version===3)&&isObject(db.runs),'JOURNAL_SCHEMA_INVALID');
    if(db.version===2)requireValid(this.readOnly&&this.legacyRead,'LEGACY_JOURNAL_HASH_UNBOUND');
    // Old v3 snapshots may contain individually valid effect preparation records
    // duplicated across run IDs (before cross-run admission was introduced).
    // Never reclassify that history as unambiguous on reopen, even read-only.
    const effectOwnerByRequestId=new Map();
    for(const [id,run] of Object.entries(db.runs)){
      requireValid(ID.test(id)&&isObject(run)&&SHA.test(run.inputDigest)&&Array.isArray(run.events)&&SHA.test(run.head),'JOURNAL_RUN_INVALID');
      let prev=ZERO;const seen=new Set();for(let i=0;i<run.events.length;i++){
        const e=run.events[i];requireValid(isObject(e)&&e.seq===i+1&&e.prev===prev&&typeof e.step==='string'&&isObject(e.detail)&&typeof e.requestId==='string'&&ID.test(e.requestId),'JOURNAL_SEQUENCE_INVALID');
        requireValid(!seen.has(e.requestId),'JOURNAL_DUPLICATE_REQUEST_ID');seen.add(e.requestId);
        const claim=db.version===3
          ? {runId:id,inputDigest:run.inputDigest,seq:e.seq,step:e.step,detail:e.detail,requestId:e.requestId,prev:e.prev}
          : {runId:id,seq:e.seq,step:e.step,detail:e.detail,prev:e.prev};
        requireValid(digest(claim)===e.hash,'JOURNAL_HASH_CORRUPT');prev=e.hash;
        if(db.version===3&&e.requestId.startsWith('effect:')){
          const priorOwner=effectOwnerByRequestId.get(e.requestId);
          requireValid(priorOwner===undefined||priorOwner===id,'JOURNAL_EFFECT_CROSS_RUN_CONFLICT');
          effectOwnerByRequestId.set(e.requestId,id);
        }
      }requireValid(run.head===prev,'JOURNAL_HEAD_CORRUPT');
    }
    return db;
  }
  // A process may crash after creating a temp file; a recycled PID must not
  // make every subsequent write fail permanently. Always allocate a fresh
  // unpredictable temp name, and never delete or trust abandoned files.
  #atomicWrite(db){const tmp=this.file+'.tmp.'+process.pid+'.'+randomUUID();const fd=openSync(tmp,'wx',0o600);
    try{writeFileSync(fd,canonical(db)+'\n','utf8');fsyncSync(fd);}finally{closeSync(fd);}
    renameSync(tmp,this.file);const dd=openSync(dirname(this.file),'r');try{fsyncSync(dd);}finally{closeSync(dd);}
  }
  #guard(fn){requireValid(!this.readOnly,'READ_ONLY_JOURNAL');let fd;
    try{fd=openSync(this.lock,'wx',0o600);}catch{throw new Hold('JOURNAL_BUSY_OR_STALE_LOCK');}
    try{return fn();}finally{closeSync(fd);unlinkSync(this.lock);}
  }
  inspect(runId){requireValid(typeof runId==='string'&&ID.test(runId),'JOURNAL_RUN_ID_INVALID');
    const db=this.#load(),run=Object.hasOwn(db.runs,runId)?db.runs[runId]:null;
    return run?db.version===2?{...structuredClone(run),integrity:'UNATTESTED_LEGACY_REQUEST_BINDING'}:structuredClone(run):null;}
  list(){return Object.keys(this.#load().runs).sort();}
  record(entry){return this.#recordInternal(entry,false);}
  // A private entrypoint preserves the local effect namespace: public record()
  // cannot impersonate prepareEffect() by selecting reserved strings.
  #recordInternal({runId,inputDigest,step,detail,requestId},fromPrepareEffect){return this.#guard(()=>{
    requireValid(typeof runId==='string'&&ID.test(runId)&&typeof inputDigest==='string'&&SHA.test(inputDigest),'JOURNAL_ID_OR_DIGEST_INVALID');
    requireValid(typeof step==='string'&&/^[A-Z_]{3,40}$/.test(step)&&isObject(detail),'JOURNAL_STEP_OR_DETAIL_INVALID');
    requireValid(typeof requestId==='string'&&ID.test(requestId),'JOURNAL_REQUEST_ID_INVALID');
    if(!fromPrepareEffect)requireValid(!requestId.toLowerCase().startsWith('effect:')&&step!=='EXTERNAL_EFFECT_UNCERTAIN','JOURNAL_EFFECT_NAMESPACE_RESERVED');
    // Snapshot getter-bearing or caller-mutable detail exactly once BEFORE
    // the hash and persisted image are derived; they must share the same bytes.
    const stableDetail=JSON.parse(canonical(detail));
    const db=this.#load();requireValid(db.version===3,'LEGACY_JOURNAL_WRITE_HOLD');
    // A single local journal must not prepare the same external operation under
    // two run IDs. This is NOT a global receiver deduplication guarantee.
    if(fromPrepareEffect)for(const [otherId,otherRun] of Object.entries(db.runs))
      if(otherId!==runId&&otherRun.events.some(e=>e.requestId===requestId))throw new Hold('EFFECT_ID_CROSS_RUN_HOLD');
    let run=Object.hasOwn(db.runs,runId)?db.runs[runId]:null;if(run)requireValid(run.inputDigest===inputDigest,'RUN_IDEMPOTENCY_CONFLICT');
    else run=db.runs[runId]={inputDigest,head:ZERO,events:[]};
    const old=run.events.find(e=>e.requestId===requestId);
    if(old){
      // Pre-existing effect: events without this new local-method marker are
      // ambiguous; never silently call them proof that prepareEffect ran.
      if(fromPrepareEffect)requireValid(old.detail.localMethod==='PREPARE_EFFECT_V3','EFFECT_ORIGIN_UNVERIFIED');
      requireValid(old.step===step&&digest(old.detail)===digest(stableDetail),'REQUEST_IDEMPOTENCY_CONFLICT');return {replayed:true,seq:old.seq,head:run.head};}

    const seq=run.events.length+1,prev=run.head;
    const e={seq,step,detail:stableDetail,prev,requestId,hash:digest({runId,inputDigest,seq,step,detail:stableDetail,requestId,prev})};
    run.events.push(e);run.head=e.hash;this.#atomicWrite(db);return {replayed:false,seq,head:run.head};
  });}
  /** A sender never assumes lack of a local ACK means a remote operation did not commit. */
  prepareEffect({runId,inputDigest,logicalId,effectDigest}){
    // The persisted requestId adds a seven-byte 'effect:' prefix, yet record()
    // enforces the same 80-character ID ceiling. Reject IDs that cannot fit
    // BEFORE any effect handoff; preserve historic mapping and receipts.
    requireValid(typeof logicalId==='string'&&logicalId.length<=73&&ID.test(logicalId)&&SHA.test(effectDigest),'EFFECT_ID_INVALID');
    return this.#recordInternal({runId,inputDigest,step:'EXTERNAL_EFFECT_UNCERTAIN',requestId:'effect:'+logicalId,detail:{logicalId,effectDigest,status:'NO_REMOTE_RETRY_WITHOUT_WITNESS',localMethod:'PREPARE_EFFECT_V3'}},true);
  }
}
