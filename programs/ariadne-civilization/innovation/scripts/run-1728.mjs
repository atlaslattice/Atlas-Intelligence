#!/usr/bin/env node
/** Execute 20 pure synthetic operator fixtures across a source-pinned 1728 HSN index. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {runInnovation,INNOVATIONS,ORIGINAL_SHA256} from '../src/innovations.mjs';
import {syntheticFixture} from '../src/synthetic-fixtures.mjs';
import {negativeFixture} from '../src/adversarial-fixtures.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SOURCE_SHA='60146fc63beba5f8d1b28ea8a6481f4e4a469827afc6ae04edfecc229c1fa4ce';
const sourcePath=process.argv[2]||path.join(root,'private-source/source-index.csv');
const outDir=process.argv[3]||path.join(root,'reports');
const raw=fs.readFileSync(sourcePath);
const sha=x=>createHash('sha256').update(x).digest('hex');
if(sha(raw)!==SOURCE_SHA)throw Error('DERIVED_SOURCE_HASH_MISMATCH');
const rows=raw.toString('utf8').trim().split(/\r?\n/);
if(rows[0]!=='coordinate,house_name,sphere_name,node_name,node_kind,source_sha256'||rows.length!==1729)throw Error('SOURCE_CSV_SHAPE');
function parseCsvLine(line){
 const fields=[];let field='',quoted=false;
 for(let i=0;i<line.length;i++){
  const ch=line[i];
  if(ch==='"'){
   if(quoted&&line[i+1]==='"'){field+='"';i++;}
   else quoted=!quoted;
  }else if(ch===','&&!quoted){fields.push(field);field='';}
  else field+=ch;
 }
 if(quoted)throw Error('UNTERMINATED_QUOTE');
 fields.push(field);return fields;
}
const node=rows.slice(1).map(line=>{
 const v=parseCsvLine(line);if(v.length!==6)throw Error('SOURCE_ROW_FIELDS');
 const [coordinate,house_name,sphere_name,node_name,node_kind,source_sha256]=v;
 if(!/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/.test(coordinate)||!['DOMAIN_SPECIALIZATION','EPISTEMIC_META'].includes(node_kind)||!/^[a-f0-9]{64}$/.test(source_sha256))throw Error('SOURCE_RECORD_TYPE');
 return {coordinate,house_name,sphere_name,node_name,node_kind,source_sha256};
});
if(new Set(node.map(x=>x.coordinate)).size!==1728)throw Error('DUPLICATE_COORDINATE');
if(node.filter(x=>x.node_kind==='DOMAIN_SPECIALIZATION').length!==1008||node.filter(x=>x.node_kind==='EPISTEMIC_META').length!==720)throw Error('ONTOLOGY_AXIS_MISMATCH');
const bySphere={},byHouse={},byLab={};for(const x of INNOVATIONS)byLab[x.id]={runs:0,candidates:0,holds:0,positiveFunctionName:x.exportName};
const lines=[],negativeLines=[];
for(const n of node){
 const h=n.coordinate.slice(0,3),s=n.coordinate.slice(0,7);byHouse[h]??={runs:0,holds:0};bySphere[s]??={runs:0,holds:0};
 for(const lab of INNOVATIONS){
  const input=syntheticFixture(lab.id,n.coordinate);
  const response=runInnovation(lab.id,input);
  if(!['LOCAL_SYNTHETIC_CANDIDATE','HOLD'].includes(response.state))throw Error('UNEXPECTED_OPERATOR_STATE');
  const receipt={schema:'atlas.one.synthetic-innovation-probe/v0.1',coordinate:n.coordinate,originalRecordSha256:n.source_sha256,
   experimentId:lab.id,state:response.state,resultSha256:sha(JSON.stringify(response)),
   sourceRegistrySha256:ORIGINAL_SHA256,sourceDerivedCsvSha256:SOURCE_SHA,realModelCalls:0,
   semanticEdgesAccepted:0,realResidentTurns:0,authorityEffect:'NONE'};
  lines.push(JSON.stringify(receipt));
  byLab[lab.id].runs++;byHouse[h].runs++;bySphere[s].runs++;
  if(response.state==='HOLD'){byLab[lab.id].holds++;byHouse[h].holds++;bySphere[s].holds++;}else byLab[lab.id].candidates++;
  const bad=runInnovation(lab.id,negativeFixture(lab.id,n.coordinate));
  if(bad.state!=='HOLD'||bad.externalEffects!==0)throw Error('ADVERSARIAL_HOLD_FAILED:'+lab.id+':'+n.coordinate);
  negativeLines.push(JSON.stringify({schema:'atlas.one.adversarial-innovation-probe/v0.1',coordinate:n.coordinate,experimentId:lab.id,
    state:bad.state,denialCode:bad.code,rawSourceRead:false,authorityEffect:'NONE',externalEffects:0}));
 }
}
if(lines.length!==34560||negativeLines.length!==34560||Object.keys(bySphere).length!==144||Object.keys(byHouse).length!==12)throw Error('CASCADE_SHAPE');
fs.mkdirSync(outDir,{recursive:true});
const text=lines.join('\n')+'\n';fs.writeFileSync(path.join(outDir,'synthetic_34560.jsonl'),text);
const negText=negativeLines.join('\n')+'\n';fs.writeFileSync(path.join(outDir,'negative_34560.jsonl'),negText);
const report={schema:'atlas.one.innovation-spectrum-run/v0.1',runStatus:'EXECUTED_DETERMINISTIC_SYNTHETIC_PROBES_ONLY',
 sourceRegistrySha256:ORIGINAL_SHA256,sourceDerivedCsvSha256:SOURCE_SHA,sourceNodes:1728,domainNodes:1008,methodNodes:720,
 inventionOperators:INNOVATIONS.length,syntheticOperatorInvocations:lines.length,
 adversarialMutationsRejected:negativeLines.length,totalSyntheticFunctionCalls:lines.length+negativeLines.length,compositeReceiptSha256:sha(text),negativeReceiptSha256:sha(negText),
 sphereProfiles:Object.keys(bySphere).length,houseProfiles:Object.keys(byHouse).length,
 byLab,byHouse,bySphere,hostVerified:false,scienceValidated:false,realResidentTurns:0,realModelCalls:0,
 externalEffects:0,authorityEffect:'NONE',globallyNovelClaimProven:false,
 existingAtlasControlPlaneChanged:false};
fs.writeFileSync(path.join(outDir,'meta145_innovation_reduction.json'),JSON.stringify(report,null,2)+'\n');
fs.writeFileSync(path.join(outDir,'innovation_catalog.json'),JSON.stringify(INNOVATIONS,null,2)+'\n');
console.log(JSON.stringify({status:report.runStatus,sourceNodes:report.sourceNodes,operatorCount:report.inventionOperators,
 runs:report.syntheticOperatorInvocations,adversarialRejected:report.adversarialMutationsRejected,total:report.totalSyntheticFunctionCalls,spheres:report.sphereProfiles,houses:report.houseProfiles,
 holds:Object.values(byLab).reduce((a,b)=>a+b.holds,0),receiptSha256:report.compositeReceiptSha256},null,2));
