/* SPDX-License-Identifier: MIT
 * Atlas R03 bounded scheduler, capability hierarchy, mailbox and page-frame ledger.
 * NO memory isolation, firmware memory ownership, interrupts, persistent authority,
 * real time source, secure boot, real OS processes or network transport established.
 */
#include "aosk.h"
static void zero_bytes(void *p,unsigned n){unsigned i;au8 *b=(au8*)p;for(i=0;i<n;i++)b[i]=0;}
static int update(struct aosk *k){if(k->epoch==0xffffffffu)return AOSK_FULL; k->epoch++;return AOSK_OK;}
static int live(const struct aosk *k,au16 id){unsigned depth=0;while(id!=AOSK_FREE){const struct aosk_domain *d;if(id>=k->count||++depth>AOSK_DOMAINS)return 0;d=&k->domain[id];if(!d->live||(d->parent!=AOSK_FREE&&d->parent>=id))return 0;id=d->parent;}return 1;}
static int actor(const struct aosk *k,au32 principal,au16 id,au8 need){return id<k->count&&k->domain[id].owner==principal&&live(k,id)&&(k->domain[id].rights&need)==need;}
void aosk_init(struct aosk *k,au32 principal){unsigned i;if(!k)return;zero_bytes(k,sizeof *k);k->epoch=1;k->count=1;k->last_run=AOSK_FREE;k->domain[0]=(struct aosk_domain){principal,0,AOSK_FREE,1024,1024,0,AOSK_DOMAINS-1,AOSK_R_ALL,1};for(i=0;i<AOSK_PAGES;i++)k->page_owner[i]=AOSK_FREE;}
int aosk_seed_pages(struct aosk *k,au32 owner,const struct aosk_region *r,unsigned n){unsigned i,j,last=0;if(!k||!r||!n||n>AOSK_PAGES||!actor(k,owner,0,AOSK_R_GRANT))return AOSK_DENY;
 /* Strict sorted disjoint fixture pages. Page zero is always reserved. */
 for(i=0;i<n;i++){unsigned end=(unsigned)r[i].start+r[i].count;if(!r[i].count||r[i].usable>1||r[i].start<last||end>AOSK_PAGES)return AOSK_BAD;last=end;}
 for(i=0;i<AOSK_PAGES;i++){if(k->page_owner[i]!=AOSK_FREE)return AOSK_DENY;}
 if(update(k))return AOSK_FULL;
 for(i=0;i<AOSK_PAGES;i++)k->page_available[i]=0;
 for(i=0;i<n;i++)if(r[i].usable){for(j=r[i].start;j<(unsigned)r[i].start+r[i].count;j++)if(j)k->page_available[j]=1;}
 return AOSK_OK;
}
int aosk_grant(struct aosk *k,au32 principal,au16 par,au32 owner,au8 rights,au16 ticks,au16 *id){const struct aosk_domain *p;au16 idx;if(!k||!id||!rights||(rights&~AOSK_R_ALL)||!ticks)return AOSK_BAD;if(!actor(k,principal,par,AOSK_R_GRANT))return AOSK_DENY;p=&k->domain[par];if((rights&~p->rights)||ticks>p->cpu_left||rights==p->rights)return AOSK_DENY;if(k->count>=AOSK_DOMAINS||update(k))return AOSK_FULL;idx=k->count++;k->domain[par].cpu_left=(au16)(k->domain[par].cpu_left-ticks);k->domain[idx]=(struct aosk_domain){owner,0,par,ticks,ticks,p->dest_lo,p->dest_hi,rights,1};*id=idx;return AOSK_OK;}
int aosk_restrict_targets(struct aosk *k,au32 principal,au16 id,au16 lo,au16 hi){
 struct aosk_domain *d;if(!k||lo>hi||hi>=AOSK_DOMAINS)return AOSK_BAD;
 if(!actor(k,principal,id,AOSK_R_SEND))return AOSK_DENY;d=&k->domain[id];
 if(lo<d->dest_lo||hi>d->dest_hi)return AOSK_DENY;
 if(update(k))return AOSK_FULL;d->dest_lo=lo;d->dest_hi=hi;return AOSK_OK;
}
static int can_route(const struct aosk *k,au16 id,au16 dst){
 unsigned depth=0;while(id!=AOSK_FREE){const struct aosk_domain *d;
 if(id>=k->count||++depth>AOSK_DOMAINS)return 0;d=&k->domain[id];
 if(dst<d->dest_lo||dst>d->dest_hi)return 0;id=d->parent;
 }return 1;
}
int aosk_revoke(struct aosk *k,au32 principal,au16 id){unsigned i,j=0;if(!k||id==0||id>=k->count)return AOSK_BAD;if(!actor(k,principal,k->domain[id].parent,AOSK_R_GRANT))return AOSK_DENY;if(update(k))return AOSK_FULL;k->domain[id].live=0;
 /* No queued message from or to a stale/revoked descendant may escape. */
 for(i=0;i<k->qsize;i++){struct aosk_message m=k->queue[i];if(live(k,m.from)&&live(k,m.to))k->queue[j++]=m;}k->qsize=(au16)j;
 for(i=0;i<AOSK_PAGES;i++)if(k->page_owner[i]!=AOSK_FREE&&!live(k,k->page_owner[i]))k->page_owner[i]=AOSK_FREE;
 return AOSK_OK;
}
int aosk_send(struct aosk *k,au32 principal,au16 src,au16 dst,au32 seq,au8 kind,const au8 *buf,au8 n){unsigned i;struct aosk_message *m;if(!k||!kind||!seq||n>AOSK_DATA||(n&&!buf))return AOSK_BAD;if(!actor(k,principal,src,AOSK_R_SEND)||dst>=k->count||!live(k,dst)||!can_route(k,src,dst)||!(k->domain[dst].rights&AOSK_R_RECV))return AOSK_DENY;if(seq<=k->domain[src].last_seq)return AOSK_STALE;if(k->qsize>=AOSK_MAIL||update(k))return AOSK_FULL;m=&k->queue[k->qsize++];m->from=src;m->to=dst;m->kind=kind;m->seq=seq;m->n=n;for(i=0;i<AOSK_DATA;i++)m->data[i]=i<n?buf[i]:0;k->domain[src].last_seq=seq;return AOSK_OK;}
int aosk_recv(struct aosk *k,au32 principal,au16 to,struct aosk_message *out){unsigned i,j;if(!k||!out)return AOSK_BAD;if(!actor(k,principal,to,AOSK_R_RECV))return AOSK_DENY;for(i=0;i<k->qsize;i++){if(k->queue[i].to!=to)continue;if(!live(k,k->queue[i].from))return AOSK_HOLD;if(update(k))return AOSK_FULL;*out=k->queue[i];for(j=i+1;j<k->qsize;j++)k->queue[j-1]=k->queue[j];k->qsize--;return AOSK_OK;}return AOSK_EMPTY;}
int aosk_alloc(struct aosk *k,au32 principal,au16 domain,au16 *out){unsigned i;if(!k||!out)return AOSK_BAD;if(!actor(k,principal,domain,AOSK_R_ALLOC))return AOSK_DENY;for(i=0;i<AOSK_PAGES;i++)if(k->page_available[i]&&k->page_owner[i]==AOSK_FREE){if(update(k))return AOSK_FULL;k->page_owner[i]=domain;*out=(au16)i;return AOSK_OK;}return AOSK_FULL;}
int aosk_release(struct aosk *k,au32 principal,au16 domain,au16 page){if(!k||page>=AOSK_PAGES)return AOSK_BAD;if(!actor(k,principal,domain,AOSK_R_ALLOC)||k->page_owner[page]!=domain)return AOSK_DENY;if(update(k))return AOSK_FULL;k->page_owner[page]=AOSK_FREE;return AOSK_OK;}
int aosk_next(struct aosk *k,au16 *id){unsigned i;if(!k||!id)return AOSK_BAD;for(i=0;i<k->count;i++){au16 j=(au16)((k->last_run==AOSK_FREE?0u:(unsigned)k->last_run+1u)+i);j=(au16)(j%k->count);if(!live(k,j)||!k->domain[j].cpu_left)continue;k->domain[j].cpu_left--;k->last_run=j;*id=j;return AOSK_OK;}return AOSK_EMPTY;}
static int isdig(char c){return c>='0'&&c<='9';}
int aosk_hsn_parse(const char *s,unsigned n,au16 *ordinal,au8 *method){unsigned h,sp,node;if(!s||!ordinal||!method||n!=11||s[0]!='H'||s[3]!='.'||s[4]!='S'||s[7]!='.'||s[8]!='N'||!isdig(s[1])||!isdig(s[2])||!isdig(s[5])||!isdig(s[6])||!isdig(s[9])||!isdig(s[10]))return AOSK_BAD;h=(unsigned)(s[1]-'0')*10+(unsigned)(s[2]-'0');sp=(unsigned)(s[5]-'0')*10+(unsigned)(s[6]-'0');node=(unsigned)(s[9]-'0')*10+(unsigned)(s[10]-'0');if(!h||h>12||!sp||sp>12||!node||node>12)return AOSK_BAD;*ordinal=(au16)((h-1)*144+(sp-1)*12+node-1);*method=(au8)(sp>7);return AOSK_OK;}
int aosk_selftest(void){static struct aosk k;struct aosk_region r[2]={{0,8,0},{8,80,1}};au16 a,b,page,next,hsn;au8 method;struct aosk_message m;au8 data[2]={4,7};aosk_init(&k,101);if(aosk_seed_pages(&k,101,r,2))return 1;if(aosk_grant(&k,101,0,202,AOSK_R_SEND|AOSK_R_ALLOC,6,&a))return 2;if(aosk_grant(&k,101,0,303,AOSK_R_RECV,6,&b))return 3;if(aosk_alloc(&k,202,a,&page)||page<8)return 4;if(aosk_send(&k,202,a,b,1,1,data,2)||aosk_recv(&k,303,b,&m)||m.data[0]!=4)return 5;if(aosk_send(&k,202,a,b,1,1,data,2)!=AOSK_STALE)return 6;if(aosk_hsn_parse("H12.S12.N12",11,&hsn,&method)||hsn!=1727||method!=1)return 7;if(aosk_next(&k,&next)||next!=0)return 8;if(aosk_revoke(&k,101,a))return 9;if(aosk_alloc(&k,202,a,&page)!=AOSK_DENY)return 10;return 0;}
