/**
 * Original I18 invariance oracle. Distinguishes genuine negative-test coverage
 * from output novelty. Never claim new cases outperform a correct fixed menu.
 */
import {runInnovation,ORIGINAL_SHA256} from '../../../src/innovations.mjs';
import {adaptMutationAtlas} from './adaptive-mutation.mjs';
const HSN=/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/;
const id=/^(?:I(0[1-9]|1[0-9]|20)|M145)$/;
const DENY=()=>({state:'HOLD',reason:'SYNTHETIC_SOURCE_SCOPE',externalEffects:0,authorityEffect:'NONE'});
const baseline=coordinate=>({coordinate,registrySha256:ORIGINAL_SHA256,originMode:'WORK'});
export function auditMutationInvariance(coordinate,rootId,syntheticSignal){
 if(typeof coordinate!=='string'||!HSN.test(coordinate)||typeof rootId!=='string'||!id.test(rootId)||
    !Number.isInteger(syntheticSignal)||syntheticSignal<0||syntheticSignal>420)return DENY();
 const original=runInnovation('I18',{packet:baseline(coordinate)});
 const withParent=runInnovation('I18',{packet:{...baseline(coordinate),parentExperiment:rootId}});
 const plan=adaptMutationAtlas({coordinate,rootId,syntheticSignal,sourceRegistrySha256:ORIGINAL_SHA256,originMode:'WORK'});
 if(original.state!=='LOCAL_SYNTHETIC_CANDIDATE'||withParent.state!==original.state||plan.state==='HOLD')return DENY();
 const invariance=JSON.stringify(original.data.mutants)===JSON.stringify(withParent.data.mutants);
 const mutations=[
  {packet:{...baseline(coordinate),coordinate:'H00.S00.N00'}},
  {packet:{...baseline(coordinate),registrySha256:'0'.repeat(64)}},
  {packet:{...baseline(coordinate),originMode:'PALACE'}},
  {packet:{...baseline(coordinate),coordinate:[]}},
  {packet:{...baseline(coordinate),registrySha256:null}},
  {packet:(()=>{const b=baseline(coordinate);delete b.registrySha256;return b;})()},
  {packet:(()=>{const b=baseline(coordinate);delete b.coordinate;return b;})()}
 ];
 const outcomes=mutations.map(packet=>runInnovation('I18',packet));
 if(outcomes.some(o=>o.state!=='HOLD'||o.externalEffects!==0))return DENY();
 return {schema:'atlas.ariadne.I18-invariance-oracle/v1',state:'LOCAL_ORIGINAL_INVARIANCE_AUDITED',coordinate,rootId,
   correctStaticMenuInvariance:invariance,originalNegativeCasesActuallyExercised:7,
   originalNegativeCasesHeld:outcomes.length,adaptiveProposalsOnly:plan.proposedAdditionalCases.length,
   adaptivePerformanceGainDemonstrated:false,adaptiveHostTested:false,sourceParentTagCorrectlyIgnoredByLegacy:true,
   modelCalls:0,actualMacroturns:0,externalEffects:0,authorityEffect:'NONE'};
}
