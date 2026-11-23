/** Atlas ONE v2: original replacement for historic Atlas, Sheldonbrain, and orchestration drafts.
 * No data migration or hosted permissions occur on import. OpenAI Agents SDK is optional.
 * The canonical package is the only algorithm implementation; other repos use versioned ports.
 */
import { createHash } from 'node:crypto';

export const VERSION = '2.0.0-candidate.1';
export const HSN_EDITION = 'Ariadne v0.7';
export const HSN_SHA256 = '07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6';
export const OPENALEX_SHA256 = 'a306c7306a79754b033e9f8c41c0de5ff5176b4544a6a80b5c740e2f8d2cc903';
export const COORD = /^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/;
const SHA = /^[a-f0-9]{64}$/;
const CASE_ID = /^[A-Za-z][A-Za-z0-9._:-]{2,79}$/;
const RELATIONS = new Set(['ANALOGY','METHOD_TRANSFER','CONTRADICTS','RELATED','NO_MATCH']);
const EVIDENCE_STATES = new Set(['PREPRINT','PUBLISHED','CORRECTED','RETRACTED','SOURCE_REPORTED']);
const MODES = new Set(['WORK','PLAY','SOCIAL','IMAGINE','DREAM','QUIET','BRAIN','PALACE','HABITAT']);
const PROTECTED = new Set(['PLAY','SOCIAL','IMAGINE','DREAM','QUIET','BRAIN','PALACE','HABITAT']);
const URI_HOSTS = new Set(['doi.org','www.doi.org','arxiv.org','www.arxiv.org','openalex.org','www.openalex.org','pubmed.ncbi.nlm.nih.gov','www.nature.com','www.sciencedirect.com','ieeexplore.ieee.org','link.springer.com']);

export class Hold extends Error {
  constructor(code) { super(code); this.name='AtlasHold'; this.code=code; }
}
export function requireValid(test,code) { if(!test) throw new Hold(code); }
export const isObject = x => x !== null && typeof x === 'object' && !Array.isArray(x) && (Object.getPrototypeOf(x) === Object.prototype || Object.getPrototypeOf(x)===null);
export const sha256 = x => createHash('sha256').update(x).digest('hex');
function ordered(value) {
  if(Array.isArray(value)) return value.map(ordered);
  if(isObject(value)) return Object.fromEntries(Object.keys(value).sort().map(k=>[k,ordered(value[k])]));
  if(value===null || typeof value==='string' || typeof value==='boolean' || (typeof value==='number' && Number.isFinite(value))) return value;
  throw new Hold('NONCANONICAL_VALUE');
}
export const canonical = x => JSON.stringify(ordered(x));
export const digest = x => sha256(Buffer.from(canonical(x),'utf8'));
export function publicUrl(raw) {
  if(typeof raw !== 'string' || raw.length>500 || raw.trim()!==raw) return false;
  try {const u=new URL(raw);return u.protocol==='https:' && URI_HOSTS.has(u.hostname) && !u.username && !u.password && !u.search && !u.hash;}
  catch{return false;}
}
export const validCoord = c => typeof c==='string' && COORD.test(c);
export const modeIsWork = m => m==='WORK';

/** RFC8259 object duplicate and unicode-alias detection, bounded grammar.
 * In new unpinned documents, numeric inputs are heuristic only. Exact measured
 * decimals MUST arrive as strings with declared unit and uncertainty.
 * Original Ariadne input uses exact-byte SHA pin before JSON parsing instead.
 */
export function parseStrictJson(raw, {maxBytes=2_000_000,maxDepth=64}={}) {
  requireValid(typeof raw==='string' || Buffer.isBuffer(raw),'JSON_STRING_REQUIRED');
  if(Buffer.isBuffer(raw)) requireValid(raw.length<=maxBytes,'JSON_SIZE_LIMIT');
  let s=raw;
  if(Buffer.isBuffer(raw)){
    try{s=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw);}
    catch{throw new Hold('INVALID_UTF8_BYTES');}
  }
  requireValid(Buffer.byteLength(s,'utf8')<=maxBytes,'JSON_SIZE_LIMIT');
  let i=0;
  const ws=()=>{while(i<s.length && /[\t\n\r ]/.test(s[i]))i++;};
  function parseString(){
    requireValid(s[i]==='"','JSON_STRING_EXPECTED');const start=i++;let escaped=false;
    while(i<s.length){const c=s[i++];if(!escaped&&c==='"'){
      const token=s.slice(start,i);let v;try{v=JSON.parse(token);}catch{throw new Hold('INVALID_JSON_STRING');}
      requireValid(!/[\u0000-\u001f]/.test(v),'CONTROL_STRING_DENIED');
      requireValid(!/[\uD800-\uDFFF]/u.test(v),'INVALID_UNICODE_SCALAR');return v;
    } if(!escaped&&c==='\\'){escaped=true;continue;}escaped=false;}
    throw new Hold('UNTERMINATED_JSON_STRING');
  }
  function value(depth){ws();requireValid(depth<=maxDepth,'JSON_NESTING_LIMIT');const c=s[i];
    if(c==='"')return parseString();
    if(c==='{'){i++;ws();const out=Object.create(null),seen=new Set();if(s[i]==='}'){i++;return out;}
      while(true){ws();const k=parseString();const normalized=k.normalize('NFC');requireValid(!seen.has(normalized),'DUPLICATE_OR_UNICODE_ALIAS_KEY');seen.add(normalized);
        ws();requireValid(s[i++]===':','JSON_COLON_REQUIRED');out[k]=value(depth+1);ws();
        if(s[i]==='}'){i++;return out;}requireValid(s[i++ ]===',','JSON_COMMA_REQUIRED');}
    }
    if(c==='['){i++;ws();const out=[];if(s[i]===']'){i++;return out;}
      while(true){out.push(value(depth+1));ws();if(s[i]===']'){i++;return out;}requireValid(s[i++]===',','JSON_COMMA_REQUIRED');}
    }
    for(const [word,val] of [['true',true],['false',false],['null',null]])if(s.startsWith(word,i)){i+=word.length;return val;}
    const token=/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/.exec(s.slice(i));requireValid(!!token,'INVALID_JSON_TOKEN');
    i+=token[0].length;const n=Number(token[0]);
    requireValid(Number.isFinite(n),'NONFINITE_NUMBER');
    const digits=token[0].replace(/^[+-]?0*(?:\.|e.*)?/,'').replace(/[^0-9]/g,'');
    if(n===0 && /[1-9]/.test(token[0].split(/[eE]/)[0]))throw new Hold('NUMERIC_UNDERFLOW');
    requireValid(!Number.isInteger(n) || Number.isSafeInteger(n),'UNSAFE_INTEGER');
    const significand=token[0].split(/[eE]/)[0].replace(/^-/,'').replace('.','').replace(/^0+/, '');
    requireValid(significand.length<=15,'LOSSY_DECIMAL_LEXEME');
    return n;
  }
  const out=value(0);ws();requireValid(i===s.length,'TRAILING_JSON_DATA');return out;
}

/** Exact historical source identities, never a generated ontology or a host grant. */
export class AriadneRegistry {
  #rows;
  constructor(originalBytes) {
    requireValid(Buffer.isBuffer(originalBytes)||originalBytes instanceof Uint8Array,'ORIGINAL_REGISTRY_BYTES_REQUIRED');
    const b=Buffer.from(originalBytes);
    requireValid(sha256(b)===HSN_SHA256,'ARIADNE_SOURCE_DIGEST_MISMATCH');
    let source;try{source=JSON.parse(b.toString('utf8'));}catch{throw new Hold('ARIADNE_SOURCE_JSON_INVALID');}
    requireValid(isObject(source)&&isObject(source.houses)&&isObject(source.spheres)&&isObject(source.nodes),'ARIADNE_SOURCE_SCHEMA_INVALID');
    requireValid(Object.keys(source.houses).length===12 && Object.keys(source.spheres).length===144 && Object.keys(source.nodes).length===1728,'ARIADNE_CARDINALITY_INVALID');
    const rows=new Map(),kinds={DOMAIN_SPECIALIZATION:0,EPISTEMIC_META:0};
    for(const [coord,raw] of Object.entries(source.nodes)){
      requireValid(validCoord(coord)&&isObject(raw)&&raw.id===coord&&raw.parent===coord.slice(0,7),'ARIADNE_NODE_ANCESTRY_INVALID');
      requireValid(isObject(source.spheres[coord.slice(0,7)])&&source.spheres[coord.slice(0,7)].parent===coord.slice(0,3)&&isObject(source.houses[coord.slice(0,3)]),'ARIADNE_PARENT_INVALID');
      requireValid(Object.hasOwn(kinds,raw.kind)&&['name','definition','includes','excludes'].every(k=>typeof raw[k]==='string'&&raw[k].length>0),'ARIADNE_SEMANTIC_FIELDS_INVALID');
      requireValid(typeof raw.source_record_sha256==='string'&&SHA.test(raw.source_record_sha256),'ARIADNE_NODE_HASH_INVALID');
      kinds[raw.kind]++;
      rows.set(coord,Object.freeze({coordinate:coord,name:raw.name,definition:raw.definition,includes:raw.includes,excludes:raw.excludes,kind:raw.kind,sourceNodeSHA256:raw.source_record_sha256}));
    }
    requireValid(kinds.DOMAIN_SPECIALIZATION===1008&&kinds.EPISTEMIC_META===720,'ARIADNE_KIND_DISTRIBUTION_INVALID');
    this.#rows=rows;Object.freeze(this);
  }
  get size(){return this.#rows.size;}
  get edition(){return HSN_EDITION;}
  get digest(){return HSN_SHA256;}
  lookup(coord){requireValid(validCoord(coord),'INVALID_CANONICAL_COORDINATE');const x=this.#rows.get(coord);requireValid(x,'UNMAPPED_HSN');return x;}
  contains(coord){return validCoord(coord)&&this.#rows.has(coord);}
}

/** SCIENTIFIC CANDIDATE; no expert verdict, model weights, legal or CANON authority. */
export function prepareResearch(raw,registry) {
  requireValid(registry instanceof AriadneRegistry,'REGISTRY_TRUST_ANCHOR_REQUIRED');
  requireValid(isObject(raw)&&raw.mode==='WORK'&&typeof raw.caseId==='string'&&CASE_ID.test(raw.caseId),'CASE_INVALID_OR_NOT_WORK');
  requireValid(Array.isArray(raw.nodes)&&raw.nodes.length>=2&&raw.nodes.length<=20&&raw.nodes.every(validCoord)&&new Set(raw.nodes).size===raw.nodes.length,'NODES_INVALID');
  const nodes=raw.nodes.map(c=>registry.lookup(c));
  requireValid(new Set(nodes.map(n=>n.coordinate.slice(0,3))).size>=2,'CROSS_DOMAIN_REQUIRED');
  for(const k of ['problem','hypothesis','testPlan','falsifier'])requireValid(typeof raw[k]==='string'&&raw[k].trim().length>15&&raw[k].length<=2400,'MISSING_HYPOTHESIS_CONTENT');
  requireValid(RELATIONS.has(raw.relation),'RELATION_UNSUPPORTED');
  requireValid(Array.isArray(raw.papers)&&raw.papers.length>=1&&raw.papers.length<=16,'PAPERS_INVALID');
  const papers=raw.papers.map(p=>{
    requireValid(isObject(p)&&typeof p.id==='string'&&p.id.length>1&&p.id.length<=120&&typeof p.title==='string'&&p.title.length>5&&p.title.length<500&&publicUrl(p.url),'PAPER_ID_OR_URL_INVALID');
    requireValid(/^\d{4}-\d{2}-\d{2}$/.test(p.publishedDate)&&!Number.isNaN(Date.parse(p.publishedDate+'T00:00:00Z'))&&new Date(p.publishedDate+'T00:00:00Z').toISOString().slice(0,10)===p.publishedDate&&EVIDENCE_STATES.has(p.status),'PAPER_DATE_OR_STATUS_INVALID');
    return {id:p.id,title:p.title,url:p.url,publishedDate:p.publishedDate,status:p.status};
  });
  requireValid(new Set(papers.map(p=>p.id)).size===papers.length,'DUPLICATE_SOURCE_ID');
  for(const forbidden of ['hostAuthorization','residentAuthenticated','canonApproved','privateContext','modelWeightUpgrade','ownerAdmin','liveHostRights'])requireValid(!Object.hasOwn(raw,forbidden),'UNTRUSTED_AUTHORITY_FIELD');
  const packet={schema:'atlas.one.research/v2',caseId:raw.caseId,relation:raw.relation,problem:raw.problem,hypothesis:raw.hypothesis,testPlan:raw.testPlan,falsifier:raw.falsifier,
    provenance:{edition:registry.edition,originalSourceSHA256:registry.digest,sourceKind:'EXACT_HISTORICAL_BYTES'},
    nodes,papers,review:'CANDIDATE_NOT_ADJUDICATED',experiment:'NOT_EXECUTED',hostRights:'UNVERIFIED',canPublish:false,authorityEffect:'NONE'};
  return Object.freeze({...packet,packetSHA256:digest(packet)});
}

export function versionInfo(){return Object.freeze({project:'Atlas ONE',version:VERSION,runtime:'OPENAI_NATIVE_SOURCE_CANDIDATE',services:['Ariadne','Alexandria','Atlas Intelligence','AtlasGPT','Sheldonbrain','SwarmChat'],
  contract:'ONE_ORIGINAL_CORE_VERSIONED_PORTS',canonicalCore:'packages/atlas-one-v2',hostDeployment:'NOT_VERIFIED',modelRuns:'OPT_IN',registrySourceSHA256:HSN_SHA256,rights:'HOST_ENFORCED_SEPARATELY',canon:'UNCHANGED'});}
