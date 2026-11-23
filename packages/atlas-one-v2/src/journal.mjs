/** Atlas ONE v2 durable local journal. No cross-host claims.
 * Append-only logical events persisted in a single atomic snapshot and protected
 * by an exclusive process lock. Lost acknowledgements remain UNCERTAIN, never retried blindly.
 */
import {openSync,closeSync,readFileSync,writeFileSync,renameSync,mkdirSync,existsSync,fsyncSync,unlinkSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {digest,canonical,Hold,requireValid,isObject} from './index.mjs';
const SHA=/^[a-f0-9]{64}$/;
const ID=/^[A-Za-z][A-Za-z0-9._:-]{2,79}$/;
const ZERO='0'.repeat(64);
export class AtomicJournal {
  constructor(filepath,{readOnly=false}={}) {
    requireValid(typeof filepath==='string'&&filepath.length>0,'JOURNAL_PATH_REQUIRED');
    this.file=resolve(filepath);this.lock=this.file+'.lock';this.readOnly=readOnly;
    if(!readOnly){mkdirSync(dirname(this.file),{recursive:true});if(!existsSync(this.file))this.#atomicWrite({version:2,runs:{}});}
    requireValid(existsSync(this.file),'JOURNAL_MISSING');this.#load();
  }
  #load(){let db;try{db=JSON.parse(readFileSync(this.file,'utf8'));}catch{throw new Hold('JOURNAL_CORRUPT');}
    requireValid(isObject(db)&&db.version===2&&isObject(db.runs),'JOURNAL_SCHEMA_INVALID');
    for(const [id,run] of Object.entries(db.runs)){
      requireValid(ID.test(id)&&isObject(run)&&SHA.test(run.inputDigest)&&Array.isArray(run.events)&&SHA.test(run.head),'JOURNAL_RUN_INVALID');
      let prev=ZERO;for(let i=0;i<run.events.length;i++){
        const e=run.events[i];requireValid(isObject(e)&&e.seq===i+1&&e.prev===prev&&typeof e.step==='string'&&isObject(e.detail),'JOURNAL_SEQUENCE_INVALID');
        requireValid(digest({runId:id,seq:e.seq,step:e.step,detail:e.detail,prev:e.prev})===e.hash,'JOURNAL_HASH_CORRUPT');prev=e.hash;
      }requireValid(run.head===prev,'JOURNAL_HEAD_CORRUPT');
    }
    return db;
  }
  #atomicWrite(db){const tmp=this.file+'.tmp.'+process.pid;const fd=openSync(tmp,'wx',0o600);
    try{writeFileSync(fd,canonical(db)+'\n','utf8');fsyncSync(fd);}finally{closeSync(fd);}
    renameSync(tmp,this.file);const dd=openSync(dirname(this.file),'r');try{fsyncSync(dd);}finally{closeSync(dd);}
  }
  #guard(fn){requireValid(!this.readOnly,'READ_ONLY_JOURNAL');let fd;
    try{fd=openSync(this.lock,'wx',0o600);}catch{throw new Hold('JOURNAL_BUSY_OR_STALE_LOCK');}
    try{return fn();}finally{closeSync(fd);unlinkSync(this.lock);}
  }
  inspect(runId){requireValid(typeof runId==='string'&&ID.test(runId),'JOURNAL_RUN_ID_INVALID');const run=this.#load().runs[runId];return run?structuredClone(run):null;}
  list(){return Object.keys(this.#load().runs).sort();}
  record({runId,inputDigest,step,detail,requestId}){return this.#guard(()=>{
    requireValid(typeof runId==='string'&&ID.test(runId)&&typeof inputDigest==='string'&&SHA.test(inputDigest),'JOURNAL_ID_OR_DIGEST_INVALID');
    requireValid(typeof step==='string'&&/^[A-Z_]{3,40}$/.test(step)&&isObject(detail),'JOURNAL_STEP_OR_DETAIL_INVALID');
    requireValid(typeof requestId==='string'&&ID.test(requestId),'JOURNAL_REQUEST_ID_INVALID');
    const db=this.#load();let run=db.runs[runId];if(run)requireValid(run.inputDigest===inputDigest,'RUN_IDEMPOTENCY_CONFLICT');
    else run=db.runs[runId]={inputDigest,head:ZERO,events:[]};
    const old=run.events.find(e=>e.requestId===requestId);
    if(old){requireValid(old.step===step&&digest(old.detail)===digest(detail),'REQUEST_IDEMPOTENCY_CONFLICT');return {replayed:true,seq:old.seq,head:run.head};}
    const seq=run.events.length+1,prev=run.head;const e={seq,step,detail,prev,requestId,hash:digest({runId,seq,step,detail,prev})};
    run.events.push(e);run.head=e.hash;this.#atomicWrite(db);return {replayed:false,seq,head:run.head};
  });}
  /** A sender never assumes lack of a local ACK means a remote operation did not commit. */
  prepareEffect({runId,inputDigest,logicalId,effectDigest}){
    requireValid(typeof logicalId==='string'&&ID.test(logicalId)&&SHA.test(effectDigest),'EFFECT_ID_INVALID');
    return this.record({runId,inputDigest,step:'EXTERNAL_EFFECT_UNCERTAIN',requestId:'effect:'+logicalId,detail:{logicalId,effectDigest,status:'NO_REMOTE_RETRY_WITHOUT_WITNESS'}});
  }
}
