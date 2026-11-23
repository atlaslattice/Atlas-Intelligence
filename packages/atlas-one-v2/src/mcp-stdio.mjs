import {createInterface} from 'node:readline';
import {readFileSync} from 'node:fs';
import {AriadneRegistry,parseStrictJson} from './index.mjs';
import {createMcpRouter} from './mcp.mjs';
let registry=null;
if(process.env.ATLAS_ARIADNE_ORIGINAL_FILE)registry=new AriadneRegistry(readFileSync(process.env.ATLAS_ARIADNE_ORIGINAL_FILE));
const dispatch=createMcpRouter({registry});
for await(const line of createInterface({input:process.stdin,crlfDelay:Infinity})){
  let msg;try{msg=parseStrictJson(line,{maxBytes:1048576});}catch{process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Parse error'}})+'\n');continue;}
  const out=dispatch(msg);if(out!==null)process.stdout.write(JSON.stringify(out)+'\n');
}
