import test from 'node:test';
import assert from 'node:assert/strict';
import {KERNEL_HOUSES,lookupKernel} from '../index.mjs';
import {civilizationKernelAction as action,readCivilizationKernelJson,CIVILIZATION_KERNEL_LIMITS} from './kernel-actions.mjs';
import {queryWithReleasePolicy,releasePolicy} from '../runtime/dispatch-policy.mjs';

test('all twelve action mounts agree with their independent reference queries',()=>{
 for(const houseId of KERNEL_HOUSES){
  const kernel=lookupKernel(houseId),fixture=kernel.fixture(103,32);
  const result=action('civilization_kernel_evaluate',{scope:'WORK',houseId,...fixture});
  assert.deepEqual(result.results,fixture.requests.map(request=>kernel.reference(fixture.dataset,request)),houseId);
  assert.equal(result.indexPreparations,1);assert.equal(result.queryCount,fixture.requests.length);
  assert.equal(result.status,'LOCAL_COMPUTATION_SUPPORTING_CAPABILITY');
  assert.equal(result.specialized_contract_complete,false);assert.equal(result.authorityEffect,'NONE');
  assert.equal(result.storageWrites,0);assert.equal(result.performanceGainClaimed,false);
 }
});
test('catalog and result mutations do not affect later queries or definitions',()=>{
 const catalog=action('civilization_kernel_status',{scope:'WORK'});
 assert.equal(catalog.catalog.count,12);catalog.catalog.kernels[0].service='changed';
 assert.notEqual(action('civilization_kernel_status',{scope:'WORK'}).catalog.kernels[0].service,'changed');
 const fixture=lookupKernel('H01').fixture(2,16),args={scope:'WORK',houseId:'H01',...fixture};
 const first=action('civilization_kernel_evaluate',args),expected=structuredClone(first);
 first.results[0].value=999999;assert.deepEqual(action('civilization_kernel_evaluate',args),expected);
});
test('H02 uses the measured reference fallback and reports the release decision',()=>{
 let referenceCalls=0;const prepared={},request={};
 const result=queryWithReleasePolicy('H02',{query(){throw Error('REGRESSED_PATH_MUST_NOT_RUN');},referenceQuery(token,args){assert.equal(token,prepared);assert.equal(args,request);referenceCalls++;return {fallback:true};}},prepared,request);
 assert.deepEqual(result,{fallback:true});assert.equal(referenceCalls,1);
 const fixture=lookupKernel('H02').fixture(5,32);
 const output=action('civilization_kernel_evaluate',{scope:'WORK',houseId:'H02',...fixture});
 assert.deepEqual(output.dispatchPolicy,releasePolicy('H02'));
 assert.deepEqual(output.results,fixture.requests.map(r=>lookupKernel('H02').reference(fixture.dataset,r)));
 assert.deepEqual(action('civilization_kernel_status',{scope:'WORK'}).dispatchPolicies.H02,releasePolicy('H02'));
});
test('unknown actions, authority-shaped fields, mode confusion and unbounded batches fail closed',()=>{
 const fixture=lookupKernel('H01').fixture(2,16),args={scope:'WORK',houseId:'H01',...fixture};
 assert.throws(()=>action('civilization_kernel_evaluate',{...args,scope:'Palace'}),/WORK_REQUIRED/);
 assert.throws(()=>action('civilization_kernel_evaluate',{...args,houseId:'H99'}),/HOUSE_INVALID/);
 assert.throws(()=>action('civilization_kernel_evaluate',{...args,granted:true}),/ARGUMENT_INVALID/);
 assert.throws(()=>action('civilization_kernel_evaluate',{...args,requests:Array(33).fill(args.requests[0])}),/ARGUMENT_INVALID/);
 assert.throws(()=>action('civilization_kernel_evaluate',{...args,requests:[]}),/ARGUMENT_INVALID/);
 assert.throws(()=>action('civilization_kernel_promote',args),/ACTION_UNKNOWN/);
 assert.throws(()=>action('civilization_kernel_evaluate',{...args,dataset:{units:[]}}),/CONTRACT_REJECTED/);
});
test('accessors, nonfinite numbers, cycles, oversized input and excessive nesting are rejected',()=>{
 let invoked=0;const getter={scope:'WORK',get dataset(){invoked++;return {};}};
 assert.throws(()=>action('civilization_kernel_evaluate',getter),/INPUT_BOUND/);assert.equal(invoked,0);
 for(const value of [Infinity,NaN,undefined,()=>0])assert.throws(()=>action('civilization_kernel_status',{scope:'WORK',value}),/INPUT_BOUND/);
 const cycle={scope:'WORK'};cycle.self=cycle;assert.throws(()=>action('civilization_kernel_status',cycle),/INPUT_BOUND/);
 assert.throws(()=>action('civilization_kernel_status',{scope:'WORK',text:'x'.repeat(CIVILIZATION_KERNEL_LIMITS.inputBytes)}),/INPUT_BOUND/);
 let nested={};for(let i=0;i<40;i++)nested={nested};assert.throws(()=>action('civilization_kernel_status',{scope:'WORK',nested}),/INPUT_BOUND/);
});
test('streaming JSON body parsing applies a route-specific byte limit before execution',async()=>{
 const make=(body,headers={})=>new Request('https://synthetic.invalid/kernel',{method:'POST',body,headers});
 assert.deepEqual(await readCivilizationKernelJson(make('{"scope":"WORK"}')),{scope:'WORK'});
 await assert.rejects(readCivilizationKernelJson(make('{}',{'content-length':String(CIVILIZATION_KERNEL_LIMITS.inputBytes+1)})),/REQUEST_TOO_LARGE/);
 await assert.rejects(readCivilizationKernelJson(make('x'.repeat(CIVILIZATION_KERNEL_LIMITS.inputBytes+1))),/REQUEST_TOO_LARGE/);
 await assert.rejects(readCivilizationKernelJson(make('{broken}')),/JSON_INVALID/);
 await assert.rejects(readCivilizationKernelJson(make(new Uint8Array([255,254]))),/JSON_INVALID/);
});
