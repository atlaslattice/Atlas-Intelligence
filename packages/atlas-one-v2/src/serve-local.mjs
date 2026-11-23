/** Local loopback only; not the SwarmChat production publisher. */
import {readFileSync} from 'node:fs';
import {AriadneRegistry} from './index.mjs';
import {createLocalPreviewServer,listenLocal} from './http.mjs';
const path=process.env.ATLAS_ARIADNE_ORIGINAL_FILE;
if(!path){console.error('Set ATLAS_ARIADNE_ORIGINAL_FILE to an authorized original Ariadne v0.7 atlas.json');process.exitCode=2;}
else {
  const registry=new AriadneRegistry(readFileSync(path));
  const server=createLocalPreviewServer({registry});
  const info=await listenLocal(server,Number(process.env.ATLAS_V2_PORT||0));
  console.log(JSON.stringify({status:'LOCAL_LOOPBACK_ONLY_NO_AUTH',url:`http://${info.address}:${info.port}/v2/status`,registryNodes:registry.size,hostedSwarmChat:false}));
}
