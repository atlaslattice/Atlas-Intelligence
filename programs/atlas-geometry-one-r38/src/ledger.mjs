/**
 * Append-only, in-memory REVIEW metadata, not a source of IAM truth.
 * This module has NO storage, provider, payment, or broker access.
 */
import { canonicalDigest, Hold } from './contracts.mjs';
import { decode } from './addresses.mjs';

export class EvidenceLedger {
  #events = [];
  #keys = new Map();
  record({ roomId, seq, bodySha256, hsn, sourceSha256, kind = 'PROPOSAL', mode = 'WORK' }) {
    if (mode !== 'WORK' || !['PROPOSAL','OBJECTION','REVISION','TEST_RECEIPT'].includes(kind)) {
      throw new Hold('WORK_EVIDENCE_ONLY');
    }
    if (!Number.isInteger(seq) || seq < 1 || seq > 500 ||
        !/^[a-z0-9-]{3,80}$/.test(roomId) ||
        ![bodySha256,sourceSha256].every(x => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x))) {
      throw new Hold('EVIDENCE_SOURCE_INVALID');
    }
    decode(hsn);
    const key = `${roomId}:${seq}`;
    const digest = canonicalDigest({roomId,seq,bodySha256,hsn,sourceSha256,kind});
    if (this.#keys.has(key)) {
      if (this.#keys.get(key) !== digest) throw new Hold('SOURCE_SEQUENCE_CONFLICT');
      return Object.freeze({status:'NO_CHANGE',key,digest});
    }
    this.#keys.set(key,digest);
    const row = Object.freeze({key,digest,hsn,kind,sourceSha256,review:'NOT_ACCEPTED'});
    this.#events.push(row);
    return Object.freeze({status:'LOCAL_METADATA_RECORDED',key,digest});
  }
  list() { return Object.freeze(this.#events.slice()); }
  get count() { return this.#events.length; }
}

export class LogicalEffectLedger {
  #effects = new Map();
  simulate(request, payloadDigest) {
    if (typeof payloadDigest !== 'string' || !/^[a-f0-9]{64}$/.test(payloadDigest)) {
      throw new Hold('EFFECT_PAYLOAD_DIGEST');
    }
    const { logicalEffectKey } = { logicalEffectKey: null };
    // Imported lazily only for avoiding an accidental stateful host interface.
    return this.#put(request,payloadDigest);
  }
  #put(request,payloadDigest) {
    const key = canonicalDigest([request.tenant,request.logicalTarget,
      request.contractVersion,request.requestId,request.sourceId,
      request.sourceSha256,request.modelSha256,request.querySha256]);
    if (this.#effects.has(key)) {
      if (this.#effects.get(key) !== payloadDigest) throw new Hold('EFFECT_PAYLOAD_CONFLICT');
      return Object.freeze({status:'SIMULATED_DUPLICATE_NO_CHANGE',key});
    }
    this.#effects.set(key,payloadDigest);
    return Object.freeze({status:'SIMULATED_FIRST_EFFECT',key});
  }
  get count() {return this.#effects.size;}
}
