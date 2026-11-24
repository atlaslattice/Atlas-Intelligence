/** One optional Atlas ONE v2 WorkHostPort consumer; this file has NO broker client.
 * The publisher must bind the trusted, current rights-at-read/return host adapter.
 * A caller-supplied callback or even a mocked ALLOW cannot attest real platform rights.
 */
import {CivilizationUnifiedBuild} from './civilization-unified.mjs';
import {Hold} from './index.mjs';
export const SWARMCHAT_CIVILIZATION_BRIDGE='atlas.one.swarmchat.civilization.source-handoff/v1';
const ID=/^[A-Za-z0-9_-]{3,80}$/;
const SHA=/^[a-f0-9]{64}$/;
function deny(){return {schema:SWARMCHAT_CIVILIZATION_BRIDGE,status:'HOLD_SOURCE_OR_RIGHTS_UNVERIFIED',data:null,
    hostAuthenticated:false,independentlyAttested:false,rightsAtReturnIndependentlyVerified:false,
    bodyReturned:false,workPosted:false,canonChanged:false};}
export class CivilizationWorkHostBridge {
 #engine;#host;
 constructor({engine,hostPort}={}){
  if(!(engine instanceof CivilizationUnifiedBuild)||!hostPort||typeof hostPort.query!=='function')throw new Hold('HOST_PORT_AND_SOURCE_ENGINE_REQUIRED');
  this.#engine=engine;this.#host=hostPort;Object.freeze(this);
 }
 /** Local proposal: exact knowledge node + already-authorized Work source sequence.
  * The host callback MUST separately enforce current account/lease/tenant scope.
  */
 async inspect({roomId,seq,coordinate,mode='WORK'}={}){
  if(mode!=='WORK'||typeof roomId!=='string'||!ID.test(roomId)||!Number.isInteger(seq)||seq<1||seq>500)return deny();
  let draft;try{draft=this.#engine.prepareSwarmChat(coordinate,roomId);}catch{return deny()}
  let result;try{result=await this.#host.query({roomId,sourceSeqs:[seq],purpose:'research'});}catch{return deny()}
  if(result?.status!=='HOST_REPORTED_READ_RETURN_RECHECKED_SOURCE_ONLY'||result?.data?.sourceCount!==1
    ||!Array.isArray(result.data.references)||result.data.references.length!==1)return deny();
  const r=result.data.references[0];
  if(r.roomId!==roomId||r.seq!==seq||typeof r.sourceSHA256!=='string'||!SHA.test(r.sourceSHA256))return deny();
  return {schema:SWARMCHAT_CIVILIZATION_BRIDGE,status:'HOST_CALLBACK_REPORTED_SOURCE_POINTER_NOT_ATTESTED',
    data:{roomId,seq,sourceMessageSha256:r.sourceSHA256,sourceAriadne:draft.source,houseModuleId:draft.moduleId,
      sphereQuestion:draft.sourceQuestion,originalMessageBodyIncluded:false},
    hostAuthenticated:false,independentlyAttested:false,rightsAtReturnIndependentlyVerified:false,
    bodyReturned:false,workPosted:false,canonChanged:false};
 }
}
