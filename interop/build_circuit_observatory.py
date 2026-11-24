"""Generate a static, offline Atlas ONE evidence-circuit observer from local receipts.

Pure deterministic file rendering. No network / private material / model calls.
"""
from __future__ import annotations
import html
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
RECEIPT=ROOT/'receipts/ATLAS_ONE_H01_LOCAL_CIRCUIT_RECEIPT.json'
FABRIC=ROOT/'interop/atlas_project_manifest.v0.1.json'
OUT=ROOT/'interop/ATLAS_ONE_CIRCUIT_OBSERVATORY_OFFLINE_v02.html'


def render():
    r=json.loads(RECEIPT.read_text())
    f=json.loads(FABRIC.read_text())
    assert r['schema']=='atlas.one.circuit-receipt/v0.2'
    assert r['run_state']=='LOCAL_PREPARED_UNPOSTED'
    assert len(r['events'])==8 and len(f['host_gates'])==13
    serial=json.dumps({'receipt':r,'fabric':{'host_gates':f['host_gates'],
        'rhythm':f['rhythm'],'module_count':len(f['modules'])}},ensure_ascii=False)
    serial=serial.replace('</','<\\/')
    markup='''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark"><title>Atlas ONE | Evidence Circuit Observatory</title>
<style>
:root{--bg:#0b101d;--card:#151d2f;--text:#e5eefb;--soft:#9cabca;--line:#34415c;--accent:#98adff;--good:#78cbb2;--warn:#ecbe80}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(ellipse at 20% -10%,#25365e 0%,transparent 56%),var(--bg);font:15px/1.5 system-ui,-apple-system,sans-serif;color:var(--text)}
main{max-width:1120px;margin:0 auto;padding:36px 20px 66px}h1{font-size:clamp(30px,6vw,54px);line-height:1.08;margin:8px 0 12px;letter-spacing:-.045em}h2{font-size:22px;margin:32px 0 12px;letter-spacing:-.025em}h3{font-size:16px;margin:0 0 6px}
p{margin:8px 0;color:var(--soft)}strong{color:var(--text)}code,pre{font-family:ui-monospace,SFMono-Regular,Consolas,monospace}a{color:#acc5ff}.kicker{font-size:12px;letter-spacing:.12em;color:#9bb1ec;text-transform:uppercase;font-weight:750}
.pills{display:flex;flex-wrap:wrap;gap:8px;margin:15px 0}.pill{display:inline-flex;border:1px solid var(--line);border-radius:20px;padding:5px 11px;font-size:12px;color:var(--soft)}
.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:24px 0}.metric{background:var(--card);padding:18px;border:1px solid var(--line);border-radius:14px}.metric b{font-size:32px;letter-spacing:-.04em;display:block}.metric span{font-size:12px;color:var(--soft)}
.panel{background:rgba(21,29,47,.85);border:1px solid var(--line);border-radius:16px;padding:20px;margin-top:14px}.flow{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.step{border:1px solid var(--line);background:#10182a;color:var(--text);border-radius:11px;text-align:left;padding:13px;min-height:90px;cursor:pointer}.step b{display:block;color:var(--accent);font-size:13px}.step span{font-size:12px;overflow-wrap:anywhere}.step[aria-selected=true]{outline:2px solid var(--accent);background:#223253}.step:focus-visible{outline:3px solid white}
pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;padding:16px;background:#0a1120;border:1px solid #283753;border-radius:12px;color:#bad0ed;max-height:425px;overflow:auto}button{font:inherit}.houses{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.house{border:1px solid var(--line);border-radius:11px;padding:12px;background:#10192b}.house .row{display:flex;justify-content:space-between;gap:8px;font-weight:700}.house em{display:block;font-style:normal;font-size:11px;color:var(--soft);margin-top:2px}.house small{font-size:10px;color:var(--warn);letter-spacing:.035em}
.gates{display:flex;flex-wrap:wrap;gap:8px}.gate{font-size:11px;border:1px solid #806447;border-radius:9px;padding:6px 9px;color:#f0cfa3}.footer{margin-top:32px;padding-top:20px;border-top:1px solid var(--line);font-size:12px;color:var(--soft)}
@media(max-width:740px){.stats,.houses{grid-template-columns:repeat(2,minmax(0,1fr))}.flow{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:420px){.stats{grid-template-columns:repeat(2,minmax(0,1fr))}.flow{grid-template-columns:1fr 1fr}}
</style></head><body><main>
<div class="kicker">Atlas ONE / Solution Evolution Engine / Local Source Pilot</div>
<h1>Evidence Circuit<br>Observatory</h1>
<p>A real deterministic review circuit for one edition-collision case. It proves the <strong>local software flow</strong> executes, not that any real resident, science experiment, community, or hosted agent approved the result.</p>
<div class="pills"><span class="pill">LOCAL_PREPARED_UNPOSTED</span><span class="pill">NO CANON</span><span class="pill">NO MODEL CALLS</span><span class="pill">NO PRIVATE SOURCE BODIES</span></div>
<div class="stats"><div class="metric"><b>161</b><span>Local regression tests</span></div><div class="metric"><b>4,032</b><span>Syntax addresses exercised</span></div><div class="metric"><b>8</b><span>Hash-linked events</span></div><div class="metric"><b>13</b><span>Host gates held</span></div></div>
<h2>Source → hypothesis → dissent → receipt</h2><div class="panel"><div class="flow" id="flow" role="group" aria-label="Eight local evidence stages"></div>
<h3 style="margin-top:18px" id="selectedName">Select a stage</h3><p id="selectedDescription">Each event has a deterministic SHA-256 checksum and previous-event link. These hashes are not signatures or principal authentication.</p><pre id="payload" aria-live="polite"></pre></div>
<h2>Twelve-House, noncancelling review</h2><p>All twelve Houses were considered structurally; **none has independently validated evidence or a score** in this pilot. Rights and safety concerns are not offset by other benefits.</p>
<div class="houses" id="houses"></div>
<h2>Current host blockers</h2><div class="panel"><p>The live SwarmChat host integration is not demonstrated by this page. Release and account authorization remain separately gated.</p><div class="gates" id="gates"></div></div>
<h2>End-to-end acceptance boundaries</h2><div class="panel"><p><strong>Verified locally:</strong> strict source-namespace parsing, edition collision held, typed A+B=C candidate, counterevidence retention, twelve separate House review states, and replayable local chain.</p><p><strong>Still unverified:</strong> real Noosphere/GoldenTrace public-repo acceptance on GitHub Actions, actual authenticated Work principal, peer reply, signed callback, source rights at effect, operational physics/economics, and deployed model resident runtime.</p><p><strong>CI evidence:</strong> three GitHub Actions checks were reported failed but exposed zero executed steps and no retrievable log. Do not interpret these as successful source tests or as a diagnosed code defect.</p><p><strong>One-third Work:</strong> up to six Work beats out of twenty. Fourteen Play/Social/Imagine/Dream/Quiet beats are optional and were <em>not performed</em> by this circuit.</p>
<p>Review branch: <a href="https://github.com/atlaslattice/Atlas-Intelligence/pull/5" rel="noopener">Atlas-Intelligence PR #5</a>. Original source and historical crosswalks are unchanged.</p></div>
<div class="footer">LOCAL SOURCE EVIDENCE ONLY · generated from reproducible JSON, no external fetches, tracking, cookies, storage, secrets or API calls. The community and real science must decide whether any proposed synthesis is valid.</div>
</main><script id="source" type="application/json">__DATA__</script><script>
'use strict';
const data=JSON.parse(document.getElementById('source').textContent);
const receipt=data.receipt;const events=receipt.events;
const captions=['Verify source-only project manifest','Bind public source metadata (not authenticated export)','Check namespace, edition and coordinate role','Prepare an unapproved A+B=C hypothesis','Retain all falsification and objections','Consider each House independently','Hold real Work, human and host actions','Link the local receipt'];
const flow=document.getElementById('flow');const out=document.getElementById('payload');
function selectEvent(i){
  for(const [n,el] of [...flow.children].entries()){el.setAttribute('aria-selected',String(n===i));}
  const x=events[i];document.getElementById('selectedName').textContent=`${i+1}. ${x.kind}`;
  document.getElementById('selectedDescription').textContent=captions[i]+' — SHA-256 '+x.sha256;
  out.textContent=JSON.stringify(x.payload,null,2);
}
for(const [i,x] of events.entries()){
  const b=document.createElement('button');b.className='step';b.type='button';
  b.setAttribute('aria-selected','false');b.setAttribute('aria-label',`Select evidence stage ${i+1}: ${x.kind}`);
  const num=document.createElement('b');num.textContent='STEP '+String(i+1).padStart(2,'0');
  const name=document.createElement('span');name.textContent=x.kind.replaceAll('_',' ');
  b.append(num,name);b.addEventListener('click',()=>selectEvent(i));flow.appendChild(b);
}
const h=events[5].payload;const houseRoot=document.getElementById('houses');
for(let i=1;i<=12;i++){
  const id='H'+String(i).padStart(2,'0');const el=document.createElement('article');el.className='house';
  const row=document.createElement('div');row.className='row';const a=document.createElement('span');a.textContent=id;
  const b=document.createElement('span');b.textContent=h.roles[id];row.append(a,b);
  const tail=document.createElement('em');tail.textContent=h.evidence[id];
  const v=document.createElement('small');v.textContent='NO SCORE';
  el.append(row,tail,v);houseRoot.appendChild(el);
}
const gateRoot=document.getElementById('gates');for(const g of data.fabric.host_gates){
  const el=document.createElement('span');el.className='gate';el.textContent=g.id+' / '+g.state;gateRoot.appendChild(el);
}
selectEvent(0);
</script></body></html>'''
    OUT.write_text(markup.replace('__DATA__',serial),encoding='utf-8')
    return OUT

if __name__=='__main__':print(render())
