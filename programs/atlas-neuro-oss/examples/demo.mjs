import fs from 'node:fs';
import {validateCatalogue,generateWorkOrders,runEventLif,stableExactTopK,reviewNeuralReferences} from '../src/index.mjs';
const root=new URL('../',import.meta.url);
const catalog=JSON.parse(fs.readFileSync(new URL('data/feature_candidates_144.json',root)));
const sources=JSON.parse(fs.readFileSync(new URL('data/source_registry.json',root)));
const status=validateCatalogue(catalog,sources),orders=generateWorkOrders(catalog,sources);
const LIF=runEventLif([0.6,0.6,0.1,0.9,0.5],{beta:0.75,threshold:1});
const ranked=stableExactTopK([{id:'A1',score:.97},{id:'A2',score:.95},{id:'B',score:.72}],3);
const rights=reviewNeuralReferences({verifiedInfluenceInventory:true,
 candidates:[{id:'A1',sourceId:'root-a',recordDigest:'a'.repeat(64),mode:'WORK',route:'DIRECT_NEURAL'}],
 sourceUse:[{sourceId:'root-a',allowed:true},{sourceId:'root-b',allowed:false}],
 returnDisclosure:[{sourceId:'root-a',allowed:true}]});
console.log(JSON.stringify({status,orders:orders.orderCount,firstOrders:orders.workOrders.slice(0,3),lif:LIF,ranked,offResultDenied: rights.status},null,2));
