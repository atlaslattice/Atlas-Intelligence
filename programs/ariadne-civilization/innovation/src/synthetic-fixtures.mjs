/** Deterministic toy cases, one per original HSN address × proposed operator. */
import {ORIGINAL_SHA256} from './innovations.mjs';
const N=/^H(\d{2})\.S(\d{2})\.N(\d{2})$/;
export function syntheticFixture(id,coordinate){
 const hit=N.exec(coordinate);if(!hit)throw new Error('BAD_SYNTHETIC_COORDINATE');
 const h=+hit[1],s=+hit[2],n=+hit[3],house=`H${hit[1]}`,next=`H${String(h%12+1).padStart(2,'0')}`;
 const other=`${next}.S01.N01`,lens=`${house}.S11.N05`===coordinate?`${house}.S12.N05`:`${house}.S11.N05`;
 const data={
 I01:{facets:[{id:coordinate,kind:'OBSERVATION'},{id:'uncertainty',kind:'FORECAST'},{id:'community-voice',kind:'VALUE'}]},
 I02:{required:['definition','independent-study','limitations','affected-groups'],observed:['definition'],refuted:[]},
 I03:{records:[{id:'study-A',sourceId:'doi:abc',rootId:'publisher-A'},{id:'preprint-A',sourceId:'arxiv:def',rootId:'publisher-A'},{id:'study-B',sourceId:'doi:ghi',rootId:'publisher-B'}]},
 I04:{day:100,records:[{id:'source-A',observedDay:s,reviewEveryDays:30},{id:'source-B',observedDay:90,reviewEveryDays:20}]},
 I05:{claims:[{id:'reading-A',subject:coordinate,sourceId:'source-A',polarity:'SUPPORTS'},{id:'reading-B',subject:coordinate,sourceId:'source-B',polarity:'CHALLENGES'}]},
 I06:{nodes:[{id:coordinate,house,terms:['systems','care',`lane${s}`]},{id:other,house:next,terms:['systems','future']}]},
 I07:{start:coordinate,nodes:[{id:coordinate,house,kind:s<=7?'DOMAIN_SPECIALIZATION':'EPISTEMIC_META'},{id:other,house:next,kind:'DOMAIN_SPECIALIZATION'},{id:lens,house,kind:'EPISTEMIC_META'}],links:[[coordinate,other],[other,lens]],maxHops:3},
 I08:{subject:coordinate,lenses:[lens,`${next}.S11.N05`],cycle:(h+s+n)%7},
 I09:{fields:{editionPin:true,recordDigest:true,rightsEvidence:true,semanticWitness:false,independentChallenge:false}},
 I10:{nodes:[{id:coordinate,mapped:false,relevance:(n%10)/10,neighborCoverage:s%12},{id:other,mapped:true,relevance:1,neighborCoverage:12}]},
 I11:{claimId:coordinate,kind:['CAUSAL','PREDICTION','CORRELATION','EQUIVALENCE'][n%4]},
 I12:{base:n/12,threshold:0.7,shocks:[-0.3,-0.1,0.1,0.3,0.5]},
 I13:{options:[{id:'A',benefit:0.8,cost:0.8,rightsOk:true},{id:'B',benefit:0.6,cost:0.4,rightsOk:true},{id:'C',benefit:1,cost:0.1,rightsOk:false}]},
 I14:{objections:[{id:coordinate,group:house,sourceId:'src1'},{id:coordinate,group:house,sourceId:'src1'},{id:other,group:next,sourceId:'src2'}]},
 I15:{signals:[{id:'expert-A',view:'SUPPORTS'},{id:'expert-B',view:'SUPPORTS'},{id:'expert-C',view:'CHALLENGES'}],minimum:2},
 I16:{steps:[{id:'observe',rollback:'drop-local-view',requires:[]},{id:'challenge',rollback:'revert-proposal',requires:['observe']}]},
 I17:{requiredClaims:['source','method','rights'],budget:6,sources:[{id:'A',cost:3,covers:['source','method']},{id:'B',cost:3,covers:['rights']}]},
 I18:{packet:{coordinate,registrySha256:ORIGINAL_SHA256,originMode:'WORK'}},
 I19:{representations:[{name:'Atlas',payload:{coordinate,source:'source-v1'}},{name:'Swarm',payload:{source:'source-v1',coordinate}}]},
 I20:{cases:[{id:coordinate,house,unknownReductionProxy:0.5,voluntary:true},{id:other,house:next,unknownReductionProxy:0.7,voluntary:true}],budget:2,perHouse:1},
 };
 if(!Object.hasOwn(data,id))throw new Error('UNKNOWN_SYNTHETIC_OPERATOR');
 return data[id];
}
