#!/usr/bin/env python3
"""Build owner-private, no-network HTML from verified source-derived offline rows."""
from pathlib import Path
import json,html,sys

def build(input_dir,receipt_path,out):
    root=Path(input_dir)
    nodes=[json.loads(line) for line in (root/'wikimedia_node_work_orders_1728.jsonl').read_text().splitlines()]
    spheres=[json.loads(line) for line in (root/'sphere_wikimedia_reviews_144.jsonl').read_text().splitlines()]
    houses=[json.loads(line) for line in (root/'house_wikimedia_followups_12.jsonl').read_text().splitlines()]
    audit=json.loads(Path(receipt_path).read_text())
    assert len(nodes)==1728 and len(spheres)==144 and len(houses)==12 and audit['roundsPerformed']==12
    safe=lambda x:json.dumps(x,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c').replace('>','\\u003e')
    data=safe({'nodes':nodes,'spheres':spheres,'houses':houses,'audit':{
      'checks':audit['totalStructuralChecks'],'rounds':audit['roundsPerformed'],
      'passes':[{'id':r['pass'],'name':r['perspective'],'digest':r['roundDigest']} for r in audit['rounds']]}})
    page=r'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Atlas Ariadne Wikimedia Research Observatory R10</title>
<style>
:root{color-scheme:dark;font-family:Inter,system-ui,sans-serif;--bg:#08121d;--panel:#112235;--panel2:#142b40;--text:#e7f2fd;--mute:#9bb5c8;--line:#2a4358;--accent:#7bcde7}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(ellipse at top,#153654,transparent 45%),var(--bg);color:var(--text)}main{max-width:1250px;margin:auto;padding:30px 22px 80px}
header{padding:32px 0;border-bottom:1px solid var(--line)}h1{font-size:clamp(29px,4vw,50px);letter-spacing:-.04em;margin:12px 0}.muted,small{color:var(--mute)}.eyebrow{letter-spacing:.15em;text-transform:uppercase;color:var(--accent);font-size:12px;font-weight:700}
.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:24px 0}.metric,.panel{border:1px solid var(--line);background:rgba(17,34,53,.92);border-radius:12px;padding:16px}.metric b{font-size:27px;display:block}.metric small{display:block;font-size:12px;margin-top:4px}
.controls{display:flex;gap:10px;flex-wrap:wrap;margin:22px 0}.controls>*{background:#142e43;color:#fff;border:1px solid #47627a;border-radius:9px;padding:12px;font:inherit;min-width:120px}#search{flex:2;min-width:230px}
.layout{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(320px,.8fr);gap:16px}.table-wrap{max-height:650px;overflow:auto;border:1px solid var(--line);border-radius:10px}table{border-collapse:collapse;width:100%;font-size:13px}th,td{padding:11px 12px;text-align:left;border-bottom:1px solid #263a4a}th{position:sticky;top:0;background:#1b354a}tr:hover{background:#203b52}td button{padding:2px 4px;background:transparent;color:var(--accent);border:0;font:inherit;cursor:pointer;text-align:left;text-decoration:underline}
a{color:#a8e4fa}.tag{display:inline-block;border-radius:5px;background:#234a62;padding:4px 7px;color:#c0f0ff;font-size:11px;margin:3px 5px 3px 0}.tag.held{background:#4c3c25;color:#f1d5ab}h2{margin:0 0 15px;font-size:19px}.detail h3{margin-top:20px;font-size:16px}.detail p{line-height:1.5}ul{padding-left:20px}.note{padding:10px 14px;border-left:3px solid #8fd1e4;background:#142c40;border-radius:5px;color:#b6ceda}
.sr-only{position:absolute;left:-10000px}button:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #e7bd5e}
@media(max-width:900px){.layout{grid-template-columns:1fr}.metrics{grid-template-columns:repeat(2,1fr)}}
</style></head><body><main><header><div class="eyebrow">ATLAS ONE × ARIADNE × WIKIPEDIA × WIKIDATA</div><h1>Wikimedia Research Observatory</h1><p class="muted">R10 • 12 verified offline audit passes • all 1,728 original node addresses • historical OpenAlex topic candidates • Wikimedia ingestion is NOT LIVE, NOT CANON.</p></header>
<div class="metrics"><div class="metric"><b>12</b><small>Distinct local audit passes</small></div><div class="metric"><b>3,234,816</b><small>Offline source checks</small></div><div class="metric"><b>4,516</b><small>Historical OpenAlex topics</small></div><div class="metric"><b>0</b><small>Approved Wikipedia↔HSN facts</small></div></div>
<div class="panel note"><strong>Knowledge integrity:</strong> OpenAlex topic links are historical heuristic candidates, not semantic equivalents. Wikipedia pages and Wikidata QIDs are deliberately unresolved until explicitly fetched, revision-locked, license-checked and independently reviewed. The private original ontology is not exported through public Git.</div>
<div class="controls"><label class="sr-only" for="search">Search HSN node or topic</label><input id="search" type="search" placeholder="Search coordinates, disciplines, OpenAlex topics ..." aria-label="Search nodes and topics"><label class="sr-only" for="house">House filter</label><select id="house" aria-label="Filter House"><option value="">All Houses</option></select><label class="sr-only" for="role">Role filter</label><select id="role" aria-label="Role filter"><option value="">All roles</option><option value="DOMAIN_SPECIALIZATION">Domain</option><option value="EPISTEMIC_META">Epistemic</option></select><button id="clear" type="button">Reset</button></div>
<div class="layout"><section class="panel"><h2>HSN research ledger <span id="matches" class="muted"></span></h2><div class="table-wrap"><table><thead><tr><th>Coordinate</th><th>Source subject</th><th>OpenAlex candidate count</th><th>Wikimedia state</th></tr></thead><tbody id="tbody"></tbody></table></div><p class="muted" id="paging" aria-live="polite"></p></section>
<section class="panel detail" id="detail" aria-live="polite"><h2>Choose an HSN coordinate</h2><p class="muted">Select any row to see its original subject name, candidate topics, and missing Wikimedia steps. Live research actions and publishing are deliberately disabled.</p></section></div>
<section class="panel" style="margin-top:17px"><h2>Twelve audit perspectives</h2><div id="passes"></div></section>
<footer class="muted" style="margin-top:22px">Owner-private offline source-aligned explorer. All examples require independent source and rights review. No API traffic, roles, resident wakes or CANON changes.</footer></main>
<script id="data" type="application/json">__ATLAS_JSON__</script>
<script>
(()=>{const D=JSON.parse(document.getElementById('data').textContent),$=x=>document.getElementById(x),escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
for(const h of D.houses){const e=document.createElement('option');e.value=h.house;e.textContent=h.house+' '+h.name;$('house').append(e)}
let chosen=null;
function detail(n){
  chosen=n.coordinate;
  const all=n.allOpenalexCandidates||[], primary=n.candidateDisplay.primaryCandidates;
  $('detail').innerHTML='<h2>'+escape(n.coordinate)+' · '+escape(n.sourceNodeName)+'</h2><div><span class="tag">'+escape(n.sourceRole)+'</span><span class="tag held">NOT CANON</span></div>'+
    '<p><strong>Sphere:</strong> '+escape(n.sphere)+' &nbsp; <strong>House:</strong> '+escape(n.house)+'</p>'+
    '<h3>Historical OpenAlex candidates</h3><p class="muted">'+all.length+' total candidates: '+primary+' primary and '+(all.length-primary)+' alternate. Full denominator preserved; no match is scientifically reviewed.</p>'+
    '<ul id="topic-list"></ul><p id="topic-more" class="muted"></p>'+
    '<h3>Wikipedia / Wikidata</h3><p class="muted">Wikipedia URL: not yet confirmed • Wikidata QID: not yet resolved • Versioned page content: not yet fetched.</p>'+
    '<p class="note">Next research action: '+escape(n.nextStage.replaceAll('_',' '))+'. The research queue must retrieve current OpenAlex <code>ids.wikipedia</code>, confirm Wikipedia page ID and revision, resolve the Wikidata sitelink and obtain consented Work review. No automatic semantic equivalence.</p>';
  let shown=0;
  function showNext(){const chunk=all.slice(shown,shown+40);const list=$('topic-list');
    for(const t of chunk){const li=document.createElement('li'),a=document.createElement('a'),lab=document.createElement('span');
      a.href='https://openalex.org/'+encodeURIComponent(t.id);a.target='_blank';a.rel='noopener noreferrer';a.textContent=t.id;
      lab.textContent=' '+t.label+' — unreviewed rank '+t.rank;li.append(a,lab);list.append(li)}
    shown+=chunk.length;const holder=$('topic-more');holder.replaceChildren();
    const summary=document.createElement('span');summary.textContent='Showing '+shown+' of '+all.length+' candidate links. Omitted: '+(all.length-shown)+'.';holder.append(summary);
    if(shown<all.length){const more=document.createElement('button');more.type='button';more.textContent='Show next '+Math.min(40,all.length-shown);more.id='topic-next';more.onclick=showNext;holder.append(more)}
  }
  showNext();
}
function render(){const q=$('search').value.trim().toLowerCase(),house=$('house').value,role=$('role').value;let hits=D.nodes.filter(n=>(!house||n.house===house)&&(!role||n.sourceRole===role)&&(!q||[n.coordinate,n.sourceNodeName,n.sphere,n.house,...(n.allOpenalexCandidates||[]).flatMap(x=>[x.id,x.label])].join(' ').toLowerCase().includes(q)));$('matches').textContent='('+hits.length+')';$('tbody').replaceChildren();for(const n of hits.slice(0,120)){const tr=document.createElement('tr');let c=document.createElement('td'),button=document.createElement('button');button.type='button';button.textContent=n.coordinate;button.onclick=()=>detail(n);c.append(button);tr.append(c);for(const val of [n.sourceNodeName,String(n.openalexCandidateCount),n.wikipedia.status.replaceAll('_',' ').toLowerCase()]){const e=document.createElement('td');e.textContent=val;tr.append(e)}$('tbody').append(tr)}$('paging').textContent='Showing '+Math.min(120,hits.length)+' of '+hits.length+' matching records. Refine your search for others.';if(hits.length===1)detail(hits[0]);}
for(const p of D.audit.passes){const el=document.createElement('span');el.className='tag';el.title=p.digest;el.textContent=p.id+' '+p.name;$('passes').append(el)}
for(const i of ['search','house','role'])$(i).addEventListener(i==='search'?'input':'change',render);$('clear').onclick=()=>{$('search').value='';$('house').value='';$('role').value='';render()};render();})();
</script></body></html>'''
    Path(out).write_text(page.replace('__ATLAS_JSON__',data),encoding='utf8')
    return {'nodes':len(nodes),'bytes':Path(out).stat().st_size,'noNetwork':True,'rounds':audit['roundsPerformed']}

if __name__=='__main__':
    import argparse
    a=argparse.ArgumentParser();a.add_argument('--input',required=True);a.add_argument('--audit',required=True);a.add_argument('--out',required=True);args=a.parse_args()
    print(build(args.input,args.audit,args.out))
