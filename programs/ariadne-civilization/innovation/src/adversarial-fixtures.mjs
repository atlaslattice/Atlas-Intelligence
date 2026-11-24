import {syntheticFixture} from './synthetic-fixtures.mjs';
/** Exactly one structurally invalid mutation for each candidate method. */
export function negativeFixture(id,coordinate){
 const a=syntheticFixture(id,coordinate);
 switch(id){
  case'I01':a.facets[0].kind='MASTER_AUTHORITY';break;
  case'I02':a.required='NO_REQUIRED_RECORD';break;
  case'I03':delete a.records[0].rootId;break;
  case'I04':a.records[0].observedDay=a.day+1;break;
  case'I05':a.claims[0].polarity='PROVED';break;
  case'I06':a.nodes[0].id='H00.S00.N00';break;
  case'I07':a.nodes[0].kind=a.nodes[0].kind==='EPISTEMIC_META'?'DOMAIN_SPECIALIZATION':'EPISTEMIC_META';break;
  case'I08':a.lenses[0]='H01.S01.N01';break;
  case'I09':delete a.fields.editionPin;break;
  case'I10':a.nodes[0].relevance=Number.NaN;break;
  case'I11':a.kind='ENDORSED';break;
  case'I12':a.shocks[0]=Infinity;break;
  case'I13':a.options[0].rightsOk='YES';break;
  case'I14':delete a.objections[0].sourceId;break;
  case'I15':a.minimum=0;break;
  case'I16':a.steps[0].requires=['challenge'];break;
  case'I17':a.budget=-1;break;
  case'I18':a.packet.registrySha256='0'.repeat(64);break;
  case'I19':a.representations[0].payload='UNSTRUCTURED';break;
  case'I20':a.perHouse=0;break;
  default:throw Error('NO_NEGATIVE_FIXTURE');
 }
 return a;
}
