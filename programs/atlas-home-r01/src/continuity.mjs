/** Ephemeral owner-controlled return ticket. No storage, timers or background effect. */
export function createReturnTicket(){let state=null,closed=false;return Object.freeze({
 remember(hsn){if(closed)return {status:'CLOSED'};if(typeof hsn!=='string'||!/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/.test(hsn))return{status:'HOLD_INVALID_HSN'};state=hsn;return{status:'IN_MEMORY_ONLY',persisted:false}},
 peek(){return Object.freeze({status:closed?'CLOSED':'IN_MEMORY_ONLY',hsn:closed?null:state,persisted:false})},
 leave(){state=null;closed=true;return Object.freeze({status:'LEFT',storedRecords:0,networkRequests:0})}
})}
