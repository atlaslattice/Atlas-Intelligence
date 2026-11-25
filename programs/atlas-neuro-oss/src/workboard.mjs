/** Source-only review queue, never publishes to SwarmChat or modifies GitHub. */
import {validateCatalogue, featureLibraryStatus} from './native_core.mjs';
export function generateWorkOrders(catalog,sources){
 const validity=validateCatalogue(catalog,sources);
 if(validity.status!=='SOURCE_LINKED_CANDIDATES_PREPARED')return {status:'HOLD_SOURCE',workOrders:[]};
 return {schema:'atlas.neuro.oss.workboard/v1',status:'PREPARED_NOT_POSTED',moduleCount:12,orderCount:144,
 workOrders:catalog.features.map(x=>({workId:x.id,module:x.moduleId,reviewSlot:x.reviewSlotOnly,
   feature:x.title,sourceUrl:x.primaryUrl,secondaryUrl:x.secondaryUrl,
   releaseStatus:'PROPOSED_NOT_IMPLEMENTED',upstreamLicense:x.upstreamLicensePrimary,
   licenseGate:x.licenseGate,existingOverlap:x.existingAtlasStatus,
   acceptance:x.testThatWouldDisproveIt,
   nextStep:x.licenseGate==='REVIEW_ONLY'?'REVIEW_LICENSE_AND_ARCHIVAL_STATUS':'COMPARE_EXACT_ATLAS_SOURCE_AND_TEST',
   role:'WORK_REVIEW_ONLY',hostAuthorized:false,trainingAuthorized:false,canPublish:false,
   ssp:'SOURCE-SCOPE-PROVENANCE_REQUIRED'})),
 authorities:{canPublish:false,canPost:false,canTrain:false,canonEffect:'NONE'},
 note:'Output is a deterministic review queue. No committee, automatic code admission or privilege grant.'};
}
