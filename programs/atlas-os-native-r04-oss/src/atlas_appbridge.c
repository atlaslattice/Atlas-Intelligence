/* SPDX-License-Identifier: MIT */
#include "atlas_appbridge.h"
static struct aos_app_result hold(uint64_t epoch){
 struct aos_app_result o={0};o.status=AOS_APP_SCOPE_STALE;o.epoch=epoch;return o;
}
struct aos_app_result aos_app_plan_bound(const struct aosk *k,au16 domain,au32 caller,
                                        au32 expected_boot_epoch,const struct aos_app_request *request){
 const struct aosk_domain *d;
 if(!k||!request||domain>=AOSK_DOMAINS)return hold(0);
 if(!expected_boot_epoch||expected_boot_epoch!=k->epoch)return hold(k->epoch);
 d=&k->domain[domain];
 if(!d->live||d->owner!=caller||(d->rights&AOSK_R_SEND)==0)return hold(k->epoch);
 if(request->expected_epoch!=k->epoch||request->current_epoch!=k->epoch)return hold(k->epoch);
 /* Local raw fixture state; not an authenticated kernel or browser identity. */
 return aos_app_plan(request);
}
