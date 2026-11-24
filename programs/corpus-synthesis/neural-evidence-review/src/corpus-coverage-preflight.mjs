/** Corpus readiness preview. Inventory counts are NOT readable chunks. */
export const COVERAGE_SCHEMA='atlas.mica.corpus-coverage-admission/v1';
const HOLD=Object.freeze({schema:COVERAGE_SCHEMA,status:'HOLD_COVERAGE_OR_RIGHTS',
  canTrain:false,canPublish:false,hostVerified:false,complete:false});
const SHA=/^[a-f0-9]{64}$/;
const ID=/^[A-Za-z0-9._:-]{1,120}$/;
const only=(x,keys)=>{
  if(!x||typeof x!=='object'||Array.isArray(x))return false;
  if(Object.getPrototypeOf(x)!==Object.prototype&&Object.getPrototypeOf(x)!==null)return false;
  const found=Reflect.ownKeys(x);return found.length===keys.length&&keys.every(k=>{
    const d=Object.getOwnPropertyDescriptor(x,k);return d&&Object.hasOwn(d,'value')&&d.enumerable;
  })&&found.every(k=>typeof k==='string'&&keys.includes(k));
};
const FIELDS=['storageState','decryptionVerified','fullCorpusVerified','providerRightsRecheckedLive',
  'contentComplete','verifiedRegistrySha256','expectedChunkIds','readableChunkReceipts',
  'familySplitVerified','sourceUseRightsVerified'];
const RECEIPT=['chunkId','contentSha256','sourceId','familyId','sourceRevision','storageReceiptSha256'];
export function evaluateCorpusCoverage(m){
  try{
    if(!only(m,FIELDS)||m.storageState!=='READY'||m.decryptionVerified!==true
      ||m.fullCorpusVerified!==true||m.providerRightsRecheckedLive!==true
      ||m.contentComplete!==true||m.familySplitVerified!==true||m.sourceUseRightsVerified!==true
      ||!SHA.test(m.verifiedRegistrySha256)||!Array.isArray(m.expectedChunkIds)
      ||!Array.isArray(m.readableChunkReceipts)||m.expectedChunkIds.length===0
      ||m.expectedChunkIds.length>8192||m.expectedChunkIds.length!==m.readableChunkReceipts.length
      ||new Set(m.expectedChunkIds).size!==m.expectedChunkIds.length
      ||!m.expectedChunkIds.every(x=>typeof x==='string'&&ID.test(x)))return HOLD;
    const seen=new Set();
    for(const item of m.readableChunkReceipts){
      if(!only(item,RECEIPT)||!ID.test(item.chunkId)||!ID.test(item.sourceId)
        ||!ID.test(item.familyId)||!SHA.test(item.contentSha256)
        ||!SHA.test(item.storageReceiptSha256)
        ||!Number.isSafeInteger(item.sourceRevision)||item.sourceRevision<1
        ||seen.has(item.chunkId))return HOLD;
      seen.add(item.chunkId);
    }
    if(m.expectedChunkIds.some(x=>!seen.has(x)))return HOLD;
    return Object.freeze({schema:COVERAGE_SCHEMA,status:'LOCAL_COVERAGE_METADATA_CONSISTENT',
      checkedChunkCount:seen.size,complete:false,canTrain:false,canPublish:false,hostVerified:false,
      sourceBodiesRead:0,measuredSemanticRecall:false,
      warning:'Metadata consistency is not authenticated decryption, live rights or training permission'});
  }catch{return HOLD;}
}
