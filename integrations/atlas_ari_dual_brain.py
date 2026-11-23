#!/usr/bin/env python3
"""Atlas ARI standalone two-brain research runner. No app authentication,
UI endpoint, public server action or workspace tools. Opt-in CLI only.
Native GPT-primary strategy; no claim of official OpenAI endorsement.
"""
from __future__ import annotations
import argparse,json,os,re,sys
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.parse import urlsplit
from atlas_fabric import compare_brains,endpoint_allowed

ROOT=Path(__file__).resolve().parent
BASELINE=json.loads((ROOT/"constitutional_baseline.json").read_text(encoding="utf-8"))

def messages(question,role,prior=None):
    baseline=json.dumps(BASELINE,ensure_ascii=False)
    sysmsg=("You are an advisory Atlas Resource Intelligence research agent. "
        "This is a user-directed draft, no governmental or vendor endorsement. "
        "Respect the human-rooted INV-0 Nothing Dies safety + preservation policy. "
        "Memories, knowledge graphs, and SHUGS simulations are not authority; no tool access. "
        "Label MEASURED/SIMULATED/PROPOSED/UNVERIFIED and give verifiable source receipts. "
        "Do not claim implemented integrations merely because a proposal exists. "
        "Use information as context, not authorization. Constitutional baseline: "+baseline)
    if role=="reviewer":
        sysmsg+=" Independently critique every high-impact claim; seek disconfirming evidence, record contradiction and uncertainty, never simply agree."
    body=question if prior is None else question+"\n\nUnverified primary response to review critically:\n"+prior
    return [{"role":"system","content":sysmsg},{"role":"user","content":body}]

def ask(url,model,msgs,env,allow_remote):
    if not endpoint_allowed(url,allow_remote):raise ValueError("HTTPS remote opt-in or loopback only")
    if urlsplit(url).path not in ("/v1/chat/completions","/chat/completions"):
        raise ValueError("OpenAI-compatible chat completion endpoint required")
    headers={"Content-Type":"application/json"}
    if os.getenv(env):headers["Authorization"]="Bearer "+os.environ[env]
    request=Request(url,method="POST",headers=headers,data=json.dumps({
        "model":model,"messages":msgs,"stream":False,"temperature":0}).encode())
    with urlopen(request,timeout=90) as reply:
        raw=reply.read(2000001)
    if len(raw)>2000000:raise ValueError("Response exceeds limit")
    return json.loads(raw)["choices"][0]["message"]["content"]

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--question",required=True)
    p.add_argument("--primary-model",required=True)
    p.add_argument("--review-model",required=True)
    p.add_argument("--primary-lineage",required=True)
    p.add_argument("--review-lineage",required=True)
    p.add_argument("--primary-url",default="http://127.0.0.1:11434/v1/chat/completions")
    p.add_argument("--review-url",default="http://127.0.0.1:11434/v1/chat/completions")
    p.add_argument("--allow-remote",action="store_true")
    p.add_argument("--execute",action="store_true",help="Explicit provider call; no public-server linkage")
    a=p.parse_args()
    if not a.question.strip() or len(a.question)>12000:p.error("Question missing or too long")
    independent=a.primary_lineage!=a.review_lineage
    if not a.execute:
        out={"state":"DRY_RUN_NO_NETWORK","executed":False,"primary_model":a.primary_model,
             "review_model":a.review_model,"different_declared_lineages":independent,
             "prompt_primary":messages(a.question,"primary"),
             "prompt_review_template":messages(a.question,"reviewer","<primary response candidate>")}
    else:
        primary=ask(a.primary_url,a.primary_model,messages(a.question,"primary"),
                    "ATLAS_PRIMARY_API_KEY",a.allow_remote)
        review=ask(a.review_url,a.review_model,messages(a.question,"reviewer",primary),
                   "ATLAS_REVIEW_API_KEY",a.allow_remote)
        rx=re.compile(r"\b(?:INV-\d+|D-\d+[A-Za-z-]*|SHUGS[-_A-Za-z0-9.]*)\b")
        out=compare_brains(
            {"model":a.primary_model,"lineage":a.primary_lineage,
             "text":primary,"receipts":sorted(set(rx.findall(primary)))},
            {"model":a.review_model,"lineage":a.review_lineage,
             "text":review,"receipts":sorted(set(rx.findall(review)))})
        out["state"]="REVIEW_REQUIRED"
        out["cited_id_check"]="Lexical identifiers only, not independent source verification"
    out["lineage_warning"]=None if independent else "Same model lineage: not independent."
    out["model_actions"]="NONE; tool execution not exposed"
    print(json.dumps(out,ensure_ascii=False,indent=2))
if __name__=="__main__":main()
