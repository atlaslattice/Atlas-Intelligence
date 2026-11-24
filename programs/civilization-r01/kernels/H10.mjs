import {requireValue, shape, id, bool, array, unique, snapshot, opaqueStore, seeded} from './b-support.mjs';

export const descriptor=Object.freeze({houseId:'H10',sphereId:'H10.S05',service:'scoped_communication_protocol',contractVersion:'1',scope:'Attributed field projection and reply-chain validation; prepares data only and cannot send or authenticate messages.'});
const store=opaqueStore('H10');
const key=(room,audience)=>JSON.stringify([room,audience]);
function validate(data){
  const d=snapshot(data);shape(d,['messages','fieldPolicies'],'dataset');array(d.messages,'messages',4096,1);array(d.fieldPolicies,'fieldPolicies',4096);
  const messageIds=new Set(),policyIds=new Set();
  for(const m of d.messages){shape(m,['id','author','room','audiences','replyTo','fields','observed'],'message');id(m.id);id(m.author);id(m.room);unique(m.audiences,'audiences',128);bool(m.observed,'observed');requireValue(!messageIds.has(m.id),'Duplicate message');messageIds.add(m.id);if(m.replyTo!==null)id(m.replyTo);shape(m.fields,Object.keys(m.fields),'fields');requireValue(Object.keys(m.fields).length<=64,'Too many message fields');for(const field of Object.keys(m.fields))id(field,'field name');}
  for(const p of d.fieldPolicies){shape(p,['room','audience','allowedFields'],'field policy');id(p.room);id(p.audience);unique(p.allowedFields,'allowedFields',64);const k=key(p.room,p.audience);requireValue(!policyIds.has(k),'Duplicate room/audience policy');policyIds.add(k);}
  return d;
}
function requestValue(request){const r=snapshot(request);shape(r,['messageId','room','audience'],'request');id(r.messageId);id(r.room);id(r.audience);return r;}
function hold(reason){return {status:'HOLD',reason,candidate:null,delivered:false,hostAuthorizationVerified:false,sourceObservationAuthenticated:false};}
function prepared(message,policy,parents){const fields={};for(const name of [...policy.allowedFields].sort())if(Object.hasOwn(message.fields,name))Object.defineProperty(fields,name,{value:message.fields[name],enumerable:true,writable:true,configurable:true});return {status:'PREPARED_NOT_DELIVERED',reason:null,candidate:{messageId:message.id,author:message.author,room:message.room,replyTo:message.replyTo,fields:snapshot(fields)},checkedReplyParents:parents,delivered:false,hostAuthorizationVerified:false,sourceObservationAuthenticated:false};}

function slow(d,request){
  const r=requestValue(request),message=d.messages.find(m=>m.id===r.messageId);
  if(!message)return hold('UNKNOWN_MESSAGE');
  if(message.room!==r.room||!message.audiences.includes(r.audience))return hold('AUDIENCE_OR_ROOM_MISMATCH');
  const policy=d.fieldPolicies.find(p=>p.room===r.room&&p.audience===r.audience);if(!policy)return hold('NO_FIELD_POLICY');
  const parents=[],seen=new Set([message.id]);let parentId=message.replyTo;
  while(parentId!==null){if(seen.has(parentId))return hold('CYCLIC_REPLY_CHAIN');seen.add(parentId);const parent=d.messages.find(m=>m.id===parentId);if(!parent||!parent.observed)return hold('UNOBSERVED_REPLY_PARENT');if(parent.room!==r.room||!parent.audiences.includes(r.audience))return hold('REPLY_PARENT_SCOPE_MISMATCH');parents.push(parentId);parentId=parent.replyTo;}
  return prepared(message,policy,parents);
}
export function prepare(data){const d=validate(data);return store.put({d,messages:new Map(d.messages.map(m=>[m.id,m])),policies:new Map(d.fieldPolicies.map(p=>[key(p.room,p.audience),p]))});}
export function reference(data,request){return slow(validate(data),request);}
export function referenceQuery(prepared,request){return slow(store.get(prepared).d,request);}
export function query(preparedState,request){
  const s=store.get(preparedState),r=requestValue(request),message=s.messages.get(r.messageId);
  if(!message)return hold('UNKNOWN_MESSAGE');
  if(message.room!==r.room||!message.audiences.includes(r.audience))return hold('AUDIENCE_OR_ROOM_MISMATCH');
  const policy=s.policies.get(key(r.room,r.audience));if(!policy)return hold('NO_FIELD_POLICY');
  const ancestors=[],visited=new Set();let current=message;
  while(current.replyTo!==null){visited.add(current.id);if(visited.has(current.replyTo))return hold('CYCLIC_REPLY_CHAIN');const parent=s.messages.get(current.replyTo);if(!parent||!parent.observed)return hold('UNOBSERVED_REPLY_PARENT');if(parent.room!==r.room||!parent.audiences.includes(r.audience))return hold('REPLY_PARENT_SCOPE_MISMATCH');ancestors.push(parent.id);current=parent;}
  return prepared(message,policy,ancestors);
}
export function fixture(seed=1,size=256){const random=seeded(seed,size),messages=Array.from({length:size},(_,i)=>({id:'message'+i,author:'author'+(i%17),room:'room'+(i%4),audiences:['audience'+(i%4)],replyTo:i>=4&&i%20>=4?'message'+(i-4):null,fields:{body:'Synthetic message '+i,source:'source'+i,privateNote:'Excluded private fixture field'},observed:i%31!==0}));const fieldPolicies=Array.from({length:4},(_,i)=>({room:'room'+i,audience:'audience'+i,allowedFields:['body','source']}));const requests=Array.from({length:16},()=>{const i=random(size);return {messageId:'message'+i,room:'room'+(i%4),audience:'audience'+(i%4)};});return {dataset:{messages,fieldPolicies},requests};}
