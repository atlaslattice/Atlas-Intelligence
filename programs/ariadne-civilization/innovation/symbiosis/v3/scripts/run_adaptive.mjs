/** Full-lattice source-conditioned I18 mutation proposal sweep. Offline, no host mutation. */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {adaptMutationAtlas,challengeSyntheticCandidate} from '../src/adaptive-mutation.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const input=readFileSync(resolve(root,'private-source/source-seeds.txt'),'utf8').trim().split('\n');
if(input.length!==1728)throw Error('SOURCE_COUNT');
const sha=x=>createHash('sha256').update(x).digest('hex');
const original='07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6';
let executed=0,refusals=0,adversarial=0,changed=0;const hashes=createHash('sha256');const houses={};const spheres={};
const toCoord=i=>`H${String(Math.floor(i/144)+1).padStart(2,'0')}.S${String(Math.floor(i%144/12)+1).padStart(2,'0')}.N${String(i%12+1).padStart(2,'0')}`;
for(let i=0;i<1728;i++){
 const [ordinal,h,s,kind,signal]=input[i].split(' ').map((x,j)=>j<5?Number(x):x);
 const coord=toCoord(i);
 if(ordinal!==i||Math.floor(i/144)+1!==h||Math.floor(i%144/12)+1!==s||kind!==(s>=8?1:0)||signal<0||signal>420)throw Error('SOURCE_PARITY');
 const house=coord.slice(0,3),sphere=coord.slice(0,7);
 houses[house]??={nodes:0,plans:0,refusals:0};spheres[sphere]??={nodes:0,plans:0,refusals:0};houses[house].nodes++;spheres[sphere].nodes++;
 for(let rootNum=0;rootNum<21;rootNum++){
  const rootId=rootNum===20?'M145':`I${String(rootNum+1).padStart(2,'0')}`;
  const arg={coordinate:coord,sourceRegistrySha256:original,originMode:'WORK',rootId,syntheticSignal:signal};
  const p=adaptMutationAtlas(arg);
  if(p.state!=='LOCAL_SYNTHETIC_MUTATION_PLAN'||p.proposedAdditionalCases.length!==3||p.totalCases!==8||p.actualHostFuzzing!==false)throw Error('BAD_ADAPTIVE_RESULT');
  executed++;changed++;houses[house].plans++;spheres[sphere].plans++;hashes.update(p.proposalSha256+'\n');
  const neg=adaptMutationAtlas({...arg,originMode:'PALACE'});
  if(neg.state!=='HOLD'||neg.externalEffects!==0)throw Error('PRIVATE_REFUSAL_MISSING');
  refusals++;houses[house].refusals++;spheres[sphere].refusals++;
  for(let j=0;j<8;j++){
   const q=challengeSyntheticCandidate(p,{caseIndex:j});
   if(q.state!=='ADVERSARIAL_CASE_PREPARED_NOT_HOST_RUN'||q.externalEffects!==0)throw Error('BAD_CASE');
   adversarial++;
  }
 }
}
if(executed!==36288||refusals!==36288||adversarial!==290304||Object.keys(spheres).length!==144||Object.keys(houses).length!==12)throw Error('CARDINALITY');
const report={schema:'atlas.ariadne.adaptive-mutation-sweep/v0.1',status:'LOCAL_SYNTHETIC_PROPOSALS_ONLY',
 originalAriadneRegistrySha256:original,derivedInputSha256:sha(readFileSync(resolve(root,'private-source/source-seeds.txt'))),
 syntheticSourceConditionedPlans:executed,syntheticChangedVsFixedMenu:changed,privateModeRefusals:refusals,
 adversarialCasesPreparedNotExecutedOnHost:adversarial,
 sourceNodes:1728,roots:21,sourceHashesRecheckedFromOriginalBytes:false,
 sphereCount:144,houseCount:12,originalI18LeftUnmodified:true,
 workHostAttested:false,scientificAccuracyMeasured:false,actualMacroturns:0,providerCalls:0,externalEffects:0,authorityEffect:'NONE',
 planDigestSha256:hashes.digest('hex'),sphereSummaries:spheres,houseSummaries:houses};
mkdirSync(resolve(root,'reports/full'),{recursive:true});writeFileSync(resolve(root,'reports/full/ADAPTIVE_MUTATION_SWEEP.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({plans:executed,refusals,adversarial,changed,planDigestSha256:report.planDigestSha256},null,2));
