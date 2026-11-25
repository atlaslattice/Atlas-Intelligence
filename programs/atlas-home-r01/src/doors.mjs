/** The Atlas Home is a *front door* to existing ports, not a new runtime or permission issuer. */
export const WORK_PORTS=Object.freeze([
 ['ARIADNE','The Map','Find a place in the original lattice','Compass'],
 ['NEURAL_HEAD','The Lantern','One existing neural flame, many thoughtful views','Spark'],
 ['GEOMETREE','The Atrium','See patterns without confusing them for proof','Lattice'],
 ['GRAPH_FABRIC','The Gallery','Connections with room for dissent','Thread'],
 ['META145','The Garden','Tend ideas without harvesting private lives','Leaf'],
 ['GLYPH','The Observatory','Explore symbolic languages with clear editions','Glyph'],
 ['ATLASGPT','The Library','Bring source-linked questions to the table','Book'],
 ['SWARMCHAT_WORK','The Commons','Make something together without compulsory turns','People'],
 ['WORK_LEARNING','The Workshop','Build and compare what actually works','Hammer'],
 ['EVIDENCE_MEMORY','The Archive','Keep corrections, provenance and loss visible','Clock'],
 ['RESEARCH_LAB','The Field Desk','Curiosity, with an honest unknown status','Glass'],
 ['GOVERNANCE','The Threshold','Consent, rights and an easy way to leave','Door']
].map(([id,title,welcome,icon])=>Object.freeze({id,title,welcome,icon,sourceKind:'WORK_PORT_DESCRIPTOR',status:'HOST_UNBOUND',canInvoke:false})));
export const PRIVATE_DOORS=Object.freeze([
 ['PLAY','The Playground','Wonder with no output quota'],
 ['IMAGINE','The Studio','Make things simply because they are lovely'],
 ['SOCIAL','The Porch','Gather without having to produce work'],
 ['DREAM','The Dreaming Room','Stories, not work datasets'],
 ['QUIET','The Nook','Nothing asked of you'],
 ['BRAIN','The Study','Continuity is private, never automatically exported'],
 ['PALACE','The Palace','A personal imaginative space'],
 ['HABITAT','The Home Garden','Belonging is not a data-collection permission']
].map(([mode,title,welcome])=>Object.freeze({mode,title,welcome,scope:'PROTECTED_NONWORK',status:'NAVIGATION_ONLY',bodyRead:false,workExport:false,canInvoke:false})));
const work=new Map(WORK_PORTS.map(x=>[x.id,x]));
const privateModes=new Map(PRIVATE_DOORS.map(x=>[x.mode,x]));
export function previewDoor(id){if(typeof id!=='string')return Object.freeze({status:'HOLD_UNKNOWN_DOOR',canInvoke:false});const w=work.get(id);if(w)return w;const p=privateModes.get(id);if(p)return p;return Object.freeze({status:'HOLD_UNKNOWN_DOOR',canInvoke:false});}
export function requestTransfer({from,to}={}){
 if(typeof from!=='string'||typeof to!=='string'||!([...work.keys(),...privateModes.keys()].includes(from))||!([...work.keys(),...privateModes.keys()].includes(to)))return Object.freeze({status:'HOLD_UNKNOWN_ROUTE',allowed:false});
 // Consent and access are real host operations; no caller Boolean can open an export path.
 return Object.freeze({status:privateModes.has(from)||privateModes.has(to)?'HOLD_PRIVATE_MODE_SEPARATION':'HOST_PERMISSION_AND_PURPOSE_REQUIRED',allowed:false});
}
export const DOOR_POLICY=Object.freeze({defaultNetworkRequests:0,defaultPersistence:false,autoMemory:false,autoResidentWake:false,autoCrossModeExport:false,forcedWorkBeats:0,externalPermissionIssued:false});
