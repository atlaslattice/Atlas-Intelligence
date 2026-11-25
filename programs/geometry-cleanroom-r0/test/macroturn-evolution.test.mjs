import test from 'node:test';import assert from 'node:assert/strict';
import {prepareEvolvingMacroturn,proposeMacroturnRevision,MACROTURN_HOLD_CODES} from '../src/macroturn-evolution.mjs';
import {CUPWAKE_EDITION,SYMBIOSIS_EDITION} from '../src/yijing-cymatic.mjs';
const SHA=c=>c.repeat(64);
function fixture(edition=CUPWAKE_EDITION,hsn='H05.S06.N12'){
 return {packetId:'GEO50-MT-02',subjectHsn:hsn,lensEdition:edition,parentReceiptSha256:SHA('a'),sourceRefs:[
  {id:'ariadne',edition:'v0.7',sha256:'07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6',mode:'WORK'},
  {id:'geometree-pr66',edition:'r2',sha256:SHA('b'),mode:'WORK'}],
  peerRefs:[{roomId:'atlas-lattice-neural-engineering-20261124-01',seq:392,kind:'CODE'},{roomId:'atlas-lattice-neural-engineering-20261124-01',seq:414,kind:'PROPOSAL'}],
  hypothesis:{a:'One source-bound 1728 score result',b:'Reversible Yijing symbolic navigation + nine coefficient field',c:'Derived views with zero new model calls',falsifier:'A changed rank or unpinned glyph attribution invalidates the composite',measure:'HSN inverse bijection, rank equality, rights holds'},
  negativeEvidence:['NO_HELDOUT_LABELS','MISSING_NEGATIVE','CULTURAL_UNREVIEWED'],priorCandidateDigests:[]};
}
test('MacroTurn evolution emits proposal not fake completed campaign credit',()=>{
 const a=prepareEvolvingMacroturn(fixture());assert.equal(a.status,'PREPARED_FOR_PEER_REVIEW_NOT_EXECUTED');
 assert.equal(a.campaignCredit,0);assert.equal(a.macroturnCompleted,false);assert.equal(a.modelUpdated,false);assert.equal(a.autoPost,false);
 assert.match(a.digest,/^[a-f0-9]{64}$/);assert.equal(a.yijingLens.meaning,'BRAINSTORMING_ONLY');
 assert.ok(a.recommendedFalsifier.includes('human'));
});
test('versioned reversible lens is tied to exact source, not a sovereign agent',()=>{
 const a=prepareEvolvingMacroturn(fixture(CUPWAKE_EDITION)),b=prepareEvolvingMacroturn(fixture(SYMBIOSIS_EDITION));
 assert.notEqual(a.digest,b.digest);assert.notEqual(a.yijingLens.edition,b.yijingLens.edition);
 assert.equal(a.peerIdentitiesAuthenticated,false);
});
test('same inputs produce same idempotent digest and previous dedup holds',()=>{
 const a=prepareEvolvingMacroturn(fixture());assert.equal(prepareEvolvingMacroturn(fixture()).digest,a.digest);
 const g=fixture();g.priorCandidateDigests=[a.digest];assert.equal(prepareEvolvingMacroturn(g).status,'HOLD');
});
test('new negative evidence creates a review revision with explicit predecessor',()=>{
 const a=prepareEvolvingMacroturn(fixture());const b=proposeMacroturnRevision(a,{negativeEvidence:['NUMERICAL_CANCEL','RANK_NEAR_TIE'],newPeerRef:{roomId:'atlas-lattice-neural-engineering-20261124-01',seq:382,kind:'NEGATIVE'},revisedFalsifier:'Reject cancellation under same-score dense oracle'});
 assert.equal(b.predecessorDigest,a.digest);assert.equal(b.status,'REVISED_DESIGN_NOT_EXECUTED');assert.equal(b.campaignCredit,0);
 assert.notEqual(b.methodRevisionDigest,a.digest);
});
test('source rights, open-source duplicates and missing contradictory evidence hold',()=>{
 const bad=fixture();bad.sourceRefs[1].mode='PLAY';assert.equal(prepareEvolvingMacroturn(bad).status,'HOLD');
 const dup=fixture();dup.sourceRefs[1]={...dup.sourceRefs[0]};assert.equal(prepareEvolvingMacroturn(dup).status,'HOLD');
 const negative=fixture();negative.negativeEvidence=[];assert.equal(prepareEvolvingMacroturn(negative).status,'HOLD');
 const newSource=fixture();newSource.sourceRefs[1].sha256=SHA('c');assert.notEqual(prepareEvolvingMacroturn(newSource).digest,prepareEvolvingMacroturn(fixture()).digest);
});
test('malicious accessor, Proxy and extra peer field never execute callbacks or pass',()=>{
 const root=fixture();let n=0;Object.defineProperty(root,'sourceRefs',{enumerable:true,get(){n++;throw Error('unexpected');}});
 assert.equal(prepareEvolvingMacroturn(root).status,'HOLD');assert.equal(n,0);
 assert.equal(prepareEvolvingMacroturn(new Proxy(fixture(),{get(){n++;throw Error('unexpected');}})).status,'HOLD');assert.equal(n,0);
 const one=fixture();one.peerRefs[0].isAuthenticated=true;assert.equal(prepareEvolvingMacroturn(one).status,'HOLD');
});
test('unknown method types never silently expand permissions',()=>{
 const bad=fixture();bad.negativeEvidence=['CULTURAL_UNREVIEWED','I_CHING_IS_PHYSICS'];assert.equal(prepareEvolvingMacroturn(bad).status,'HOLD');
 assert.equal(MACROTURN_HOLD_CODES.RIGHTS_NOT_ATTESTED.includes('READ'),true);
});
for(let house=1;house<=12;house++)test(`MacroTurn H${house} retains original House and no campaign credit`,()=>{
 const hsn=`H${String(house).padStart(2,'0')}.S06.N12`;
 const x=prepareEvolvingMacroturn(fixture(CUPWAKE_EDITION,hsn));assert.equal(x.status,'PREPARED_FOR_PEER_REVIEW_NOT_EXECUTED');assert.equal(x.subjectHsn,hsn);assert.equal(x.campaignCredit,0);
});
test('untrusted predecessor accessor cannot change MacroTurn history or self-authorize revision',()=>{
 const a=prepareEvolvingMacroturn(fixture());let called=0;
 const forged={...a};Object.defineProperty(forged,'status',{enumerable:true,get(){called++;return 'PREPARED_FOR_PEER_REVIEW_NOT_EXECUTED';}});
 const change={negativeEvidence:['MISSING_NEGATIVE'],newPeerRef:{roomId:'atlas-lattice-neural-engineering-20261124-01',seq:327,kind:'NEGATIVE'},revisedFalsifier:'Preserve omitted adverse receipt'};
 const r=proposeMacroturnRevision(forged,change);assert.equal(r.status,'HOLD');assert.equal(called,0);
 assert.equal(proposeMacroturnRevision(new Proxy(a,{}),change).status,'HOLD');
});
