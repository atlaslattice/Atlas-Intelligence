import test from 'node:test';import assert from 'node:assert/strict';
import {inspectIdea,compareIdeas} from '../src/garden.mjs';
const idea=(id='C01',hsn='H05.S05.N03')=>({id,hsn,sourceSha256:'a'.repeat(64),sourceEdition:'owner-synthetic-v1',status:'PROPOSED',premiseA:'Source-linked geometry',premiseB:'Source-family scope',falsifier:'Compare flat and shuffled source-access controls'});
test('a source-pinned idea remains proposed, never semantic acceptance',()=>{const r=inspectIdea(idea());assert.equal(r.status,'PROPOSED');assert.equal(r.semanticAcceptance,false);assert.equal(r.authorityEffect,'NONE')});
test('METHOD idea must acquire a real domain subject independently',()=>{const r=inspectIdea(idea('C02','H03.S08.N01'));assert.equal(r.methodRequiresSubject,true)});
test('composed concepts are still draft, not proved synergy',()=>{const r=compareIdeas([idea(),idea('C02','H03.S08.N01')],[{from:'C01',to:'C02',type:'FALSIFIES'}]);assert.equal(r.status,'DRAFT_IDEA_REFLECTION_ONLY');assert.equal(r.edgeCount,1);assert.equal(r.semanticAcceptance,false)});
test('duplicate idea ids fail closed',()=>assert.equal(compareIdeas([idea(),idea()]).status,'HOLD_DUPLICATE_ID'));
test('an unknown relation type fails closed',()=>assert.equal(compareIdeas([idea(),idea('C02')],[{from:'C01',to:'C02',type:'SAME_AS'}]).status,'HOLD_EDGE'));
test('a missing source digest remains held',()=>{let x=idea();x.sourceSha256='not a hash';assert.equal(inspectIdea(x).status,'HOLD_UNTRUSTED_IDEA')});
test('malicious getter never executes from untrusted idea intake',()=>{let x=idea(),reads=0;Object.defineProperty(x,'premiseA',{enumerable:true,get(){reads++;throw Error('SECRET')}});assert.equal(inspectIdea(x).status,'HOLD_UNTRUSTED_IDEA');assert.equal(reads,0)});
test('private sourceBody field is rejected',()=>{let x=idea();x.sourceBody='private text';assert.equal(inspectIdea(x).status,'HOLD_UNTRUSTED_IDEA')});

test('hostile edge getter is never invoked',()=>{let reads=0;const edge={from:'C01',to:'C02',type:'COMPLEMENTS'};Object.defineProperty(edge,'type',{enumerable:true,get(){reads++;throw Error('SECRET')}});const r=compareIdeas([idea(),idea('C02')],[edge]);assert.equal(r.status,'HOLD_EDGE');assert.equal(reads,0)});
