import test from 'node:test';
import assert from 'node:assert/strict';
import * as H01 from '../kernels/H01.mjs';
import * as H02 from '../kernels/H02.mjs';
import * as H03 from '../kernels/H03.mjs';
import * as H04 from '../kernels/H04.mjs';
import * as H05 from '../kernels/H05.mjs';
import * as H06 from '../kernels/H06.mjs';

const kernels=[H01,H02,H03,H04,H05,H06];
const PIN_A='a'.repeat(64),PIN_B='b'.repeat(64);

for(const kernel of kernels){
  test(`${kernel.descriptor.houseId}: independent scan/reference parity on seeded workloads`,()=>{
    for(const seed of [1,17,987]){
      const {dataset,requests}=kernel.fixture(seed,64);const prepared=kernel.prepare(dataset);
      for(const request of requests){const expected=kernel.reference(dataset,request);assert.deepEqual(kernel.referenceQuery(prepared,request),expected);assert.deepEqual(kernel.query(prepared,request),expected);}
    }
  });
  test(`${kernel.descriptor.houseId}: prepared state cannot be forged or changed through caller data`,()=>{
    const {dataset,requests}=kernel.fixture(23,32);const prepared=kernel.prepare(dataset),request=requests[0];
    const expected=kernel.query(prepared,request);assert.throws(()=>kernel.query({...prepared},request),/forged/);
    for(const key of Object.keys(dataset))dataset[key]=null;
    assert.deepEqual(kernel.query(prepared,request),expected);
    expected.invalid='caller mutation';assert.deepEqual(kernel.query(prepared,request),kernel.referenceQuery(prepared,request));
  });
  test(`${kernel.descriptor.houseId}: invalid, nonfinite and accessor inputs are rejected`,()=>{
    const {dataset,requests}=kernel.fixture(3,32);const prepared=kernel.prepare(dataset);
    assert.throws(()=>kernel.query(prepared,{...requests[0],unexpected:true}),/unknown field/);
    let accessed=false;const bad={};Object.defineProperty(bad,'trap',{enumerable:true,get(){accessed=true;return 1;}});
    assert.throws(()=>kernel.query(prepared,bad),/accessors/);assert.equal(accessed,false);
    assert.throws(()=>kernel.prepare({anything:Infinity}),/nonfinite/);
    assert.throws(()=>kernel.fixture(1,1000000),/fixture size/);
  });
}

const units={units:[{unit:'m',dimension:'length',scale:1,offset:0},{unit:'cm',dimension:'length',scale:0.01,offset:0},{unit:'s',dimension:'time',scale:1,offset:0},{unit:'K',dimension:'temperature',scale:1,offset:0},{unit:'C',dimension:'temperature',scale:1,offset:273.15}],frames:['lab'],states:['material','nuclear']};
test('H01: known dimensional conversion preserves frame and state',()=>{
  const p=H01.prepare(units);assert.deepEqual(H01.query(p,{quantity:{value:125,unit:'cm',frame:'lab',state:'material'},toUnit:'m'}),{kind:'quantity_conversion',value:1.25,unit:'m',dimension:'length',frame:'lab',state:'material',sourceUnit:'cm'});
  assert.equal(H01.query(p,{quantity:{value:0,unit:'C',frame:'lab',state:'material'},toUnit:'K'}).value,273.15);
});
test('H01: incompatible dimensions and undeclared frame/state changes fail',()=>{
  const p=H01.prepare(units),r={quantity:{value:1,unit:'m',frame:'lab',state:'material'},toUnit:'cm'};
  assert.throws(()=>H01.query(p,{...r,toUnit:'s'}),/dimensions/);assert.throws(()=>H01.query(p,{...r,targetFrame:'other'}),/frame transformation/);assert.throws(()=>H01.query(p,{...r,targetState:'nuclear'}),/state transformation/);assert.throws(()=>H01.query(p,{...r,quantity:{...r.quantity,value:true}}),/finite number/);
});

test('H02: duplicates, missing values, type errors and source contamination remain visible',()=>{
  const d={records:[{id:'a',source:'ok',fields:{title:'A',value:1},contaminated:false},{id:'a',source:'ok',fields:{title:'A duplicate',value:2},contaminated:false},{id:'b',source:'ok',fields:{title:'B'},contaminated:false},{id:'c',source:'bad',fields:{title:'C',value:'wrong'},contaminated:true},{id:'d',source:'ok',fields:{title:'D',value:0},contaminated:false}],rules:{required:['title','value'],fieldTypes:{title:'string',value:'number'},blockedSources:['bad']}};
  const p=H02.prepare(d),r=H02.query(p,{});assert.equal(r.rows.length,5);assert.deepEqual(r.totals,{considered:5,admitted:1,rejected:4});assert(r.rows[0].reasons.includes('DUPLICATE_ID'));assert(r.rows[1].reasons.includes('DUPLICATE_ID'));assert.deepEqual(r.rows[2].missingFields,['value']);assert.deepEqual(r.rows[3].reasons,['INVALID_FIELD_TYPES','BLOCKED_SOURCE','CONTAMINATION_INDICATOR']);assert.equal(r.rows[4].admitted,true);
  const selected=H02.query(p,{ids:['a','absent']});assert.equal(selected.rows.length,2);assert.deepEqual(selected.selection.unknownIds,['absent']);assert.equal(selected.selection.unselectedRecordCount,3);
});
test('H02: result mutation cannot erase cached admission failures',()=>{
  const {dataset,requests}=H02.fixture(4,32),p=H02.prepare(dataset);const out=H02.query(p,{});out.rows[0].reasons.length=0;out.rows[0].missingFields.length=0;assert.deepEqual(H02.query(p,{}),H02.reference(dataset,{}));assert.throws(()=>H02.query(p,{ids:['r1','r1']}),/duplicates/);
});

const graph={nodes:['a','b','c','d'],edges:[{id:'ab',from:'a',to:'b',cost:1,capacity:5,failureDomain:'north',provenance:['pa']},{id:'bd',from:'b',to:'d',cost:1,capacity:5,failureDomain:'north',provenance:['pb']},{id:'ac',from:'a',to:'c',cost:2,capacity:10,failureDomain:'south',provenance:['pc']},{id:'cd',from:'c',to:'d',cost:2,capacity:10,failureDomain:'south',provenance:['pd']}]};
const route={source:'a',target:'d',demand:1,disabledDomains:[],blockedEdgeIds:[],includeFallback:true};
test('H03: route includes full path provenance and edge-disjoint fallback',()=>{
  const r=H03.query(H03.prepare(graph),route);assert.equal(r.primary.cost,2);assert.deepEqual(r.primary.nodePath,['a','b','d']);assert.deepEqual(r.primary.provenance,['pa','pb']);assert.equal(r.fallback.cost,4);assert.deepEqual(r.fallback.edgeIds,['ac','cd']);
});
test('H03: capacity, failed domains, blocked edges and disconnection are enforced',()=>{
  const p=H03.prepare(graph);assert.equal(H03.query(p,{...route,demand:6}).primary.cost,4);assert.equal(H03.query(p,{...route,disabledDomains:['north']}).primary.cost,4);assert.equal(H03.query(p,{...route,blockedEdgeIds:['ab']}).primary.cost,4);assert.equal(H03.query(p,{...route,demand:11}).primary.reachable,false);assert.deepEqual(H03.query(p,{...route,target:'a'}).primary.nodePath,['a']);
  const negative=structuredClone(graph);negative.edges[0].cost=-1;assert.throws(()=>H03.prepare(negative),/cost/);
});
test('H03: zero cycles and equal-cost alternatives have deterministic finite routes',()=>{
  const d={nodes:['a','b','c','d'],edges:[{id:'z',from:'a',to:'b',cost:1,capacity:1,failureDomain:'f',provenance:[]},{id:'b',from:'b',to:'d',cost:1,capacity:1,failureDomain:'f',provenance:[]},{id:'a',from:'a',to:'c',cost:1,capacity:1,failureDomain:'f',provenance:[]},{id:'c',from:'c',to:'d',cost:1,capacity:1,failureDomain:'f',provenance:[]},{id:'loop',from:'c',to:'c',cost:0,capacity:1,failureDomain:'f',provenance:[]}]};
  const r={...route,includeFallback:false};assert.deepEqual(H03.query(H03.prepare(d),r).primary.edgeIds,['a','c']);assert.deepEqual(H03.query(H03.prepare(d),r),H03.reference(d,r));
});

test('H04: supplied runtime dependencies expand closure and remain mismatches',()=>{
  const d={components:['a','b','c'].map(id=>({id,inputs:['data'],outputs:['data']})),dependencies:[{id:'ab',from:'a',to:'b',contract:'data'}],traces:[{id:'ac',from:'a',to:'c',contract:'data'}]};
  const p=H04.prepare(d),r=H04.query(p,{root:'a',direction:'dependencies'});assert.deepEqual(r.componentIds,['a','b','c']);assert.deepEqual(r.traceIds,['ac']);assert.deepEqual(r.mismatches.map(x=>x.reason),['UNDECLARED_RUNTIME_DEPENDENCY']);
  assert.deepEqual(H04.query(p,{root:'b',direction:'dependents'}).componentIds,['a','b']);
});
test('H04: missing components and contract mismatches are reported without hiding evidence',()=>{
  const d={components:[{id:'a',inputs:['data'],outputs:[]},{id:'b',inputs:[],outputs:[]}],dependencies:[{id:'ab',from:'a',to:'b',contract:'data'},{id:'bx',from:'b',to:'missing',contract:'data'}],traces:[]};
  const r=H04.query(H04.prepare(d),{root:'a',direction:'dependencies'});assert.deepEqual(r.missingComponentIds,['missing']);assert(r.mismatches.some(x=>x.reason==='MISSING_PROVIDER_OUTPUT'));assert(r.mismatches.some(x=>x.reason==='MISSING_COMPONENT'));assert(r.declaredDependencyIds.includes('bx'));
});

const record=(id,overrides={})=>({id,coordinate:'fixture:n1',edition:'edition1',sourceId:'s1',sourceSha256:PIN_A,tenant:'tenant1',positiveText:'alpha beta alpha',excludedTerms:[],evidenceIds:[`e${id}`],...overrides});
const searchRequest={text:'alpha',tenant:'tenant1',allowedIds:['a','b','c','d'],sourcePins:[{sourceId:'s1',sha256:PIN_A}],limit:10};
test('H05: exact positive-token ranking preserves evidence and deterministic ties',()=>{
  const d={records:[record('a'),record('b',{positiveText:'alpha beta'}),record('c',{positiveText:'alpha beta alpha'})]},r=H05.query(H05.prepare(d),searchRequest);assert.deepEqual(r.results.map(x=>[x.id,x.score]),[['a',2],['c',2],['b',1]]);assert.deepEqual(r.results[0].evidenceIds,['ea']);assert.equal(r.hostAuthorizationVerified,false);
});
test('H05: excluded text, tenant, current allowlist and source pins cannot broaden matches',()=>{
  const d={records:[record('a'),record('b',{excludedTerms:['alpha']}),record('c',{tenant:'tenant2'}),record('d',{sourceSha256:PIN_B})]},p=H05.prepare(d);assert.deepEqual(H05.query(p,searchRequest).results.map(x=>x.id),['a']);assert.deepEqual(H05.query(p,{...searchRequest,allowedIds:[]}).results,[]);assert.deepEqual(H05.query(p,{...searchRequest,sourcePins:[{sourceId:'s1',sha256:PIN_B}]}).results.map(x=>x.id),['d']);
  assert.throws(()=>H05.query(p,{text:'alpha',tenant:'tenant1',sourcePins:[],limit:10}),/required field/);
});
test('H05: coordinate and normalized token lookup retain exact source edition',()=>{
  const d={records:[record('a',{positiveText:'ＣＡＦＥ alpha'}),record('b',{coordinate:'fixture:n2'})]},p=H05.prepare(d);assert.deepEqual(H05.query(p,{...searchRequest,text:'cafe'}).results.map(x=>x.id),['a']);const r=H05.query(p,{...searchRequest,text:'',coordinate:'fixture:n2'});assert.equal(r.results[0].edition,'edition1');assert.deepEqual(r.results.map(x=>x.id),['b']);assert.throws(()=>H05.query(p,{...searchRequest,text:''}),/positive terms/);
});

const grant={id:'g1',actor:'actor1',tenant:'tenant1',actions:['read'],resources:['r1'],sourceSha256:PIN_A,artifactSha256:PIN_B,notBefore:100,expiresAt:200};
const grantRequest={actor:'actor1',tenant:'tenant1',action:'read',resource:'r1',sourceSha256:PIN_A,artifactSha256:PIN_B,now:150,revokedGrantIds:[],currentPolicyVersion:'v1'};
test('H06: exact scoped candidate never authenticates or authorizes execution',()=>{
  const p=H06.prepare({version:'v1',grants:[grant]}),r=H06.query(p,grantRequest);assert.equal(r.decision,'ALLOW_CANDIDATE');assert.deepEqual(r.matchedGrantIds,['g1']);assert.equal(r.hostAuthenticated,false);assert.equal(r.executionAuthorized,false);assert.equal(H06.query(p,{...grantRequest,tenant:'other'}).decision,'REFUSE');assert.equal(H06.query(p,{...grantRequest,resource:'other'}).decision,'REFUSE');
});
test('H06: revocation, expiry, policy change and artifact/source changes are current checks',()=>{
  const p=H06.prepare({version:'v1',grants:[grant]});
  for(const [change,reason]of [[{revokedGrantIds:['g1']},'GRANT_REVOKED'],[{now:200},'GRANT_EXPIRED'],[{now:99},'GRANT_NOT_YET_VALID'],[{currentPolicyVersion:'v2'},'POLICY_VERSION_CHANGED'],[{sourceSha256:PIN_B},'SOURCE_PIN_MISMATCH'],[{artifactSha256:PIN_A},'ARTIFACT_PIN_MISMATCH']]){const r=H06.query(p,{...grantRequest,...change});assert.equal(r.decision,'REFUSE');assert(r.reasons.includes(reason));}
  assert.equal(H06.query(p,grantRequest).decision,'ALLOW_CANDIDATE');
});
test('H06: duplicate grants, invalid pins and caller-authority flags are rejected',()=>{
  assert.throws(()=>H06.prepare({version:'v1',grants:[grant,grant]}),/Duplicate grant/);assert.throws(()=>H06.query(H06.prepare({version:'v1',grants:[grant]}),{...grantRequest,sourceSha256:'wrong'}),/SHA-256/);assert.throws(()=>H06.query(H06.prepare({version:'v1',grants:[grant]}),{...grantRequest,executionAuthorized:true}),/unknown field/);
});
