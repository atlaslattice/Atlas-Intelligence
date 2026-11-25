/* SPDX-License-Identifier: MIT
 * Atlas R03: 100 distinct, deterministic, source-compatible local Work probes.
 * Untrusted synthetic principals/time/pages only. NOT an OS boot, host IAM,
 * authorized resident activity, or 100 genuine SwarmChat/MacroTurns.
 */
#include <stdio.h>
#include <string.h>
#include "aosk.h"

#define REQUIRE(test) do { if (!(test)) { \
  fprintf(stderr,"FAIL pass=%u line=%u condition=%s\n",pass,(unsigned)__LINE__,#test); \
  return 1; } assertions++; } while(0)

static unsigned pass,assertions;
static const char *families[10]={
 "hsn-valid", "hsn-malformed", "quota-delegate", "quota-overdraft",
 "ipc-destination", "ipc-replay", "cascading-revoke", "page-reuse",
 "scheduler-exhaustion", "malformed-ipc"
};

static int one(unsigned family,unsigned i) {
 struct aosk k;
 struct aosk_region reg;
 struct aosk_message m;
 au16 a=0,b=0,c=0,p=0,out=0,idx=0;
 au8 method=0,payload[2]={(au8)(i+1),(au8)(200+i)};
 unsigned j;
 int rc;
 aosk_init(&k,(au32)(700+i));
 REQUIRE(k.count==1 && k.epoch==1 && k.domain[0].cpu_left==1024);
 switch (family){
 case 0: { /* Ten different exact identity/parent/role controls. */
  char s[12]="H01.S01.N01";
  unsigned n=i*17+1,h=(n-1)/144+1,sp=((n-1)/12)%12+1,nn=(n-1)%12+1;
  s[1]=(char)('0'+h/10);s[2]=(char)('0'+h%10);
  s[5]=(char)('0'+sp/10);s[6]=(char)('0'+sp%10);
  s[9]=(char)('0'+nn/10);s[10]=(char)('0'+nn%10);
  REQUIRE(aosk_hsn_parse(s,11,&idx,&method)==AOSK_OK);
  REQUIRE((unsigned)idx==n-1);
  REQUIRE(method==(sp>7));
  break;
 }
 case 1: { /* Ten deliberately noncanonical address byte sequences. */
  static const char *bad[10]={"H00.S01.N01","H13.S01.N01","H01.S00.N01",
   "H01.S13.N01","H01.S01.N00","H01.S01.N13","X01.S01.N01",
   "H01-X01-N01","H01.S01.N1 ","H01.S01.N01 "};
  REQUIRE(aosk_hsn_parse(bad[i],(unsigned)strlen(bad[i]),&idx,&method)==AOSK_BAD);
  REQUIRE(k.count==1);
  break;
 }
 case 2: { /* Parent reservations must decrease by the exact child quota. */
  unsigned ticks=i+1;
  REQUIRE(aosk_grant(&k,(au32)(700+i),0,(au32)(800+i),AOSK_R_SEND|AOSK_R_GRANT,(au16)ticks,&a)==AOSK_OK);
  REQUIRE(k.domain[0].cpu_left==1024-ticks);
  REQUIRE(k.domain[a].cpu_initial==ticks && k.domain[a].cpu_left==ticks);
  REQUIRE(k.domain[a].parent==0 && k.domain[a].rights==(AOSK_R_SEND|AOSK_R_GRANT));
  break;
 }
 case 3: { /* Root has four ticks remaining; any larger grant must fail atomically. */
  unsigned before;
  REQUIRE(aosk_grant(&k,(au32)(700+i),0,(au32)(800+i),AOSK_R_SEND,1020,&a)==AOSK_OK);
  before=k.epoch;
  REQUIRE(aosk_grant(&k,(au32)(700+i),0,(au32)(900+i),AOSK_R_RECV,(au16)(5+i),&b)==AOSK_DENY);
  REQUIRE(k.epoch==before && k.count==2 && k.domain[0].cpu_left==4);
  break;
 }
 case 4: { /* Sender destination narrowed to an existing receiver. */
  REQUIRE(aosk_grant(&k,(au32)(700+i),0,(au32)(800+i),AOSK_R_SEND|AOSK_R_GRANT,30,&a)==AOSK_OK);
  REQUIRE(aosk_grant(&k,(au32)(700+i),0,(au32)(900+i),AOSK_R_RECV,20,&b)==AOSK_OK);
  REQUIRE(aosk_restrict_targets(&k,(au32)(800+i),a,b,b)==AOSK_OK);
  REQUIRE(aosk_send(&k,(au32)(800+i),a,0,(au32)(i+1),1,payload,2)==AOSK_DENY);
  REQUIRE(aosk_send(&k,(au32)(800+i),a,b,(au32)(i+1),1,payload,2)==AOSK_OK);
  REQUIRE(aosk_recv(&k,(au32)(900+i),b,&m)==AOSK_OK && m.data[0]==i+1);
  break;
 }
 case 5: { /* Retry the same sequence must never re-admit an IPC packet. */
  REQUIRE(aosk_grant(&k,(au32)(700+i),0,(au32)(800+i),AOSK_R_SEND,30,&a)==AOSK_OK);
  REQUIRE(aosk_grant(&k,(au32)(700+i),0,(au32)(900+i),AOSK_R_RECV,20,&b)==AOSK_OK);
  REQUIRE(aosk_send(&k,(au32)(800+i),a,b,(au32)(10+i),1,payload,2)==AOSK_OK);
  REQUIRE(aosk_send(&k,(au32)(800+i),a,b,(au32)(10+i),1,payload,2)==AOSK_STALE);
  REQUIRE(aosk_send(&k,(au32)(800+i),a,b,(au32)(11+i),1,payload,2)==AOSK_OK);
  REQUIRE(k.qsize==2);
  break;
 }
 case 6: { /* Revoking a parent invalidates queued child packets and page tags. */
  reg=(struct aosk_region){(au16)(20+i),1,1};
  REQUIRE(aosk_seed_pages(&k,(au32)(700+i),&reg,1)==AOSK_OK);
  REQUIRE(aosk_grant(&k,(au32)(700+i),0,(au32)(800+i),AOSK_R_SEND|AOSK_R_ALLOC|AOSK_R_GRANT,30,&a)==AOSK_OK);
  REQUIRE(aosk_grant(&k,(au32)(700+i),0,(au32)(900+i),AOSK_R_RECV,20,&b)==AOSK_OK);
  REQUIRE(aosk_grant(&k,(au32)(800+i),a,(au32)(1000+i),AOSK_R_SEND,10,&c)==AOSK_OK);
  REQUIRE(aosk_alloc(&k,(au32)(800+i),a,&p)==AOSK_OK && p==20+i);
  REQUIRE(aosk_send(&k,(au32)(1000+i),c,b,(au32)(i+1),1,payload,2)==AOSK_OK);
  REQUIRE(k.qsize==1);
  REQUIRE(aosk_revoke(&k,(au32)(700+i),a)==AOSK_OK);
  REQUIRE(k.qsize==0 && k.page_owner[p]==AOSK_FREE);
  REQUIRE(aosk_send(&k,(au32)(1000+i),c,b,(au32)(i+2),1,payload,2)==AOSK_DENY);
  break;
 }
 case 7: { /* Synthetic frame bookkeeping; this is NOT physical page clearing. */
  reg=(struct aosk_region){(au16)(12+i),1,1};
  REQUIRE(aosk_seed_pages(&k,(au32)(700+i),&reg,1)==AOSK_OK);
  REQUIRE(aosk_grant(&k,(au32)(700+i),0,(au32)(800+i),AOSK_R_ALLOC,3,&a)==AOSK_OK);
  REQUIRE(aosk_alloc(&k,(au32)(800+i),a,&p)==AOSK_OK && p==12+i);
  REQUIRE(aosk_release(&k,(au32)(800+i),a,p)==AOSK_OK);
  REQUIRE(aosk_release(&k,(au32)(800+i),a,p)==AOSK_DENY);
  REQUIRE(aosk_alloc(&k,(au32)(800+i),a,&p)==AOSK_OK && p==12+i);
  break;
 }
 case 8: { /* Synthetic scheduler sums to 1,024 exact reserved ticks. */
  unsigned root=0,child=0,ticks=i+1;
  REQUIRE(aosk_grant(&k,(au32)(700+i),0,(au32)(800+i),AOSK_R_SEND,(au16)ticks,&a)==AOSK_OK);
  for(j=0;j<1024;j++){REQUIRE(aosk_next(&k,&out)==AOSK_OK);if(out==0)root++;else if(out==a)child++;else REQUIRE(0);}
  REQUIRE(root==1024-ticks && child==ticks);
  REQUIRE(aosk_next(&k,&out)==AOSK_EMPTY);
  break;
 }
 case 9: { /* Multiple malformed or unauthorized dispatch paths. */
  REQUIRE(aosk_grant(&k,(au32)(700+i),0,(au32)(800+i),AOSK_R_SEND,20,&a)==AOSK_OK);
  REQUIRE(aosk_grant(&k,(au32)(700+i),0,(au32)(900+i),AOSK_R_RECV,20,&b)==AOSK_OK);
  switch(i){
   case 0: rc=aosk_send(&k,(au32)(800+i),a,b,1,1,payload,9);REQUIRE(rc==AOSK_BAD);break;
   case 1: rc=aosk_send(&k,(au32)(800+i),a,b,1,1,payload,255);REQUIRE(rc==AOSK_BAD);break;
   case 2: rc=aosk_send(&k,(au32)(800+i),a,b,1,0,payload,2);REQUIRE(rc==AOSK_BAD);break;
   case 3: rc=aosk_send(&k,(au32)(800+i),a,b,0,1,payload,2);REQUIRE(rc==AOSK_BAD);break;
   case 4: rc=aosk_send(&k,(au32)(800+i),a,b,1,1,(const au8*)0,1);REQUIRE(rc==AOSK_BAD);break;
   case 5: rc=aosk_send(&k,(au32)(900+i),a,b,1,1,payload,2);REQUIRE(rc==AOSK_DENY);break;
   case 6: rc=aosk_send(&k,(au32)(800+i),11,b,1,1,payload,2);REQUIRE(rc==AOSK_DENY);break;
   case 7: rc=aosk_send(&k,(au32)(800+i),a,11,1,1,payload,2);REQUIRE(rc==AOSK_DENY);break;
   case 8: REQUIRE(aosk_revoke(&k,(au32)(700+i),a)==AOSK_OK);rc=aosk_send(&k,(au32)(800+i),a,b,1,1,payload,2);REQUIRE(rc==AOSK_DENY);break;
   case 9: rc=aosk_recv(&k,(au32)(800+i),b,&m);REQUIRE(rc==AOSK_DENY);break;
  }
  REQUIRE(k.qsize==0);
  break;
 }
 default: REQUIRE(0);
 }
 printf("PASS|%03u|%s|%u\n",pass,families[family],i+1);
 return 0;
}
int main(void){unsigned family,i;
 for(family=0;family<10;family++)for(i=0;i<10;i++){
  pass=family*10+i+1;
  if(one(family,i))return 1;
 }
 printf("SUMMARY|100|%u|LOCAL_C_SYNTHETIC_ONLY\n",assertions);
 return 0;
}
