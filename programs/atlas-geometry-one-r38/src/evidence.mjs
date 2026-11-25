/**
 * Typed source- and role-aware graph. Integer coordinate similarity NEVER
 * implies semantic equivalence. Candidate edges do not train or become canon.
 */
import { decode, ARIADNE_SHA256 } from './addresses.mjs';
import { Hold } from './contracts.mjs';
const SHA = /^[a-f0-9]{64}$/;
const TYPES = Object.freeze([
  'SUPPORTS','CONTRADICTS','SAME_SOURCE_FAMILY','MATHEMATICAL_RELATION',
  'METHOD_APPLIES_TO','COMPUTATIONAL_ANALOGY','SEMANTIC_CANDIDATE',
  'MYTHOLOGICAL_ASSOCIATION','ENCODING_COLLISION_ONLY'
]);
export const RELATION_TYPES = TYPES;
export class CandidateGraph {
  #edges = new Map();
  propose({src,dst,type,sourceId,sourceSha256,sourceVersion,
           originScope='WORK',registrySha256=ARIADNE_SHA256,subject=null}) {
    decode(src);decode(dst);
    if (!TYPES.includes(type) || originScope!=='WORK' ||
        registrySha256!==ARIADNE_SHA256 ||
        typeof sourceId!=='string' || !sourceId.startsWith('work:') ||
        typeof sourceSha256!=='string' || !SHA.test(sourceSha256) ||
        typeof sourceVersion!=='string' || sourceVersion.length<1 ||
        (type==='METHOD_APPLIES_TO' && (typeof subject!=='string' || !subject.trim()))) {
      throw new Hold('CANDIDATE_RELATION_INVALID');
    }
    const row = Object.freeze({
      src,dst,type,sourceId,sourceSha256,sourceVersion,
      scope:'WORK',subject,review:'UNREVIEWED',semanticAccepted:false,
      canTrain:false,canPublish:false,authorityEffect:'NONE'
    });
    const id = JSON.stringify([src,dst,type,sourceId,sourceSha256,sourceVersion]);
    if (this.#edges.has(id)) return Object.freeze({status:'NO_CHANGE',count:this.#edges.size});
    this.#edges.set(id,row);
    return Object.freeze({status:'CANDIDATE_ONLY',count:this.#edges.size});
  }
  current() {return Object.freeze([...this.#edges.values()]);}
  get count(){return this.#edges.size;}
}
