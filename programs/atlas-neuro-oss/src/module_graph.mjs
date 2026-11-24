/** Twelve additive engineering modules; dependencies are review order, NOT semantic ontology edges. */
export const MODULE_EDGES=Object.freeze([
 ['01','02'],['01','03'],['01','04'],['01','05'],['01','06'],['01','07'],['01','08'],['01','09'],['01','10'],['01','11'],['01','12'],
 ['02','03'],['02','04'],['02','07'],['02','08'],['02','09'],
 ['03','08'],['04','07'],['05','08'],['06','07'],['07','08'],['08','09'],['09','11'],['10','11'],['10','12'],['11','12']
]);
export function deterministicBuildOrder(catalog){
 if(!catalog||!Array.isArray(catalog.engineeringModules)||catalog.engineeringModules.length!==12)return Object.freeze({status:'HOLD_MODULES',order:[]});
 const nodes=new Set(catalog.engineeringModules.map(m=>String(m.module).padStart(2,'0')));
 if(nodes.size!==12||[...nodes].some(n=>!/^(0[1-9]|1[0-2])$/.test(n)))return Object.freeze({status:'HOLD_MODULES',order:[]});
 const graph=new Map([...nodes].map(n=>[n,new Set()])),incoming=new Map([...nodes].map(n=>[n,0]));
 for(const [u,v] of MODULE_EDGES){if(!graph.has(u)||!graph.has(v)||graph.get(u).has(v))return Object.freeze({status:'HOLD_MODULE_GRAPH',order:[]});graph.get(u).add(v);incoming.set(v,incoming.get(v)+1);}
 const order=[],available=[...nodes].filter(n=>incoming.get(n)===0).sort();
 while(available.length){let n=available.shift();order.push(n);
  for(const v of [...graph.get(n)].sort()){incoming.set(v,incoming.get(v)-1);if(!incoming.get(v))available.push(v)}available.sort();}
 if(order.length!==12)return Object.freeze({status:'HOLD_MODULE_GRAPH',order:[]});
 return Object.freeze({status:'PREPARED_REVIEW_DAG_ONLY',order:Object.freeze(order.map(n=>`NEURO.M${n}`)),edges:MODULE_EDGES.length,canExecute:false,canPublish:false,canonEffect:'NONE'});
}
