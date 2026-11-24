import test from 'node:test';
import assert from 'node:assert/strict';
import {CorpusEngine} from '../index.mjs';
import {runIntegrity} from './integrity-fixtures.mjs';

const report=await runIntegrity(CorpusEngine);
for(const result of report.cases)test(`independent ${result.id}: ${result.description}`,()=>{
  assert.equal(result.passed,true,result.error??'Independent fixture failed');
});
