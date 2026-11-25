import {readFileSync} from 'node:fs';
const bytes=readFileSync(process.argv[2]);const m=new WebAssembly.Module(bytes);const imports=WebAssembly.Module.imports(m);
if(imports.length!==0)throw Error('Untrusted imports in compiled native WASM');
const e=WebAssembly.Module.exports(m).map(x=>x.name);
for(const n of ['aos_app_plan','aos_app_lookup','aos_app_catalog_count'])if(!e.includes(n))throw Error('Missing native exported symbol '+n);
console.log('ATLAS_APPGATE_WASM_PASS bytes='+bytes.length+' imports=0 exportedNativeFunctions='+e.filter(x=>x==='aos_app_plan'||x==='aos_app_lookup').length);
