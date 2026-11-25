/* SPDX-License-Identifier: MIT
 * Atlas OS Native R04 user-space application plan ABI.
 * No privileged effects, network calls, credentials, app execution, or installs.
 */
#ifndef ATLAS_APPGATE_H
#define ATLAS_APPGATE_H
#include <stdint.h>
struct aos_app_entry {
    const char *id,*name,*profile,*family,*maturity,*account,*license,*upstream,*source_revision,*kind,*license_review;
};
extern const struct aos_app_entry aos_app_catalog[];
extern const unsigned aos_app_catalog_count;
enum aos_app_action { AOS_APP_VIEW=0, AOS_APP_PLAN_INSTALL=1, AOS_APP_PLAN_LOGIN=2,
   AOS_APP_PLAN_VPN=3, AOS_APP_PLAN_BROWSER=4, AOS_APP_PLAN_FILE_SHARE=5,
   AOS_APP_PLAN_REMOVE=6 };
enum aos_app_result_status { AOS_APP_HOLD=0, AOS_APP_CATALOG_ONLY=1,
   AOS_APP_NEEDS_CONSENT=2, AOS_APP_NEEDS_SOURCE_PIN=3, AOS_APP_NEEDS_LICENSE_REVIEW=4,
   AOS_APP_EXPERIMENTAL_OPT_IN=5, AOS_APP_NEEDS_PACKAGE_PROOF=6,
   AOS_APP_NEEDS_CAPABILITY=7, AOS_APP_SCOPE_STALE=8, AOS_APP_NEEDS_PROVIDER_SUPPORT=9,
   AOS_APP_PREPARED_NO_EFFECT=10, AOS_APP_LOCAL_NO_LOGIN_NEEDED=11,
   AOS_APP_PROTECTED_MODE=12, AOS_APP_UNSUPPORTED=13 };
struct aos_app_request {
    const char *app_id;
    enum aos_app_action action;
    uint64_t expected_epoch, current_epoch;
    unsigned user_confirmed:1;
    unsigned experimental_opt_in:1;
    unsigned package_digest_attested:1;
    unsigned license_decision_attested:1;
    unsigned host_capability_attested:1;
    unsigned explicit_service_consent:1;
    unsigned identity_provider_supported:1;
    unsigned service_origin_verified:1;
    unsigned user_present:1;
    unsigned vpn_opt_in:1;
    unsigned vpn_profile_verified:1;
    unsigned browser_extension_grant:1;
    unsigned document_portal_selection:1;
    unsigned private_mode:1;
    unsigned final_return_current:1;
};
struct aos_app_result {
    enum aos_app_result_status status;
    const char *app_id;
    const char *source_revision;
    uint64_t epoch;
    unsigned may_install:1;
    unsigned may_issue_token:1;
    unsigned may_start_vpn:1;
    unsigned actual_effects:1;
    unsigned release_authorized:1;
    unsigned source_code_copied:1;
};
int aos_app_lookup(const char *id);
struct aos_app_result aos_app_plan(const struct aos_app_request *r);
#endif
