/** Run 48 distinct Node acceptance probes against an exact pinned OSS source.
 * No callbacks to a live broker, no model calls, no training or networking.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import {
  sha,parseHSN,stableExactTopK,vectorCacheKey,evidenceBindingKey,
  lifStep,runEventLif,familySplitPreview,reviewNeuralReferences,
  openAICompatibleTools,featureLibraryStatus
} from './native_core.mjs';
const HEX='a'.repeat(64),HEX2='b'.repeat(64);
const cases=[];
function add(lane,title,fn,source='OSS_NATIVE_CORE'){
 const index=cases.filter(x=>x.lane===lane).length+1;
 if(index>12)throw new Error('TOO_MANY_CASES');
 cases.push({id:`A144.${String(lane).padStart(2,'0')}.${String(index).padStart(2,'0')}`,lane,name:title,fn,source});
}
const check=(fn)=>{try{fn();return false}catch(e){return e instanceof Error}};
const ref=(overrides={})=>({candidates:[{id:'A1',sourceId:'srcA',recordDigest:HEX,mode:'WORK'}],sourceUse:[{sourceId:'srcA',allowed:true}],returnDisclosure:[{sourceId:'srcA',allowed:true}],verifiedInfluenceInventory:true,...overrides});
const split=(overrides={})=>({sourceFamily:'rootA',split:'TRAIN',verifiedFamily:true,eligibleForTrain:true,...overrides});
// 09: exact retrieval and distinct cache identities
add(9,'Stable descending score order',()=>stableExactTopK([{id:'b',score:.1},{id:'a',score:.9}],2).map(x=>x.id).join(',')==='a,b');
add(9,'Preserve original tie order',()=>stableExactTopK([{id:'z',score:.7},{id:'a',score:.7},{id:'b',score:.7}],3).map(x=>x.id).join(',')==='z,a,b');
add(9,'Support signed negative neural scores',()=>stableExactTopK([{id:'a',score:-.8},{id:'b',score:-.2}],2)[0].id==='b');
add(9,'Refuse boolean-neural score masquerading as numeric',()=>stableExactTopK([{id:'a',score:true}],1).length===0);
add(9,'Refuse nonfinite retrieval score',()=>stableExactTopK([{id:'a',score:Infinity}],1).length===0);
add(9,'Refuse excessive top-k request',()=>stableExactTopK([{id:'a',score:1}],101).length===0);
add(9,'Refuse invalid k zero',()=>stableExactTopK([{id:'a',score:1}],0).length===0);
add(9,'Produce same exact scores on repeated request',()=>JSON.stringify(stableExactTopK([{id:'a',score:.1},{id:'b',score:.2}],2))===JSON.stringify(stableExactTopK([{id:'a',score:.1},{id:'b',score:.2}],2)));
add(9,'Separate encoder revisions in vector cache',()=>vectorCacheKey({encoderRevision:'e1',semanticDigest:HEX,poolingVersion:'p'})!==vectorCacheKey({encoderRevision:'e2',semanticDigest:HEX,poolingVersion:'p'}));
add(9,'Separate rights epochs in evidence binding',()=>evidenceBindingKey({sourceId:'A',sourceRevision:'1',recordDigest:HEX,rightsEpoch:'1',sourceFamily:'F',mode:'WORK'})!==evidenceBindingKey({sourceId:'A',sourceRevision:'1',recordDigest:HEX,rightsEpoch:'2',sourceFamily:'F',mode:'WORK'}));
add(9,'Keep vector identity unaffected by citation/rights metadata',()=>vectorCacheKey({encoderRevision:'e1',semanticDigest:HEX,poolingVersion:'p'})===vectorCacheKey({encoderRevision:'e1',semanticDigest:HEX,poolingVersion:'p'}));
add(9,'Refuse source body from vector cache key',()=>vectorCacheKey({encoderRevision:'e',semanticDigest:'source_text',poolingVersion:'p'})===null);
// 10: family/split and source admission
add(10,'Preview verified eligible train family',()=>familySplitPreview([split()]).status==='SOURCE_ONLY_SPLIT_PROJECTION');
add(10,'Accept family-disjoint train and dev projections',()=>familySplitPreview([split(),split({sourceFamily:'rootB',split:'DEV',eligibleForTrain:false})]).families===2);
add(10,'Reject train/final same-source family',()=>familySplitPreview([split(),split({split:'FINAL'})]).status==='HOLD_NOT_AUTHORIZED');
add(10,'Reject unverified family lineage',()=>familySplitPreview([split({verifiedFamily:false})]).status==='HOLD_NOT_AUTHORIZED');
add(10,'Reject ineligible training example',()=>familySplitPreview([split({eligibleForTrain:false})]).status==='HOLD_NOT_AUTHORIZED');
add(10,'Reject unknown data split label',()=>familySplitPreview([split({split:'VAL'})]).status==='HOLD_NOT_AUTHORIZED');
add(10,'Reject missing family name',()=>familySplitPreview([split({sourceFamily:''})]).status==='HOLD_NOT_AUTHORIZED');
add(10,'Reject empty split preview',()=>familySplitPreview([]).status==='HOLD_NOT_AUTHORIZED');
add(10,'Permit repeated verified same-family training rows only as projection',()=>familySplitPreview([split(),split()]).status==='SOURCE_ONLY_SPLIT_PROJECTION');
add(10,'Reject split boolean eligibility masquerading as bool',()=>familySplitPreview([split({eligibleForTrain:1})]).status==='HOLD_NOT_AUTHORIZED');
add(10,'Refuse a non-Work source in evidence cache key',()=>evidenceBindingKey({sourceId:'A',sourceRevision:'1',recordDigest:HEX,rightsEpoch:'1',sourceFamily:'F',mode:'PLAY'})===null);
add(10,'Never convert source-family audit into training grant',()=>familySplitPreview([split()]).canTrain===false);
// 11: event-driven reference execution
add(11,'Discrete LIF nonspiking step finite',()=>lifStep(0,.6,{beta:.5}).voltage===.6);
add(11,'Discrete LIF threshold causes spike',()=>lifStep(.6,.75,{beta:.5}).spike===1);
add(11,'Reset-to-zero discards spike voltage',()=>lifStep(.6,.75,{beta:.5,reset:'zero'}).voltage===0);
add(11,'Subtract-threshold reset keeps residual',()=>Math.abs(lifStep(.6,.75,{beta:.5,reset:'subtract'}).voltage-.05)<1e-12);
add(11,'Beta zero removes prior state',()=>lifStep(10,.2,{beta:0}).integrated===.2);
add(11,'Beta one preserves prior state',()=>lifStep(.1,.2,{beta:1}).integrated===.30000000000000004);
add(11,'Reject invalid beta above one',()=>check(()=>lifStep(0,0,{beta:1.1})));
add(11,'Reject invalid nonpositive threshold',()=>check(()=>lifStep(0,0,{threshold:0})));
add(11,'Reject nonfinite direct input',()=>check(()=>lifStep(0,Infinity)));
add(11,'Reject finite operands with overflowed integrated voltage',()=>check(()=>lifStep(1e308,1e308,{beta:1})));
add(11,'Keep event trace deterministic across reruns',()=>JSON.stringify(runEventLif([.2,.5,.8,.2]))===JSON.stringify(runEventLif([.2,.5,.8,.2])));
add(11,'Never infer hardware watts from SynOps software counts',()=>runEventLif([.1,.2]).energyMeasured===false);
// 12: source rights, code/protocol boundaries
add(12,'Allow synthetic current-use and disclosure reference preview',()=>reviewNeuralReferences(ref()).status==='LOCAL_REFERENCES_PREPARED');
add(12,'Hold off-result source with inference-use denied',()=>reviewNeuralReferences(ref({sourceUse:[{sourceId:'srcA',allowed:true},{sourceId:'hidden',allowed:false}]})).status==='HOLD_NOT_AUTHORIZED');
add(12,'Allow undisclosed off-result source with valid inference use',()=>reviewNeuralReferences(ref({sourceUse:[{sourceId:'srcA',allowed:true},{sourceId:'hidden',allowed:true}],returnDisclosure:[{sourceId:'srcA',allowed:true},{sourceId:'hidden',allowed:false}]})).status==='LOCAL_REFERENCES_PREPARED');
add(12,'Hold emitted source disclosure denied',()=>reviewNeuralReferences(ref({returnDisclosure:[{sourceId:'srcA',allowed:false}]})).status==='HOLD_NOT_AUTHORIZED');
add(12,'Hold missing current inference-use inventory',()=>reviewNeuralReferences(ref({sourceUse:[]})).status==='HOLD_NOT_AUTHORIZED');
add(12,'Hold duplicated use decision for same source',()=>reviewNeuralReferences(ref({sourceUse:[{sourceId:'srcA',allowed:true},{sourceId:'srcA',allowed:true}]})).status==='HOLD_NOT_AUTHORIZED');
add(12,'Hold unverified influence inventory',()=>reviewNeuralReferences(ref({verifiedInfluenceInventory:false})).status==='HOLD_NOT_AUTHORIZED');
add(12,'Hold non-Work candidate even if locally allowed',()=>reviewNeuralReferences(ref({candidates:[{id:'A1',sourceId:'srcA',recordDigest:HEX,mode:'PALACE'}]})).status==='HOLD_NOT_AUTHORIZED');
add(12,'Hold malformed source record digest',()=>reviewNeuralReferences(ref({candidates:[{id:'A1',sourceId:'srcA',recordDigest:'x',mode:'WORK'}]})).status==='HOLD_NOT_AUTHORIZED');
add(12,'Abstain on empty eligible result',()=>reviewNeuralReferences(ref({candidates:[],sourceUse:[],returnDisclosure:[]})).status==='ABSTAIN_NO_ELIGIBLE_RETURN');
add(12,'Describe strict OpenAI-style review tool with no execution',()=>{const t=openAICompatibleTools();return t.length===1&&t[0].strict===true&&t[0].name==='atlas_neural_review_candidates'&&t[0].parameters.additionalProperties===false});
add(12,'Never grant host publish rights from local review',()=>reviewNeuralReferences(ref()).canPublish===false);
if(cases.length!==48||[9,10,11,12].some(n=>cases.filter(x=>x.lane===n).length!==12))throw Error('BAD_MATRIX');
const receipts=[];
for(const item of cases){
 const t=process.hrtime.bigint();let status='FAIL',detail='predicate false';
 try{const result=item.fn();if(result===true){status='PASS';detail='predicate satisfied'}else detail=`result ${String(result).slice(0,120)}`}
 catch(e){status='ERROR';detail=`${e.name}: ${e.message}`}
 receipts.push({id:item.id,lane:String(item.lane).padStart(2,'0'),task:item.name,status,sourceRef:item.source,evidenceKind:'SYNTHETIC_SOURCE_BOUND',detail,elapsedNs:Number(process.hrtime.bigint()-t),neuralQualityGainVerified:false,productionChange:false});
}
const payload={schema:'atlas.one.144-sprint-js/v1',sourceSha256:crypto.createHash('sha256').update(fs.readFileSync(new URL('./native_core.mjs',import.meta.url))).digest('hex'),probes:receipts};
fs.mkdirSync(new URL('../evidence/',import.meta.url),{recursive:true});
fs.writeFileSync(new URL('../evidence/JS_48_RECEIPTS.json',import.meta.url),JSON.stringify(payload,null,2)+'\n');
const tally={};for(const x of receipts)tally[x.status]=(tally[x.status]||0)+1;
console.log(JSON.stringify({total:receipts.length,tally,errors:receipts.filter(x=>x.status!=='PASS').map(x=>({id:x.id,task:x.task,detail:x.detail}))},null,2));
if(receipts.some(x=>x.status!=='PASS'))process.exitCode=1;
