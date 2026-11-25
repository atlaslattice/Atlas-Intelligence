import {originalAddresses} from '../src/geometry.mjs';
import {encodeYijing,CUPWAKE_EDITION,SYMBIOSIS_EDITION,glyphCoefficients} from '../src/yijing-cymatic.mjs';
// Work-safe structural coordinates ONLY. No owner corpus titles/weights/bodies.
process.stdout.write(JSON.stringify(originalAddresses.map(hsn=>{
  const c=encodeYijing(hsn,CUPWAKE_EDITION),p=encodeYijing(hsn,SYMBIOSIS_EDITION);
  return {hsn,c:c.hexagramCode,t:c.contextDigits,p:p.hexagramCode,pt:p.contextDigits,coeff:glyphCoefficients({edition:c.edition,hexagramCode:c.hexagramCode,contextCode:c.contextCode})};
})));
