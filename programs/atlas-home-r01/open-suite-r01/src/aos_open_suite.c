#include "aos_open_suite.h"
uint32_t aos_app_id_hash(const char *id) {
 uint32_t h=2166136261u, n=0;
 if(!id) return 0;
 while(*id) {
  const unsigned char c=(unsigned char)*id++;
  if(++n>96 || !((c>='a'&&c<='z')||(c>='0'&&c<='9')||c=='-'))return 0;
  h=(h^c)*16777619u;
 }
 return n?h:0;
}
#define FLAG(f) ((r->f)==1u)
aos_install_disposition aos_open_suite_review(const aos_install_review *r) {
 if(!r || r->abi!=AOS_OPEN_SUITE_ABI || !r->app_id_hash)return AOS_OS_HOLD_INPUT;
 if(!r->account_epoch || !r->observed_epoch || r->account_epoch!=r->observed_epoch)return AOS_OS_HOLD_EPOCH;
 if(r->private_data_requested)return AOS_OS_HOLD_PRIVATE_MODE;
 if(!FLAG(verified_principal_fixture))return AOS_OS_HOLD_ACCOUNT;
 if(!FLAG(user_opted_in))return AOS_OS_HOLD_CONSENT;
 if(!FLAG(license_notice_and_assets_reviewed))return AOS_OS_HOLD_LICENSE;
 if(!FLAG(source_ref_reviewed))return AOS_OS_HOLD_SOURCE;
 if(!FLAG(signed_artifact_fixture) || !FLAG(compatible_arch))return AOS_OS_HOLD_ARTIFACT;
 if(!FLAG(sandbox_policy_reviewed))return AOS_OS_HOLD_SANDBOX;
 if(r->needs_server && !FLAG(network_endpoint_approved))return AOS_OS_HOLD_NETWORK;
 return AOS_OS_PREPARED_NO_EXECUTION; /* deliberate, even on fully positive fixture */
}
