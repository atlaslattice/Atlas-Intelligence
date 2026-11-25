/* SPDX-License-Identifier: MIT
 * Host fixture: exactly 100 distinct source-pinned app/action/scope scenarios.
 * This executable never installs an app, authenticates a user or configures a VPN.
 */
#include "atlas_appgate.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
static unsigned checks;
static void require(int x,const char *s){checks++;if(!x){fprintf(stderr,"FAIL %s\n",s);exit(2);}}
static struct aos_app_request fixture(unsigned i){
 struct aos_app_request r={0};const struct aos_app_entry *a=&aos_app_catalog[(i*7u)%aos_app_catalog_count];
 r.app_id=a->id;r.action=(enum aos_app_action)(i%7u);r.expected_epoch=77;r.current_epoch=77;r.final_return_current=1;
 r.user_confirmed=1;r.user_present=1;r.host_capability_attested=1;r.package_digest_attested=1;
 r.license_decision_attested=0;r.experimental_opt_in=1;r.identity_provider_supported=1;
 r.service_origin_verified=1;r.explicit_service_consent=1;r.vpn_opt_in=1;r.vpn_profile_verified=1;
 r.browser_extension_grant=1;r.document_portal_selection=1;
 if(i%17u==1u)r.current_epoch=78;
 if(i%19u==2u)r.final_return_current=0;
 if(i%13u==3u)r.user_confirmed=0;
 if(i%11u==4u)r.experimental_opt_in=0;
 if(i%7u==5u)r.package_digest_attested=0;
 if(i%23u==6u)r.identity_provider_supported=0;
 if(i%29u==7u)r.vpn_opt_in=0;
 if(i%31u==8u)r.license_decision_attested=1;
 if(i%37u==9u)r.private_mode=1;
 if(i%41u==10u)r.browser_extension_grant=0;
 return r;
}
int main(void){
 unsigned i,stage_count[14]={0},artcraft=0,pinned=0;
 require(aos_app_catalog_count==37,"exact pinned 26-app candidate inventory");
 for(i=0;i<aos_app_catalog_count;i++){
   const struct aos_app_entry *a=&aos_app_catalog[i];
   require(a->id!=NULL&&a->name!=NULL&&a->upstream!=NULL,"catalogue not null");
   require(aos_app_lookup(a->id)==(int)i,"exact id lookup");
   require(a->source_revision!=NULL,"source revision field present");
   if(strlen(a->source_revision)==40)pinned++;
   if(strcmp(a->family,"ArtCraft")==0)artcraft++;
 }
 require(pinned==36,"25 exact upstream source commit pins, firefox holds");
 require(artcraft==18,"17 ArtCraft apps and launcher");
 for(i=0;i<100;i++){
   struct aos_app_request r=fixture(i);
   struct aos_app_result o=aos_app_plan(&r);
   require(o.app_id!=NULL,"known app identity");
   require(!o.actual_effects&&!o.release_authorized,"no real install/privilege");
   require(!o.may_install&&!o.may_issue_token&&!o.may_start_vpn,"no silent installed credential or VPN");
   require(!o.source_code_copied,"no unlicensed source copies");
   require(o.status>=AOS_APP_HOLD&&o.status<=AOS_APP_UNSUPPORTED,"known status");
   stage_count[o.status]++;
   printf("{\"case\":%u,\"app\":\"%s\",\"action\":%d,\"status\":%d,\"epoch\":%llu,\"effects\":%d}\n",
       i,o.app_id,(int)r.action,(int)o.status,(unsigned long long)o.epoch,(int)o.actual_effects);
 }
 {struct aos_app_request a={0};struct aos_app_result o;
   a.app_id="firefox";a.action=AOS_APP_PLAN_INSTALL;a.expected_epoch=1;a.current_epoch=1;a.final_return_current=1;a.user_present=1;a.user_confirmed=1;
   o=aos_app_plan(&a);require(o.status==AOS_APP_NEEDS_SOURCE_PIN,"unpinned browser held");
   a.app_id="photocraft";o=aos_app_plan(&a);require(o.status==AOS_APP_EXPERIMENTAL_OPT_IN,"alpha optin required");
   a.experimental_opt_in=1;o=aos_app_plan(&a);require(o.status==AOS_APP_NEEDS_PACKAGE_PROOF,"source commit not package SHA");
   a.package_digest_attested=1;o=aos_app_plan(&a);require(o.status==AOS_APP_NEEDS_CAPABILITY,"caller cannot install without host");
   a.host_capability_attested=1;o=aos_app_plan(&a);require(o.status==AOS_APP_PREPARED_NO_EFFECT&&!o.may_install,"local flags still no installation");
   a.app_id="blender";o=aos_app_plan(&a);require(o.status==AOS_APP_NEEDS_LICENSE_REVIEW,"NOASSERTION held");
   a.app_id="wireguard";a.action=AOS_APP_PLAN_VPN;a.vpn_opt_in=0;o=aos_app_plan(&a);require(o.status==AOS_APP_NEEDS_CONSENT,"VPN strictly optin");
   a.vpn_opt_in=1;a.vpn_profile_verified=1;o=aos_app_plan(&a);require(o.status==AOS_APP_PREPARED_NO_EFFECT&&!o.may_start_vpn,"VPN never starts in fixture");
   a.app_id="nextcloud-desktop";a.action=AOS_APP_PLAN_LOGIN;a.identity_provider_supported=0;o=aos_app_plan(&a);require(o.status==AOS_APP_NEEDS_PROVIDER_SUPPORT,"cannot force universal SSO");
   a.app_id="libreoffice";a.action=AOS_APP_PLAN_LOGIN;o=aos_app_plan(&a);require(o.status==AOS_APP_LOCAL_NO_LOGIN_NEEDED,"offline app no account");
   a.app_id="ublock-origin";a.action=AOS_APP_PLAN_BROWSER;a.browser_extension_grant=0;o=aos_app_plan(&a);require(o.status==AOS_APP_NEEDS_CONSENT,"browser extension broad permission requires consent");
   a.app_id="wordcraft";a.action=AOS_APP_PLAN_INSTALL;a.private_mode=1;o=aos_app_plan(&a);require(o.status==AOS_APP_PROTECTED_MODE,"private space cannot silently install");
 }
 fprintf(stderr,"AOS_OPEN_SOURCE_FIRST_PASS scenarios=100 assertions=%u artcraft=%u pinned=%u ",checks,artcraft,pinned);
 for(i=0;i<14;i++)if(stage_count[i])fprintf(stderr,"status_%u=%u ",i,stage_count[i]);
 fprintf(stderr,"actualInstalls=0 authenticatedSessions=0 vpnStarted=0\n");
 return 0;
}
