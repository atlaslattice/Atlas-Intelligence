import {createHash} from 'node:crypto';import {readFileSync} from 'node:fs';import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..'),data=JSON.parse(readFileSync(resolve(root,'SOURCE_MANIFEST.json'),'utf8'));
if(data.schema!=='atlas.home.source-manifest/v1'||data.pins?.length<18)throw Error('MANIFEST_SHAPE');
for(const row of data.pins){if(typeof row.path!=='string'||row.path.startsWith('/')||row.path.includes('..')||!/^[a-f0-9]{64}$/.test(row.sha256))throw Error('MANIFEST_ENTRY');const bytes=readFileSync(resolve(root,row.path));if(bytes.length!==row.bytes||createHash('sha256').update(bytes).digest('hex')!==row.sha256)throw Error('MANIFEST_MISMATCH '+row.path)}
console.log(JSON.stringify({status:'VERIFIED',files:data.pins.length,sourceHead:data.gitParent.headSha,codeGeometry:data.ontology.coordinateShape}));
