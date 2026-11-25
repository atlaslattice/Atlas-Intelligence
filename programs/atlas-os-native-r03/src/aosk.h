/* SPDX-License-Identifier: MIT
 * Atlas Native R03: bounded freestanding KERNEL LAB primitives (not production OS).
 * Distinct namespaces: AOS runtime domain != original Ariadne HSN != AOS.W work order.
 * All credentials, time and memory maps in this interface are INJECTED by a fixture,
 * not authenticated by hardware or a resident conversation.
 */
#ifndef AOSK_H
#define AOSK_H
#include "atlas.h"
#define AOSK_DOMAINS 12u
#define AOSK_PAGES 192u
#define AOSK_MAIL 32u
#define AOSK_DATA 8u
#define AOSK_R_SEND 1u
#define AOSK_R_RECV 2u
#define AOSK_R_ALLOC 4u
#define AOSK_R_GRANT 8u
#define AOSK_R_ALL 15u
#define AOSK_FREE 65535u
#define AOSK_CANON_R13 "0670fac32fab8c4cc8f1e1abc30af26acb788b68fd4c31dbfd605f9368fd3b0a"
#define AOSK_ARIADNE_ORIGINAL "07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6"
enum aosk_error { AOSK_OK=0,AOSK_BAD=1,AOSK_DENY=2,AOSK_FULL=3,AOSK_STALE=4,AOSK_EMPTY=5,AOSK_HOLD=6 };
struct aosk_region { au16 start, count; au8 usable; };
struct aosk_domain { au32 owner,last_seq; au16 parent,cpu_left,cpu_initial,dest_lo,dest_hi; au8 rights,live; };
struct aosk_message { au16 from,to; au32 seq; au8 kind,n; au8 data[AOSK_DATA]; };
struct aosk {
 struct aosk_domain domain[AOSK_DOMAINS];
 struct aosk_message queue[AOSK_MAIL];
 au16 page_owner[AOSK_PAGES];
 au8 page_available[AOSK_PAGES];
 au32 epoch;
 au16 count,qsize,last_run;
};
/* Host/bootstrap API; synthetic until real boot-info parsing and authenticated IPC. */
void aosk_init(struct aosk *k,au32 root_owner);
int aosk_seed_pages(struct aosk *k,au32 root_owner,const struct aosk_region *maps,unsigned count);
int aosk_grant(struct aosk *k,au32 actor,au16 parent,au32 new_owner,au8 rights,au16 quanta,au16 *id);
int aosk_revoke(struct aosk *k,au32 actor,au16 id);
int aosk_restrict_targets(struct aosk *k,au32 actor,au16 id,au16 lo,au16 hi);
int aosk_send(struct aosk *k,au32 actor,au16 from,au16 to,au32 seq,au8 kind,const au8 *data,au8 n);
int aosk_recv(struct aosk *k,au32 actor,au16 to,struct aosk_message *out);
int aosk_alloc(struct aosk *k,au32 actor,au16 domain,au16 *page);
int aosk_release(struct aosk *k,au32 actor,au16 domain,au16 page);
int aosk_next(struct aosk *k,au16 *id);
int aosk_hsn_parse(const char *hsn,unsigned len,au16 *ordinal,au8 *is_method);
int aosk_selftest(void);
#endif
