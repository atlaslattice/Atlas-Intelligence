/** Release selection from the frozen local experiment, not a new benchmark. */
const HOUSES=/^H(?:0[1-9]|1[0-2])$/;
export const BENCHMARK_PROTOCOL_SHA256='e7895c7f39549706eb1e377ebdd2d3c9ae8904d7d492b96f1f9433c286bb2d38';
export const BENCHMARK_RAW_SHA256='ed03acd0bacd3990d90051e01a9552faadb49bcbea05723d7eed8f59fd45cef6';
export function releasePolicy(houseId){
 if(typeof houseId!=='string'||!HOUSES.test(houseId))throw new Error('UNKNOWN_POLICY_HOUSE');
 return {houseId,selectedImplementation:houseId==='H02'?'REFERENCE_QUERY':'INDEXED_QUERY',
   rationale:houseId==='H02'?'Retain the scan baseline after the indexed variant regressed in the registered local experiment.':'Use the indexed candidate supported by the registered local experiment.',
   benchmarkProtocolSha256:BENCHMARK_PROTOCOL_SHA256,benchmarkRawSha256:BENCHMARK_RAW_SHA256,
   scope:'LOCAL_SYNTHETIC_SUPPORTING_KERNEL_COMPARISON',universalFastestClaimed:false,
   originalNodeMetricCredit:0,productionPerformanceVerified:false};
}
export function queryWithReleasePolicy(houseId,kernel,prepared,request){
 return releasePolicy(houseId).selectedImplementation==='REFERENCE_QUERY'?kernel.referenceQuery(prepared,request):kernel.query(prepared,request);
}
