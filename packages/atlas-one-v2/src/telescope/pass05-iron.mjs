/** 05 — pinned PUBLIC Iron Empire editorial-review interface only.
 * Do not load protected Play/Imagine/Palace bodies or claim an adopted story CANON.
 * Complement existing source-only Atlas PR #26; no competing story writer.
 */
export const PR26_SOURCE_BLOB='970b212ef04af48afd3b237ec5b95d080bdefd33';
export const PUBLIC_SOURCE_IDS=Object.freeze([
 'IRON-TREATMENT-20261030-v04','IRON-MARS-DELTA-20261106-v01',
 'IRON-QVERSE-20261030-v02','IRON-CONTINUUM-METHOD-20261030-v01',
 'IRON-ORCS-20261030-v02']);
export const HOUSE_THEMES=Object.freeze([
 'resource-conservation','water-food','ecology-restoration','care-biosafety',
 'knowledge-provenance','nonlethal-security','finance-governance','culture-voice',
 'epistemology-personhood-fiction','community-consent','independent-rights','space-mission'
]);
const deny=()=>({status:'HOLD',storyCanonChanged:false,scienceVerified:false,authorityEffect:'NONE'});
/** Work editorial review only, not a story generation or role-play interface. */
export function reviewIronEditorial(event){
 try{
  const keys=['chapter','event','mode','sourceId'];
  if(!event||Object.getPrototypeOf(event)!==Object.prototype)return deny();
  const props=Object.getOwnPropertyDescriptors(event);
  if(Object.keys(props).length!==keys.length||Object.keys(props).some(k=>!keys.includes(k)||!('value' in props[k])))return deny();
  const v=Object.fromEntries(keys.map(k=>[k,props[k].value]));
  const {chapter,sourceId,mode}=v;
  if(mode!=='WORK'||!PUBLIC_SOURCE_IDS.includes(sourceId)||!['Film I','Film II','Film III','Film IV','Film V','Film VI','Prologue'].includes(chapter))return deny();
  if(v.event==='MARS_ANCIENT_PREQUEL'&&chapter!=='Film II')return deny();
  if(v.event==='MARS_MAIN_RESTORATION'&&chapter!=='Film III')return deny();
  if(!['MARS_ANCIENT_PREQUEL','MARS_MAIN_RESTORATION','CULTURAL_SOURCE_REVIEW','FICTIONAL_SCIENCE_FALSIFIER'].includes(v.event))return deny();
  return{status:'EDITORIAL_REVIEW_CANDIDATE',sourceId,chapter,
    authorApproval:false,storyCanonChanged:false,scienceVerified:false,authorityEffect:'NONE'};
 }catch{return deny();}
}
export async function pass05(c){
 if(c.source.length!==1728||HOUSE_THEMES.length!==12||PUBLIC_SOURCE_IDS.length!==5)return{status:'HOLD'};
 const positive=reviewIronEditorial({chapter:'Film III',event:'MARS_MAIN_RESTORATION',sourceId:'IRON-MARS-DELTA-20261106-v01',mode:'WORK'});
 const negative=reviewIronEditorial({chapter:'Film II',event:'MARS_MAIN_RESTORATION',sourceId:'IRON-MARS-DELTA-20261106-v01',mode:'WORK'});
 if(positive.status!=='EDITORIAL_REVIEW_CANDIDATE'||negative.status!=='HOLD')return{status:'HOLD'};
 c.state.ironStatus='PUBLIC_EDITORIAL_REVIEW_ONLY';
 return{status:'PASS_LOCAL',fictionLensCount:12,sourcePointers:5,
   originalSiblingPR:26,sourceBlob:PR26_SOURCE_BLOB,canonAdopted:false};
}
