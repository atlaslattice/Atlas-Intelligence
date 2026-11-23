/** 08 — use ORIGINAL Work Burst; never create another scheduler or bypass caps. */
import {previewEntireR07} from '../r07-workburst-bridge.mjs';
export async function pass08(c){
 if(c.state.modeCounts?.WORK!==1248)return{status:'HOLD'};
 const raw=Buffer.from(JSON.stringify(c.source));
 // JSON original can differ in whitespace from passed raw; caller must use exact raw bytes.
 // SourcePlan digest is from exact input, supplied by validated original entry point.
 // The engine's own source is stored as parsed records; reserialization is not a new source pin.
 const report=c.inspected.summary;
 if(report.sourcePlanSha256!==c.sourceSha)return{status:'HOLD'};
 // Keep actual WorkBurst execution in an explicitly source-supplied helper.
 // The input bytes (original) are captured by context, not reserialized here.
 if(!c.rawBytes)return{status:'HOLD'};
 const r=await previewEntireR07(c.rawBytes,c.sourceSha);
 if(r.status!=='LOCAL_R07_SOURCE_PREFLIGHT_ONLY'||r.preflightChecks!==1248||r.workBurstInvocations!==13||r.workPosts!==0)return{status:'HOLD'};
 c.state.workPreflight={status:r.status,batches:13,checks:1248,receiptDigest:r.preflightReceiptDigest,
   actualTasks:0,brokerPosts:0};
 return{status:'PASS_LOCAL',batches:13,checks:1248,
   fingerprintRoot:r.preflightReceiptDigest,actualTasksImplemented:0};
}
