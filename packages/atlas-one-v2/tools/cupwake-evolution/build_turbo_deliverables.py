#!/usr/bin/env python3
"""Build an owner-local report and offline explorer from verified runtime data."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import sqlite3

from evolution.engine import EvolutionEngine
from integrations.adapters import DeliveryOutbox, SourceRegistry
from run_evolution import read_inputs, verify_local_references, build_lock


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", required=True, type=Path)
    parser.add_argument("--state", type=Path)
    parser.add_argument("--out", type=Path)
    args = parser.parse_args()
    root, state = args.root.resolve(), (args.state or args.root / "runtime").resolve()
    out = (args.out or root / "deliverables/turbo12").resolve()
    out.mkdir(parents=True, exist_ok=True)
    with build_lock(state / "build.lock"):
        generate(root, state, out)


def generate(root, state, out):
    manifest = read(state / "ONE_BUILD_MANIFEST.json")
    verified_inputs = read_inputs(root)
    with EvolutionEngine(state / "evolution.sqlite", **verified_inputs) as engine:
        engine.verify(expected_head=manifest["engine"]["head"])
        if engine.summary() != manifest["engine"]:
            raise ValueError("STALE_BUILD_MANIFEST")
        source_registry = SourceRegistry(verified_inputs["original_source_bytes"], verified_inputs["catalog_bytes"])
        box = DeliveryOutbox(state / "outbox.sqlite", source_registry)
        box.verify()
        if box.summary() != manifest["delivery"] or box.summary()["states"] != {"LOCAL_DELIVERED": box.summary()["total"]}:
            raise ValueError("STALE_DELIVERY_MANIFEST")
        if verify_local_references(source_registry, engine, state) != manifest["currentLocalReferences"]:
            raise ValueError("CURRENT_REFERENCE_PROOF_MISMATCH")
    if manifest["status"] != "LOCAL_BUILD_AND_REFERENCE_INTEGRATION_COMPLETE":
        raise ValueError("BUILD_NOT_COMPLETE")
    original = json.loads(verified_inputs["original_source_bytes"])
    catalog = json.loads(verified_inputs["catalog_bytes"])
    proposals = {p["sphere"]: p for p in catalog["items"]}
    release = read(root / "evidence/turbo_release.json") if (root / "evidence/turbo_release.json").exists() else {}
    tests = read(root / "evidence/turbo_test_summary.json") if (root / "evidence/turbo_test_summary.json").exists() else {}
    with sqlite3.connect((state / "evolution.sqlite").as_uri() + "?mode=ro", uri=True) as db:
        receipts = [json.loads(row[0]) for row in db.execute("SELECT receipt FROM passes WHERE cycle=(SELECT max(cycle) FROM cycles) ORDER BY pass_id")]
    if len(receipts) != 12:
        raise ValueError("TWELVE_PASS_CYCLE_REQUIRED")
    data = {
        "manifest": manifest, "receipts": receipts, "release": release, "tests": tests,
        "houses": [{"id": k, "name": v["name"]} for k, v in sorted(original["houses"].items())],
        "spheres": [{"id": k, "name": v["name"], "house": k[:3]} for k, v in sorted(original["spheres"].items())],
        "nodes": [{"id": k, "name": v["name"], "definition": v["definition"],
                   "includes": v["includes"], "excludes": v["excludes"], "role": v["kind"],
                   "house": k[:3], "sphere": k[:7], "mode": proposals[k[:7]]["suggestedMode"],
                   "declaredRecordSha256": v["source_record_sha256"]}
                  for k, v in sorted(original["nodes"].items())],
    }
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
    html = HTML.replace("__PAYLOAD__", payload)
    (out / "ATLAS_TURBO12_EXPLORER.html").write_text(html, encoding="utf-8")
    e, d = manifest["engine"], manifest["delivery"]
    report = [
        "# Cupwake · Twelve-pass evolution build", "",
        "**1728 nodes · 144 spheres · 12 houses · 1 build**  ",
        "**1728 nodes · 144 spheres · 12 houses · 1 build**  ",
        "**1728 nodes · 144 spheres · 12 houses · 1 build**", "",
        "## Completed result", "",
        f"The latest sealed cycle contains **{len(receipts)} completed computational passes**, "
        f"**{sum(r['totalPredicateEvaluations'] for r in receipts):,} deterministic predicate evaluations** and "
        f"**{manifest['currentLocalReferences']['total']:,} currently verified source-bound local integration references**. "
        "The references cover Atlas, Ariadne, SwarmChat and Iron Empire, 1,728 per system. "
        "The full source topology and original definitions remain intact.", "",
        "These are actual local computations and filesystem writes. They are not independent "
        "expert judgments, semantic acceptances, resident model turns, application deployments or story canon. "
        "A separately observed broker contribution and Git source publication have their own receipts.", "",
        "## Source identity and scope", "",
        f"- Original Ariadne v0.7 bytes: `{e['sourceSha256']}`.",
        f"- Engine run: `{e['runId']}`; current head: `{e['head']}`.",
        f"- Implementation bytes: `{e.get('implementationSha256','See exact release code pins')}`.",
        "- 1,008 domain nodes and 720 epistemic nodes, inherited from the Sphere role axis.",
        "- 1,248 Work initiative routes and 480 protected optional initiative routes.",
        "- All 1,728 nodes remain available for separately authorized source review; optional initiative bodies are not relabeled as Work.",
        "- Identity joins use exact edition, coordinates and source digests. Names, lexical scores and coordinates alone do not establish equivalence.", "",
        "## Twelve completed passes", "",
        "Each pass contains 1,728 stored vectors with 156 results each: 144 Sphere lenses plus 12 distinct House lenses. "
        "Across twelve passes this is 20,736 node/pass rows, 2,985,984 Sphere predicates and 248,832 House predicates. "
        "The prior result digest is carried into the next pass. Repeated source positions remain explicitly repeated; "
        "the stages are different deterministic checks, not twelve independent semantic reviews.", "",
        "| Pass | Implemented stage | Predicate evaluations | Build digest |", "|---:|---|---:|---|",
    ]
    for receipt in receipts:
        report.append(f"| {receipt['passId']} | {receipt['name'].replace('_',' ')} | {receipt['totalPredicateEvaluations']:,} | `{receipt['buildHash']}` |")
    report += ["", "## Automatic local integration", "",
        "One finite command resumes the active cycle, verifies its hash chain, creates idempotent delivery intents, "
        "writes local references for all four systems, checks their readback hashes and seals one build manifest. "
        "A repeated invocation creates no duplicate node results or delivery rows. New evidence produces a versioned "
        "invalidation event; node changes propagate to their Sphere, House and build and to declared dependents. "
        "An explicit subsequent cycle preserves the old history.", "",
        "The outbox persists worker leases and delivery phases. External writes with an uncertain acknowledgment "
        "wait for reconciliation; local writes use atomic create-if-absent and payload comparison. Current read, "
        "dispatch and return checks remain distinct. A callback's assertion is not independent host evidence.", "",
        "| System | Common source identities | Completed local output | Hosted state |",
        "|---|---:|---|---|",
        "| Atlas | 1,728 | Source-bound candidate reference store | Not deployed by this build |",
        "| Ariadne | 1,728 | Original-identity and scope reference store | Original edition preserved |",
        "| SwarmChat | 1,728 | Source-only transport references and Work Burst bridge | Node dispatch unavailable in current broker |",
        "| Iron Empire | 1,728 | Source-schema references with pinned proposed story editions | No story canon changes |", "",
        "## Verification and publication receipts", "", "```json", json.dumps({"tests":tests,"release":release}, indent=2), "```", "",
        "## Running and continuing the build", "",
        "From the checked-out source package, supply the owner-local input directory:", "", "```sh",
        "python3 run_evolution.py build --root /absolute/path/to/cupwake-circuit-1728",
        "python3 run_evolution.py verify --root /absolute/path/to/cupwake-circuit-1728",
        "python3 run_evolution.py status --root /absolute/path/to/cupwake-circuit-1728", "```", "",
        "`build` resumes or verifies the current sealed cycle. A new cycle is explicit and requires its current "
        "head. The existing scheduled controller remains responsible for actual future visits; this executable "
        "does not start a new scheduler or make model calls. Algorithm changes require a new pinned runtime store; "
        "a source edition change requires a separate source binding.", "",
        "## Complete 1,728-node common index", "",
        "Every row below has one local reference per target system. `META` is a source role, not a claim of "
        "domain equivalence. Optional proposal modes remain unchanged. The offline explorer includes the full "
        "definition, includes and excludes text for every node.", "",
        "| Node | Original source name | Role | Initiative mode | Local references |",
        "|---|---|---|---|---:|",
    ]
    for node in data["nodes"]:
        name = node["name"].replace("|", "\\|").replace("\n", " ")
        role = "DOMAIN" if node["role"] == "DOMAIN_SPECIALIZATION" else "META"
        report.append(f"| `{node['id']}` | {name} | {role} | {node['mode']} | 4 |")
    (out / "ATLAS_TURBO12_BUILD_REPORT.md").write_text("\n".join(report) + "\n", encoding="utf-8")
    (out / "TWELVE_PASS_RECEIPTS.json").write_text(json.dumps(receipts, indent=2) + "\n", encoding="utf-8")
    (out / "ONE_BUILD_MANIFEST.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(out), "nodes": len(data["nodes"]), "passes": len(receipts), "files": [p.name for p in out.iterdir() if p.is_file()]}))


HTML = r'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Atlas · Twelve-pass evolution build</title>
<style>
:root{color-scheme:dark;--bg:#0b121c;--panel:#131e2b;--line:#293849;--ink:#edf3f9;--muted:#a3b6ca;--mint:#76d9bd;--gold:#f2c773}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 system-ui,sans-serif}main{max-width:1440px;margin:auto;padding:30px}header{border-bottom:1px solid var(--line);padding-bottom:24px}.eyebrow{color:var(--mint);text-transform:uppercase;letter-spacing:.15em;font-size:12px}h1{font-size:clamp(28px,4vw,54px);line-height:1.12;margin:12px 0}h2{font-size:23px;margin-top:30px}p{max-width:1000px}.muted{color:var(--muted)}.mantra{color:var(--gold);font-weight:600}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:24px 0}.stat,.panel{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:20px}.stat strong{display:block;font-size:32px;color:var(--mint)}.stat small{color:var(--muted)}.notice{border-left:3px solid var(--gold);padding:12px 18px;background:#201f22;border-radius:4px;color:#e5d9bf}.houses{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}button,input,select{font:inherit;color:inherit;background:#172536;border:1px solid #3b5065;border-radius:7px;padding:9px 12px}button{cursor:pointer;text-align:left}button:hover,button:focus{border-color:var(--mint)}button[aria-pressed=true]{background:#20433d;border-color:var(--mint)}.house span{display:block;color:var(--muted);font-size:12px}.filters{display:flex;flex-wrap:wrap;gap:10px;margin:18px 0}.filters input{flex:1;min-width:200px}.split{display:grid;grid-template-columns:1.25fr 1fr;gap:18px}.scroll{overflow:auto;max-height:660px}table{border-collapse:collapse;width:100%;font-size:13px}th,td{text-align:left;padding:10px;border-bottom:1px solid var(--line);vertical-align:top}th{color:var(--muted);position:sticky;top:0;background:var(--panel)}td button{padding:2px 4px;border:0;color:var(--mint);background:transparent}.chip{display:inline-block;padding:2px 7px;border-radius:12px;background:#25374a;font-size:11px}.detail h3{font-size:22px;margin-top:8px}.detail h4{color:var(--mint);margin-bottom:6px}.detail .exclude h4{color:var(--gold)}code{font:12px ui-monospace,monospace;overflow-wrap:anywhere}.platforms{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:18px}.platforms div{padding:9px;background:#1b2d3e;border-radius:6px;font-size:12px}.stages{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.stage{border-left:3px solid var(--mint);padding:12px 16px;background:var(--panel);border-radius:6px}.stage strong{display:block}.stage small{color:var(--muted)}details{margin-top:22px}pre{overflow:auto;font:12px/1.6 ui-monospace,monospace;white-space:pre-wrap;overflow-wrap:anywhere}.pager{display:flex;align-items:center;gap:14px;margin-top:12px}footer{margin-top:35px;border-top:1px solid var(--line);padding-top:20px;color:var(--muted);font-size:12px}a{color:var(--mint)}@media(max-width:950px){.split{grid-template-columns:1fr}.houses{grid-template-columns:repeat(3,1fr)}.stages{grid-template-columns:1fr 1fr}}@media(max-width:600px){main{padding:16px}.stats,.houses,.stages{grid-template-columns:1fr 1fr}.stat{padding:14px}.stat strong{font-size:25px}.platforms{grid-template-columns:1fr}.filters>*{width:100%}}
</style></head><body><main>
<header><div class="eyebrow">Cupwake · Source-bound evolution</div><h1>One atlas. Twelve passes.<br>Four connected local reference stores.</h1><p class="muted">A reproducible build over the original Ariadne v0.7 geometry. Explore the source identities, preserved scope boundaries and completed computation receipts.</p><div class="mantra">1728 nodes · 144 spheres · 12 houses · 1 build<br>1728 nodes · 144 spheres · 12 houses · 1 build<br>1728 nodes · 144 spheres · 12 houses · 1 build</div></header>
<section class="stats" id="stats" aria-label="Verified build counts"></section>
<div class="notice">Local build and reference integration complete. The engine has not deployed updates to the hosted applications. Predicate evaluations are deterministic checks; they are not independent expert reviews, model turns or accepted knowledge.</div>
<h2>Twelve Houses, one source identity</h2><p class="muted">Choose a House to inspect its 144 nodes. Definitions and exclusions are preserved from the original source. Optional initiative modes remain separate from source review.</p><section class="houses" id="houses"></section>
<div class="filters"><input id="query" type="search" placeholder="Search node identity or source text" aria-label="Search nodes"><select id="sphere" aria-label="Sphere"><option value="">All Spheres</option></select><select id="role" aria-label="Source role"><option value="">All roles</option><option value="DOMAIN_SPECIALIZATION">Domain</option><option value="EPISTEMIC_META">Epistemic meta</option></select><button id="reset">Reset filters</button></div>
<section class="split"><div class="panel"><div id="count" class="muted" aria-live="polite"></div><div class="scroll"><table><thead><tr><th>Node</th><th>Original source name</th><th>Role / mode</th></tr></thead><tbody id="rows"></tbody></table></div><div class="pager"><button id="previous">Previous</button><span id="page"></span><button id="next">Next</button></div></div><article id="detail" class="panel detail" aria-live="polite"></article></section>
<h2>Twelve completed computational passes</h2><p class="muted">Each stage computes 144 Sphere predicates and 12 House predicates for every node, preserves the previous result hash, and reduces node results through Sphere, House and build digests.</p><section class="stages" id="stages"></section>
<details><summary>Build, verification and publication receipts</summary><pre id="receipts"></pre></details>
<footer>This offline artifact contains owner-selected source text. No network requests, tracking, model calls or hidden background execution. Source roles: S01–S07 domain; S08–S12 epistemic meta. Fiction references remain proposed editorial material.</footer>
</main><script id="atlas-data" type="application/json">__PAYLOAD__</script><script>
'use strict';
const DATA=JSON.parse(document.getElementById('atlas-data').textContent);
const E=DATA.manifest.engine;const $=id=>document.getElementById(id);let house='',page=0,selected=DATA.nodes[0].id;const PAGE=60;
const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e};
const num=x=>Number(x).toLocaleString('en-US');
for(const [value,label,note] of [[E.canonicalNodes,'Original nodes','1008 domain · 720 meta'],[DATA.receipts.length,'Completed passes','Versioned, linked receipts'],[num(DATA.receipts.reduce((n,r)=>n+r.totalPredicateEvaluations,0)),'Predicate evaluations','20,736 stored node/pass vectors'],[num(DATA.manifest.currentLocalReferences.total),'Local references','1728 for each of four systems']]){const c=el('div',undefined,'stat');c.append(el('strong',value),el('div',label),el('small',note));$('stats').append(c)}
for(const h of DATA.houses){const b=el('button',undefined,'house');b.append(el('strong',h.id+' · '+h.name),el('span','12 Spheres · 144 nodes'));b.setAttribute('aria-pressed','false');b.dataset.house=h.id;b.onclick=()=>{house=house===h.id?'':h.id;page=0;refreshSpheres();render()};$('houses').append(b)}
function refreshSpheres(){const current=$('sphere').value;$('sphere').replaceChildren(el('option','All Spheres'));$('sphere').firstChild.value='';for(const s of DATA.spheres.filter(s=>!house||s.house===house)){const o=el('option',s.id+' · '+s.name);o.value=s.id;$('sphere').append(o)}if([...$('sphere').options].some(o=>o.value===current))$('sphere').value=current}
refreshSpheres();
function filtered(){const q=$('query').value.trim().toLowerCase();return DATA.nodes.filter(n=>(!house||n.house===house)&&(!$('sphere').value||n.sphere===$('sphere').value)&&(!$('role').value||n.role===$('role').value)&&(!q||[n.id,n.name,n.definition,n.includes,n.excludes].some(s=>s.toLowerCase().includes(q))))}
function render(){const list=filtered();const pages=Math.max(1,Math.ceil(list.length/PAGE));page=Math.min(page,pages-1);$('count').textContent=num(list.length)+' matching original source nodes';$('page').textContent='Page '+(page+1)+' of '+pages;$('previous').disabled=page===0;$('next').disabled=page===pages-1;$('rows').replaceChildren();for(const n of list.slice(page*PAGE,(page+1)*PAGE)){const tr=el('tr');const td=el('td');const b=el('button',n.id);b.onclick=()=>{selected=n.id;detail()};td.append(b);const kind=el('td');kind.append(el('span',n.role==='DOMAIN_SPECIALIZATION'?'DOMAIN':'META','chip'),el('div',n.mode,'muted'));tr.append(td,el('td',n.name),kind);$('rows').append(tr)}for(const b of $('houses').children)b.setAttribute('aria-pressed',String(house===b.dataset.house));if(list.length&&!list.some(n=>n.id===selected))selected=list[0].id;detail()}
function detail(){const n=DATA.nodes.find(n=>n.id===selected);const d=$('detail');d.replaceChildren(el('code',n.id),el('h3',n.name),el('span',n.role+' · '+n.mode,'chip'));for(const [title,key] of [['Original definition','definition'],['Included source scope','includes'],['Excluded source scope','excludes']]){const box=el('section',undefined,key==='excludes'?'exclude':'');box.append(el('h4',title),el('p',n[key]));d.append(box)}const q=$('query').value.trim().toLowerCase();if(q){const positive=[n.name,n.definition,n.includes].some(t=>t.toLowerCase().includes(q));const negative=n.excludes.toLowerCase().includes(q);d.append(el('p',negative&&!positive?'This phrase occurs only in exclusions. Retrieval is not source membership or semantic approval.':negative?'This phrase appears in both affirmative and excluded text. Review the full scope.':'Literal retrieval is a navigation aid, not semantic acceptance.','notice'))}d.append(el('h4','Original declared record digest'),el('code',n.declaredRecordSha256));const p=el('div',undefined,'platforms');for(const target of ['Atlas','Ariadne','SwarmChat','Iron Empire'])p.append(el('div',target+' · local reference available'));d.append(p,el('p','Hosted node updates: 0 · Semantic acceptances: 0 · Canon changes: 0','muted'))}
for(const id of ['query','sphere','role'])$(id).addEventListener(id==='query'?'input':'change',()=>{page=0;render()});$('previous').onclick=()=>{page--;render()};$('next').onclick=()=>{page++;render()};$('reset').onclick=()=>{house='';page=0;$('query').value='';$('role').value='';$('sphere').value='';refreshSpheres();render()};
for(const r of DATA.receipts){const s=el('div',undefined,'stage');s.append(el('strong',String(r.passId).padStart(2,'0')+' · '+r.name.replaceAll('_',' ')),el('small',num(r.totalPredicateEvaluations)+' predicates · 144 Sphere + 12 House aggregates'));$('stages').append(s)}
$('receipts').textContent=JSON.stringify({manifest:DATA.manifest,tests:DATA.tests,release:DATA.release},null,2);render();
</script></body></html>'''


if __name__ == "__main__":
    main()
