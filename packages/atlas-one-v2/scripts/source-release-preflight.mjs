/**
 * Atlas ONE v2 public-source release evidence review, deliberately NOT a
 * publisher, signed host verifier, or an authorization decision engine.
 * A self-edited JSON manifest cannot satisfy independent real-host gates.
 */
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

const REQUIRED = Object.freeze({
  sourceAndLocalTests: 'local',
  currentServedSiteHead: 'host',
  hostOwnedIssuer: 'host',
  twoAccountD1: 'host',
  workReadAndReturnRevoke: 'host',
  signedConversationCallback: 'host',
  actualOpenAIAgentsRun: 'optional',
  externalLiveLiteratureFeed: 'optional',
  independentScientificReview: 'human',
  canonAdoption: 'human',
  productionDeployment: 'host'
});
const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
const PLAIN=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;

/** Return immutable SOURCE-ONLY diagnostic; NEVER `canPublish:true`. */
export function inspectReleaseSource(data){
  const bad=reason=>Object.freeze({schema:'atlas.one.source-preflight/v1',status:'INVALID_SOURCE_MANIFEST',reason,
    canPublish:false,sourceOnly:true,hostAttested:false,canonEffect:'NONE',heldFields:[]});
  if(!PLAIN(data)||data.schema!=='atlas.one.release-gates/v2')return bad('INVALID_SCHEMA');
  if(data.canPublish!==false)return bad('SELF_CLAIMED_PUBLISH_PERMISSION');
  const keys=new Set(['schema','candidateVersion','canPublish',...Object.keys(REQUIRED)]);
  if(Object.keys(data).some(k=>!keys.has(k))||Object.keys(REQUIRED).some(k=>!own(data,k)))return bad('MISSING_OR_UNKNOWN_GATE_FIELD');
  if(typeof data.candidateVersion!=='string'||!/^2\.0\.0-candidate\.[0-9]{1,4}$/.test(data.candidateVersion))return bad('UNPINNED_CANDIDATE_VERSION');
  if(Object.keys(REQUIRED).some(k=>typeof data[k]!=='string'||data[k].length<3||data[k].length>140))return bad('INVALID_GATE_VALUE');
  // This code cannot verify a platform-signed principal, D1 effects, consent,
  // actual served bundle, or a separate human CANON decision. A string such as
  // VERIFIED is a caller claim, never a host witness. No optimistic path.
  const heldFields=Object.keys(REQUIRED).filter(k=>REQUIRED[k]!=='optional');
  return Object.freeze({schema:'atlas.one.source-preflight/v1',status:'SOURCE_REVIEW_HOLD',
    candidateVersion:data.candidateVersion,heldFields,optionalNotPerformed:Object.keys(REQUIRED).filter(k=>REQUIRED[k]==='optional'&&data[k]!=='PERFORMED'),
    reason:'CURRENT_HOST_AND_HUMAN_WITNESSES_NOT_ATTESTED',canPublish:false,
    sourceOnly:true,hostAttested:false,canonEffect:'NONE'});
}

export function reviewManifestFile(path){
  try {const bytes=readFileSync(path);if(bytes.length>32768)throw new Error('MAX_BYTES');
    const data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
    return inspectReleaseSource(data);
  } catch {
    return Object.freeze({schema:'atlas.one.source-preflight/v1',status:'INVALID_SOURCE_MANIFEST',reason:'INVALID_FILE_OR_JSON',
      canPublish:false,sourceOnly:true,hostAttested:false,canonEffect:'NONE',heldFields:[]});
  }
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){
  const p=process.argv[2]??resolve('docs/RELEASE_GATES.json');
  const report=reviewManifestFile(p);
  process.stdout.write(JSON.stringify(report)+'\n');
  process.exitCode=report.status==='INVALID_SOURCE_MANIFEST'?1:2;
}
