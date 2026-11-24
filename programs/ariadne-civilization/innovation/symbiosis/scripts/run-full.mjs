#!/usr/bin/env node
/** Full synthetic execution 1,728 × (21 roots × 20 extensions), dry-run only. */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {ROOTS,CHANNELS,runNodeMesh,meta145MeshReduce,symbiosisExtension,extensionCatalog,meshGraph} from '../src/mesh.mjs';
import {playDeck} from '../src/play.mjs';
const here=dirname(fileURLToPath(import.meta.url));
const repo=resolve(here,'../..');
const inPath=process.argv[2]??join(repo,'private-source/source-index.csv');
const outPath=process.argv[3]??join(repo,'symbiosis/reports');
const EXPECTED_DERIVED_SHA='60146fc63beba5f8d1b28ea8a6481f4e4a469827afc6ae04edfecc229c1fa4ce';
const hash=b=>createHash('sha256').update(b).digest('hex');
const raw=readFileSync(inPath),actual=hash(raw);
if(actual!==EXPECTED_DERIVED_SHA)throw Error('SOURCE_DERIVED_INDEX_HASH_MISMATCH');
const rows=raw.toString('utf8').trimEnd().split(/\r?\n/);
function parseCSV(row){const out=[];let part='',quoted=false;for(let i=0;i<row.length;i++){const c=row[i];if(c==='"'){if(quoted&&row[i+1]==='"'){part+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){out.push(part);part='';}else part+=c;}if(quoted)throw Error('BAD_CSV');return [...out,part];}
if(rows[0]!=='coordinate,house_name,sphere_name,node_name,node_kind,source_sha256'||rows.length!==1729)throw Error('SOURCE_INDEX_SCHEMA');
const records=rows.slice(1).map(parseCSV).map(p=>({coordinate:p[0],house_name:p[1],sphere_name:p[2],node_name:p[3],kind:p[4],recordSha256:p[5]}));
if(records.length!==1728||new Set(records.map(x=>x.coordinate)).size!==1728)throw Error('SOURCE_INDEX_CARDINALITY');
let domain=0,meta=0;const counts={},sumHouse={},sumSphere={};
for(const r of records){const h=r.coordinate.slice(0,3),s=r.coordinate.slice(0,7);if(!/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/.test(r.coordinate)||!/^[a-f0-9]{64}$/.test(r.recordSha256))throw Error('RECORD_PIN');
 if(r.kind==='DOMAIN_SPECIALIZATION')domain++;else if(r.kind==='EPISTEMIC_META')meta++;else throw Error('NODE_KIND');
 counts[s]=(counts[s]??0)+1;sumHouse[h]={nodes:0,compositions:0,outcomeChanges:0,deniedProbes:0};sumSphere[s]={nodes:0,compositions:0,outcomeChanges:0,deniedProbes:0};
}
if(domain!==1008||meta!==720||Object.keys(counts).length!==144||Object.values(counts).some(x=>x!==12))throw Error('ONTOLOGY_ROLE_PARITY');
const runHash=createHash('sha256'),denialHash=createHash('sha256'),ledger=[],byTarget=Object.fromEntries(CHANNELS.map(x=>[x.operatorId,{calls:0,changed:0,unchanged:0}]));
let positives=0,negatives=0,changed=0,unchanged=0;
const start=process.env.ATLAS_START?Number(process.env.ATLAS_START):0;
const limit=process.env.ATLAS_TEST_LIMIT?Number(process.env.ATLAS_TEST_LIMIT):records.length;
if(!Number.isInteger(limit)||limit<1||limit>1728||!Number.isInteger(start)||start<0||start+limit>1728)throw Error('INVALID_SLICE');
for(const [i,r] of records.slice(start,start+limit).entries()){
 const cards=runNodeMesh(r.coordinate);
 if(!Array.isArray(cards)||cards.length!==420)throw Error('MISSING_420:'+r.coordinate);
 const reduction=meta145MeshReduce(cards);
 if(reduction.state!=='SIMULATED_MESH_READY_FOR_REVIEW')throw Error('MESH_REDUCTION_FAILED:'+r.coordinate);
 let localChanged=0;const localStream=createHash('sha256');
 for(const c of cards){if(c.state!=='LOCAL_SYNTHETIC_CANDIDATE'||c.authorityEffect!=='NONE'||c.externalEffects!==0||c.acceptedScienceEdges!==0)throw Error('FORGED_SUCCESS');
  runHash.update(c.receiptSha256+'\n');localStream.update(c.receiptSha256+'\n');positives++;byTarget[c.targetId].calls++;
  if(c.targetOutputChanged){changed++;localChanged++;byTarget[c.targetId].changed++;}else {unchanged++;byTarget[c.targetId].unchanged++;}
  const neg=symbiosisExtension(c.rootId,c.channelId,r.coordinate,{originMode:'PALACE'});
  if(neg.state!=='HOLD'||neg.externalEffects!==0||neg.authorityEffect!=='NONE')throw Error('PRIVATE_HARVEST_VETO_FAILED');
  denialHash.update(c.extensionId+'|'+r.coordinate+'|'+neg.state+'\n');negatives++;
 }
 const house=r.coordinate.slice(0,3),sphere=r.coordinate.slice(0,7);
 for(const z of [sumHouse[house],sumSphere[sphere]]){z.nodes++;z.compositions+=420;z.outcomeChanges+=localChanged;z.deniedProbes+=420;}
 ledger.push({coordinate:r.coordinate,sourceNodeSha256:r.recordSha256,kind:r.kind,positive:420,privateModeHolds:420,changed:localChanged,unchanged:420-localChanged,positiveStreamSha256:localStream.digest('hex'),meta145ReceiptSha256:reduction.receiptSha256});
 if((i+1)%144===0)console.log('Progress',start+i+1,'/',1728,'synthetic nodes');
}
if(limit===1728&&(positives!==725760||negatives!==725760||changed+unchanged!==725760))throw Error('GLOBAL_CARDINALITY');
const report={schema:'atlas.ariadne.symbiotic-full-sweep/v0.1',status:'EXECUTED_DETERMINISTIC_SYNTHETIC_NOT_HOSTED',
 sourceDerivedCsvSha256:actual,startOrdinal:start+1,endOrdinal:start+limit,ariadneRegistrySha256:'07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6',
 rawOriginalRegistryBytesPresent:false,sourceNodesExecuted:limit,sourceDomainNodes:domain,sourceMethodNodes:meta,
 baseOperatorRoots:21,extensionMethods:20,uniqueDirectedConfigurations:extensionCatalog().length,
 totalSyntheticPositiveCompositions:positives,totalNegativePrivateModeHolds:negatives,
 targetResultsChangedUnderSyntheticConditioning:changed,targetResultsUnchanged:unchanged,
 sourceOnlyPositiveStreamDigest:runHash.digest('hex'),privateModeHoldStreamDigest:denialHash.digest('hex'),
 sphereCount:144,houseCount:12,houseSummaries:sumHouse,sphereSummaries:sumSphere,targetSummary:byTarget,
 hierarchicalEffectivenessValidated:false,evidenceEdgesAccepted:0,realModelCalls:0,realResidentVisits:0,
 canonicalSourceReverifiedFromOriginalBytes:false,hostRightsVerified:false,privatePlayImported:false,
 workflowsActivated:false,meta145HostDeployed:false,externalEffects:0,authorityEffect:'NONE'};
mkdirSync(outPath,{recursive:true});writeFileSync(join(outPath,'run_receipt.json'),JSON.stringify(report,null,2)+'\n');
writeFileSync(join(outPath,'node_1728_receipts.jsonl'),ledger.map(x=>JSON.stringify(x)).join('\n')+'\n');
writeFileSync(join(outPath,'catalog_420.json'),JSON.stringify(extensionCatalog(),null,2)+'\n');
writeFileSync(join(outPath,'directed_mesh_graph.json'),JSON.stringify(meshGraph(),null,2)+'\n');
writeFileSync(join(outPath,'play_cards_420.json'),JSON.stringify(playDeck(42),null,2)+'\n');
console.log(JSON.stringify({status:report.status,sourceNodesExecuted:limit,positive:positives,privateModeHolds:negatives,changed,unchanged,spheres:Object.keys(sumSphere).length,houses:Object.keys(sumHouse).length,sourceStreamSha256:report.sourceOnlyPositiveStreamDigest},null,2));
