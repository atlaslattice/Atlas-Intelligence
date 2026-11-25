/**
 * Twelve engineering ports, not renamed Ariadne Houses and not 12 resident minds.
 * Pure projections are local; external systems MUST be injected and authorized.
 */
import { HSN, fromIndex, addressAsGlyphTokens } from './addresses.mjs';

export const PORTS = Object.freeze([
  'ARIADNE','NEURAL_HEAD','GEOMETREE','GRAPH_FABRIC','META145','GLYPH',
  'ATLASGPT','SWARMCHAT_WORK','WORK_LEARNING','EVIDENCE_MEMORY',
  'RESEARCH_LAB','GOVERNANCE'
]);
const unbound = port => Object.freeze({port,status:'HOST_PORT_NOT_BOUND',canExecute:false});
export function projectTwelve(shared, candidateGraph = []) {
  const { hits, masses, frameDigest, request } = shared;
  const addresses = Object.freeze(hits.map(h => h.hsn));
  const graph = Object.freeze(candidateGraph.filter(e =>
    addresses.includes(e.src) && e.scope === 'WORK' && e.review === 'UNREVIEWED'
  ).map(e => Object.freeze({...e,semanticAccepted:false,canTrain:false})));
  const local = {
    ARIADNE:Object.freeze({port:'ARIADNE',status:'STRUCTURAL_VIEW',addresses,
      sourceRegistrySha256:request.registrySha256,semanticAccepted:false}),
    NEURAL_HEAD:Object.freeze({port:'NEURAL_HEAD',status:'EXISTING_ONE_FRAME',frameDigest,
      rerankingDefault:false,modelSha256:request.modelSha256}),
    GEOMETREE:Object.freeze({port:'GEOMETREE',status:'STRUCTURAL_VIEW',nodes:1728,spheres:144,houses:12,
      routingReviewed:false}),
    GRAPH_FABRIC:Object.freeze({port:'GRAPH_FABRIC',status:'UNREVIEWED_PROPOSALS_ONLY',
      candidateEdges:graph,semanticAccepted:false}),
    META145:Object.freeze({port:'META145',status:'READ_ONLY_SYNTHESIS',
      houseMass:masses.house,sphereMass:masses.sphere,executedResidentTurns:0}),
    GLYPH:Object.freeze({port:'GLYPH',status:'REVERSIBLE_SYMBOLIC_ADDRESS_ONLY',
      tokens:Object.freeze(addresses.map(addressAsGlyphTokens)),physicalClaim:false}),
    EVIDENCE_MEMORY:Object.freeze({port:'EVIDENCE_MEMORY',status:'EPHEMERAL_PROVENANCE_METADATA',
      frameDigest,privateModeImported:false})
  };
  const result = Object.fromEntries(PORTS.map(port => [port,local[port] || unbound(port)]));
  return Object.freeze(result);
}
export function roleHintOnly(hsn) {
  const {s} = fromIndex(HSN.indexOf(hsn));
  return s <= 7 ? 'DOMAIN_POSITION_NOT_SOURCE_ATTESTED' : 'METHOD_POSITION_REQUIRES_SUBJECT';
}
