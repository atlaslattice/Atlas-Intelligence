#!/usr/bin/env node
import { civilizationKernelAction } from '../programs/civilization-r01/integrations/kernel-actions.mjs';

const args = process.argv.slice(2);
if (args.length > 1 || (args[0] ?? 'status') !== 'status') {
  console.error('Usage: node scripts/run_civilization_r01.mjs status');
  process.exitCode = 2;
} else {
  console.log(JSON.stringify(civilizationKernelAction('civilization_kernel_status', {scope:'WORK'}), null, 2));
}
