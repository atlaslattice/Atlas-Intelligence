/* Atlas OS open-suite v1: pure freestanding advisory gate, NEVER an installer. */
#ifndef AOS_OPEN_SUITE_H
#define AOS_OPEN_SUITE_H
#include <stdint.h>
#define AOS_OPEN_SUITE_ABI 0x41534F31u /* ASO1 */
typedef enum {
 AOS_OS_HOLD_INPUT=1,
 AOS_OS_HOLD_ACCOUNT,
 AOS_OS_HOLD_CONSENT,
 AOS_OS_HOLD_LICENSE,
 AOS_OS_HOLD_SOURCE,
 AOS_OS_HOLD_ARTIFACT,
 AOS_OS_HOLD_SANDBOX,
 AOS_OS_HOLD_NETWORK,
 AOS_OS_HOLD_PRIVATE_MODE,
 AOS_OS_HOLD_EPOCH,
 AOS_OS_PREPARED_NO_EXECUTION
} aos_install_disposition;
typedef struct {
 uint32_t abi;
 uint32_t app_id_hash; /* catalog ID fingerprint, not an auth credential */
 uint32_t account_epoch;
 uint32_t observed_epoch;
 uint8_t verified_principal_fixture;
 uint8_t user_opted_in;
 uint8_t license_notice_and_assets_reviewed;
 uint8_t source_ref_reviewed;
 uint8_t signed_artifact_fixture;
 uint8_t compatible_arch;
 uint8_t sandbox_policy_reviewed;
 uint8_t needs_server;
 uint8_t network_endpoint_approved;
 uint8_t private_data_requested;
} aos_install_review;
aos_install_disposition aos_open_suite_review(const aos_install_review *req);
uint32_t aos_app_id_hash(const char *canonical_ascii_id); /* FNV-1a non-security lookup */
#endif
