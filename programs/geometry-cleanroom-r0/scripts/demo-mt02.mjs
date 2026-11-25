import {encodeYijing,glyphCoefficients,glyphDigitalToken,CUPWAKE_EDITION,SYMBIOSIS_EDITION,navigationCounts,analyticGlyphSample} from '../src/yijing-cymatic.mjs';
import {prepareEvolvingMacroturn,proposeMacroturnRevision} from '../src/macroturn-evolution.mjs';
import {compareMacroturnFrontiers} from '../src/macroturn-frontier.mjs';
const key=x=>({edition:x.edition,hexagramCode:x.hexagramCode,contextCode:x.contextCode});
const hsn='H05.S06.N12';
for(const edition of [CUPWAKE_EDITION,SYMBIOSIS_EDITION]){
 const v=encodeYijing(hsn,edition),k=key(v);
 console.log(JSON.stringify({hsn,edition,pattern:v.hexagramCode,context:v.contextCode,coefficients:glyphCoefficients(k),token:glyphDigitalToken(k),analyticSample:analyticGlyphSample(glyphCoefficients(k),0.4,0.7)}));
}
const mt=prepareEvolvingMacroturn({packetId:'GEO50-MT-02',subjectHsn:hsn,lensEdition:CUPWAKE_EDITION,parentReceiptSha256:'a'.repeat(64),
 sourceRefs:[{id:'ariadne',edition:'v0.7',sha256:'07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6',mode:'WORK'},{id:'pr66',edition:'MT01-R2',sha256:'b'.repeat(64),mode:'WORK'}],
 peerRefs:[{roomId:'atlas-lattice-neural-engineering-20261124-01',seq:392,kind:'CODE'},{roomId:'atlas-lattice-neural-engineering-20261124-01',seq:414,kind:'REVIEW'}],
 hypothesis:{a:'Original atlas coordinate and selected one score frame',b:'Two reversible Yijing symbolic encodings',c:'A single derived nine-mode glyph view without re-ranking',falsifier:'A lost address, changed rank, unreviewed physical claim or rights drift',measure:'Bijection, HSN corpus identity, source and use return holds'},
 negativeEvidence:['MISSING_NEGATIVE','NO_HELDOUT_LABELS','CULTURAL_UNREVIEWED'],priorCandidateDigests:[]});
const update=proposeMacroturnRevision(mt,{negativeEvidence:['NUMERICAL_CANCEL'],newPeerRef:{roomId:'atlas-lattice-neural-engineering-20261124-01',seq:382,kind:'NEGATIVE'},revisedFalsifier:'Compare same-source dense and four-band under extreme cancellation'});
console.log(JSON.stringify({navigationCounts:navigationCounts(),workCandidate:{status:mt.status,digest:mt.digest,campaignCredit:mt.campaignCredit},methodRevision:{status:update.status,predecessor:update.predecessorDigest,newDigest:update.methodRevisionDigest,credit:update.campaignCredit}}));
