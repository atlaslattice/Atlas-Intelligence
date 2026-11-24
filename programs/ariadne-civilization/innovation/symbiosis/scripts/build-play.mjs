#!/usr/bin/env node
/* Build a zero-network, completely fictional exploration interface. */
import {writeFileSync,mkdirSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ROOTS,CHANNELS,extensionCatalog} from '../src/mesh.mjs';
import {playDeck} from '../src/play.mjs';
const base=dirname(fileURLToPath(import.meta.url));
const root=join(base,'..');
const deck=playDeck(42);
if(deck.cards.length!==420)throw Error('PLAY_DECK_CARDINALITY');
const data=JSON.stringify({roots:ROOTS,channels:CHANNELS,cards:deck.cards.map(x=>({id:x.id,title:x.title,at:x.at,quest:x.quest,twist:x.twist}))}).replace(/</g,'\\u003c');
const html=`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Lantern Ferry · 420 Doors</title>
<style>
:root{color-scheme:dark;--bg:#0b1627;--panel:#18263e;--line:#34445f;--accent:#e4ca8c;--mint:#9bdfcd;--muted:#b3c4d5}
*{box-sizing:border-box}body{font:16px/1.55 system-ui,-apple-system,sans-serif;margin:0;background:radial-gradient(ellipse at 55% -40%,#375b75,var(--bg) 75%);color:#eef4fc}
main{max-width:980px;margin:0 auto;padding:32px 20px 56px}header{margin-bottom:22px}h1{font:clamp(1.8rem,4vw,3rem)/1.13 Georgia,serif;color:var(--accent);margin:.4rem 0}
small,.muted{color:var(--muted)}.ribbon{display:inline-block;padding:3px 12px;border:1px solid var(--mint);border-radius:999px;color:var(--mint);font-size:12px}
.card{background:linear-gradient(140deg,rgba(30,52,79,.96),rgba(22,35,57,.96));border:1px solid var(--line);border-radius:22px;padding:24px;box-shadow:0 16px 36px #0004}
.toolbar{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:18px 0}label{display:flex;flex-direction:column;gap:6px;font-size:.9rem;color:#d4e2ee}
select,button{font:inherit;border-radius:10px;padding:11px 12px;background:#12223b;color:#fff;border:1px solid #506681;cursor:pointer}
select:focus-visible,button:focus-visible{outline:3px solid var(--accent);outline-offset:3px}button{background:#2c4d67}button:hover{background:#416680}
.buttonbar{display:flex;flex-wrap:wrap;gap:10px;margin:16px 0}#story{border-left:3px solid var(--mint);padding-left:18px;min-height:170px}#story h2{font:1.65rem/1.25 Georgia,serif;color:var(--accent)}
#trail{padding:8px 12px;background:#101e33;border-radius:12px;min-height:56px}.foot{font-size:.85rem;color:#aebecf;margin-top:18px}
@media(max-width:620px){.toolbar{grid-template-columns:1fr}main{padding:20px 12px}}
</style></head><body><main>
<header><span class="ribbon">PLAY LOCAL · NO NETWORK · NO WORK HARVEST</span><h1>🏮 Lantern Ferry</h1><p class="muted">A little passage through 420 imagined doors. Twenty inventions meet one another, and META145 joins the party. No performance pressure, no leaderboards, no research assignments.</p></header>
<section class="card" aria-label="Choose a fictional door">
<div class="toolbar"><label>Choose a traveler<select id="root"></select></label><label>Choose a companion method<select id="ext"></select></label></div>
<div class="buttonbar"><button id="open">Open this door</button><button id="random">Surprise me</button><button id="clear">Leave the trail quiet</button></div>
<div id="story" aria-live="polite"></div>
<div class="buttonbar"><button data-choice="Wonder">Wonder aloud</button><button data-choice="Repair">Repair a tiny thing</button><button data-choice="Tea">Make tea instead</button></div>
<div id="trail" aria-live="polite"><small>Your imaginary journey hasn't begun.</small></div>
</section>
<p class="foot">Private Palace and actual Brain contents are never requested. Every place and puzzle is generated solely from these public operator labels. Nothing is saved, posted, analyzed, or transmitted. Just an optional storybook.</p>
</main><script type="application/json" id="deck">${data}</script><script>
'use strict';
const data=JSON.parse(document.querySelector('#deck').textContent),byId=new Map(data.cards.map(c=>[c.id,c]));
const root=document.querySelector('#root'),ext=document.querySelector('#ext'),story=document.querySelector('#story'),trail=document.querySelector('#trail');
for(const item of data.roots){const o=document.createElement('option');o.value=item.id;o.textContent=item.title;root.append(o)}
for(const item of data.channels){const o=document.createElement('option');o.value=item.id;o.textContent=item.title;ext.append(o)}
let n=0,lastId=null;
const clear=x=>{while(x.firstChild)x.removeChild(x.firstChild)};
const p=(parent,text,tag='p')=>{const el=document.createElement(tag);el.textContent=text;parent.append(el);return el};
function openDoor(){clear(story);lastId=root.value+'.'+ext.value;const card=byId.get(lastId);if(!card){p(story,'The ferry is closed for repairs.');return}n++;p(story,card.title,'h2');p(story,'You arrive at '+card.at+'.');p(story,'Your optional quest: '+card.quest+'.');p(story,'An unexpected twist: '+card.twist+'.');p(trail,'Door '+n+': '+card.id+' · '+card.at+'. Nothing has been sent anywhere.');}
document.querySelector('#open').addEventListener('click',openDoor);
document.querySelector('#random').addEventListener('click',()=>{root.selectedIndex=Math.floor(Math.random()*root.options.length);ext.selectedIndex=Math.floor(Math.random()*ext.options.length);openDoor()});
document.querySelector('#clear').addEventListener('click',()=>{n=0;lastId=null;clear(story);clear(trail);p(trail,'The river is quiet again. Nothing was stored.','small');});
for(const btn of document.querySelectorAll('[data-choice]'))btn.addEventListener('click',()=>{if(!lastId){p(trail,'Choose a door first.');return}const v=btn.dataset.choice;const texts={Wonder:'A new question floats upstream like a paper boat.',Repair:'The bridge becomes a little safer for whoever arrives next.',Tea:'The kettle sings, and nobody needs to accomplish anything.'};p(trail,v+': '+texts[v]);});
openDoor();
</script></body></html>`;
mkdirSync(join(root,'play'),{recursive:true});const dest=join(root,'play','lantern_ferry_420.html');writeFileSync(dest,html);
console.log(JSON.stringify({path:dest,cards:deck.cards.length,bytes:Buffer.byteLength(html),externalRequests:0}));
