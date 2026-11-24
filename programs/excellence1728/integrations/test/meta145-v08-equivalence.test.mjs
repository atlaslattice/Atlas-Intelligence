import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {compileEvidencePortfolio as baseline,computeReviewTicket} from './fixtures/meta145-v07-reference.mjs';
import {compileEvidencePortfolio as optimized} from '../meta145-evidence-portfolio.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const source='07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6';
const scope={sourceSha256:source,outputSha256:sha('v08-candidate'),dependencySha256:sha('v08-deps'),rightsEpoch:'acl-v08-002',originMode:'WORK',reportedHostAuthenticated:false};
function generate(){
  const nodes=[],reviews=[];
  for(let h=1;h<=12;h++)for(let s=1;s<=12;s++)for(let n=1;n<=12;n++){
    const hsn=`H${String(h).padStart(2,'0')}.S${String(s).padStart(2,'0')}.N${String(n).padStart(2,'0')}`;
    const recordSha256=sha('record:'+hsn),role=s<=7?'DOMAIN_SPECIALIZATION':'EPISTEMIC_META';
    const r={hsn,status:'UNREVIEWED',sourceSha256:source,outputSha256:scope.outputSha256,recordSha256,dependencySha256:scope.dependencySha256,rightsEpoch:scope.rightsEpoch,evidenceSha256:null,naReason:null};
    r.ticketSha256=computeReviewTicket(r); nodes.push({hsn,recordSha256,role});reviews.push(r);
  }
  return {nodes,reviews};
}
const copy=x=>structuredClone(x);
function match(d,sc=scope){const a=baseline(d.nodes,d.reviews,sc),b=optimized(d.nodes,d.reviews,sc);assert.deepStrictEqual(b,a);return b;}
function shuffle(a,seed=123){for(let i=a.length-1;i>0;i--){seed=(seed*1664525+1013904223)>>>0;const j=seed%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
function statusAt(d,i,status){const r=d.reviews[i];r.status=status;r.evidenceSha256=['PASS','FAIL'].includes(status)?sha('external-evidence:'+i):null;r.naReason=status==='N_A'?'NO_METHOD_SUBJECT':null;}
test('full original-coordinate source-only 1728 outputs exact',()=>{const r=match(generate());assert.equal(r.summary.nodes,1728);assert.equal(r.summary.counts.UNREVIEWED,1728);});
test('all five review statuses, 144 Sphere and 12 House outputs exact',()=>{const d=generate();for(let i=0;i<1728;i++)statusAt(d,i,['PASS','FAIL','HOLD','UNREVIEWED','N_A'][i%5]);const o=match(d);assert.equal(o.summary.counts.FAIL,346);});
test('shuffled node and review order has identical result',()=>{const d=generate(),b=match(d);shuffle(d.nodes,24);shuffle(d.reviews,57);assert.deepStrictEqual(match(d),b)});
test('adversarial source HSN and ordinal collision reject both',()=>{let d=generate();d.reviews[0].hsn=d.reviews[1].hsn;assert.equal(match(d).status,'HOLD');d=generate();d.nodes[0].role='EPISTEMIC_META';assert.equal(match(d).status,'HOLD');});
test('malformed array shape, sparse rows and side properties reject both',()=>{let d=generate();delete d.reviews[777];assert.equal(match(d).status,'HOLD');d=generate();d.reviews.hidden='forbidden';assert.equal(match(d).status,'HOLD');});
test('getter changing returned rights epoch never evaluated',()=>{const d=generate();let calls=0;Object.defineProperty(d.reviews[0],'rightsEpoch',{enumerable:true,get(){calls++;return scope.rightsEpoch;}});assert.equal(match(d).status,'HOLD');assert.equal(calls,0)});
test('source and output digest drift both HOLD',()=>{const d=generate();d.reviews[0].outputSha256=sha('changed');assert.equal(match(d).status,'HOLD')});
test('PASS cannot override failures or fabricate host grants',()=>{const d=generate();for(let i=0;i<1728;i++)statusAt(d,i,'PASS');const r=match(d);assert.equal(r.summary.result,'REPORTED_PASS_NOT_ATTESTED');assert.equal(r.summary.hostAuthenticated,false);statusAt(d,11,'FAIL');assert.equal(match(d).summary.result,'FAIL')});
