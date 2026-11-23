/** Atlas ONE 1728-node structural symbiosis proposer, no semantic or host authority.
 * Role boundary: N01-N07 domain locators; N08-N12 epistemic-method locations.
 * An address is not a truth claim, a real researcher, or a resident specialty.
 */
import {createHash} from 'node:crypto';

export const CATALOG_VERSION = 'atlas.1728.structural-source-only/v1';
export const ROUTE_VERSION = 'atlas.1728.symbiosis-projection/v1';
export const COORD = /^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/;
export const SHA = /^[a-f0-9]{64}$/;
export const sha = value => createHash('sha256').update(value).digest('hex');
export const codeRole = n => n <= 7 ? 'DOMAIN_LOCATOR' : 'EPISTEMIC_METHOD';
export const makeCoordinate = (h,s,n) => `H${String(h).padStart(2,'0')}.S${String(s).padStart(2,'0')}.N${String(n).padStart(2,'0')}`;
export const parseCoordinate = address => {
  if (typeof address !== 'string' || !COORD.test(address)) return null;
  return Object.freeze({house:Number(address.slice(1,3)),sphere:Number(address.slice(5,7)),node:Number(address.slice(9,11))});
};
export const buildCatalog = () => {
  const out=[];
  for(let h=1;h<=12;h++)for(let s=1;s<=12;s++)for(let n=1;n<=12;n++){
    const coordinate=makeCoordinate(h,s,n);
    out.push(Object.freeze({coordinate,house:h,sphere:s,node:n,role:codeRole(n)}));
  }
  return Object.freeze(out);
};
export const ALL_NODES=buildCatalog();
const catalogIndex=new Map(ALL_NODES.map(x=>[x.coordinate,x]));
export const getStructuralNode=coordinate=>catalogIndex.get(coordinate)??null;
export const expectedSyntheticSourceDigest=coordinate=>sha('synthetic-hsn-source-v1:'+coordinate);

/** A topological candidate is not SAME_AS, SOURCE_VERIFIED, or CANON. */
export function proposeStructuralSymbiosis(coordinate, previousAcceptedHead, originalCaseHead){
  const node=getStructuralNode(coordinate);
  if(!node||typeof previousAcceptedHead!=='string'||!SHA.test(previousAcceptedHead)
      ||typeof originalCaseHead!=='string'||!SHA.test(originalCaseHead))return null;
  const counterpartNode=node.node<=7 ? 8+(node.node-1)%5 : 1+(node.node-8)%7;
  const intraSphere=makeCoordinate(node.house,node.sphere,counterpartNode);
  const crossHouse=makeCoordinate(node.house%12+1,node.sphere,node.node);
  const draft={schema:ROUTE_VERSION,coordinate,nodeRole:node.role,
    counterpartRole:codeRole(counterpartNode),intraSphere,crossHouse,
    relation:'TOPOLOGICAL_COMPLEMENT_CANDIDATE',
    sourceEdition:'synthetic-hsn-v1',sourceDigest:expectedSyntheticSourceDigest(coordinate),
    previousAcceptedHead,originalCaseHead,
    semanticMappingApproved:false,hostAuthenticated:false,authorityEffect:'NONE',
    provenance:'SYNTHETIC_COORDINATE_ONLY'};
  return Object.freeze({...draft,ruleDigest:sha(JSON.stringify(draft))});
}

export function surveyLattice(){
  const houses=Array(12).fill(0),spheres=new Map(),roles={DOMAIN_LOCATOR:0,EPISTEMIC_METHOD:0};
  for(const x of ALL_NODES){
    houses[x.house-1]++;
    const k=`H${String(x.house).padStart(2,'0')}.S${String(x.sphere).padStart(2,'0')}`;
    const slot=spheres.get(k)??{domain:0,method:0};
    if(x.role==='DOMAIN_LOCATOR'){slot.domain++;roles.DOMAIN_LOCATOR++;}
    else{slot.method++;roles.EPISTEMIC_METHOD++;}
    spheres.set(k,slot);
  }
  const valid=ALL_NODES.length===1728 && new Set(ALL_NODES.map(x=>x.coordinate)).size===1728
    && houses.every(n=>n===144)&&spheres.size===144
    && [...spheres.values()].every(x=>x.domain===7&&x.method===5)
    && roles.DOMAIN_LOCATOR===1008&&roles.EPISTEMIC_METHOD===720;
  return Object.freeze({valid,nodes:ALL_NODES.length,houses,spheres:spheres.size,roles,hostVerified:false,
    semanticClaimsConfirmed:0,verifiedResidentAssignments:0});
}

/** Recompute structural route identity, never trust a self-declared rule digest. */
export function validateStructuralRule(rule){
  try{
    if(!rule||typeof rule!=="object"||Array.isArray(rule))return false;
    const names=Object.keys(rule), expected=proposeStructuralSymbiosis(
      rule.coordinate,rule.previousAcceptedHead,rule.originalCaseHead);
    if(!expected||names.length!==Object.keys(expected).length)return false;
    return names.every(k=>Object.hasOwn(expected,k)&&rule[k]===expected[k]);
  }catch{return false;}
}

const INPUT_KEYS=Object.freeze(['schema','coordinate','intraSphere','crossHouse','tenant','principal','room',
  'mode','purpose','sourceEdition','sourceDigest','rightsRead','rightsReturn','consent',
  'noHarvest','canon','deployment','rawBody','replayCount','issuerEpoch','relation','hostAttested']);
const INPUT_SET=new Set(INPUT_KEYS);
const failure=()=>({status:'HOLD',reason:'UNVERIFIED_SCOPE_OR_SOURCE',
  authorityEffect:'NONE',canExecute:false,canPublish:false,hostAttested:false,
  brokerPosts:0,modelCalls:0});
const prepared=rule=>({status:'PREPARED_LOCAL_ONLY',reason:'STRUCTURAL_TOPOLOGY_NO_SEMANTIC_PROOF',
  coordinate:rule.coordinate,contrasts:[rule.intraSphere,rule.crossHouse],
  nodeRole:rule.nodeRole,relation:rule.relation,sourceDigest:rule.sourceDigest,
  sourceEdition:rule.sourceEdition,priorRuleHead:rule.previousAcceptedHead,
  ruleDigest:rule.ruleDigest,authorityEffect:'NONE',canExecute:false,canPublish:false,
  semanticMappingApproved:false,hostAttested:false,brokerPosts:0,modelCalls:0});

/** A caller's source/rights flags cannot prove host access. No input body is echoed. */
export function prepareNodeProjection(rule, request){
  try{
    if(!validateStructuralRule(rule)||typeof request!=='object'||request===null
       ||Array.isArray(request)||Object.getPrototypeOf(request)!==Object.prototype)return failure();
    const props=Object.getOwnPropertyDescriptors(request);
    const names=Object.keys(props);
    if(names.length!==INPUT_KEYS.length||names.some(k=>!INPUT_SET.has(k)||!('value' in props[k])))return failure();
    const v=Object.fromEntries(names.map(k=>[k,props[k].value]));
    const exact=v.schema==='atlas.symbiosis.inert-request/v1'
      &&v.coordinate===rule.coordinate
      &&v.intraSphere===rule.intraSphere&&v.crossHouse===rule.crossHouse
      &&v.tenant==='synthetic-atlas'&&v.principal==='selfdeclared-test-only'
      &&v.room==='synthetic-work-room'&&v.mode==='WORK'&&v.purpose==='REVIEW_ONLY'
      &&v.sourceEdition===rule.sourceEdition&&v.sourceDigest===rule.sourceDigest
      &&v.rightsRead==='HOST_NOT_CHECKED'&&v.rightsReturn==='HOST_NOT_CHECKED'
      &&v.consent==='NO_RELEASE_GRANT'&&v.noHarvest===false
      &&v.canon===false&&v.deployment===false&&v.rawBody===null
      &&v.replayCount===0&&v.issuerEpoch===0
      &&v.relation==='TOPOLOGICAL_COMPLEMENT_CANDIDATE'&&v.hostAttested===false;
    return exact ? prepared(rule) : failure();
  }catch{return failure();}
}
export function inertPositive(rule){
  return {schema:'atlas.symbiosis.inert-request/v1',coordinate:rule.coordinate,
    intraSphere:rule.intraSphere,crossHouse:rule.crossHouse,
    tenant:'synthetic-atlas',principal:'selfdeclared-test-only',room:'synthetic-work-room',
    mode:'WORK',purpose:'REVIEW_ONLY',sourceEdition:rule.sourceEdition,
    sourceDigest:rule.sourceDigest,rightsRead:'HOST_NOT_CHECKED',rightsReturn:'HOST_NOT_CHECKED',
    consent:'NO_RELEASE_GRANT',noHarvest:false,canon:false,deployment:false,rawBody:null,
    replayCount:0,issuerEpoch:0,relation:'TOPOLOGICAL_COMPLEMENT_CANDIDATE',hostAttested:false};
}
