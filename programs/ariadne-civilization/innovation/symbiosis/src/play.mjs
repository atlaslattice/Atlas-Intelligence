/**
 * Lantern Ferry: opt-in, isolated, locally fictional cards.
 * Does NOT import Work source index or read protected Brain/Palace/Chat data.
 * Public operator display labels only. The user can quit at any time.
 */
import {ROOTS,CHANNELS} from './mesh.mjs';
const HOLD=Object.freeze({state:'HOLD',code:'NO_LEISURE_SOURCE_MIXING',authorityEffect:'NONE',effects:0});
const pick=(a,n)=>a[n%a.length];
const places=['Moonlit Orchard','Teaspoon Ferry','Mossglass Estuary','Kite Observatory','Lantern Library','Wildwood Commons','Cloudfish Arcade','Rainwheel Garden','The Listening Hill','Comet Pantry','Starlight Workshop','Quiet Tidepool'];
const games=['swap the riddles','plant one improbable question','make two witnesses disagree kindly','let an old map learn a new route','invent a reversible dance','trade a lantern for an uncertainty','build a miniature bridge of ideas','send a goose to fetch a paradox','make room for the quietest hypothesis','weave three clues into a paper constellation','discover why a false answer was tempting','turn a mistake into a rescue mission'];
const twists=['the compass insists on honesty','two doors look identical until a question is asked','the lantern refuses to erase a dissenting whisper','a friendly goose claims all the biscuits','the stars ask for a better falsifier','a bridge gently changes direction','time runs sideways for one imaginary minute','the town library grows an extra floor','a tiny tidepool contains an enormous map','the bell only rings for reversible choices','the travelers disagree but remain neighbors','the best answer is to ask another question'];
const keyPattern=/^(I(0[1-9]|1[0-9]|20)|M145)\.X(0[1-9]|1[0-9]|20)$/;
const ids=new Set(ROOTS.flatMap(r=>CHANNELS.map(c=>r.id+'.'+c.id)));
/** Makes a distinct fiction prompt based only on public card coordinates. */
export function playCard(id,{mode='PLAY_LOCAL',seed=0}={}){
 if(mode!=='PLAY_LOCAL'||typeof id!=='string'||!keyPattern.test(id)||!ids.has(id)||!Number.isInteger(seed)||seed<0||seed>1000000)return {...HOLD};
 const [rootId,extensionId]=id.split('.'),r=ROOTS.find(x=>x.id===rootId),ch=CHANNELS.find(x=>x.id===extensionId);
 const a=ROOTS.findIndex(x=>x.id===rootId),b=CHANNELS.findIndex(x=>x.id===extensionId);
 const n=((a*37+b*53+seed*7)>>>0);
 return {schema:'atlas.lantern-ferry.story-card/v0.1',state:'FICTION_LOCAL_ONLY',id,mode,
  title:r.title+' meets '+ch.title,at:pick(places,n),quest:pick(games,n+a),twist:pick(twists,n+b),
  invitation:'Choose to explore, repair, play or leave. All choices are optional; no score authorizes Work.',
  sourceRecordsRead:0,workDataImported:false,privatePalaceImported:false,gamePlayedByAgent:false,
  externalEffects:0,authorityEffect:'NONE'};
}
/** Snapshot of all 420 playful possibility cards; no Work source data. */
export function playDeck(seed=0){
 if(!Number.isInteger(seed)||seed<0||seed>1000000)return {...HOLD};
 const cards=[];for(const r of ROOTS)for(const ch of CHANNELS)cards.push(playCard(r.id+'.'+ch.id,{seed}));
 return {schema:'atlas.lantern-ferry.deck/v0.1',state:'FICTION_ONLY_PREPARED',cards,
   count:cards.length,sourceRecordsRead:0,hostActions:0,privateModesCrossed:0,authorityEffect:'NONE'};
}
