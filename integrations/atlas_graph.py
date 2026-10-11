#!/usr/bin/env python3
"""Local Atlas ARI proof-of-plumbing: seed provenance-first graph from the
US draft constitution and its public source references. Never canonizes docs.
"""
import argparse,json,hashlib
from pathlib import Path
from atlas_fabric import ReceiptGraph

BASE=Path(__file__).resolve().parent
def build(graph):
    configuration=json.loads((BASE/"constitutional_baseline.json").read_text(encoding="utf-8"))
    root="atlas-ari:inv0:draft"
    graph.add_node(node_id=root,kind="Claim",title="INV-0 — Nothing Dies (user-directed draft)",
                   source="integrations/constitutional_baseline.json",
                   receipt="git-versioned:integrations/constitutional_baseline.json",
                   status="canonical_candidate")
    for link in configuration["source_links"]:
        key="source:"+hashlib.sha256(link.encode()).hexdigest()[:20]
        graph.add_node(node_id=key,kind="SourceArtifact",title=link.rsplit("/",1)[-1],
                       source=link,receipt="source-addressable:"+link,status="raw")
        graph.add_edge(root,key,"DERIVED_FROM","integrations/constitutional_baseline.json")
    return root

if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--db",default=":memory:")
    p.add_argument("--search",default="INV-0")
    a=p.parse_args()
    g=ReceiptGraph(a.db)
    root=build(g)
    print(json.dumps({"state":"LOCAL_KG_READY","nodes":g.search(a.search),
       "edges":g.linked(root),"status":"USER_DIRECTED_DRAFT_NOT_CANON"},
       indent=2))
