/** Existing Work Burst + exact NEXT144 + recovered R02 ingress.
 * No second runner, scheduler, broker, peer identity, model call or authority.
 * The caller supplies exact source module paths. Every dependency is pinned
 * before loading, including R02's existing relative NEXT144 import.
 */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL, fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

export const PINS=Object.freeze({
  registry:'07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6',
  catalog:'2540f702c020efbfaee0532e84face21394860e57e91749bf36f2b1a3f3c2843',
  workBurst:'2908700f3b7cab546ce80496c946de7083db27f33a8bd1d71132bc5afc4db6a9',
  next144:'b7d03c1fa6bc4d570f4f4532e81cb035a7ed597f3a94c407136f3cc441a60a6c',
  modeIngress:'6f3864c753d9745c969244c77d18cf773800e50d768124c10d9b60cefe21c08a'
});
const sha=raw=>createHash('sha256').update(raw).digest('hex');
const must=(condition,reason)=>{if(!condition)throw new Error(reason);};
const canonical=x=>Array.isArray(x)?'['+x.map(canonical).join(',')+']':x!==null&&typeof x==='object'
  ?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}':JSON.stringify(x);
const payloadKeys=['schema','platform','runId','passId','identity','route','initiative','sourceProposalSuggestedMode',
 'proposalBodyImported','sourceBodyImported','catalogSha256','mode','status','semanticAcceptance','canonEffect',
 'authorityEffect','hostAuthenticated','residentAssigned','actualModelVisits','scopeMatch','implementationState'];
const sameKeys=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)
 &&Object.keys(value).sort().join('|')===[...keys].sort().join('|');
const identityKeys=['namespace','edition','registrySha256','coordinate','houseId','sphereId','sourceRole',
 'declaredSourceRecordSha256','computedOriginalRecordSha256','recordDigestMeaning'];

async function pinnedModule(path,pin){
 must(typeof path==='string'&&sha(readFileSync(path))===pin,'NATIVE_DEPENDENCY_DIGEST_MISMATCH');
 return import(pathToFileURL(resolve(path)).href);
}

export async function runProjectionWorkBurst({envelopeBytes,registryBytes,catalogBytes,workBurstModulePath,
 next144ModulePath,modeIngressModulePath,maxParallel=12}={}){
 must(sha(registryBytes)===PINS.registry&&sha(catalogBytes)===PINS.catalog,'ORIGINAL_BYTES_REQUIRED');
 must(Number.isSafeInteger(maxParallel)&&maxParallel>=1&&maxParallel<=12,'NATIVE_PARALLEL_SAFETY_BOUND');
 const nestedNext=resolve(dirname(modeIngressModulePath),'../peer-inputs/next144.mjs');
 must(sha(readFileSync(nestedNext))===PINS.next144,'R02_DEPENDENCY_DIGEST_MISMATCH');
 const [{executeLocalWorkBurst},{bindNext144ToOriginal},{buildReviewIngress}]=await Promise.all([
  pinnedModule(workBurstModulePath,PINS.workBurst),pinnedModule(next144ModulePath,PINS.next144),pinnedModule(modeIngressModulePath,PINS.modeIngress)]);
 const bound=bindNext144ToOriginal({catalogBytes,registryBytes});
 const ingress=buildReviewIngress({catalogBytes,registryBytes});
 const original=JSON.parse(Buffer.from(registryBytes).toString('utf8'));
 const nodes=new Map(bound.targets.map(n=>[n.coordinate,n]));
 const proposals=new Map(bound.tasks.map(p=>[p.id,p]));
 const envelopes=JSON.parse(Buffer.from(envelopeBytes).toString('utf8'));
 must(Array.isArray(envelopes)&&envelopes.length>0,'ENVELOPE_INVENTORY_REQUIRED');
 const seen=new Set(),tasks=[];
 for(const e of envelopes){
  must(e&&typeof e==='object'&&!Array.isArray(e)&&Object.keys(e).sort().join('|')===['schema','requestId','payloadSha256','payload','state','requiredRights'].sort().join('|'),'ENVELOPE_SCHEMA');
  const p=e.payload,n=nodes.get(p?.identity?.coordinate),proposal=proposals.get(n?.initiative);
  must(n&&proposal,'SOURCE_NODE_NOT_FOUND');
  must(e.schema==='atlas.delivery-intent/v1'&&e.state==='PREPARED_NOT_DELIVERED'&&/^circuit-[a-f0-9]{56}$/.test(e.requestId)&&!seen.has(e.requestId),'REQUEST_ID_OR_DUPLICATE');
  must(e.payloadSha256===sha(canonical(p)),'PAYLOAD_DIGEST');
  must(typeof p.runId==='string'&&/^[a-zA-Z0-9._:-]{1,120}$/.test(p.runId)&&Number.isSafeInteger(p.passId)&&p.passId>=1,'RUN_PASS_ID');
  must(e.requestId==='circuit-'+sha(canonical({run:p.runId,pass:p.passId,node:p.identity.coordinate,platform:p.platform,route:p.route})).slice(0,56),'REQUEST_BINDING');
  const keys=[...payloadKeys,...(p.platform==='IRON_EMPIRE'?['fiction']:[])].sort();
  must(Object.keys(p).sort().join('|')===keys.join('|')&&['ATLAS','ARIADNE','SWARMCHAT','IRON_EMPIRE'].includes(p.platform),'PUBLIC_REFERENCE_PROJECTION_ONLY');
  must(sameKeys(p.identity,identityKeys)&&p.identity.namespace==='ARIADNE_V07'&&p.identity.edition==='Ariadne v0.7'
   &&p.identity.registrySha256===PINS.registry&&p.identity.declaredSourceRecordSha256===n.sourceNodeDigest
   &&p.identity.computedOriginalRecordSha256===sha(canonical(original.nodes[n.coordinate]))
   &&p.identity.sourceRole===n.sourceRole&&p.identity.sphereId===n.sphere&&p.identity.houseId===n.coordinate.slice(0,3)
   &&p.identity.recordDigestMeaning==='ORIGINAL_RECORD_DECLARATION_AND_RECOMPUTED_JSON_ARE_DISTINCT','ORIGINAL_NODE_IDENTITY_MISMATCH');
  must(p.route==='NODE_WORK_REVIEW'&&p.initiative===null&&p.sourceProposalSuggestedMode===proposal.suggestedMode
   &&p.proposalBodyImported===false&&p.sourceBodyImported===false&&p.catalogSha256===PINS.catalog
   &&p.mode==='WORK_REFERENCE_ONLY'&&p.status==='CANDIDATE_NOT_ACCEPTED'&&p.semanticAcceptance===false
   &&p.canonEffect==='NONE'&&p.authorityEffect==='NONE'&&p.hostAuthenticated===false&&p.residentAssigned===false
   &&p.actualModelVisits===0&&p.implementationState==='NOT_IMPLEMENTED_BY_TRANSPORT','PROJECTION_MODE_OR_AUTHORITY');
  if(p.scopeMatch!==null){
   const s=p.scopeMatch;
   must(sameKeys(s,['reason','affirmativeTokenHits','exclusionTokenHits','semanticAcceptance','authorityEffect'])
    &&['AFFIRMATIVE_TEXT_ONLY','EXCLUSION_TEXT_ONLY','MIXED_SCOPE_TEXT','IDENTITY_ONLY','BROWSE_ONLY'].includes(s.reason)
    &&Number.isSafeInteger(s.affirmativeTokenHits)&&s.affirmativeTokenHits>=0&&Number.isSafeInteger(s.exclusionTokenHits)
    &&s.exclusionTokenHits>=0&&s.semanticAcceptance===false&&s.authorityEffect==='NONE','SCOPE_IS_NOT_AUTHORITY');
  }
  if(p.platform==='IRON_EMPIRE'){
   const f=p.fiction;
   must(sameKeys(f,['context','source','overlay','isEmpiricalScience','storyEdited','privateModeImported','creativeExecution'])
    &&f.context==='SOURCE_SCHEMA_REVIEW_ONLY'&&f.isEmpiricalScience===false&&f.storyEdited===false&&f.privateModeImported===false
    &&f.creativeExecution==='REQUIRES_EXPLICIT_OPT_IN_AND_EDITORIAL_REVIEW','FICTION_REFERENCE_ONLY');
   must(sameKeys(f.source,['repository','commit','blob','sha256','status'])&&f.source.repository==='atlaslattice/continuum-os'
    &&f.source.commit==='38df5731f32e4bf77e8d9b8ff9026ac47b699219'&&f.source.blob==='8a93c26cf2e8b8cd7d1ba180f2a30eb72f422a0f'
    &&f.source.sha256==='baa72525a19d38d6320a84eeaddaa5966b4c7d44481a011c9191f67d4498f632'&&f.source.status==='PROPOSED_NOT_LOCKED_CANON','FICTION_SOURCE_PIN');
   must(sameKeys(f.overlay,['repository','commit','blob','sha256','status'])&&f.overlay.repository==='atlaslattice/open-regenerative-compute-standard'
    &&f.overlay.commit==='3814624e40c7a35a360fbc60403cc59455261a98'&&f.overlay.blob==='991d64d57164336ceefbf3f450769ab43c49fd91'
    &&f.overlay.sha256==='5afae5eabc2aae466ed933d09bfb73165d5d541b238dda2346dbfe79f094e269'&&f.overlay.status==='AUTHOR_REVIEW_REQUIRED','FICTION_OVERLAY_PIN');
  }
  must(e.requiredRights.join('|')==='READ|DISPATCH|RETURN','CURRENT_RIGHTS_REQUIREMENT');
  const request={coordinate:n.coordinate,edition:bound.registryEdition,initiative:null,namespace:'ARIADNE_V07',
   registrySha256:bound.registrySha256,route:'NODE_WORK_REVIEW',sourceNodeDigest:n.sourceNodeDigest};
  const preview=ingress(request);
  must(preview.status==='INDEPENDENT_NODE_REVIEW_REQUIRES_AUTHORIZATION','R02_INGRESS_HOLD');
  seen.add(e.requestId);
  tasks.push({id:'evp'+sha(e.requestId).slice(0,40),operator:'LOCAL_SOURCE_PROJECTION',mode:'WORK',
   resourceKey:n.sphere,input:{request,projectionDigest:e.payloadSha256,platform:p.platform},
   evidenceRefs:['ariadne:'+PINS.registry,'native:PR19-WorkBurst-R02-Ingress'],noHarvest:false});
 }
 const pages=[];let passed=0;
 for(let offset=0;offset<tasks.length;offset+=96){
  const page=tasks.slice(offset,offset+96);
  const result=await executeLocalWorkBurst({tasks:page,maxParallel,operators:{LOCAL_SOURCE_PROJECTION:async input=>{
   const output=ingress(input.request);
   return {status:output.status==='INDEPENDENT_NODE_REVIEW_REQUIRES_AUTHORIZATION'?'PASS_LOCAL':'HOLD_LOCAL',resultTag:'SOURCE_PROJECTION',checks:1};
  }}});
  must(result.status==='LOCAL_COMPLETE','NATIVE_BURST_HELD');
  passed+=result.counts.passed;
  pages.push({index:pages.length+1,count:page.length,receiptDigest:result.receiptDigest,waves:result.waves.length});
 }
 return {schema:'atlas.twelve-pass.native-work-burst/v1',status:'LOCAL_SOURCE_PROJECTIONS_CHECKED',
  inputSha256:sha(Buffer.from(envelopeBytes)),runIds:[...new Set(envelopes.map(e=>e.payload.runId))].sort(),
  passIds:[...new Set(envelopes.map(e=>e.payload.passId))].sort((a,b)=>a-b),
  executionConfig:{nativeBatchSize:96,maxParallel,operator:'LOCAL_SOURCE_PROJECTION'},
  modulePins:PINS,projectionsChecked:passed,uniqueNodes:new Set(envelopes.map(e=>e.payload.identity.coordinate)).size,
  platforms:Object.fromEntries(['ATLAS','ARIADNE','SWARMCHAT','IRON_EMPIRE'].map(p=>[p,envelopes.filter(e=>e.payload.platform===p).length])),
  nativeBurstInvocations:pages.length,maxParallel,pages,receiptDigest:sha(canonical(pages)),
  proposedSourceWorkInitiatives:bound.modeCounts.WORK,protectedOptionalSourceInitiatives:144-bound.modeCounts.WORK,
  distinctModelVisits:0,implementedNodeTickets:0,hostVerified:false,hostedUpdates:0,canonEffect:'NONE',
  originalR02IngressReused:true,secondSchedulerCreated:false};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const [input,registry,catalog,workBurst,next144,ingress]=process.argv.slice(2);
  must(input&&registry&&catalog&&workBurst&&next144&&ingress,'Usage: node workburst-bridge.mjs projections.json original.json catalog.json work-burst.mjs next144.mjs mode-ingress.mjs');
  const result=await runProjectionWorkBurst({envelopeBytes:readFileSync(input),registryBytes:readFileSync(registry),
   catalogBytes:readFileSync(catalog),workBurstModulePath:workBurst,next144ModulePath:next144,modeIngressModulePath:ingress});
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
 }catch(error){process.stderr.write(String(error.message)+'\n');process.exitCode=1;}
}
