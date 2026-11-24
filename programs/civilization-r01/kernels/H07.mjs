import {requireValue, shape, id, integer, bool, array, unique, snapshot, opaqueStore, seeded} from './b-support.mjs';

export const descriptor = Object.freeze({houseId:'H07', sphereId:'H07.S01', service:'workflow_accountability_engine', contractVersion:'1', scope:'Recorded commitment and resource projection; supplied outcomes are not authenticated evidence.'});
const store = opaqueStore('H07');

function validate(data) {
  const d = snapshot(data); shape(d, ['commitments','events'], 'dataset');
  array(d.commitments, 'commitments', 4096, 1); array(d.events, 'events', 32768);
  const tasks = new Set(); const eventIds = new Set();
  for (const task of d.commitments) {
    shape(task, ['id','owner','budget'], 'commitment'); id(task.id); id(task.owner, 'owner'); integer(task.budget, 'budget', 0, 1e9);
    requireValue(!tasks.has(task.id), 'Duplicate commitment'); tasks.add(task.id);
  }
  for (const event of d.events) {
    shape(event, ['id','taskId','kind','units','observed'], 'event'); id(event.id); id(event.taskId);
    requireValue(tasks.has(event.taskId) && !eventIds.has(event.id), 'Unknown commitment or duplicate event'); eventIds.add(event.id);
    requireValue(['PROPOSED','STARTED','COST','COMPLETED','FAILED'].includes(event.kind), 'Unknown event kind');
    integer(event.units, 'event units', 0, 1e9); bool(event.observed, 'observed');
    requireValue(event.kind === 'COST' || event.units === 0, 'Only COST events carry resource units');
  }
  return d;
}
function selection(request, ids) {
  const r = snapshot(request); shape(r, ['taskIds'], 'request');
  const selected = r.taskIds === undefined ? [...ids] : unique(r.taskIds, 'taskIds');
  requireValue(selected.every(v => ids.has(v)), 'Unknown selected task'); return [...selected].sort();
}
function empty(task) { return {id:task.id, owner:task.owner, state:'PLANNED', spent:0, budget:task.budget, recordedCompletion:false, unverifiedOutcomeEvents:0, unresolvedTransitions:0, evidenceAuthenticated:false}; }
function finish(entry) { return {...entry, remaining:entry.budget-entry.spent, overBudget:entry.spent>entry.budget}; }
function result(entries) { return {entries, unfulfilled:entries.filter(e=>!e.recordedCompletion).map(e=>e.id), reportedTotalSpent:entries.reduce((sum,e)=>sum+e.spent,0), hostExecutionStarted:false, outcomeEvidenceAuthenticated:false}; }

// Full ordered event replay for each selected commitment, independent of the prepared projection.
function slow(d, r, ids) {
  return result(selection(r, ids).map(taskId => {
    const task = d.commitments.find(t=>t.id===taskId); const entry=empty(task);
    for (const event of d.events) {
      if (event.taskId!==taskId) continue;
      if (!event.observed) { if (event.kind==='COMPLETED'||event.kind==='FAILED') entry.unverifiedOutcomeEvents++; continue; }
      if (event.kind==='COST') entry.spent+=event.units;
      else if (event.kind==='STARTED') {
        if(entry.state==='PLANNED')entry.state='STARTED';
        else if(entry.state!=='STARTED'){entry.state='CONFLICTED';entry.recordedCompletion=false;entry.unresolvedTransitions++;}
      }
      else if (event.kind==='COMPLETED') {
        if(entry.state==='STARTED'){entry.state='COMPLETED';entry.recordedCompletion=true;}
        else if(entry.state!=='COMPLETED'){entry.state='CONFLICTED';entry.recordedCompletion=false;entry.unresolvedTransitions++;}
      }
      else if (event.kind==='FAILED') {
        if(entry.state==='STARTED')entry.state='FAILED';
        else if(entry.state!=='FAILED'){entry.state='CONFLICTED';entry.recordedCompletion=false;entry.unresolvedTransitions++;}
      }
    }
    return finish(entry);
  }));
}
export function prepare(data) {
  const d=validate(data), ids=new Set(d.commitments.map(t=>t.id)), ledger=new Map(d.commitments.map(t=>[t.id,empty(t)]));
  // One pass materializes all commitment accounts under an immutable dataset snapshot.
  for (const e of d.events) {
    const row=ledger.get(e.taskId);
    if (!e.observed) { row.unverifiedOutcomeEvents+=Number(e.kind==='COMPLETED'||e.kind==='FAILED'); continue; }
    switch(e.kind) {
      case 'COST': row.spent+=e.units; break;
      case 'STARTED':
        if(row.state==='PLANNED')row.state='STARTED';
        else if(row.state!=='STARTED'){row.unresolvedTransitions++;row.state='CONFLICTED';row.recordedCompletion=false;} break;
      case 'COMPLETED':
        if(row.state==='STARTED'){row.recordedCompletion=true;row.state='COMPLETED';}
        else if(row.state!=='COMPLETED'){row.unresolvedTransitions++;row.state='CONFLICTED';row.recordedCompletion=false;} break;
      case 'FAILED':
        if(row.state==='STARTED')row.state='FAILED';
        else if(row.state!=='FAILED'){row.unresolvedTransitions++;row.state='CONFLICTED';row.recordedCompletion=false;} break;
    }
  }
  for (const [key,value] of ledger) ledger.set(key,finish(value));
  return store.put({d,ids,ledger});
}
export function reference(data, request) { const d=validate(data); return slow(d,request,new Set(d.commitments.map(t=>t.id))); }
export function referenceQuery(prepared, request) { const s=store.get(prepared); return slow(s.d,request,s.ids); }
export function query(prepared, request) { const s=store.get(prepared); return result(selection(request,s.ids).map(key=>({...s.ledger.get(key)}))); }
export function fixture(seed=1,size=256) {
  const random=seeded(seed,size), commitments=[],events=[];
  for(let i=0;i<size;i++){
    const taskId='task'+i;commitments.push({id:taskId,owner:'owner'+(i%12),budget:100});
    events.push({id:'e'+i+'p',taskId,kind:'PROPOSED',units:0,observed:true},{id:'e'+i+'s',taskId,kind:'STARTED',units:0,observed:true},{id:'e'+i+'c',taskId,kind:'COST',units:random(130),observed:true},{id:'e'+i+'o',taskId,kind:i%7===0?'FAILED':'COMPLETED',units:0,observed:i%5!==0});
  }
  const requests=Array.from({length:16},()=>({taskIds:[...new Set(Array.from({length:Math.min(8,size)},()=> 'task'+random(size)))]}));
  return {dataset:{commitments,events},requests};
}
