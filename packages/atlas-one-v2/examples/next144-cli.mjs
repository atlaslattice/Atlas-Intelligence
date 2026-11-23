#!/usr/bin/env node
/** Offline-only source compiler. No site, D1, webhook, model, room or provider calls. */
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {prepareNext144,bindNext144ToOriginal} from '../src/next144.mjs';
const args=process.argv.slice(2),flags=new Map();
for(let i=0;i<args.length;i++){
  const a=args[i];
  if(a==='--include-source-names'){flags.set(a,true);continue;}
  if(!['--registry','--out'].includes(a)||!args[i+1]||args[i+1].startsWith('--')){process.stderr.write('Usage: node examples/next144-cli.mjs --out PLAN.json [--registry PRIVATE_ORIGINAL_ATLAS.json] [--include-source-names]\n');process.exit(2);}
  flags.set(a,args[++i]);
}
if(!flags.get('--out')||flags.has('--include-source-names')&&!flags.has('--registry')){process.stderr.write('An output path is required; source names need original registry bytes.\n');process.exit(2)}
const catalogBytes=readFileSync(fileURLToPath(new URL('../data/next144-civilizational-capabilities.json',import.meta.url)));
const plan=flags.has('--registry')?bindNext144ToOriginal({catalogBytes,registryBytes:readFileSync(flags.get('--registry')),includeNames:flags.has('--include-source-names')}):prepareNext144({catalogBytes});
// Never clobber source or overwrite an existing review/receipt.
writeFileSync(flags.get('--out'),JSON.stringify(plan,null,2)+'\n',{flag:'wx',mode:0o600});
process.stdout.write(JSON.stringify({schema:plan.schema,status:plan.status,spheres:144,targets:1728,sourceBytesVerified:plan.sourceBytesVerified,completedCapabilities:plan.completedCapabilities||0,verifiedWelfareGains:plan.verifiedWelfareGains||plan.measuredWelfareGains||0})+'\n');
