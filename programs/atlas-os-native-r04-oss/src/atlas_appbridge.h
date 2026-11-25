/* SPDX-License-Identifier: MIT
 * Source-only Atlas original kernel/user-space boundary for app planning.
 */
#ifndef ATLAS_APPBRIDGE_H
#define ATLAS_APPBRIDGE_H
#include "atlas_appgate.h"
#include "aosk.h"
struct aos_app_result aos_app_plan_bound(const struct aosk *kernel,au16 caller_domain,au32 caller,
                                        au32 expected_boot_epoch,const struct aos_app_request *request);
#endif
