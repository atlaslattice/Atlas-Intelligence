import {writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ARIADNE_SHA256,NODE_COUNT,decodeIndex} from '../src/geometry.mjs';
const dir=resolve(dirname(fileURLToPath(import.meta.url)),'..','manifests');
mkdirSync(dir,{recursive:true});
const addressRecords=Array.from({length:NODE_COUNT},(_,i)=>{
  const x=decodeIndex(i);
  return {hsn:x.hsn,linearIndex:i,house:x.h,sphere:x.s,node:x.n,semanticStatus:'ADDRESS_ONLY_NOT_REVIEWED',registrySha256:ARIADNE_SHA256};
});
const tracks=['original-ontology','tensor-memory','neural-conditioning','sparse-routing','source-corpus','typed-crosswalks','council-academy','learning-memory','simulation-physics','glyph-cymatic-ux','safety-protocol','evaluation-reproducibility'];
const gates=['exact-source-pin','scope-rights','input-contract','output-contract','adversarial-falsifier','baseline-parity','independent-heldout','resource-budget','provenance-license','semantic-review','migration-rollback','peer-dissent-review'];
const workboard=[];
for(let w=0;w<tracks.length;w++)for(let c=0;c<gates.length;c++)workboard.push({id:`ATLAS-GEO-W${String(w+1).padStart(2,'0')}-C${String(c+1).padStart(2,'0')}`,workstream:tracks[w],check:gates[c],status:'PROPOSED_NOT_RUN',voluntary:true,assignedTo:null,accepted:false,countsAsCompletedMacroTurn:false});
const files=[
  ['addresses.json',{schema:'atlas.geometry.addresses/v1',originalAriadneSha256:ARIADNE_SHA256,cardinality:1728,semanticCoverageClaim:false,addresses:addressRecords}],
  ['workboard_144.json',{schema:'atlas.geometry.workboard-proposals/v1',intent:'VOLUNTARY_ALL_HANDS',matrix:'12 workstreams x 12 criteria; NOT original ontology or agent count',totalProposed:144,completed:0,canonicalSource:ARIADNE_SHA256,items:workboard}]
];
for(const [name,value] of files)writeFileSync(resolve(dir,name),JSON.stringify(value,null,2)+'\n');
console.log('Regenerated 1,728 address-only entries and 144 proposed review cells; no semantic acceptance or resident dispatch.');
