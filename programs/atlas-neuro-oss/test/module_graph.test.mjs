import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {deterministicBuildOrder,MODULE_EDGES} from '../src/module_graph.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('../data/feature_candidates_144.json',import.meta.url)));
test('12 modules dependency DAG is stable and nonauthoritative',()=>{
 const r=deterministicBuildOrder(catalog);assert.equal(r.status,'PREPARED_REVIEW_DAG_ONLY');assert.equal(r.order.length,12);
 assert.equal(new Set(r.order).size,12);assert.equal(r.order[0],'NEURO.M01');assert.equal(r.order.at(-1),'NEURO.M12');assert.equal(r.canExecute,false);
});
test('each dependency respects topological review order',()=>{
 const r=deterministicBuildOrder(catalog),idx=new Map(r.order.map((x,i)=>[x.slice(-2),i]));
 for(const [a,b] of MODULE_EDGES){assert.ok(idx.get(a)<idx.get(b),`${a} -> ${b}`)}
});
test('missing module holds instead of substituting',()=>{
 const x=structuredClone(catalog);x.engineeringModules.splice(0,1);assert.equal(deterministicBuildOrder(x).status,'HOLD_MODULES');
});
