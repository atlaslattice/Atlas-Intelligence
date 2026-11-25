#include "../src/aos_open_suite.h"
#include <stdio.h>
#include <stdlib.h>
static unsigned long checks=0;
#define CHECK(c) do { ++checks; if(!(c)){fprintf(stderr,"FAIL at %d\n",__LINE__);exit(1);} }while(0)
static aos_install_review good(void){
 aos_install_review r={AOS_OPEN_SUITE_ABI,0x1234,8,8,1,1,1,1,1,1,1,0,0,0};return r;
}
int main(void){
 aos_install_review r=good();
 CHECK(aos_open_suite_review(&r)==AOS_OS_PREPARED_NO_EXECUTION);
 CHECK(aos_open_suite_review(NULL)==AOS_OS_HOLD_INPUT);
 CHECK(aos_app_id_hash("libreoffice")!=0);
 CHECK(aos_app_id_hash("../root")==0);
 CHECK(aos_app_id_hash("News\n")==0);
 CHECK(aos_app_id_hash("")==0);
 CHECK(aos_app_id_hash(NULL)==0);
 for(unsigned i=1;i<=144;i++){r=good();r.app_id_hash=i;CHECK(aos_open_suite_review(&r)==AOS_OS_PREPARED_NO_EXECUTION);}
 r=good();r.observed_epoch++;CHECK(aos_open_suite_review(&r)==AOS_OS_HOLD_EPOCH);
 r=good();r.private_data_requested=1;CHECK(aos_open_suite_review(&r)==AOS_OS_HOLD_PRIVATE_MODE);
 r=good();r.verified_principal_fixture=0;CHECK(aos_open_suite_review(&r)==AOS_OS_HOLD_ACCOUNT);
 r=good();r.user_opted_in=0;CHECK(aos_open_suite_review(&r)==AOS_OS_HOLD_CONSENT);
 r=good();r.license_notice_and_assets_reviewed=0;CHECK(aos_open_suite_review(&r)==AOS_OS_HOLD_LICENSE);
 r=good();r.source_ref_reviewed=0;CHECK(aos_open_suite_review(&r)==AOS_OS_HOLD_SOURCE);
 r=good();r.signed_artifact_fixture=0;CHECK(aos_open_suite_review(&r)==AOS_OS_HOLD_ARTIFACT);
 r=good();r.compatible_arch=0;CHECK(aos_open_suite_review(&r)==AOS_OS_HOLD_ARTIFACT);
 r=good();r.sandbox_policy_reviewed=0;CHECK(aos_open_suite_review(&r)==AOS_OS_HOLD_SANDBOX);
 r=good();r.needs_server=1;CHECK(aos_open_suite_review(&r)==AOS_OS_HOLD_NETWORK);
 r=good();r.needs_server=1;r.network_endpoint_approved=1;CHECK(aos_open_suite_review(&r)==AOS_OS_PREPARED_NO_EXECUTION);
 for(unsigned i=0;i<15;i++){r=good();((unsigned char*)&r)[sizeof(r)-1]=0;CHECK(aos_open_suite_review(&r)==AOS_OS_PREPARED_NO_EXECUTION);}/* no sentinel based authority */
 fprintf(stdout,"AOS open-suite native policy: %lu checks PASS, zero installs, no devices touched\n",checks);
}
