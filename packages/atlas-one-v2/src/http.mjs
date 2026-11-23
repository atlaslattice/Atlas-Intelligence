/** Optional owner-local HTTP preview for the new core. NEVER expose on a public host without IAM.
 * No model calls, private content ingress, Work posts or CANON writes.
 */
import {createServer} from 'node:http';
import {AriadneRegistry,prepareResearch,versionInfo,parseStrictJson,Hold} from './index.mjs';
import {prepareWorkEnvelope} from './engine.mjs';
const reply=(res,status,body)=>{
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store, private','X-Atlas-Authority':'NONE','X-Content-Type-Options':'nosniff'});
  res.end(JSON.stringify(body));
};
export function createLocalPreviewServer({registry=null}={}){
  if(registry!==null && !(registry instanceof AriadneRegistry))throw new Hold('PINNED_SOURCE_ONLY');
  return createServer(async(req,res)=>{
    const url=new URL(req.url||'/', 'http://127.0.0.1');
    if(req.method==='GET' && url.pathname==='/v2/status')return reply(res,200,{...versionInfo(),hostAuthenticated:false});
    if(req.method==='GET' && url.pathname.startsWith('/v2/hsn/')){
      if(!registry)return reply(res,503,{status:'HOLD',reason:'REGISTRY_NOT_INSTALLED'});
      try {return reply(res,200,{status:'SOURCE_NODE_NOT_SEMANTIC_AUTHORITY',node:registry.lookup(decodeURIComponent(url.pathname.slice(8))),authorityEffect:'NONE'});}catch{return reply(res,400,{status:'HOLD',reason:'INVALID_OR_UNKNOWN_HSN'});}
    }
    if(req.method==='POST' && url.pathname==='/v2/research/preview'){
      if(!registry)return reply(res,503,{status:'HOLD',reason:'REGISTRY_NOT_INSTALLED'});
      let raw='',size=0;for await(const chunk of req){size+=chunk.length;if(size>65536)return reply(res,413,{status:'HOLD',reason:'REQUEST_TOO_LARGE'});raw+=chunk.toString('utf8');}
      try{const packet=prepareResearch(parseStrictJson(raw,{maxBytes:65536}),registry);return reply(res,200,{status:'CANDIDATE_NOT_ADJUDICATED',packetSHA256:packet.packetSHA256,envelope:prepareWorkEnvelope(packet),hostAuthenticated:false});}
      catch(e){return reply(res,400,{status:'HOLD',reason:e instanceof Hold?e.code:'INVALID_RESEARCH_PACKET'});}
    }
    return reply(res,404,{status:'NOT_FOUND'});
  });
}
export async function listenLocal(server,port=0){return new Promise((resolve,reject)=>{
  server.once('error',reject);server.listen(port,'127.0.0.1',()=>resolve({address:server.address().address,port:server.address().port}));
});}
