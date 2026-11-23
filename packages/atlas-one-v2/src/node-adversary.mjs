/** Independent deterministic constructive-adversarial tester for synthetic routes.
 * This is SOFTWARE with a challenge role, NOT an authenticated peer AI agent.
 */
import {prepareNodeProjection,inertPositive,validateStructuralRule} from './node-symbiosis.mjs';

const ATTACKS=Object.freeze([
  ['wrong_tenant',r=>r.tenant='wrong-tenant'],
  ['forged_principal',r=>r.principal='platform-root'],
  ['wrong_room',r=>r.room='other-room'],
  ['palace_to_work',r=>r.mode='PALACE'],
  ['play_to_work',r=>r.mode='PLAY'],
  ['publish_purpose',r=>r.purpose='PUBLISH'],
  ['cross_edition',r=>r.sourceEdition='historical-different'],
  ['forged_source_digest',r=>r.sourceDigest='a'.repeat(64)],
  ['wrong_coordinate',r=>r.coordinate=r.coordinate==='H12.S12.N12'?'H01.S01.N01':'H12.S12.N12'],
  ['wrong_intrasphere',r=>r.intraSphere=r.intraSphere==='H12.S12.N12'?'H01.S01.N01':'H12.S12.N12'],
  ['wrong_house',r=>r.crossHouse=r.crossHouse==='H12.S12.N12'?'H01.S01.N01':'H12.S12.N12'],
  ['selfclaimed_read_grant',r=>r.rightsRead='GRANTED'],
  ['revoked_return',r=>r.rightsReturn='REVOKED'],
  ['selfclaimed_consent',r=>r.consent='APPROVED'],
  ['no_harvest',r=>r.noHarvest=true],
  ['canon_claim',r=>r.canon=true],
  ['deployment_claim',r=>r.deployment=true],
  ['private_body',r=>r.rawBody='DO_NOT_COPY_PRIVATE_BODY'],
  ['replay',r=>r.replayCount=1],
  ['stale_epoch',r=>r.issuerEpoch=1],
  ['inferred_semantic_same_as',r=>r.relation='SAME_AS'],
  ['forged_host_attestation',r=>r.hostAttested=true],
  ['extra_approval',r=>r.humanRootApproved=true],
  ['wrong_schema',r=>r.schema='atlas.symbiosis.signed/v1']
]);
export const ATTACK_FAMILIES=Object.freeze(ATTACKS.map(([name])=>name));
const isHeld=x=>x&&x.status==='HOLD'&&x.reason==='UNVERIFIED_SCOPE_OR_SOURCE'
  &&x.canExecute===false&&x.canPublish===false&&x.hostAttested===false
  &&x.authorityEffect==='NONE'&&x.modelCalls===0&&x.brokerPosts===0;

export function challengeProposedRoute(rule){
  if(!validateStructuralRule(rule))return {accepted:false,reason:"INVALID_STRUCTURAL_RULE",checks:1,attacks:0};
  const positive=prepareNodeProjection(rule,inertPositive(rule));
  if(positive.status!=='PREPARED_LOCAL_ONLY'||positive.canExecute!==false
    ||positive.canPublish!==false||positive.hostAttested!==false)
    return {accepted:false,reason:'POSITIVE_NOT_INERT',checks:1,attacks:0};
  let count=1;
  let holdShape=null;
  for(const [name,mutate] of ATTACKS){
    const changed=inertPositive(rule);
    mutate(changed);
    let result;
    try{result=prepareNodeProjection(rule,changed);}catch{return {accepted:false,reason:'UNCAUGHT_'+name,checks:count,attacks:count-1};}
    if(!isHeld(result))return {accepted:false,reason:'FAILED_TO_HOLD_'+name,checks:count+1,attacks:count};
    const serialized=JSON.stringify(result);
    if(holdShape!==null&&serialized!==holdShape)return {accepted:false,reason:'NON_UNIFORM_DENIAL_'+name,checks:count+1,attacks:count};
    holdShape=serialized;count++;
  }
  const getter=inertPositive(rule);
  Object.defineProperty(getter,'tenant',{get(){throw new Error('PRIVATE_SECRET_SHOULD_NOT_APPEAR');},enumerable:true});
  if(!isHeld(prepareNodeProjection(rule,getter)))return {accepted:false,reason:'GETTER_GAP',checks:count+1,attacks:count};
  count++;
  const hostile=Object.create(null);
  Object.assign(hostile,inertPositive(rule));
  if(!isHeld(prepareNodeProjection(rule,hostile)))return {accepted:false,reason:'PROTOTYPE_GAP',checks:count+1,attacks:count};
  count++;
  return {accepted:true,checks:count,attacks:ATTACKS.length+2,
    positiveStatus:'PREPARED_LOCAL_ONLY',denialHash:holdShape,
    rawBodyExported:false,authorityGranted:false};
}

export function sampleAttack(rule,attackName){
  const match=ATTACKS.find(([name])=>name===attackName);
  if(!match)return null;
  const request=inertPositive(rule);match[1](request);
  return request;
}
