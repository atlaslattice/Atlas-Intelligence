#!/usr/bin/env python3
"""Public source-only, no-peer-data Atlas Foundry 1728 work-order compiler.

For owner-only peer Work-room candidates use owner/build_foundry_owner.py,
which is not distributed in the public-safe archive or GitHub review branch.
"""
import argparse
import json
import pathlib
from atlas1728 import validate_original, compile_program, run_1728, topology_summary

def main():
    p=argparse.ArgumentParser()
    p.add_argument('--source',required=True,help='Exact owner-supplied Ariadne v0.7 raw JSON, SHA-256 pin required')
    p.add_argument('--output',required=True)
    a=p.parse_args()
    raw=pathlib.Path(a.source).read_bytes()
    original=validate_original(raw)
    program=compile_program(original,private=False)
    report,receipts=run_1728(original,program)
    report['topology']=topology_summary()
    out=pathlib.Path(a.output)
    out.mkdir(parents=True,exist_ok=True)
    (out/'public_work_orders_1728.json').write_text(json.dumps(program,sort_keys=True,indent=2)+'\n')
    (out/'public_local_execution.json').write_text(json.dumps(report,sort_keys=True,indent=2)+'\n')
    print(json.dumps({'status':'LOCAL_STRUCTURAL_PASS','sourceSha256':report['sourceSha256'],
           'structuralNodes':report['individualWorkOrdersStructurallyChecked'],
           'hostAcceptance':False,'fullWorkOrdersExecutedInProduction':0},indent=2))

if __name__=='__main__':main()
