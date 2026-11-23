import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {ALL_NODES,buildCatalog,surveyLattice,proposeStructuralSymbiosis,
  parseCoordinate,prepareNodeProjection,inertPositive,validateStructuralRule,sha} from '../src/node-symbiosis.mjs';
import {challengeProposedRoute,ATTACK_FAMILIES,sampleAttack} from '../src/node-adversary.mjs';
import {registeredCodeRoutes,knownRoutes,hasNodeRoute,getNodeRule,dispatchNode} from '../generated/generated-node-routes.mjs';
const here=dirname(fileURLToPath(import.meta.url));
const compiled=readFileSync(resolve(here,'../generated/generated-node-routes.mjs'));
const manifest=JSON.parse(readFileSync(resolve(here,'../generated/generated-node-route-manifest.json'),'utf8'));
const id=knownRoutes();
const holding=r=>{
  assert.equal(r.status,'HOLD');assert.equal(r.canExecute,false);assert.equal(r.canPublish,false);
  assert.equal(r.hostAttested,false);assert.equal(r.authorityEffect,'NONE');
};

test('entire 1728 catalog has seven domain SPHERES and five meta SPHERES per House',()=>{
 const r=surveyLattice();assert.equal(r.valid,true);assert.equal(ALL_NODES.length,1728);
 assert.equal(r.spheres,144);assert.equal(r.roles.DOMAIN_SPECIALIZATION,1008);
 assert.equal(r.roles.EPISTEMIC_META,720);assert.ok(r.houses.every(n=>n===144));
 assert.equal(new Set(ALL_NODES.map(x=>x.coordinate)).size,1728);
});
test('Ariadne original source-index split: H01.S01.N08 is DOMAIN, H01.S08.N01 is META',()=>{
 assert.equal(ALL_NODES.find(x=>x.coordinate==='H01.S01.N08').role,'DOMAIN_SPECIALIZATION');
 assert.equal(ALL_NODES.find(x=>x.coordinate==='H01.S08.N01').role,'EPISTEMIC_META');
 assert.equal(ALL_NODES.find(x=>x.coordinate==='H12.S07.N12').role,'DOMAIN_SPECIALIZATION');
 assert.equal(ALL_NODES.find(x=>x.coordinate==='H12.S08.N12').role,'EPISTEMIC_META');
});
test('each original source Sphere is homogeneous; no invented N01-N07 vs N08-N12 split',()=>{
 for(let h=1;h<=12;h++)for(let s=1;s<=12;s++){
  const records=ALL_NODES.filter(x=>x.house===h&&x.sphere===s);
  assert.equal(records.length,12);
  const expected=s<=7?'DOMAIN_SPECIALIZATION':'EPISTEMIC_META';
  assert.ok(records.every(x=>x.role===expected));
 }
});
test('structural symbiosis pairs across Sphere role axis but preserves in-Sphere identity',()=>{
 for(const c of ['H01.S01.N08','H01.S08.N01','H12.S12.N12']){
  const rule=proposeStructuralSymbiosis(c,'0'.repeat(64),'1'.repeat(64));
  const source=parseCoordinate(c),intra=parseCoordinate(rule.intraSphere),contrast=parseCoordinate(rule.crossSphere);
  assert.equal(intra.sphere,source.sphere);assert.equal(intra.node,source.node%12+1);
  assert.equal(contrast.house,source.house);assert.equal(contrast.node,source.node);
  assert.notEqual(contrast.sphere<=7,source.sphere<=7);
  assert.notEqual(rule.counterpartRole,rule.nodeRole);
  assert.equal(rule.semanticMappingApproved,false);
 }
});
test('7-to-5 sphere contrasts are not reversible semantic equivalences',()=>{
 const a=proposeStructuralSymbiosis('H01.S06.N01','0'.repeat(64),'1'.repeat(64));
 assert.equal(a.crossSphere,'H01.S08.N01');
 const b=proposeStructuralSymbiosis(a.crossSphere,'0'.repeat(64),'1'.repeat(64));
 assert.equal(b.crossSphere,'H01.S01.N01');
 assert.notEqual(b.crossSphere,a.coordinate);
 assert.equal(a.relation,'TOPOLOGICAL_COMPLEMENT_CANDIDATE');
 assert.equal(a.semanticMappingApproved,false);
});
test('actual built executable routes total 1100 with 628 explicitly unregistered',()=>{
 assert.equal(registeredCodeRoutes,1100);assert.equal(id.length,1100);
 assert.equal(new Set(id).size,1100);assert.equal(1728-registeredCodeRoutes,628);
 assert.equal(manifest.registeredExecutableRoutes,1100);
 assert.equal(manifest.unregisteredCoordinates,628);
});
test('generated executable source matches recorded SHA256 and is not an authority gate',()=>{
 assert.equal(sha(compiled),manifest.sourceCodeHashSha256);
 assert.equal(manifest.hostVerified,false);assert.equal(manifest.canPublish,false);
 assert.equal(manifest.semanticEdgesApproved,0);assert.equal(manifest.authenticatedModelAgents,0);
 assert.equal(manifest.workRightsGranted,false);assert.equal(manifest.privateModesImported,false);
});
test('all 1100 code registrations are actually callable but inert',()=>{
 for(const address of id){
  assert.equal(hasNodeRoute(address),true);
  const rule=getNodeRule(address);
  assert.equal(validateStructuralRule(rule),true,address);
  const r=dispatchNode(address,inertPositive(rule));
  assert.equal(r.status,'PREPARED_LOCAL_ONLY');assert.equal(r.canExecute,false);
  assert.equal(r.canPublish,false);assert.equal(r.hostAttested,false);
  assert.equal(r.semanticMappingApproved,false);
  assert.equal(r.contrasts.length,3);
 }
});
test('untouched nodes are not silently fabricated as active routes',()=>{
 const missed=ALL_NODES.filter(x=>!hasNodeRoute(x.coordinate));
 assert.equal(missed.length,628);
 for(const x of missed){holding(dispatchNode(x.coordinate,{}));}
});
test('adversarial testing runs against independent samples from both role types',()=>{
 const domain=id.find(a=>getNodeRule(a).nodeRole==='DOMAIN_SPECIALIZATION');
 const method=id.find(a=>getNodeRule(a).nodeRole==='EPISTEMIC_META');
 assert.ok(domain&&method);
 for(const address of [domain,method,id.at(-1)]){
  const proof=challengeProposedRoute(getNodeRule(address));
  assert.equal(proof.accepted,true,address);
  assert.equal(proof.attacks,ATTACK_FAMILIES.length+2);
 }
});
test('unqualified equivalence of HSN addresses remains false even with matching strings',()=>{
 const r=getNodeRule(id[2]);
 assert.equal(challengeProposedRoute({...r,relation:'SAME_AS'}).accepted,false);
 assert.equal(challengeProposedRoute({...r,sourceDigest:'e'.repeat(64)}).accepted,false);
 assert.equal(challengeProposedRoute({...r,previousAcceptedHead:'e'.repeat(64)}).accepted,false);
});
test('all adversarial families return the same opaque denial with no body leak',()=>{
 for(const a of [id[0],id[100],id[550],id[1099]]){
  const rule=getNodeRule(a);let denial;
  for(const attack of ATTACK_FAMILIES){
   const candidate=sampleAttack(rule,attack);
   const r=dispatchNode(a,candidate);
   holding(r);
   if(denial===undefined)denial=JSON.stringify(r);
   assert.equal(JSON.stringify(r),denial);
   assert.doesNotMatch(JSON.stringify(r),/DO_NOT_COPY_PRIVATE_BODY|forged-authority|other-tenant/);
  }
 }
});
test('getters and prototype poisoning fail closed rather than reading private inputs',()=>{
 const a=id[0],rule=getNodeRule(a);
 const poison=inertPositive(rule);
 Object.defineProperty(poison,'tenant',{enumerable:true,get(){throw Error('SECRET')} });
 holding(dispatchNode(a,poison));
 const inherited=Object.create({tenant:'synthetic-atlas'});
 Object.assign(inherited,inertPositive(rule));
 holding(dispatchNode(a,inherited));
 const proxy=new Proxy(inertPositive(rule),{getPrototypeOf(){throw Error('SECRET')} });
 holding(dispatchNode(a,proxy));
});
test('private modes, forged host claims, duplicate/replay all hold for sampled nodes',()=>{
 for(const a of [id[0],id.at(-1)]){
  const r=getNodeRule(a);
  for(const mode of ['PLAY','SOCIAL','QUIET','DREAM','IMAGINE','PALACE','BRAIN','HABITAT']){
   holding(dispatchNode(a,{...inertPositive(r),mode}));
  }
  for(const key of ['canon','deployment','hostAttested']){
   holding(dispatchNode(a,{...inertPositive(r),[key]:true}));
  }
 }
});
test('intra-sphere structural complement is cross-role and cross-house pointer never authority',()=>{
 for(const a of id){
  const r=getNodeRule(a),n=parseCoordinate(a),cross=parseCoordinate(r.crossHouse),intra=parseCoordinate(r.intraSphere),contrast=parseCoordinate(r.crossSphere);
  assert.equal(intra.house,n.house);assert.equal(intra.sphere,n.sphere);
  assert.equal(intra.node,n.node%12+1);
  assert.equal(contrast.house,n.house);assert.equal(contrast.node,n.node);
  assert.notEqual(contrast.sphere<=7,n.sphere<=7);
  assert.equal(cross.house,n.house%12+1);assert.equal(cross.sphere,n.sphere);assert.equal(cross.node,n.node);
  assert.equal(r.semanticMappingApproved,false);
  assert.equal(r.authorityEffect,'NONE');
 }
});
test('deterministic 100→1000 source heads remain pinned to accepted local route code',()=>{
 assert.equal(manifest.iterations,1100);
 assert.match(manifest.first100CodeHead,/^[a-f0-9]{64}$/);
 assert.match(manifest.finalCodeHead,/^[a-f0-9]{64}$/);
 assert.notEqual(manifest.first100CodeHead,manifest.finalCodeHead);
 assert.equal(manifest.parentStage100Head,'d02e7faa0b7e42ee8ac4e0c3cb5c412232b9d8af71ed44236f756b20e308646c');
 assert.equal(manifest.parentStage1100Head,'244a8dfb2b37ff38c097ee5414752f5feb2ce2e5e8bdeb3917bca5031e4f490a');
});
test('malformed synthetic typed requests do not throw or leak 2000 seeded input controls',()=>{
 let seed=20261123;
 const next=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
 const bad=[null,undefined,true,12,NaN,Infinity,[],['WORK'],'PALACE',{__proto__:null},new Date(),
   {'sourceDigest':'f'.repeat(64)},'DO_NOT_COPY_PRIVATE_BODY'];
 const r=getNodeRule(id[0]);
 for(let i=0;i<2000;i++){
  const v=bad[next()%bad.length];
  const q=next()%5===0?{...inertPositive(r),rawBody:v}:v;
  const x=dispatchNode(r.coordinate,q);
  assert.equal(x.canExecute,false);assert.equal(x.canPublish,false);
  assert.equal(x.hostAttested,false);
  assert.doesNotMatch(JSON.stringify(x),/DO_NOT_COPY_PRIVATE_BODY/);
 }
});
