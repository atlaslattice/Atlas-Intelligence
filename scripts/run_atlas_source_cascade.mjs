#!/usr/bin/env node
/* Offline replay of Atlas 100 + 1000 historical-source review requests.
 * No network, GitHub mutations, model calls, host permissions or CANON effects.
 */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {SOURCE_BLOB,planEvolution,verifyEvolution} from './atlas_source_cascade.mjs';

function main(argv){
  if(argv.includes('--help')){
    console.log('Usage: node scripts/run_atlas_source_cascade.mjs [--all-three-gates] [--out-prefix PATH] [snapshot.json]');
    return 0;
  }
  const positional=[],named={};
  for(let i=0;i<argv.length;i++){
    const arg=argv[i];
    if(arg==='--out-prefix'){
      if(i+1>=argv.length||argv[i+1].startsWith('--'))throw Error('MISSING_OUTPUT_PREFIX');
      named.prefix=argv[++i];
    }else if(arg==='--all-three-gates')named.all=true;
    else if(arg.startsWith('--'))throw Error('UNKNOWN_ARGUMENT');
    else positional.push(arg);
  }
  if(positional.length>1)throw Error('EXPECTED_SINGLE_SOURCE_CUT');
  const defaultPath=fileURLToPath(new URL('../docs/ops/ATLAS_GITHUB_OPEN_SOURCE_CUT_20261122.json',import.meta.url));
  const path=positional[0]?resolve(positional[0]):defaultPath;
  const raw=readFileSync(path);
  const blob=createHash('sha1').update(Buffer.from('blob '+raw.length+'\0')).update(raw).digest('hex');
  if(blob!==SOURCE_BLOB)throw Error('SOURCE_CUT_GIT_BLOB_SHA_MISMATCH');
  const cut=JSON.parse(raw.toString('utf8'));
  const result=planEvolution(cut,{pilot:100,expansion:named.all?1220:1000});
  const verification=verifyEvolution(cut,result);
  if(!verification.valid)throw Error('DETERMINISTIC_REPLAY_MISMATCH');
  const summary={
    status:'REVIEW_REQUIREMENTS_RECORDED_NOT_PERFORMED',
    source_git_blob_sha1:blob,source_date:result.source_date,
    pilot_steps:result.pilot_rows.length,followon_steps:result.expansion_rows.length,
    input_items:result.source_items,candidate_review_steps:result.summary.total_steps,
    unique_items_touched:result.summary.distinct_items_touched,
    generated_review_gates:result.summary.review_gate_counts,
    still_unrequested_gates:result.summary.remaining_unrequested_review_gates,
    pilot_checkpoint64:result.pilot_checkpoint64,final_checkpoint64:result.final_checkpoint64,
    exact_replay_pass:verification.valid,
    checksum_warning:'FNV1a64 is a replay checksum, NOT cryptographic provenance or identity attestation',
    host_actions:0,model_calls:0,room_messages:0,real_issues_closed:0,
    real_prs_merged:0,source_rights_verified:false,canon:false,deployed:false
  };
  if(named.prefix){
    const filename=resolve(named.prefix);
    const files=[
      [filename+'.pilot.json',{phase:'PILOT_100',source_git_blob_sha1:blob,parent:result.initial_checksum64,checkpoint:result.pilot_checkpoint64,rows:result.pilot_rows}],
      [filename+'.followon.json',{phase:named.all?'EXPANSION_1220':'EXPANSION_1000',source_git_blob_sha1:blob,parent:result.pilot_checkpoint64,checkpoint:result.final_checkpoint64,rows:result.expansion_rows}]
    ];
    for(const [name,obj]of files)writeFileSync(name,JSON.stringify(obj,null,2)+'\n',{encoding:'utf8',flag:'wx'});
  }
  console.log(JSON.stringify(summary,null,2));
  return 0;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{process.exitCode=main(process.argv.slice(2));}
  catch(error){
    console.error('CASCADE_HOLD:',error instanceof Error?error.message:'UNKNOWN');
    process.exitCode=2;
  }
}
export {main};
