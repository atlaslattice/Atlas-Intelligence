/**
 * Source-only peer convergence on one already-issued Atlas geometry frame.
 * Additive to PR #67, consuming review-only functions from PR #65 and PR #66.
 * No model, broker, credential, corpus read, source grant, training or egress.
 * Public-safe: no private corpus or model weights are embedded.
 */
import { createHash } from 'node:crypto';
import { types as utilTypes } from 'node:util';

export const SCHEMA = 'atlas.peer-convergence.review/v1';
export const ORIGINAL_ARIADNE = '07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6';
const HEX = /^[a-f0-9]{64}$/;
const HSN = /^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/;
const sha = s => createHash('sha256').update(JSON.stringify(s)).digest('hex');
const HOLD = reason => Object.freeze({schema:SCHEMA,status:'HOLD',reason,releaseAuthorized:false,hostedNeuralVerified:false,modelCalls:0,modelUpdated:false,trainingEligible:false,authorityEffect:'NONE'});
function plain(input) {
  if (input===null || typeof input!=='object' || Array.isArray(input) || utilTypes.isProxy(input) || Object.getPrototypeOf(input)!==Object.prototype) throw Error('UNTRUSTED_OBJECT');
  const ds=Object.getOwnPropertyDescriptors(input),out=Object.create(null);
  for(const k of Reflect.ownKeys(ds)) {
    if(typeof k!=='string'||k==='__proto__'||k==='constructor'||k==='prototype'||!ds[k].enumerable||!Object.hasOwn(ds[k],'value'))throw Error('UNTRUSTED_FIELDS');
    out[k]=ds[k].value;
  }
  return out;
}
function own(o,k) { const d=Object.getOwnPropertyDescriptor(o,k); if(!d||!Object.hasOwn(d,'value')||!d.enumerable)throw Error('MISSING_OR_ACCESSOR_'+k);return d.value; }
function dataArray(raw,n) {
  if(utilTypes.isProxy(raw)||!Array.isArray(raw)||raw.length!==n)throw Error('ARRAY_SHAPE');
  const ds=Object.getOwnPropertyDescriptors(raw);
  if(Reflect.ownKeys(ds).length!==n+1)throw Error('ARRAY_EXTRA_OR_SPARSE');
  const out=new Array(n);
  for(let i=0;i<n;i++) { const d=ds[String(i)];if(!d||!Object.hasOwn(d,'value')||typeof d.value!=='number'||!Number.isFinite(d.value))throw Error('NONFINITE_OR_ACCESSOR_SCORE');out[i]=d.value; }
  return out;
}
function address(i){const h=Math.floor(i/144)+1,s=Math.floor(i/12)%12+1,n=i%12+1;return `H${String(h).padStart(2,'0')}.S${String(s).padStart(2,'0')}.N${String(n).padStart(2,'0')}`}
export const CANONICAL_IDS = Object.freeze(Array.from({length:1728},(_,i)=>address(i)));
export const REQUIRED_PEER_IMPORTS = Object.freeze({
  base:'PR67 review/atlas-geometry-one-clean-sheet-r38-20261124',
  closure:'PR65 kestrelglass/required-closure-gate-20261124',
  geometry:'PR66 kestrelglass/geometry-clean-sheet-r0-20261124'
});
/**
 * All validators are injected from the EXACT imported peer editions. The
 * authentic selected-head and policy host are intentionally NOT injected here.
 * A caller's closure anchor is metadata consistency only. No release follows.
 */
export function inspectConvergence(input, peers) {
  try {
    const x=plain(input),p=plain(peers);
    const allowed=['root','rawScores','candidateScores','queryBinding','closureInput','errorBound','topK'];
    if(Object.keys(x).length!==allowed.length||Object.keys(x).some(k=>!allowed.includes(k)))throw Error('INPUT_FIELDS');
    if(typeof p.rankReview!=='function'||typeof p.closureReview!=='function'||typeof p.topK!=='function')throw Error('PEER_MODULES_UNBOUND');
    const bind=plain(x.queryBinding);
    if(Object.keys(bind).sort().join('|')!==['modelSha256','querySha256','requestId','sourceSha256'].sort().join('|'))throw Error('QUERY_FIELDS');
    if(typeof bind.requestId!=='string'||!bind.requestId||bind.requestId.length>128||!['querySha256','modelSha256','sourceSha256'].every(k=>HEX.test(bind[k])))throw Error('QUERY_VALUES');
    const root=plain(x.root);
    if(root.status!=='INSPECTION_CANDIDATE_ONLY'||!Array.isArray(root.topology)||root.topology.join(',')!=='12,12,12')throw Error('FOREIGN_ROOT');
    const pins=plain(root.sourcePins),base=plain(root.baseline);
    if(pins.registrySha256!==ORIGINAL_ARIADNE||pins.modelSha256!==bind.modelSha256||pins.sourceSha256!==bind.sourceSha256)throw Error('ROOT_PINS_DRIFT');
    const raw=dataArray(x.rawScores,1728),candidate=dataArray(x.candidateScores,1728);
    const expectedFrame=sha({requestId:bind.requestId,modelSha256:bind.modelSha256,sourceSha256:bind.sourceSha256,querySha256:bind.querySha256,scores:raw});
    if(root.frameDigest!==expectedFrame)throw Error('FRAME_DIGEST_DRIFT');
    if(!Number.isInteger(x.topK)||x.topK<1||x.topK>20||typeof x.errorBound!=='number'||!Number.isFinite(x.errorBound)||x.errorBound<0)throw Error('TOPK_OR_BOUND');
    const baselineHits=p.topK(raw,x.topK);
    if(!Array.isArray(base.hits)||base.hits.length!==baselineHits.length)throw Error('BASELINE_SHAPE_DRIFT');
    for(let i=0;i<baselineHits.length;i++){
      const a=plain(base.hits[i]),b=plain(baselineHits[i]);
      if(a.hsn!==b.hsn||a.index!==b.index||!Object.is(a.score,b.score))throw Error('BASELINE_RANK_DRIFT');
    }
    const projections=plain(root.projections);
    for(const k of ['ARIADNE','NEURAL_HEAD','GEOMETREE','GRAPH_FABRIC','META145','GLYPH']){
      if(!Object.hasOwn(projections,k)||!projections[k])throw Error('MISSING_PEER_VIEW_'+k);
    }
    if(typeof projections.NEURAL_HEAD.frameDigest!=='string'||projections.NEURAL_HEAD.frameDigest!==expectedFrame)throw Error('VIEW_FRAME_DRIFT');
    if(projections.GEOMETREE.nodes!==1728||projections.GEOMETREE.spheres!==144||projections.GEOMETREE.houses!==12)throw Error('GEOMETRY_DRIFT');
    const rank=plain(p.rankReview({ids:CANONICAL_IDS.slice(),baseline:raw,candidate,errorBound:x.errorBound,k:x.topK}));
    if(rank.status!=='STABLE_ON_SUPPLIED_SCORES')return HOLD('RANK_REVIEW_'+String(rank.status).slice(0,60));
    const closure=plain(p.closureReview(x.closureInput));
    if(closure.status!=='MATCHED_PINNED_METADATA'||closure.releaseAuthorized!==false||closure.authorityEffect!=='NONE')return HOLD('REQUIRED_CLOSURE_'+String(closure.status).slice(0,60));
    return Object.freeze({schema:SCHEMA,status:'LOCAL_PEER_CONVERGENCE_REVIEW_ONLY',
      importedPeers:REQUIRED_PEER_IMPORTS,
      frameDigest:expectedFrame,sourceSha256:bind.sourceSha256,modelSha256:bind.modelSha256,
      originalRegistrySha256:ORIGINAL_ARIADNE,geometryShape:Object.freeze([12,12,12]),
      originalCandidateCount:baselineHits.length,originalCandidateHsn:Object.freeze(baselineHits.map(h=>h.hsn)),
      peerRankStatus:rank.status,peerClosureStatus:closure.status,
      preservedConsumers:Object.freeze(Object.keys(projections).sort()),
      currentSourceRightsAttested:false,requiredSetIndependentlyComplete:false,
      errorBoundIndependentlyVerified:false,hostedNeuralVerified:false,
      sourceBodiesIncluded:false,releaseAuthorized:false,modelCalls:0,
      trainingEligible:false,modelUpdated:false,authorityEffect:'NONE'});
  } catch (e) { return HOLD(e instanceof Error && /^[A-Z0-9_]+$/.test(e.message) ? e.message : 'UNTRUSTED_INPUT'); }
}
