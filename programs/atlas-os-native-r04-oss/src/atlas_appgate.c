/* SPDX-License-Identifier: MIT
 * Original Atlas userspace application-planning gate; not a security authority.
 * Input flags are injected local claims, NOT cryptographic attestations.
 */
#include "atlas_appgate.h"
static int exact(const char *a,const char *b){
 unsigned i=0;
 if (!a || !b) return 0;
 while(a[i] && b[i] && i<192){if(a[i]!=b[i])return 0;++i;}
 return i<192 && a[i]==0 && b[i]==0;
}
int aos_app_lookup(const char *id){
 unsigned i;
 if(!id)return -1;
 for(i=0;i<aos_app_catalog_count;i++)if(exact(id,aos_app_catalog[i].id))return (int)i;
 return -1;
}
static struct aos_app_result result(const struct aos_app_entry *a,enum aos_app_result_status status,uint64_t epoch){
 struct aos_app_result out={0};out.status=status;out.app_id=a?a->id:0;out.source_revision=a?a->source_revision:0;
 out.epoch=epoch;
 /* Deliberately never advertise host grants, installation, session/token, VPN, or source copying. */
 return out;
}
struct aos_app_result aos_app_plan(const struct aos_app_request *r){
 int ix;const struct aos_app_entry *a;
 if(!r)return result(0,AOS_APP_HOLD,0);
 ix=aos_app_lookup(r->app_id);if(ix<0)return result(0,AOS_APP_HOLD,r->current_epoch);
 a=&aos_app_catalog[(unsigned)ix];
 if(r->action==AOS_APP_VIEW)return result(a,AOS_APP_CATALOG_ONLY,r->current_epoch);
 if(r->private_mode)return result(a,AOS_APP_PROTECTED_MODE,r->current_epoch);
 if(r->expected_epoch==0||r->current_epoch!=r->expected_epoch||!r->final_return_current)
     return result(a,AOS_APP_SCOPE_STALE,r->current_epoch);
 if(!a->source_revision[0])return result(a,AOS_APP_NEEDS_SOURCE_PIN,r->current_epoch);
 if(!exact(a->license_review,"SOURCE_METADATA_ONLY") && !r->license_decision_attested)
     return result(a,AOS_APP_NEEDS_LICENSE_REVIEW,r->current_epoch);
 if(exact(a->maturity,"experimental")&&!r->experimental_opt_in)
     return result(a,AOS_APP_EXPERIMENTAL_OPT_IN,r->current_epoch);
 if(!r->user_confirmed||!r->user_present)return result(a,AOS_APP_NEEDS_CONSENT,r->current_epoch);
 if(r->action==AOS_APP_PLAN_INSTALL){
     if(!r->package_digest_attested)return result(a,AOS_APP_NEEDS_PACKAGE_PROOF,r->current_epoch);
     if(!r->host_capability_attested)return result(a,AOS_APP_NEEDS_CAPABILITY,r->current_epoch);
     return result(a,AOS_APP_PREPARED_NO_EFFECT,r->current_epoch);
 }
 if(r->action==AOS_APP_PLAN_REMOVE){
     if(!r->host_capability_attested)return result(a,AOS_APP_NEEDS_CAPABILITY,r->current_epoch);
     return result(a,AOS_APP_PREPARED_NO_EFFECT,r->current_epoch);
 }
 if(r->action==AOS_APP_PLAN_LOGIN){
     if(exact(a->account,"none"))return result(a,AOS_APP_LOCAL_NO_LOGIN_NEEDED,r->current_epoch);
     if(!r->identity_provider_supported||!r->service_origin_verified||!r->explicit_service_consent)
         return result(a,AOS_APP_NEEDS_PROVIDER_SUPPORT,r->current_epoch);
     if(!r->host_capability_attested)return result(a,AOS_APP_NEEDS_CAPABILITY,r->current_epoch);
     return result(a,AOS_APP_PREPARED_NO_EFFECT,r->current_epoch);
 }
 if(r->action==AOS_APP_PLAN_VPN){
     if(!exact(a->kind,"vpn_client"))return result(a,AOS_APP_UNSUPPORTED,r->current_epoch);
     if(!r->vpn_opt_in||!r->vpn_profile_verified)return result(a,AOS_APP_NEEDS_CONSENT,r->current_epoch);
     if(!r->host_capability_attested)return result(a,AOS_APP_NEEDS_CAPABILITY,r->current_epoch);
     return result(a,AOS_APP_PREPARED_NO_EFFECT,r->current_epoch);
 }
 if(r->action==AOS_APP_PLAN_BROWSER){
     if(!exact(a->kind,"browser_extension")&&!exact(a->id,"firefox"))return result(a,AOS_APP_UNSUPPORTED,r->current_epoch);
     if(!r->browser_extension_grant)return result(a,AOS_APP_NEEDS_CONSENT,r->current_epoch);
     return result(a,AOS_APP_PREPARED_NO_EFFECT,r->current_epoch);
 }
 if(r->action==AOS_APP_PLAN_FILE_SHARE){
     if(!r->document_portal_selection)return result(a,AOS_APP_NEEDS_CONSENT,r->current_epoch);
     if(!r->host_capability_attested)return result(a,AOS_APP_NEEDS_CAPABILITY,r->current_epoch);
     return result(a,AOS_APP_PREPARED_NO_EFFECT,r->current_epoch);
 }
 return result(a,AOS_APP_UNSUPPORTED,r->current_epoch);
}
