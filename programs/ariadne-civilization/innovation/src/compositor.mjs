/** Nonposting META145 advisory glue: explicit twenty-lab Work-safe synthetic reduction. */
import {createHash} from 'node:crypto';
import {INNOVATIONS,ORIGINAL_SHA256,runInnovation,prepareWorkCandidate} from './innovations.mjs';
import {syntheticFixture} from './synthetic-fixtures.mjs';
const isHSN=x=>typeof x==='string'&&/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/.test(x);
const sha=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
/** 20 analyses / 1 pinned knowledge coordinate; NOT twenty simulated specialists. */
export function composeInnovationCircuit(coordinate){
 if(!isHSN(coordinate))return {state:'HOLD',reason:'UNPINNED_HSN',authorityEffect:'NONE'};
 const results=INNOVATIONS.map(({id,family})=>({id,family,...runInnovation(id,syntheticFixture(id,coordinate))}));
 if(results.length!==20||results.some(r=>r.state!=='LOCAL_SYNTHETIC_CANDIDATE'))return {state:'HOLD',reason:'EXPERIMENT_FAILED',authorityEffect:'NONE'};
 const byFamily=Object.fromEntries([...new Set(INNOVATIONS.map(i=>i.family))].map(f=>[f,results.filter(r=>r.family===f).map(r=>r.id)]));
 const errors=results.filter(r=>r.state==='HOLD').map(r=>r.id);
 const short=(id)=>results.find(x=>x.id===id).data;
 const advisory={schema:'atlas.one.meta145-twenty-probe-advisory/v0.1',coordinate,
   registrySha256:ORIGINAL_SHA256,completedSyntheticOperators:results.length,
   independentSourceClaimsValidated:0,actualModelCalls:0,actualResidentTurns:0,
   unreviewedEcotones:short('I06').candidates.length,
   unresolvedEvidenceNeeds:short('I02').missing.length,
   independentWitnessesVerified:short('I03').independentWitnessesVerified,
   proposedFalsifierCount:short('I11').proposedFalsifiers.length,
   dissentObjectionsUnresolved:short('I14').unresolvedCount,
   candidateResearchHouses:short('I20').housesRepresented,
   passedSyntheticFixtures:20,negativeFixturesInThisCircuit:0,
   actualScienceAcceptance:false,rightsAuthenticated:false,hostIntegrated:false,
   gate:'REVIEW_REQUIRED_SOURCE_ONLY',authorityEffect:'NONE',externalEffects:0,
   families:byFamily,errors};
 return {...advisory,receiptSha256:sha(advisory),
   workCandidate:prepareWorkCandidate({id:'I20',coordinate,sourceDigest:ORIGINAL_SHA256})};
}
/** One aggregation from 1728 Node receipt shapes, 144 Sphere + 12 House rollups. */
export function meta145InnovationRollup(cards){
 if(!Array.isArray(cards)||cards.length!==1728||cards.some(c=>!c||c.schema!=='atlas.one.meta145-twenty-probe-advisory/v0.1'||c.registrySha256!==ORIGINAL_SHA256||c.completedSyntheticOperators!==20||c.gate!=='REVIEW_REQUIRED_SOURCE_ONLY'||c.authorityEffect!=='NONE'))return {state:'HOLD',reason:'UNPINNED_CARD_SET',authorityEffect:'NONE'};
 const ids=cards.map(c=>c.coordinate);
 if(new Set(ids).size!==1728||ids.some(x=>!isHSN(x)))return {state:'HOLD',reason:'INVALID_TOPOLOGY',authorityEffect:'NONE'};
 const spheres={},houses={};for(const c of cards){const sphere=c.coordinate.slice(0,7),house=c.coordinate.slice(0,3);(spheres[sphere]??=[]).push(c);(houses[house]??=[]).push(c);}
 if(Object.keys(spheres).length!==144||Object.keys(houses).length!==12||Object.values(spheres).some(s=>s.length!==12)||Object.values(houses).some(s=>s.length!==144))return {state:'HOLD',reason:'INVALID_TOPOLOGY',authorityEffect:'NONE'};
 const receipt={schema:'atlas.one.meta145-twenty-operator-rollup/v0.1',state:'SOURCE_ONLY_SYNTHETIC_REVIEW_REQUIRED',
  nodeCount:1728,operatorKinds:20,syntheticChecks:34560,distinctSpheres:144,distinctHouses:12,
  sphereReceiptCounts:Object.fromEntries(Object.entries(spheres).map(([id,m])=>[id,m.length])),
  houseReceiptCounts:Object.fromEntries(Object.entries(houses).map(([id,m])=>[id,m.length])),
  scientificEdgesAccepted:0,independentSpecialistsAttested:0,actualModelCalls:0,genuineMacroTurns:0,
  rightsAuthenticated:false,sourceReviewCompleted:false,hostIntegrated:false,canonEffect:'NONE',authorityEffect:'NONE'};
 return {...receipt,receiptSha256:sha(receipt)};
}
