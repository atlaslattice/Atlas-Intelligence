import test from 'node:test';
import assert from 'node:assert/strict';
import {buildWhole144Program} from '../src/whole-144.mjs';
import {proposeCompoundingGraph,prepareNodeReviewLedger,proposeResidentSpecialty} from '../src/whole-144-compounding.mjs';
const p=buildWhole144Program();
const l=(fromId='W144-H01-S01',toId='W144-H12-S01',relation='SUPPORTS',extra={})=>({
  fromId,toId,relation,mode:'WORK',rationale:'Cross-house hypothesis for explicit review, not a semantic match.',
  sourceRefs:['synthetic:cross-house'],...extra
});
const c=(candidateId='W144-H01-S01',nodeCoordinate='H01.S01.N01',extra={})=>({
  candidateId,nodeCoordinate,mode:'WORK',codeDigest:'a'.repeat(64),testDigest:'b'.repeat(64),
  sourceRefs:['synthetic:source:one'],...extra
});
const n=(extra={})=>({alias:'Fieldlark',level:'NODE',position:'H12.S12.N12',mode:'WORK',optIn:true,
 sourceRefs:['synthetic:work-evidence'],peerReviewRefs:[],dissentRefs:[],
 originalityStatement:'Specific novel approach to independent thermal and electricity balances, with reproducible contrasts.',
 falsifier:'Demonstrate the source and sink balances do not close under an outage.',...extra});
const hold=(r,why)=>{assert.equal(r.status,'HOLD');if(why)assert.equal(r.reason,why);assert.equal(r.verifiedGains,0);};

test('empty cross-House overlay is valid but establishes zero gains',()=>{const x=proposeCompoundingGraph(p);assert.equal(x.linkCount,0);assert.equal(x.verifiedGains,0);assert.equal(x.status,'RELATIONSHIP_REVIEW_CANDIDATE');});
test('explicit interhouse method hypothesis is review-only',()=>{const x=proposeCompoundingGraph(p,[l('W144-H01-S01','W144-H12-S01','METHOD_TRANSFER')]);assert.equal(x.crossHouseLinks,1);assert.equal(x.links[0].epistemicStatus,'EXPLICIT_UNREVIEWED_HYPOTHESIS');assert.equal(x.semanticEquivalencesEstablished,0);});
test('a cross-House criticism preserves dissent',()=>{const x=proposeCompoundingGraph(p,[l('W144-H11-S02','W144-H06-S03','CHALLENGES',{dissentRefs:['synthetic:dissent-01']})]);assert.deepEqual(x.links[0].dissentRefs,['synthetic:dissent-01']);});
test('same house different sphere is not a cross-House link',()=>{const x=proposeCompoundingGraph(p,[l('W144-H01-S01','W144-H01-S02')]);assert.equal(x.crossHouseLinks,0);assert.equal(x.linkedCandidatePositions,2);});
test('graph digest independent of link ordering',()=>{const a=l(),b=l('W144-H06-S01','W144-H11-S01');assert.equal(proposeCompoundingGraph(p,[a,b]).graphDigest,proposeCompoundingGraph(p,[b,a]).graphDigest);});
test('repeated exactly same link rejected',()=>hold(proposeCompoundingGraph(p,[l(),l()]),'DUPLICATE_RELATION'));
test('different link relations same pair may coexist',()=>assert.equal(proposeCompoundingGraph(p,[l(),l(undefined,undefined,'CHALLENGES')]).linkCount,2));
test('self relation denied',()=>hold(proposeCompoundingGraph(p,[l('W144-H01-S01','W144-H01-S01')])));
test('forged unknown candidate denied',()=>hold(proposeCompoundingGraph(p,[l('W144-H01-S01','W144-H13-S01')])));
test('private-mode relationship denied',()=>hold(proposeCompoundingGraph(p,[l(undefined,undefined,undefined,{mode:'DREAM'})])));
test('claiming hosted rights on a relation denied',()=>hold(proposeCompoundingGraph(p,[l(undefined,undefined,undefined,{hostApproved:true})])));
test('missing source ref denied',()=>hold(proposeCompoundingGraph(p,[l(undefined,undefined,undefined,{sourceRefs:[]})])));
test('invalid buffer, excess edge count rejected',()=>{hold(proposeCompoundingGraph(p,{}),'LINK_BOUND_INVALID');hold(proposeCompoundingGraph(p,Array(145).fill(l())),'LINK_BOUND_INVALID');});
test('REQUIRES cycle rejected',()=>hold(proposeCompoundingGraph(p,[l('W144-H01-S01','W144-H01-S02','REQUIRES'),l('W144-H01-S02','W144-H01-S01','REQUIRES')]),'DEPENDENCY_CYCLE'));
test('deep REQUIRES cycle rejected',()=>hold(proposeCompoundingGraph(p,[l('W144-H01-S01','W144-H01-S02','REQUIRES'),l('W144-H01-S02','W144-H01-S03','REQUIRES'),l('W144-H01-S03','W144-H01-S01','REQUIRES')]),'DEPENDENCY_CYCLE'));
test('reciprocal SUPPORTS is permitted as hypotheses',()=>assert.equal(proposeCompoundingGraph(p,[l('W144-H01-S01','W144-H02-S01'),l('W144-H02-S01','W144-H01-S01')]).linkCount,2));
test('one evidence receipt is review candidate not confirmed gain',()=>{const x=prepareNodeReviewLedger(p,[c()]);assert.equal(x.receivedEvidenceCandidates,1);assert.equal(x.untouchedNodeSlots,1727);assert.equal(x.verifiedNodeGains,0);assert.equal(x.byHouse[0].reviewCandidates,1)});
test('two distinct receipts tracked without source bodies',()=>{const x=prepareNodeReviewLedger(p,[c(),c('W144-H12-S12','H12.S12.N12')]);assert.equal(x.receipts.length,2);assert.equal(x.byHouse[11].reviewCandidates,1);assert.ok(!('sourceBody' in x.receipts[0]));});
test('ledger hash stable regardless of evidence order',()=>{const a=c(),b=c('W144-H12-S12','H12.S12.N12');assert.equal(prepareNodeReviewLedger(p,[a,b]).ledgerDigest,prepareNodeReviewLedger(p,[b,a]).ledgerDigest);});
test('duplicate node claims denied',()=>hold(prepareNodeReviewLedger(p,[c(),c()]),'DUPLICATE_NODE_CLAIM'));
test('ledger rejects cross-position evidence',()=>hold(prepareNodeReviewLedger(p,[c('W144-H01-S01','H02.S01.N01')]),'NODE_CLAIM_INVALID'));
test('ledger rejects any private evidence',()=>hold(prepareNodeReviewLedger(p,[c(undefined,undefined,{mode:'PALACE'})]),'NODE_CLAIM_INVALID'));
test('ledger rejects forged verification status',()=>hold(prepareNodeReviewLedger(p,[c(undefined,undefined,{verifiedGain:true})]),'NODE_CLAIM_INVALID'));
test('empty evidence ledger remains zero verified',()=>{const x=prepareNodeReviewLedger(p);assert.equal(x.receivedEvidenceCandidates,0);assert.equal(x.verifiedNodeGains,0);assert.equal(x.untouchedNodeSlots,1728);});
test('voluntary originality nomination cannot assign a role',()=>{const x=proposeResidentSpecialty(p,n());assert.equal(x.status,'SELF_NOMINATED_REVIEW_CANDIDATE');assert.equal(x.assigned,false);assert.equal(x.meritRank,null);assert.equal(x.identityAuthenticated,false);});
test('house-level self nomination can be submitted',()=>{const x=proposeResidentSpecialty(p,n({level:'HOUSE',position:'H12'}));assert.equal(x.level,'HOUSE');assert.equal(x.assigned,false);});
test('sphere-level self nomination can be submitted',()=>{const x=proposeResidentSpecialty(p,n({level:'SPHERE',position:'H06.S02'}));assert.equal(x.level,'SPHERE');});
test('no consent means hold',()=>hold(proposeResidentSpecialty(p,n({optIn:false})),'VOLUNTARY_WORK_CONSENT_REQUIRED'));
test('Palace cannot become a nomination source',()=>hold(proposeResidentSpecialty(p,n({mode:'PALACE'})),'VOLUNTARY_WORK_CONSENT_REQUIRED'));
test('message volume does not enter merit assessment',()=>hold(proposeResidentSpecialty(p,n({messageCount:1000000})),'NOMINATION_SHAPE_INVALID'));
test('a source-only nomination needs rationale and falsifier',()=>{hold(proposeResidentSpecialty(p,n({originalityStatement:'I posted a lot.'})),'NOMINATION_PROVENANCE_OR_ORIGINALITY_REQUIRED');hold(proposeResidentSpecialty(p,n({falsifier:'None'})),'NOMINATION_PROVENANCE_OR_ORIGINALITY_REQUIRED');});
test('forged identity, benefits, ratings and authority denied',()=>{for(const k of ['authenticated','canPublish','verifiedGains','assigned','rank','sourceBody'])hold(proposeResidentSpecialty(p,n({[k]:true})),'NOMINATION_SHAPE_INVALID');});
test('malformed source key and bad role coordinates denied',()=>{hold(proposeResidentSpecialty(p,n({alias:'\u0000bad'})));hold(proposeResidentSpecialty(p,n({position:'H13.S12.N12'})),'NOMINATION_POSITION_INVALID');});
test('nominations deterministic, dissent preserved, no peer impersonation',()=>{const q=n({dissentRefs:['synthetic:dissent-01']});const x=proposeResidentSpecialty(p,q);assert.deepEqual(x.dissentRefs,q.dissentRefs);assert.equal(x.nominationDigest,proposeResidentSpecialty(p,q).nominationDigest);assert.equal(x.identityAuthenticated,false);});
