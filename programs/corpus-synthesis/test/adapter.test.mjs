import test from 'node:test';
import assert from 'node:assert/strict';
import {CorpusEngine,FEATURE_REGISTRY,createCorpusSynthesisAdapter,CORPUS_SYNTHESIS_SCHEMA} from '../index.mjs';
import {createCorpusSynthesisAdapter as fromContext,CORPUS_FEATURES,ariadneNodeReference} from '../../context-integration/index.mjs';
const owner='PUBLIC_SYNTHETIC_OWNER';
const doc=(id,text,extra={})=>({id,sourceId:`synthetic:${id}`,title:id,text,sourceUri:`https://example.invalid/${id}`,collection:'invented',
  rights:{scope:'owner-private',allowed:true,ownerId:owner},evidenceStatus:'SOURCE_REPORTED',...extra});
const engine=documents=>new CorpusEngine({documents,principal:owner,now:'2026-11-24T00:00:00Z'});

test('public context port re-exports the same explicit corpus API without changing source references',()=>{
  assert.equal(fromContext,createCorpusSynthesisAdapter);assert.equal(CORPUS_FEATURES,FEATURE_REGISTRY);assert.equal(CORPUS_FEATURES.length,20);
  const reference=ariadneNodeReference('H01.S01.N01');assert.equal(reference.namespace,'ARIADNE_HSN');
  const e=engine([doc('current','H01.S01.N01 is an explicitly annotated invented source.',{coordinates:[reference]})]);
  const p=fromContext({engine:e,authorize:()=>true});const result=p.search(reference.coordinate,{reference});assert.equal(result.results[0].scoreComponents.qualifiedHsn,true);
  assert.equal(p.descriptor().schema,CORPUS_SYNTHESIS_SCHEMA);assert.equal(p.descriptor().hostAuthenticated,false);
});

test('source loading and authorization are explicit required construction inputs',()=>{
  assert.throws(()=>createCorpusSynthesisAdapter({engine:{},authorize:()=>true}),/ENGINE_INSTANCE/);
  assert.throws(()=>createCorpusSynthesisAdapter({engine:engine([])}),/AUTHORIZATION_CALLBACK/);
});

test('denial blocks source output from every port method',()=>{
  const e=engine([doc('a','Quartz invented record.'),doc('b','Coral invented record.')]);const p=createCorpusSynthesisAdapter({engine:e,authorize:()=>false});
  for(const invoke of [()=>p.status(),()=>p.search('Quartz'),()=>p.prepareContext('Quartz'),()=>p.verifyCitation({}),()=>p.synthesize({}),()=>p.compare('a','b')]){
    const result=invoke();assert.equal(result.status,'AUTHORIZATION_HOLD');assert.equal(result.contextText,null);assert.deepEqual(result.results,[]);
  }
});

test('authorization changes before return suppress computed evidence',()=>{
  const e=engine([doc('a','Quartz invented record.')]);let calls=0;const p=createCorpusSynthesisAdapter({engine:e,authorize:()=>++calls===1});
  const result=p.search('Quartz');assert.equal(result.status,'AUTHORIZATION_HOLD');assert.deepEqual(result.results,[]);assert.equal(calls,2);
});

test('throwing or asynchronous callbacks never count as authorization',()=>{
  const e=engine([doc('a','Quartz invented record.')]);
  for(const authorize of [()=>{throw Error('unavailable');},()=>Promise.resolve(true)])assert.equal(createCorpusSynthesisAdapter({engine:e,authorize}).search('Quartz').status,'AUTHORIZATION_HOLD');
});

test('valid context remains exact and source revocation invalidates prior citations through the port',()=>{
  const e=engine([doc('a','Quartz exact supplied text.')]),p=createCorpusSynthesisAdapter({engine:e,authorize:()=>true});
  const c=p.prepareContext('Quartz',{budgetChars:5000});assert.equal(c.status,'CONTEXT_READY');assert.equal(p.verifyCitation(c.citations[0]).valid,true);
  e.revoke({sourceIds:['synthetic:a']});assert.equal(p.verifyCitation(c.citations[0]).valid,false);assert.equal(p.search('Quartz').results.length,0);
});

test('closing the port leaves the caller engine alive but denies further port use',()=>{
  const e=engine([doc('a','Quartz exact supplied text.')]),p=createCorpusSynthesisAdapter({engine:e,authorize:()=>true});p.close();
  assert.equal(p.descriptor().status,'CLOSED');assert.throws(()=>p.search('Quartz'),/ADAPTER_CLOSED/);assert.equal(e.search('Quartz').results.length,1);
});
