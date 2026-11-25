/* SPDX-License-Identifier: MIT
 * These are EXPECTED OPEN LIMITATIONS in the unhosted Atlas R03 laboratory.
 * The program succeeds only when it reproduces the known missing boundaries.
 * Nothing here establishes a hosted security breach or actual boot.
 */
#include <stdio.h>
#include "aosk.h"
int main(void) {
 struct aosk k; au16 tx=0,rx=0; au8 p[1]={91}; struct aosk_message m;
 aosk_init(&k,123);
 if(aosk_grant(&k,123,0,201,AOSK_R_SEND,4,&tx)!=AOSK_OK ||
    aosk_grant(&k,123,0,202,AOSK_R_RECV,4,&rx)!=AOSK_OK ||
    aosk_send(&k,201,tx,rx,1,255,p,1)!=AOSK_OK ||
    aosk_recv(&k,202,rx,&m)!=AOSK_OK || m.kind!=255) return 1;
 puts("KNOWN_GAP|kind255|UNRECOGNIZED_WIRE_EDITION_ACCEPTED_BY_RAW_MAILBOX|TYPED_DECODER_UNMOUNTED");
 /* Recreating an untrusted local host fixture resets epoch, sequence history
  * and IDs. Real reboot protection must be owned by a durable host boundary. */
 aosk_init(&k,123);
 if(k.epoch!=1||aosk_grant(&k,123,0,201,AOSK_R_SEND,4,&tx)!=AOSK_OK ||
    aosk_grant(&k,123,0,202,AOSK_R_RECV,4,&rx)!=AOSK_OK ||
    aosk_send(&k,201,tx,rx,1,255,p,1)!=AOSK_OK) return 2;
 puts("KNOWN_GAP|reset_epoch|LOCAL_REINIT_REUSES_DOMAIN_AND_SEQ|BOOT_PERSISTENCE_UNBOUND");
 puts("KNOWN_GAP|source_hsn|TEXT_PARSER_HAS_NO_SOURCE_RECORD_DIGEST|REGISTRY_ISSUER_UNBOUND");
 puts("SUMMARY|3|EXPECTED_UNHOSTED_GAPS|NO_LIVE_EXPLOIT_CLAIM");
 return 0;
}
