/** Actual offline 1728×21 I18 source-oracle replay, distinct from prepared adaptive cases. */
import {readFileSync,writeFileSync} from 'node:fs';import {createHash} from 'node:crypto';import {resolve,dirname} from 'node:path';import {fileURLToPath} from 'node:url';
import {auditMutationInvariance} from '../src/mutation-oracle.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const rows=readFileSync(root+'/private-source/source-seeds.txt','utf8').trim().split('\n');if(rows.length!==1728)throw Error('NOT_1728');
const digest=createHash('sha256');let cases=0,originalNegatives=0,newRecommendations=0,correctStatic=0;
for(let n=0;n<1728;n++){
 const c=`H${String(Math.floor(n/144)+1).padStart(2,'0')}.S${String(Math.floor(n%144/12)+1).padStart(2,'0')}.N${String(n%12+1).padStart(2,'0')}`;
 const fields=rows[n].trim().split(' ');if(Number(fields[0])!==n)throw Error('SOURCE_ORDER');
 for(let k=0;k<21;k++){
  const id=k===20?'M145':'I'+String(k+1).padStart(2,'0');let p=auditMutationInvariance(c,id,Number(fields[4]));
  if(p.state!=='LOCAL_ORIGINAL_INVARIANCE_AUDITED'||!p.correctStaticMenuInvariance||p.originalNegativeCasesHeld!==7)throw Error('ORACLE_MISMATCH');
  cases++;correctStatic++;originalNegatives+=7;newRecommendations+=p.adaptiveProposalsOnly;digest.update(c+'|'+id+'|'+p.originalNegativeCasesHeld+'\n');
 }
}
const result={schema:'atlas.ariadne.I18-invariance-full/v1',status:'EXECUTED_LOCAL_NOT_HOSTED',
 nodeRootPairs:cases,correctLegacyInvarianceExamples:correctStatic,actualSourceOnlyNegativeExecutions:originalNegatives,
 additionalAdaptiveCasesPreparedNotHostTested:newRecommendations,adaptiveImprovementVerified:false,
 streamSha256:digest.digest('hex'),modelCalls:0,externalEffects:0,realMacroturns:0,authorityEffect:'NONE'};
writeFileSync(root+'/reports/full/I18_INVARIANCE_ORACLE.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
