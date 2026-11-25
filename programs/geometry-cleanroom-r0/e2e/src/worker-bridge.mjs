import {spawn} from 'node:child_process';
import {join} from 'node:path';
/** One long-lived, bounded worker attached to a separately hash-restored private Model0.3 workspace. */
export function startPrivateSelectedWorker({python='python',sourceRoot,privateR06Root,workspace,timeoutMs=120000}){
 if(typeof sourceRoot!=='string'||typeof privateR06Root!=='string'||typeof workspace!=='string')throw Error('HOST_PATHS_REQUIRED');
 const args=['-u','-m','worker.selected_model_worker','--workspace',workspace];
 const env={PATH:process.env.PATH??'',HOME:process.env.HOME??'',PYTHONPATH:[sourceRoot,privateR06Root].join(':'),
  PYTHONDONTWRITEBYTECODE:'1',OPENBLAS_NUM_THREADS:'1',OMP_NUM_THREADS:'1',MKL_NUM_THREADS:'1'};
 const child=spawn(python,args,{cwd:sourceRoot,env,stdio:['pipe','pipe','pipe']});
 let live=false,buffer='',pending=null,readyResolve,readyReject;
 const ready=new Promise((res,rej)=>{readyResolve=res;readyReject=rej});
 const backlog=[];
 function rejectAll(err){if(pending){clearTimeout(pending.timer);pending.reject(err);pending=null;}for(const item of backlog)item.reject(err);backlog.length=0;if(!live)readyReject(err);}
 child.on('error',rejectAll);child.on('exit',code=>rejectAll(Error('PRIVATE_MODEL_WORKER_EXIT_'+code)));
 child.stdout.on('data',chunk=>{
  buffer+=chunk.toString('utf8');if(Buffer.byteLength(buffer)>1024*1024){rejectAll(Error('MODEL_OUTPUT_BUDGET'));child.kill();return;}
  for(;;){const k=buffer.indexOf('\n');if(k<0)break;const line=buffer.slice(0,k);buffer=buffer.slice(k+1);
   let msg;try{msg=JSON.parse(line);}catch{rejectAll(Error('WORKER_PROTOCOL'));child.kill();break;}
   if(!live){if(msg.event!=='READY'||msg.headStateSha256!=='736fdd341778468d32d89ca3cb60b71d415f678dae7b2efdcec978a08b7432d8'){
     rejectAll(Error('WRONG_MODEL_READY'));child.kill();return;}
     live=true;readyResolve(msg);launch();continue;}
   if(pending){const item=pending;pending=null;clearTimeout(item.timer);msg.event==='FRAME'?item.resolve(msg):item.reject(Error('REAL_INFERENCE_HELD'));launch();}
  }
 });
 function launch(){if(!live||pending||backlog.length===0)return;pending=backlog.shift();pending.timer=setTimeout(()=>{pending?.reject(Error('WORKER_TIMEOUT'));child.kill();},timeoutMs);
  child.stdin.write(JSON.stringify(pending.req)+'\n');}
 const infer=async req=>{await ready;return new Promise((resolve,reject)=>{backlog.push({req,resolve,reject,timer:null});launch();});};
 return Object.freeze({ready,infer,close:()=>{child.kill();},pid:child.pid});
}
