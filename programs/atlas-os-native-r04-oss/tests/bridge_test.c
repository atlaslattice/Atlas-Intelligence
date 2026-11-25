#include "atlas_appbridge.h"
#include <stdio.h>
#include <stdlib.h>
static unsigned checks;
#define CHECK(X) do{checks++;if(!(X)){fprintf(stderr,"FAIL %s at %d\n",#X,__LINE__);exit(2);}}while(0)
int main(void){
 struct aosk k;struct aos_app_request r={0};struct aos_app_result o;au16 child=0;
 aosk_init(&k,0xA70);
 r.app_id="libreoffice";r.action=AOS_APP_PLAN_INSTALL;r.expected_epoch=k.epoch;r.current_epoch=k.epoch;
 r.final_return_current=r.user_confirmed=r.user_present=r.package_digest_attested=r.host_capability_attested=1;
 o=aos_app_plan_bound(&k,0,0xA70,k.epoch,&r);CHECK(o.status==AOS_APP_PREPARED_NO_EFFECT);
 CHECK(!o.actual_effects&&!o.may_install);
 o=aos_app_plan_bound(&k,0,0xBAD,k.epoch,&r);CHECK(o.status==AOS_APP_SCOPE_STALE);
 o=aos_app_plan_bound(&k,0,0xA70,k.epoch+1,&r);CHECK(o.status==AOS_APP_SCOPE_STALE);
 CHECK(aosk_grant(&k,0xA70,0,0xA71,AOSK_R_SEND,8,&child)==AOSK_OK);
 r.expected_epoch=r.current_epoch=k.epoch;
 o=aos_app_plan_bound(&k,child,0xA71,k.epoch,&r);CHECK(o.status==AOS_APP_PREPARED_NO_EFFECT);
 CHECK(aosk_revoke(&k,0xA70,child)==AOSK_OK);
 o=aos_app_plan_bound(&k,child,0xA71,k.epoch,&r);CHECK(o.status==AOS_APP_SCOPE_STALE);
 r.expected_epoch=r.current_epoch=k.epoch;
 r.private_mode=1;o=aos_app_plan_bound(&k,0,0xA70,k.epoch,&r);CHECK(o.status==AOS_APP_PROTECTED_MODE);
 r.private_mode=0;r.app_id="firefox";o=aos_app_plan_bound(&k,0,0xA70,k.epoch,&r);CHECK(o.status==AOS_APP_NEEDS_SOURCE_PIN);
 printf("ATLAS_NATIVE_BRIDGE_PASS assertions=%u cannotInstall=1 hostAttested=0\n",checks);
}
