/* SPDX-License-Identifier: MIT -- executable freestanding kernel LAB controls */
#include <stdio.h>
#include <string.h>
#include "aosk.h"
#define CHECK(c) do{checks++;if(!(c)){fprintf(stderr,"FAIL %s:%d %s\n",__FILE__,__LINE__,#c);return 1;}}while(0)
int main(void){
 unsigned checks=0,i,n;struct aosk k;struct aosk_region maps[3]={{0,10,0},{10,60,1},{70,122,0}};
 au16 a,b,c,page,chosen,idx; au8 method;struct aosk_message msg;au8 payload[2]={23,42};
 CHECK(aosk_selftest()==0);aosk_init(&k,1234);
 CHECK(aosk_seed_pages(&k,1234,maps,3)==AOSK_OK);CHECK(aosk_seed_pages(&k,1234,maps,3)==AOSK_OK);
 CHECK(aosk_grant(&k,1234,0,200,AOSK_R_SEND|AOSK_R_ALLOC|AOSK_R_GRANT,8,&a)==AOSK_OK);
 CHECK(aosk_grant(&k,1234,0,300,AOSK_R_RECV,6,&b)==AOSK_OK);
 CHECK(k.domain[0].cpu_left==1024-8-6);
 CHECK(aosk_grant(&k,200,a,400,AOSK_R_SEND,4,&c)==AOSK_OK);
 CHECK(k.domain[a].cpu_left==4);
 CHECK(aosk_grant(&k,200,a,500,AOSK_R_ALL,4,&page)==AOSK_DENY);
 CHECK(aosk_grant(&k,300,b,500,AOSK_R_SEND,4,&page)==AOSK_DENY);
 CHECK(aosk_restrict_targets(&k,200,a,b,b)==AOSK_OK);
 CHECK(aosk_restrict_targets(&k,200,a,0,b)==AOSK_DENY);
 CHECK(aosk_send(&k,200,a,0,1,1,payload,2)==AOSK_DENY);
 CHECK(aosk_alloc(&k,200,a,&page)==AOSK_OK);CHECK(page==10);
 CHECK(aosk_alloc(&k,300,b,&chosen)==AOSK_DENY);CHECK(aosk_release(&k,300,b,page)==AOSK_DENY);
 CHECK(aosk_release(&k,200,a,page)==AOSK_OK);CHECK(aosk_release(&k,200,a,page)==AOSK_DENY);
 CHECK(aosk_alloc(&k,200,a,&page)==AOSK_OK);CHECK(page==10);
 CHECK(aosk_send(&k,200,a,b,1,1,payload,2)==AOSK_OK);
 CHECK(aosk_send(&k,200,a,b,1,1,payload,2)==AOSK_STALE);
 CHECK(aosk_send(&k,300,b,a,1,1,payload,2)==AOSK_DENY);
 CHECK(aosk_recv(&k,300,b,&msg)==AOSK_OK);CHECK(msg.from==a&&msg.to==b&&msg.n==2&&msg.data[1]==42);
 CHECK(aosk_recv(&k,300,b,&msg)==AOSK_EMPTY);
 CHECK(aosk_send(&k,400,c,b,3,1,payload,2)==AOSK_OK);
 CHECK(aosk_revoke(&k,1234,a)==AOSK_OK);CHECK(k.qsize==0);
 CHECK(aosk_send(&k,400,c,b,4,1,payload,2)==AOSK_DENY);CHECK(aosk_alloc(&k,200,a,&page)==AOSK_DENY);
 CHECK(k.page_owner[10]==AOSK_FREE);CHECK(aosk_recv(&k,300,b,&msg)==AOSK_EMPTY);
 CHECK(aosk_next(&k,&chosen)==AOSK_OK&&chosen==0);
 CHECK(aosk_hsn_parse("H01.S01.N01",11,&idx,&method)==AOSK_OK&&idx==0&&method==0);
 CHECK(aosk_hsn_parse("H12.S12.N12",11,&idx,&method)==AOSK_OK&&idx==1727&&method==1);
 CHECK(aosk_hsn_parse("H01.S13.N01",11,&idx,&method)==AOSK_BAD);
 CHECK(aosk_hsn_parse("H01.S01.N00",11,&idx,&method)==AOSK_BAD);
 CHECK(aosk_hsn_parse("H01.S01.N01 ",12,&idx,&method)==AOSK_BAD);
 for(i=0;i<1728;i++){
  char s[12]="H00.S00.N00";unsigned h=i/144+1,sp=(i/12)%12+1,node=i%12+1;
  s[1]=(char)('0'+h/10);s[2]=(char)('0'+h%10);
  s[5]=(char)('0'+sp/10);s[6]=(char)('0'+sp%10);
  s[9]=(char)('0'+node/10);s[10]=(char)('0'+node%10);
  CHECK(aosk_hsn_parse(s,11,&idx,&method)==AOSK_OK);
  CHECK(idx==i);
  CHECK(method==(sp>7));
  s[0]='X';CHECK(aosk_hsn_parse(s,11,&idx,&method)==AOSK_BAD);
 }
 /* 32-entry mailbox is fixed, cannot push beyond capacity, and drains FIFO. */
 {struct aosk q;au16 tx,rx;unsigned j;struct aosk_message mm;
 aosk_init(&q,888);CHECK(aosk_grant(&q,888,0,901,AOSK_R_SEND,3,&tx)==AOSK_OK);
 CHECK(aosk_grant(&q,888,0,902,AOSK_R_RECV,3,&rx)==AOSK_OK);
 CHECK(aosk_restrict_targets(&q,901,tx,rx,rx)==AOSK_OK);
 for(j=1;j<=AOSK_MAIL;j++)CHECK(aosk_send(&q,901,tx,rx,j,1,payload,2)==AOSK_OK);
 CHECK(aosk_send(&q,901,tx,rx,33,1,payload,2)==AOSK_FULL);
 CHECK(aosk_send(&q,901,tx,rx,0,1,payload,2)==AOSK_BAD);
 CHECK(aosk_send(&q,901,tx,rx,33,1,payload,9)==AOSK_BAD);
 for(j=1;j<=AOSK_MAIL;j++){CHECK(aosk_recv(&q,902,rx,&mm)==AOSK_OK);CHECK(mm.seq==j);}
 CHECK(aosk_recv(&q,902,rx,&mm)==AOSK_EMPTY);
 CHECK(q.qsize==0);
 }
 /* Strict root budget conservation under sibling grants and child delegation. */
 {struct aosk t;au16 first,second,grand;aosk_init(&t,77);
 CHECK(aosk_grant(&t,77,0,71,AOSK_R_SEND|AOSK_R_GRANT,600,&first)==AOSK_OK);
 CHECK(aosk_grant(&t,77,0,72,AOSK_R_RECV,500,&second)==AOSK_DENY);
 CHECK(t.domain[0].cpu_left==424);
 CHECK(aosk_grant(&t,71,first,73,AOSK_R_SEND,601,&grand)==AOSK_DENY);
 CHECK(aosk_grant(&t,71,first,73,AOSK_R_SEND,200,&grand)==AOSK_OK);
 CHECK(t.domain[first].cpu_left==400);
 CHECK(aosk_restrict_targets(&t,71,first,first,first)==AOSK_OK);
 CHECK(aosk_send(&t,73,grand,0,1,1,payload,2)==AOSK_DENY);
 }
 /* Denied/invalid memory region attempts do not mutate the accepted map. */
 {struct aosk temp;struct aosk_region bad[2]={{0,60,1},{50,20,0}};aosk_init(&temp,99);n=temp.epoch;
 CHECK(aosk_seed_pages(&temp,99,bad,2)==AOSK_BAD);CHECK(temp.epoch==n);
 CHECK(aosk_seed_pages(&temp,3,maps,3)==AOSK_DENY);
 }
 printf("ATLAS_R03_KERNEL_LAB_OK assertions=%u original_HSN=1728 microkernel=unhosted\n",checks);
 return 0;
}
