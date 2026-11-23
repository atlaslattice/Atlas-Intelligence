/** Actual code-route additions: 100 primary then 1000 inherited, all local.
 * Two distinct executable software roles: symbiosis proposer and adversarial
 * tester. No claims of independent model peers, live agent wakes, or permissions.
 */
import {createHash} from 'node:crypto';
import {openSync,writeSync,fsyncSync,closeSync,mkdirSync,readFileSync,writeFileSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {verifyLedger as verifyParentLedger} from './cascade-evolution.mjs';
import {sha,SHA,COORD,proposeStructuralSymbiosis,
  surveyLattice,validateStructuralRule,prepareNodeProjection,inertPositive,
  ALL_NODES} from './node-symbiosis.mjs';
import {challengeProposedRoute,sampleAttack,ATTACK_FAMILIES} from './node-adversary.mjs';

export const CODE_CASCADE_SCHEMA='atlas.one.code-symbiosis-evolution/v2';
export const GENESIS=sha('ATLAS_SYMBIOSIS_CODE_GENESIS_V2\0');
const EXPECTED_PARENT_100='d02e7faa0b7e42ee8ac4e0c3cb5c412232b9d8af71ed44236f756b20e308646c';
const EXPECTED_PARENT_1100='244a8dfb2b37ff38c097ee5414752f5feb2ce2e5e8bdeb3917bca5031e4f490a';
const h1=v=>createHash('sha1').update(v).digest('hex');
export const nodeSourcePrefix=()=>`/** COMPILED: 1100 local structural route extensions; zero real identities/semantic edges.\n * Every route is a candidate-only executable projection. Do not use for auth. */\nimport {prepareNodeProjection} from '../src/node-symbiosis.mjs';\nconst registered=new Map();\n`;
export const nodeSourceSuffix=()=>`export const registeredCodeRoutes=registered.size;\nexport const hasNodeRoute=coordinate=>typeof coordinate==='string'&&registered.has(coordinate);\nexport const knownRoutes=()=>[...registered.keys()];\nexport const getNodeRule=coordinate=>typeof coordinate==='string'?(registered.get(coordinate)??null):null;\nexport const dispatchNode= (coordinate,input)=>prepareNodeProjection(getNodeRule(coordinate),input);\n`;
export function encodeRoute(rule){
  if(!validateStructuralRule(rule))throw Error('INVALID_PROPOSED_RULE');
  return `registered.set(${JSON.stringify(rule.coordinate)},Object.freeze(${JSON.stringify(rule)}));\n`;
}

/** An accepted delta is appended as executable source only AFTER adversarial
 * red/green review. Survey all 1728 coordinates before every proposal.
 * The receipt links original 1100-case parent ancestry and new code ancestry.
 */
export function evolveCodeRoutes({parentRecords,outDir,steps=1100}={}){
  if(!Array.isArray(parentRecords)||parentRecords.length!==1100||!Number.isSafeInteger(steps)
    ||steps<1||steps>1100||typeof outDir!=='string'||!outDir.trim())
    return {status:'HOLD',reason:'INPUT_BOUNDARY_INVALID'};
  const parent=verifyParentLedger(parentRecords);
  if(!parent.ok||parent.head!==EXPECTED_PARENT_1100||parentRecords[99].head!==EXPECTED_PARENT_100)
    return {status:'HOLD',reason:'PARENT_SOURCE_OR_ANCESTRY_DRIFT'};
  const initial=surveyLattice();if(!initial.valid)return {status:'HOLD',reason:'LATTICE_INVALID'};
  const entries=[];const accepted=[];const seen=new Set();
  let head=GENESIS,checks=0,attackChecks=0,mutationRejects=0,latticeInspections=0;
  let codeBytes=nodeSourcePrefix().length;
  mkdirSync(outDir,{recursive:true});
  const filenames=['generated-node-routes.mjs','source-code-evolution-ledger.jsonl','source-code-evolution-summary.json'];
  for(const name of filenames){
    try{statSync(join(outDir,name));return {status:'HOLD',reason:'REFUSE_OVERWRITE_EXISTING_ARTIFACT'};}
    catch(e){if(e.code!=='ENOENT')return {status:'HOLD',reason:'OUTPUT_PATH_UNUSABLE'};}
  }
  const sourceFd=openSync(join(outDir,filenames[0]),'wx',0o600);
  const ledgerFd=openSync(join(outDir,filenames[1]),'wx',0o600);
  try{
    writeSync(sourceFd,nodeSourcePrefix());
    for(let i=0;i<steps;i++){
      const parentRow=parentRecords[i],coordinate=parentRow.coordinate;
      const survey=surveyLattice();
      if(!survey.valid||survey.nodes!==1728||seen.has(coordinate))
        return {status:'HOLD',reason:'LATTICE_OR_DUPLICATE_FAIL',accepted:entries.length};
      latticeInspections+=survey.nodes;
      const rule=proposeStructuralSymbiosis(coordinate,head,parentRow.head);
      if(!validateStructuralRule(rule))return {status:'HOLD',reason:'BUILDER_INVALID_RULE',at:i};
      // Adversarial mutant: semantic equivalence must be refused before repair.
      const bad={...rule,relation:'SAME_AS'};
      const rejected=challengeProposedRoute(bad);
      if(rejected.accepted || rejected.reason!=='INVALID_STRUCTURAL_RULE')
        return {status:'HOLD',reason:'SEMANTIC_MUTANT_NOT_CAUGHT',at:i};
      mutationRejects++;
      const attacked=challengeProposedRoute(rule);
      if(!attacked.accepted)return {status:'HOLD',reason:attacked.reason,at:i};
      attackChecks+=attacked.checks;
      accepted.push(rule);seen.add(coordinate);
      // Cumulative recheck of every previous executable route at every step.
      for(const r of accepted){
        const positive=prepareNodeProjection(r,inertPositive(r));checks++;
        if(positive.status!=='PREPARED_LOCAL_ONLY'||positive.canExecute!==false||positive.hostAttested!==false)
          return {status:'HOLD',reason:'INHERITED_POSITIVE_CHANGED',at:i};
        const negative=prepareNodeProjection(r,sampleAttack(r,'wrong_tenant'));checks++;
        if(negative.status!=='HOLD'||negative.canExecute!==false)
          return {status:'HOLD',reason:'INHERITED_DENIAL_CHANGED',at:i};
      }
      const sourceLine=encodeRoute(rule);
      const lineSha=sha(sourceLine);
      const nextHead=sha(`${head}\n${lineSha}\n${i+1}\n${parentRow.head}`);
      const record={schema:CODE_CASCADE_SCHEMA,seq:i+1,
        phase:i<100?'CODE_PRIMARY_100':'CODE_DESCENDANT_1000',
        coordinate,nodeRole:rule.nodeRole,intraSphere:rule.intraSphere,crossHouse:rule.crossHouse,
        parentCaseHead:parentRow.head,previousCodeHead:head,
        ruleDigest:rule.ruleDigest,lineSha256:lineSha,acceptedCodeHead:nextHead,
        inheritedRouteChecks:checks,attackChecks:attacked.checks,
        falseFriendMutationRejected:true,fullLatticeNodesVisited:survey.nodes,
        action:'APPEND_EXECUTABLE_CODE_ROUTE',status:'ACCEPTED_LOCAL_ONLY',
        independentModelAgentCalls:0,hostVerified:false,canPublish:false};
      writeSync(sourceFd,sourceLine);codeBytes+=Buffer.byteLength(sourceLine);
      writeSync(ledgerFd,JSON.stringify(record)+'\n');
      entries.push(record);head=nextHead;
      if((i+1)%100===0){fsyncSync(sourceFd);fsyncSync(ledgerFd);}
    }
    writeSync(sourceFd,nodeSourceSuffix());
    fsyncSync(sourceFd);fsyncSync(ledgerFd);
  }finally{closeSync(sourceFd);closeSync(ledgerFd);}
  const source=readFileSync(join(outDir,filenames[0]));
  const ledger=readFileSync(join(outDir,filenames[1]));
  const all=ALL_NODES.length;
  const summary={schema:CODE_CASCADE_SCHEMA,status:'CODE_ROUTES_ADDED_AND_TESTED_LOCAL_ONLY',
    parentStage100Head:EXPECTED_PARENT_100,parentStage1100Head:EXPECTED_PARENT_1100,
    first100CodeHead:entries[99]?.acceptedCodeHead??null,finalCodeHead:head,
    iterations:steps,stage100:Math.min(steps,100),stage1000:Math.max(steps-100,0),
    wholeLatticeNodes:all,registeredExecutableRoutes:seen.size,
    unregisteredCoordinates:all-seen.size,
    fullLatticeVisits:latticeInspections,
    inheritedRegressionsRun:checks,adversarialCasesRun:attackChecks,
    semanticFalseFriendMutantsRejected:mutationRejects,
    sourceCodeHashSha256:sha(source),sourceBlobGitSha1:h1(`blob ${source.length}\0`+source.toString('utf8')),
    ledgerSha256:sha(ledger),sourceCodeBytes:source.length,ledgerBytes:ledger.length,
    softwareRoles:['deterministic-symbiosis-proposer','independent-constructive-adversarial-checker'],
    authenticatedModelAgents:0,realPeerPosts:0,hostVerified:false,canPublish:false,
    semanticEdgesApproved:0,canonEffect:'NONE',workRightsGranted:false,privateModesImported:false};
  writeFileSync(join(outDir,filenames[2]),JSON.stringify(summary,null,2)+'\n',{flag:'wx',mode:0o600});
  return summary;
}
