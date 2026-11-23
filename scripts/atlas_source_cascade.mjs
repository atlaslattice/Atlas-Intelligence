/* Atlas source-linked cascading review ledger.
 * This creates 100 + 1000 DISTINCT REVIEW-GATE CANDIDATES, not 1100 model calls,
 * chats, PR merges, evidence validations, scientific results, or human decisions.
 * Input: dated PUBLIC GitHub metadata cut; snapshots do not prove current status.
 * The FNV-1a 64-bit rolling checksum works on JS UTF-16 code units and is NOT
 * cryptographic. Independently replay and verify the published Git blob.
 * No network calls, permissions, source-body access, publishing or host actions.
 */
export const SOURCE_BLOB="165a59bfeefbeeeaf314b1db8b071e8f8de3f6af";
export const STAGES=[
  {
    "id": "PIN_CURRENT_SOURCE",
    "kind": "source",
    "requirement": "Re-fetch current GitHub state; pin current HEAD, primary source, exact timestamp and evidence. Yesterday's search-cut metadata cannot prove completion.",
    "hold": "HOLD until fresh item/HEAD and original source readback."
  },
  {
    "id": "VERIFY_RIGHTS_SCOPE",
    "kind": "rights",
    "requirement": "Verify source-owner rights, relevant consent, Work/Play/Imagine boundary, privacy and revocation. A metadata row grants no source permission.",
    "hold": "HOLD until authenticated permission and mode scope are independently verified."
  },
  {
    "id": "PROVE_ACCEPTANCE",
    "kind": "acceptance",
    "requirement": "Require task-specific acceptance tests, exact source or current-HEAD CI receipts, dissent preservation, independent reviewer decision and rollback before closing/merging.",
    "hold": "HOLD until executable/current-head evidence and release gates are met."
  }
];
export function fingerprint64(value){
 const s=typeof value==="string"?value:JSON.stringify(value);
 let h=14695981039346656037n;
 for(let i=0;i<s.length;i++){h^=BigInt(s.charCodeAt(i));h=h*1099511628211n&18446744073709551615n;}
 return h.toString(16).padStart(16,"0");
}
export function cutItems(cut){
 if(!cut||typeof cut!=="object"||!Array.isArray(cut.issues)||!Array.isArray(cut.prs)||!/^20\d{2}-\d{2}-\d{2}$/.test(cut.observed_date??""))throw Error("INVALID_SOURCE_CUT");
 if(cut.coverage!=="SOURCE_SEARCH_SNAPSHOT_NOT_CLOSED_OR_COMPLETED")throw Error("SOURCE_CUT_COVERAGE_MUST_BE_EXPLICIT");
 const rows=[...cut.issues,...cut.prs];if(rows.length<1||rows.length>2000)throw Error("SOURCE_COUNT_OUT_OF_BOUNDS");
 const seen=new Set(),groups=new Map();
 for(const x of rows){
  if(!x||typeof x!=="object"||!["issue","pull_request"].includes(x.type)||typeof x.repository!=="string"||!/^atlaslattice\/[A-Za-z0-9_.-]+$/.test(x.repository)||!Number.isSafeInteger(x.number)||x.number<1||typeof x.title!=="string"||!x.title.trim()||x.title.length>512||typeof x.url!=="string")throw Error("INVALID_SOURCE_RECORD");
  const kind=x.type==="issue"?"issues":"pull",expected=`https://github.com/${x.repository}/${kind}/${x.number}`;
  if(x.url!==expected)throw Error("SOURCE_URL_ID_MISMATCH");if(seen.has(x.url))throw Error("DUPLICATE_SOURCE_URL");seen.add(x.url);
  const item={key:`${x.type}:${x.repository}#${x.number}`,url:x.url,title:x.title,repository:x.repository,type:x.type,number:x.number};
  if(!groups.has(x.repository))groups.set(x.repository,[]);groups.get(x.repository).push(item);
 }
 for(const group of groups.values())group.sort((a,b)=>a.type.localeCompare(b.type)||a.number-b.number||a.title.localeCompare(b.title));
 const ordered=[],names=[...groups.keys()].sort();let idx=0;
 while(ordered.length<rows.length){for(const name of names){const x=groups.get(name)[idx];if(x)ordered.push(x);}idx++;}
 return ordered;
}
export function planEvolution(cut,{pilot=100,expansion=1000,sourceBlob=SOURCE_BLOB}={}){
 const ordered=cutItems(cut),n=pilot+expansion;
 if(!Number.isSafeInteger(pilot)||!Number.isSafeInteger(expansion)||pilot<1||expansion<1||n>3000||n>ordered.length*STAGES.length||!/^[a-f0-9]{40}$/.test(sourceBlob))throw Error("CASCADE_BOUNDS_OR_SOURCE_INVALID");
 const sourceDigest=fingerprint64(JSON.stringify({observed_date:cut.observed_date,coverage:cut.coverage,items:ordered}));
 const phase1=[],phase2=[],counts={source:0,rights:0,acceptance:0},perItem=new Map();
 let prev=fingerprint64("atlas-cascade-v1:"+sourceBlob+":"+sourceDigest),ordinal=0;
 for(let stage=0;stage<STAGES.length&&ordinal<n;stage++){
  for(const item of ordered){
   if(ordinal>=n)break;ordinal++;
   const v=STAGES[stage],past=perItem.get(item.key)??null;
   if(stage>0&&(!past||past.review_stage!==STAGES[stage-1].id))throw Error("DEPENDENCY_INCOMPLETE");
   const phase=ordinal<=pilot?"PILOT_"+pilot:"EXPANSION_"+expansion;
   const row={ordinal,phase,item_key:item.key,repository:item.repository,type:item.type,number:item.number,url:item.url,
     source_observed_date:cut.observed_date,review_stage:v.id,stage_kind:v.kind,previous_ordinal:ordinal-1,
     previous_item_ordinal:past?.ordinal??null,required_action:v.requirement,hold_reason:v.hold,
     evidence_status:"UNVERIFIED_REQUEST_NOT_COMPLETED",item_current_state:"NOT_REFRESHED",
     external_effects:0,canon_effect:"NONE",source_cut_blob_sha1:sourceBlob,previous_checksum64:prev};
   row.checksum64=fingerprint64(prev+"\u0000"+JSON.stringify(row));
   prev=row.checksum64;perItem.set(item.key,row);counts[v.kind]++;
   (ordinal<=pilot?phase1:phase2).push(row);
  }
 }
 const touched=new Set([...phase1,...phase2].map(r=>r.item_key));
 return {schema:"atlas.source-cascade/v1",kind:"DETERMINISTIC_SOURCE_REVIEW_ENRICHMENT_NOT_AI_TURNS",source_cut_blob_sha1:sourceBlob,
  source_date:cut.observed_date,source_coverage:cut.coverage,source_items:ordered.length,source_digest64:sourceDigest,
  pilot_target:pilot,expansion_target:expansion,initial_checksum64:fingerprint64("atlas-cascade-v1:"+sourceBlob+":"+sourceDigest),
  pilot_rows:phase1,expansion_rows:phase2,pilot_checkpoint64:phase1.at(-1).checksum64,final_checkpoint64:prev,
  summary:{total_steps:ordinal,pilot_steps:phase1.length,expansion_steps:phase2.length,distinct_items_touched:touched.size,
   review_gate_counts:counts,source_only:true,real_work_messages:0,real_model_calls:0,real_pr_merges:0,real_issue_closures:0,
   verified_current_statuses:0,rights_or_canon_grants:0,implementation_completed_claims:0,
   remaining_unrequested_review_gates:ordered.length*STAGES.length-ordinal}};
}
export function verifyEvolution(cut,receipt){
 if(!receipt||receipt.schema!=="atlas.source-cascade/v1")return {valid:false,reason:"SCHEMA_MISMATCH"};
 let wanted;try{wanted=planEvolution(cut,{pilot:receipt.pilot_target,expansion:receipt.expansion_target,sourceBlob:receipt.source_cut_blob_sha1});}
 catch{return {valid:false,reason:"REPLAY_INPUT_HOLD"};}
 const a=JSON.stringify(receipt),b=JSON.stringify(wanted);
 return {valid:a===b,reason:a===b?"EXACT_DETERMINISTIC_REPLAY":"CONTENT_OR_ANCESTRY_MISMATCH",steps:wanted.summary.total_steps,final_checkpoint64:wanted.final_checkpoint64};
}
