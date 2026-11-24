import * as H01 from './kernels/H01.mjs';
import * as H02 from './kernels/H02.mjs';
import * as H03 from './kernels/H03.mjs';
import * as H04 from './kernels/H04.mjs';
import * as H05 from './kernels/H05.mjs';
import * as H06 from './kernels/H06.mjs';
import * as H07 from './kernels/H07.mjs';
import * as H08 from './kernels/H08.mjs';
import * as H09 from './kernels/H09.mjs';
import * as H10 from './kernels/H10.mjs';
import * as H11 from './kernels/H11.mjs';
import * as H12 from './kernels/H12.mjs';

const kernels = new Map(Object.entries({H01,H02,H03,H04,H05,H06,H07,H08,H09,H10,H11,H12}));
export const KERNEL_HOUSES = Object.freeze([...kernels.keys()]);
export const R01_SPHERES = Object.freeze(['H01.S01','H02.S06','H03.S07','H04.S03','H05.S05','H06.S06','H07.S01','H08.S04','H09.S05','H10.S05','H11.S07','H12.S04']);
export const RELEASE_ID = 'ATLAS-CIVILIZATION-R01-20261123-1';
export function lookupKernel(houseId) {
  if (typeof houseId!=='string'||!kernels.has(houseId)) throw new Error('UNKNOWN_KERNEL_HOUSE');
  return kernels.get(houseId);
}
export function kernelCatalog() {
  return {schema:'atlas.civilization.kernel-catalog.v1',releaseId:RELEASE_ID,
    kernels:[...kernels].map(([house,kernel],i)=>({...JSON.parse(JSON.stringify(kernel.descriptor)),houseId:house,sphereId:R01_SPHERES[i],
      implementationStatus:'IMPLEMENTED_SUPPORTING_SOFTWARE_KERNEL',specializedNodeContractsComplete:0})),
    count:12,sourceNodeBindings:144,specializedNodeContractsComplete:0,
    productionPerformanceClaimed:false,hostExecutionAuthorized:false};
}
