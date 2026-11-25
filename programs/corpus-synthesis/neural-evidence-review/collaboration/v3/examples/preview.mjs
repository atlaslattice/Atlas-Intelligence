import {readFileSync} from 'node:fs';
import {compareRuleRevision} from '../src/rule-revision-gate.mjs';
const path=new URL('../fixtures/sample-review.json',import.meta.url);
const input=JSON.parse(readFileSync(path,'utf8'));
const result=compareRuleRevision(input);
process.stdout.write(JSON.stringify(result,null,2)+'\n');
if(result.status!=='LOCAL_REVIEW_CANDIDATE_ONLY')process.exitCode=1;
