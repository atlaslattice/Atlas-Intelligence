"""Build a self-contained read-only explorer from the exact reviewed catalog.

No network or third-party libraries. This writes only the requested HTML file.
The embedded JSON is escaped out of HTML parsing; UI data uses textContent.
"""
import argparse
import hashlib
import json
from pathlib import Path


HTML = r'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'none'; img-src data:; font-src 'none'; base-uri 'none'; form-action 'none'">
<title>Atlas · 144 engineering candidates</title>
<style>
:root{color-scheme:light;--ink:#152b38;--muted:#526572;--paper:#f3f5f3;--line:#ced8d9;--blue:#005e78;--pale:#e6f3f5;--hold:#853b13;--hold-bg:#fff1e6;--white:#fff;--radius:18px}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.55 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}a{color:var(--blue);text-underline-offset:3px;overflow-wrap:anywhere}button,input,select{font:inherit}button,summary,a,input,select{-webkit-tap-highlight-color:transparent}button{cursor:pointer}button:focus-visible,summary:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #e8a332;outline-offset:4px}.skip{position:absolute;top:-100px;left:18px;background:white;padding:12px;z-index:5}.skip:focus{top:12px}.wrap{max-width:1380px;margin:auto;padding:0 32px}.hero{background:#132e3c;color:#f4faf8;padding:25px 0 37px}.eyebrow{font-size:12px;letter-spacing:.17em;text-transform:uppercase;font-weight:750;color:#a9d1d5}.hero-top{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:28px}.offline{font-size:12px;border:1px solid #648491;border-radius:999px;padding:5px 12px;white-space:nowrap}.hero h1{font-size:clamp(30px,4.5vw,52px);font-weight:680;line-height:1.1;letter-spacing:-.035em;margin:0 0 16px}.hero p{max-width:850px;color:#cfdee1;margin:0;font-size:17px}.hero-foot{margin-top:22px;color:#aac7cf;font-size:13px}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:15px;margin:28px 0}.stat{border:1px solid var(--line);background:var(--white);border-radius:var(--radius);padding:17px 22px}.stat strong{font-size:29px;display:block;letter-spacing:-.04em;line-height:1.2}.stat span{display:block;color:var(--muted);font-size:13px;margin-top:5px}.notice{display:flex;align-items:start;justify-content:space-between;gap:22px;background:var(--pale);border-left:4px solid var(--blue);padding:16px 20px;border-radius:0 10px 10px 0;margin-bottom:25px}.notice p{margin:0;font-size:14px}.quiet-button{border:1px solid #93b5bf;background:#fff;color:var(--blue);border-radius:9px;padding:8px 12px;font-size:13px;white-space:nowrap}.filters{background:var(--white);border:1px solid var(--line);border-radius:var(--radius);padding:23px;margin-bottom:23px}.filters h2{font-size:18px;margin:0 0 16px}.filter-grid{display:grid;grid-template-columns:2fr 1.5fr 1.2fr 1fr 1.3fr;gap:12px}.control{min-width:0}.control label{display:block;font-size:12px;font-weight:720;letter-spacing:.03em;margin-bottom:7px}.control input,.control select{width:100%;min-height:44px;border:1px solid #abbcc1;border-radius:8px;padding:9px 10px;color:var(--ink);background:#fff}.filter-footer{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-top:17px}.hint{font-size:12px;color:var(--muted);margin:0}.results-bar{display:flex;justify-content:space-between;align-items:center;gap:20px;margin-bottom:15px}.results-bar h2{font-size:19px;margin:0}.results-actions{display:flex;gap:9px}.cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:17px;align-items:start}.feature{min-width:0;border:1px solid var(--line);background:var(--white);border-radius:var(--radius);padding:22px}.feature:target{outline:3px solid #e8a332}.feature-head{display:flex;justify-content:space-between;align-items:center;gap:12px}.feature-id{font-size:13px;letter-spacing:.08em;font-weight:800;color:var(--blue)}.priority{font-size:11px;color:#3a5360;border:1px solid #c4d3d8;border-radius:999px;padding:2px 8px}.feature h3{font-size:20px;line-height:1.25;letter-spacing:-.02em;margin:12px 0 11px}.description{font-size:14px;color:#3e5562;margin:0 0 16px}.tags{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 14px}.tag{font-size:10px;letter-spacing:.035em;padding:3px 7px;border-radius:5px;background:#edf1f0;color:#405964}.tag.local{color:#00566d;background:#e1f0f4}.tag.hold{color:var(--hold);background:var(--hold-bg)}.group-label{font-size:11px;color:var(--muted);margin:0 0 13px}.source-line{font-size:12px;color:var(--muted);margin:0 0 16px}.feature details{border-top:1px solid #dbe3e4;padding-top:13px}.feature summary{font-size:13px;color:var(--blue);font-weight:700;cursor:pointer}.feature details[open]>summary{margin-bottom:18px}.detail-section{margin-top:18px}.detail-section h4{font-size:11px;text-transform:uppercase;letter-spacing:.08em;margin:0 0 7px;color:#355c6c}.detail-section p,.detail-section li{font-size:13px;margin:0 0 8px;overflow-wrap:anywhere}.detail-section ul{margin:7px 0;padding-left:18px}.falsifier{background:#f1f6f2;border-left:3px solid #4c7663;padding:11px 13px}.falsifier h4{color:#385c4c}.local-box{border:1px solid #b7d5de;border-radius:10px;padding:12px;margin:12px 0;background:#f8fcfd}.local-box h5{font-size:13px;margin:0 0 8px;overflow-wrap:anywhere}.local-box p{font-size:12px}.local-box pre,.source-box pre{font-size:11px;white-space:pre-wrap;overflow-wrap:anywhere;background:#f1f5f5;border-radius:6px;padding:9px}.source-box{border:1px solid #d7e0e1;border-radius:8px;padding:11px;margin:10px 0}.source-box p{font-size:12px}.tiny{font-size:11px!important;color:var(--muted)}code{font-size:.85em;overflow-wrap:anywhere}.empty{padding:50px 20px;border:1px dashed #a6bac1;border-radius:var(--radius);text-align:center}.empty h3{margin:0 0 8px}.empty p{color:var(--muted);margin:0}.snapshot{background:#eaf0ef;border:1px solid var(--line);border-radius:var(--radius);padding:18px 23px;margin:30px 0}.snapshot summary{cursor:pointer;font-weight:700}.snapshot pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px}.snapshot h3{font-size:15px;margin-top:20px}.snapshot p{font-size:13px;overflow-wrap:anywhere}.footer{margin:34px 0 42px;font-size:12px;color:var(--muted);display:flex;justify-content:space-between;gap:20px}.error{color:#8a271b;padding:25px;background:#fff2eb;border-radius:12px}[hidden]{display:none!important}
@media(max-width:1100px){.cards{grid-template-columns:repeat(2,minmax(0,1fr))}.filter-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.control.search{grid-column:span 3}}
@media(max-width:650px){.wrap{padding:0 18px}.hero{padding-bottom:28px}.hero-top{margin-bottom:24px}.hero p{font-size:15px}.stats{grid-template-columns:repeat(2,1fr);gap:10px;margin:20px 0}.stat{padding:15px}.stat strong{font-size:26px}.notice{flex-direction:column;gap:12px}.filters{padding:17px}.filter-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.control.search{grid-column:span 2}.control.source{grid-column:span 2}.cards{grid-template-columns:1fr}.feature{padding:20px}.results-bar,.filter-footer,.footer{align-items:flex-start;flex-direction:column}.results-actions{flex-wrap:wrap}.hero-top .eyebrow{font-size:10px}.offline{font-size:10px}}
@media(prefers-reduced-motion:no-preference){button,a,summary{transition:color .15s,background-color .15s}}
@media print{.filters,.results-actions,.notice button{display:none}.hero{background:#fff;color:#000}.hero p,.hero-foot,.eyebrow{color:#333}.cards{display:block}.feature{break-inside:avoid;margin-bottom:12px}.wrap{max-width:none;padding:0}.stats{grid-template-columns:repeat(4,1fr)}}
</style>
</head>
<body>
<a class="skip" href="#feature-results">Skip to catalog</a>
<header class="hero"><div class="wrap">
<div class="hero-top"><span class="eyebrow">Atlas · engineering evidence</span><span class="offline">Self-contained · offline</span></div>
<h1>144 candidates. Clear evidence.</h1>
<p>Explore source-linked additions across neural retrieval, event-based computation and reliable serving. Every proposal keeps its tradeoff, falsifier and scoped baseline gap.</p>
<div class="hero-foot" id="baseline-line"></div>
</div></header>
<main class="wrap">
<div class="stats" aria-label="Catalog totals">
<div class="stat"><strong id="stat-features">144</strong><span>candidate features</span></div>
<div class="stat"><strong id="stat-groups">12</strong><span>engineering modules</span></div>
<div class="stat"><strong id="stat-sources">—</strong><span>upstream source projects</span></div>
<div class="stat"><strong id="stat-evidence">—</strong><span>separate local evidence records</span></div>
</div>
<div class="notice"><p>All entries remain candidates. Local evidence below describes narrower prototypes, with their observed results and limitations. Engineering modules are not ontology Houses or Spheres.</p><button id="show-holds" class="quiet-button" type="button">Show source holds</button></div>
<section class="filters" aria-labelledby="filters-title">
<h2 id="filters-title">Find an engineering question</h2>
<div class="filter-grid">
<div class="control search"><label for="search">Search title, F ID, source or idea</label><input id="search" type="search" placeholder="Try F025, quantization, leakage…" autocomplete="off" spellcheck="false"></div>
<div class="control"><label for="module-filter">Engineering module</label><select id="module-filter"><option value="">All modules</option></select></div>
<div class="control source"><label for="source-filter">Upstream source</label><select id="source-filter"><option value="">All source projects</option></select></div>
<div class="control"><label for="priority-filter">Priority</label><select id="priority-filter"><option value="">All priorities</option></select></div>
<div class="control"><label for="evidence-filter">Evidence status</label><select id="evidence-filter"><option value="">All evidence states</option><option value="local">Local evidence recorded</option><option value="peer">Peer handoff referenced</option><option value="hold">Source HOLD</option><option value="none">Candidate only (no attached evidence)</option></select></div>
</div>
<div class="filter-footer"><p class="hint">Filters combine. Source links open only when you choose them; this page makes no network requests.</p><button id="reset" class="quiet-button" type="button">Reset filters</button></div>
</section>
<section id="feature-results" aria-labelledby="results-title" tabindex="-1">
<div class="results-bar"><h2 id="results-title" aria-live="polite" aria-atomic="true">Loading catalog…</h2><div class="results-actions"><button id="expand" class="quiet-button" type="button">Expand visible details</button><button id="collapse" class="quiet-button" type="button">Collapse details</button></div></div>
<div id="cards" class="cards"></div><div id="empty" class="empty" hidden><h3>No matching candidates</h3><p>Try a shorter search or reset the filters.</p></div>
</section>
<details class="snapshot"><summary>Exact source snapshot and review notes</summary><div id="snapshot-content"></div></details>
<footer class="footer"><span>Atlas source review · a reading interface, with no runtime actions.</span><span id="footer-date"></span></footer>
<noscript><p class="error">This self-contained explorer needs JavaScript to show its embedded catalog. The accompanying feature-catalog.json and source-registry.json remain the authoritative data files.</p></noscript>
</main>
<script type="application/json" id="catalog-data">__PAYLOAD__</script>
<script id="explorer-app">
"use strict";
function stringifyValue(value){return typeof value==="string"?value:JSON.stringify(value,null,2);}
function safeHttps(url){try{const parsed=new URL(url);return parsed.protocol==="https:"?parsed.href:null;}catch(_){return null;}}
function evidenceFlags(feature){const local=Array.isArray(feature.local_prototype_evidence)&&feature.local_prototype_evidence.length>0;const peer=Array.isArray(feature.peer_handoff_refs)&&feature.peer_handoff_refs.length>0;const hold=Boolean(feature.source_admission&&(feature.source_admission.status==="HOLD"||(feature.source_admission.held_upstream_ids||[]).length));return {local,peer,hold,none:!local&&!peer&&!hold};}
function featureMatches(feature,filters,sources){
  if(filters.module&&feature.module_id!==filters.module)return false;
  if(filters.source&&!(feature.upstream_ids||[]).includes(filters.source))return false;
  if(filters.priority&&feature.priority!==filters.priority)return false;
  if(filters.evidence&&!evidenceFlags(feature)[filters.evidence])return false;
  const words=(filters.search||"").toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const names=(feature.upstream_ids||[]).map(id=>sources.get(id)?.project||id);
  const haystack=JSON.stringify([feature.id,feature.title,feature.description,feature.module_id,feature.upstream_ids,names,feature.benefit_hypothesis,feature.falsifier,feature.baseline_gap,feature.status]).toLocaleLowerCase();
  return words.every(word=>haystack.includes(word));
}
function startExplorer(){
  const data=JSON.parse(document.getElementById("catalog-data").textContent),catalog=data.catalog;
  const features=catalog.features,sources=new Map(data.registry.sources.map(source=>[source.id,source]));
  const groups=new Map(catalog.engineeringGroups.map(group=>[group.id,group]));
  const prototypes=new Map((catalog.prototypeEvidence||[]).map(record=>[record.id,record]));
  const handoffs=new Map((catalog.peerHandoffs||[]).map(record=>[record.id,record]));
  const el=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined&&text!==null)node.textContent=String(text);if(className)node.className=className;return node;};
  function link(url,label){const safe=safeHttps(url);if(!safe)return el("span",label);const a=el("a",label);a.href=safe;a.target="_blank";a.rel="noopener noreferrer";return a;}
  function paragraph(parent,value,className){if(value===undefined||value===null)return;parent.append(el("p",stringifyValue(value),className));}
  function section(parent,title,value,className){const node=el("section",null,"detail-section"+(className?" "+className:""));node.append(el("h4",title));if(value!==undefined)paragraph(node,value);parent.append(node);return node;}
  function list(parent,items){const ul=el("ul");for(const item of items||[])ul.append(el("li",stringifyValue(item)));parent.append(ul);}
  function structured(parent,value){parent.append(el("pre",JSON.stringify(value,null,2)));}
  const option=(select,value,text)=>{const o=el("option",text);o.value=value;select.append(o);};
  const controls={search:document.getElementById("search"),module:document.getElementById("module-filter"),source:document.getElementById("source-filter"),priority:document.getElementById("priority-filter"),evidence:document.getElementById("evidence-filter")};
  for(const group of catalog.engineeringGroups)option(controls.module,group.id,group.id+" · "+group.title);
  for(const source of [...sources.values()].sort((a,b)=>a.project.localeCompare(b.project)))option(controls.source,source.id,source.project+(source.review_status==="HOLD"?" · HOLD":""));
  for(const priority of [...new Set(features.map(f=>f.priority))].sort())option(controls.priority,priority,priority);
  document.getElementById("stat-features").textContent=String(features.length);
  document.getElementById("stat-groups").textContent=String(groups.size);
  document.getElementById("stat-sources").textContent=String(sources.size);
  document.getElementById("stat-evidence").textContent=String(prototypes.size);
  document.getElementById("baseline-line").textContent="Baseline source "+catalog.baselineCommit+" · "+catalog.status;
  document.getElementById("footer-date").textContent="Catalog review: "+catalog.reviewDate;
  const cards=document.getElementById("cards"),cardMap=new Map();
  function addPrototype(parent,ref,feature){
    const box=el("div",null,"local-box"),record=prototypes.get(ref.evidence_id);
    box.append(el("h5",ref.evidence_id));paragraph(box,ref.scope);
    paragraph(box,"Whole candidate implemented: "+String(ref.whole_feature_implemented)+" · adopted: "+String(ref.adopted),"tiny");
    if(record){paragraph(box,record.evidence_kind,"tiny");if(record.observed_summary){paragraph(box,"Shared prototype observations","tiny");structured(box,record.observed_summary);}list(box,record.limitations);if(record.receipt)structured(box,record.receipt);}
    else paragraph(box,"Referenced evidence record is not embedded in this snapshot.");
    parent.append(box);
  }
  for(const feature of features){
    const article=el("article",null,"feature");article.id=feature.id;article.dataset.featureId=feature.id;
    const head=el("div",null,"feature-head");head.append(el("span",feature.id,"feature-id"));const priority=el("span",feature.priority,"priority");priority.title=catalog.priorityMeanings?.[feature.priority]||feature.priority;head.append(priority);article.append(head);
    article.append(el("h3",feature.title),el("p",feature.description,"description"));
    const tags=el("div",null,"tags");tags.append(el("span",feature.status,"tag"));const flags=evidenceFlags(feature);if(flags.local)tags.append(el("span","LOCAL EVIDENCE","tag local"));if(flags.peer)tags.append(el("span","PEER HANDOFF","tag local"));if(flags.hold)tags.append(el("span","SOURCE HOLD","tag hold"));article.append(tags);
    article.append(el("p",feature.module_id+" · "+(groups.get(feature.module_id)?.title||""),"group-label"));
    article.append(el("p",(feature.upstream_ids||[]).map(id=>sources.get(id)?.project||id).join(" · "),"source-line"));
    const details=el("details");details.append(el("summary","Evidence, tradeoff & falsifier"));
    section(details,"Benefit hypothesis",feature.benefit_hypothesis);
    section(details,"Tradeoff",feature.tradeoff);
    section(details,"What could disprove it?",feature.falsifier,"falsifier");
    section(details,"Atlas target",feature.atlas_target);
    const gap=section(details,"Scoped baseline gap",feature.baseline_gap?.interpretation||feature.baseline_gap?.description||"");
    paragraph(gap,"Gap status: "+(feature.baseline_gap?.status||"not recorded"),"tiny");paragraph(gap,feature.baseline_gap?.scope,"tiny");
    if(feature.baseline_gap?.evidence){const block=el("details");block.append(el("summary","Baseline source observations"));structured(block,feature.baseline_gap.evidence);gap.append(block);}
    const dep=section(details,"Dependencies");list(dep,feature.dependency||[]);
    const upstream=section(details,"Upstream attribution");
    for(const id of feature.upstream_ids||[]){const source=sources.get(id),box=el("div",null,"source-box");if(!source){paragraph(box,id+" · missing source record");upstream.append(box);continue;}
      const p=el("p");p.append(link(source.repo_url,source.project));box.append(p);paragraph(box,id+" · "+source.review_status,"tiny");
      const license=el("p");license.append(el("span","Declared code license: "),link(source.license_url,stringifyValue(source.license)));box.append(license);
      paragraph(box,"License verification recorded: "+String(source.license_verified),"tiny");paragraph(box,"Commit: "+(source.commit_sha||"no exact commit recorded"),"tiny");paragraph(box,source.license_scope||source.license_conditions||source.reference_scope,"tiny");
      if(source.review_status==="HOLD")paragraph(box,"HOLD · "+(source.qualification||"exact source review incomplete"),"tag hold");
      upstream.append(box);
    }
    const code=section(details,"Inspected source references");for(const ref of feature.source_code_refs||[]){const p=el("p");if(typeof ref==="string")p.append(link(ref,ref));else{p.append(link(ref.url,ref.path||ref.url||ref.upstream_id));if(ref.inspection_status)p.append(el("span"," · "+ref.inspection_status,"tiny"));}code.append(p);}
    const local=section(details,"Local prototype evidence");if(!(feature.local_prototype_evidence||[]).length)paragraph(local,"No local prototype evidence is attached to this candidate in this catalog.");for(const ref of feature.local_prototype_evidence||[])addPrototype(local,ref,feature);
    if((feature.peer_handoff_refs||[]).length){const peers=section(details,"Separate peer handoffs");for(const id of feature.peer_handoff_refs){const box=el("div",null,"local-box");box.append(el("h5",id));const peer=handoffs.get(id);if(peer)structured(box,peer);else paragraph(box,"Reference only; no embedded handoff record.");peers.append(box);}}
    section(details,"Adoption state",feature.adoption_status||"not recorded");
    article.append(details);cards.append(article);cardMap.set(feature.id,article);
  }
  function apply(){const filters=Object.fromEntries(Object.entries(controls).map(([key,node])=>[key,node.value]));let visible=0;for(const feature of features){const show=featureMatches(feature,filters,sources);cardMap.get(feature.id).hidden=!show;if(show)visible++;}document.getElementById("results-title").textContent=visible+" of "+features.length+" candidates";document.getElementById("empty").hidden=visible!==0;}
  for(const control of Object.values(controls))control.addEventListener(control.tagName==="INPUT"?"input":"change",apply);
  document.getElementById("reset").addEventListener("click",()=>{for(const control of Object.values(controls))control.value="";apply();controls.search.focus();});
  document.getElementById("show-holds").addEventListener("click",()=>{for(const control of Object.values(controls))control.value="";controls.evidence.value="hold";apply();controls.evidence.focus();});
  document.getElementById("expand").addEventListener("click",()=>{for(const article of cardMap.values())if(!article.hidden)article.querySelector("details").open=true;});
  document.getElementById("collapse").addEventListener("click",()=>{for(const article of cardMap.values())for(const details of article.querySelectorAll("details"))details.open=false;});
  const snapshot=document.getElementById("snapshot-content");
  for(const [title,value] of [["Catalog SHA-256",data.pins.catalog],["Source registry SHA-256",data.pins.registry],["Baseline source commit",catalog.baselineCommit],["Counting policy",catalog.countingPolicy],["Baseline scope",catalog.baselineScope],["Priority meanings",catalog.priorityMeanings],["Limits",catalog.limits],["Source license interpretation",data.registry.licenseInterpretation]]){snapshot.append(el("h3",title));structured(snapshot,value);}
  apply();
}
if(typeof module!=="undefined"&&module.exports)module.exports={featureMatches,evidenceFlags,safeHttps};
if(typeof document!=="undefined"){try{startExplorer();}catch(error){const node=document.createElement("p");node.className="error";node.textContent="The embedded catalog could not be rendered: "+String(error.message);document.getElementById("cards").append(node);document.getElementById("results-title").textContent="Catalog load failed";}}
</script>
</body>
</html>
'''


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catalog", type=Path, required=True)
    parser.add_argument("--sources", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    raw_catalog, raw_sources = args.catalog.read_bytes(), args.sources.read_bytes()
    catalog, sources = json.loads(raw_catalog), json.loads(raw_sources)
    if catalog.get("schema") != "atlas.oss.capabilities/v1" or sources.get("schema") != "atlas.oss.sources/v1":
        raise ValueError("CATALOG_SCHEMA_MISMATCH")
    if [f["id"] for f in catalog["features"]] != [f"F{i:03d}" for i in range(1, 145)]:
        raise ValueError("EXACT_144_FEATURE_IDS_REQUIRED")
    if len(catalog["engineeringGroups"]) != 12 or any(f["status"] != "CANDIDATE" for f in catalog["features"]):
        raise ValueError("CATALOG_SCOPE_MISMATCH")
    if catalog["baselineCommit"] != sources["baselineCommit"]:
        raise ValueError("BASELINE_COMMIT_MISMATCH")
    ids = [s["id"] for s in sources["sources"]]
    if len(ids) != len(set(ids)) or any(set(f["upstream_ids"]) - set(ids) for f in catalog["features"]):
        raise ValueError("SOURCE_REFERENCE_MISMATCH")
    payload = {"catalog": catalog, "registry": sources,
               "pins": {"catalog": hashlib.sha256(raw_catalog).hexdigest(), "registry": hashlib.sha256(raw_sources).hexdigest()}}
    encoded = json.dumps(payload, ensure_ascii=True, separators=(",", ":"), allow_nan=False)
    encoded = encoded.replace("&", "\\u0026").replace("<", "\\u003c").replace(">", "\\u003e")
    html = HTML.replace("__PAYLOAD__", encoded)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(html, encoding="utf-8")
    if args.catalog.read_bytes() != raw_catalog or args.sources.read_bytes() != raw_sources:
        raise RuntimeError("CATALOG_CHANGED_DURING_BUILD")
    print(json.dumps({"output": str(args.output), "html_sha256": hashlib.sha256(html.encode()).hexdigest(),
                      "features": len(catalog["features"]), "sources": len(sources["sources"]), "pins": payload["pins"]}))


if __name__ == "__main__":
    main()
