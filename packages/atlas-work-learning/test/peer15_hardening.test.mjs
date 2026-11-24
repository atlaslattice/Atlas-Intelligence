import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {ARIADNE_SHA,SYNTHETIC_RELEASE_SHA,SYNTHETIC_ENCODER_REVISION,stageMicaEvidence} from '../src/pretrained-evidence-sidecar.mjs';
const h=x=>createHash('sha256').update(x).digest('hex');
const sid='synthetic:sourceA';
const source={sourceId:sid,documentId:'synthetic:docA',sourceSha256:h('srcA'),ontologyId:'H05.S06.N12',mode:'WORK',active:true,revoked:false,familyRoot:'synthetic:rootA',revision:'v1',sourceSpan:'1:20'};
const cand={sourceId:sid,documentId:source.documentId,sourceSha256:source.sourceSha256,ontology:{id:source.ontologyId,sourceRegistrySha256:ARIADNE_SHA},lane:'Work',score:.9,glyphAliases:[]};
const call=(c,a=source)=>stageMicaEvidence({candidateResults:[c],releaseSha256:SYNTHETIC_RELEASE_SHA,expectedReleaseSha256:SYNTHETIC_RELEASE_SHA,encoderRevision:SYNTHETIC_ENCODER_REVISION,expectedEncoderRevision:SYNTHETIC_ENCODER_REVISION,expectedHsn:source.ontologyId,getAuthoritativeSource:()=>a});
test('untrusted candidate getter must not forge changing sourceId',()=>{
 let n=0;const evil={...cand};Object.defineProperty(evil,'sourceId',{enumerable:true,get(){return ++n<6?sid:'synthetic:borrowed';}});
 const o=call(evil);assert.equal(o.refs.length,0);assert.equal(n,0,'must not invoke untrusted accessor');
});
test('trusted adapter must not rely on an accessor-based source record',()=>{
 let n=0;const a={...source};Object.defineProperty(a,'sourceId',{enumerable:true,get(){++n;return sid;}});
 const o=call(cand,a);assert.equal(o.refs.length,0);assert.equal(n,0);
});
test('ordinary data-only candidate and record still prepare immutable ref',()=>{
 const o=call(cand);assert.equal(o.status,'PREPARED_NEURAL_CANDIDATES_NOT_RETURNED');assert.equal(o.refs.length,1);assert.equal(o.refs[0].sourceId,sid);
 assert.equal(o.hostAttested,false);assert.equal(o.hostPermissionGranted,false);
});
