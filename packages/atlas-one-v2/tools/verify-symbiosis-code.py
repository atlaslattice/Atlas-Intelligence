#!/usr/bin/env python3
"""Independent Python verifier for compiled 1,100 synthetic CODE route additions.
All checks are explicit, never assert; survives python -O. No host rights proof.
"""
import hashlib, json, re, sys
from pathlib import Path

COORD=re.compile(r'^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$')
SHA=re.compile(r'^[a-f0-9]{64}$')
GENESIS=hashlib.sha256(b'ATLAS_SYMBIOSIS_CODE_GENESIS_V2\x00').hexdigest()
PARENT_100='d02e7faa0b7e42ee8ac4e0c3cb5c412232b9d8af71ed44236f756b20e308646c'
PARENT_1100='244a8dfb2b37ff38c097ee5414752f5feb2ce2e5e8bdeb3917bca5031e4f490a'
SCHEMA='atlas.one.code-symbiosis-evolution/v2'
PREFIX='registered.set('
def digest(x):return hashlib.sha256(x).hexdigest()
def code_role(sphere):return 'DOMAIN_SPECIALIZATION' if sphere<=7 else 'EPISTEMIC_META'
def coord(h,s,n):return f'H{h:02d}.S{s:02d}.N{n:02d}'
def synthetic_source_digest(c):return digest(('synthetic-hsn-source-v1:'+c).encode())

def independently_verify(parent_path,code_path,ledger_path,summary_path,require_complete=True):
    errors=[]
    try:
        parent=[json.loads(x) for x in Path(parent_path).read_text().splitlines() if x.strip()]
        source=Path(code_path).read_bytes()
        lines=source.decode('utf8').splitlines(keepends=True)
        ledger_bytes=Path(ledger_path).read_bytes()
        ledger=[json.loads(x) for x in ledger_bytes.decode().splitlines() if x.strip()]
        summary=json.loads(Path(summary_path).read_text())
    except (OSError,UnicodeError,ValueError,TypeError) as e:
        return {'status':'HOLD_INPUT_UNREADABLE','errors':[type(e).__name__],'authority_effect':'NONE'}
    if len(parent)!=1100 or parent[99].get('head')!=PARENT_100 or parent[-1].get('head')!=PARENT_1100:
        errors.append('PARENT_SOURCE_BASELINE_DIFFERENT')
    if len(ledger)!=1100 or (require_complete and summary.get('iterations')!=1100):
        errors.append('ROUTE_COUNT_UNEXPECTED')
    route_lines=[line for line in lines if line.startswith(PREFIX)]
    if len(route_lines)!=len(ledger):errors.append('CODE_STATEMENT_COUNT_MISMATCH')
    previous=GENESIS
    seen=set();attacks=0
    max_n=min(len(route_lines),len(ledger),len(parent))
    for i in range(max_n):
        try:
            raw=route_lines[i]
            # Exact generated format: a single JS statement with JSON-literal object.
            decoder=json.JSONDecoder()
            text=raw[len(PREFIX):]
            address,pos=decoder.raw_decode(text)
            if not text[pos:].startswith(',Object.freeze(') or not text.rstrip().endswith('));'):
                raise ValueError('not the expected code statement')
            start=pos+len(',Object.freeze(')
            obj,end=decoder.raw_decode(text,start)
            if text[end:].strip()!='));':raise ValueError('trailing expression')
            entry=ledger[i];parent_row=parent[i]
            m=COORD.fullmatch(address) if isinstance(address,str) else None
            if not m or address in seen or entry.get('coordinate')!=address or obj.get('coordinate')!=address:
                raise ValueError('coordinate mismatch or duplicated route')
            h,s,n=map(int,m.groups())
            counterpart_sphere=8+(s-1)%5 if s<=7 else 1+(s-8)%7
            intra=coord(h,s,n%12+1)
            cross_sphere=coord(h,counterpart_sphere,n)
            cross=coord(h%12+1,s,n)
            if obj.get('intraSphere')!=intra or obj.get('crossSphere')!=cross_sphere or obj.get('crossHouse')!=cross:
                raise ValueError('structural topology tampering')
            if obj.get('nodeRole')!=code_role(s) or obj.get('counterpartRole')!=code_role(counterpart_sphere):
                raise ValueError('7+5 role mismatch')
            if obj.get('relation')!='TOPOLOGICAL_COMPLEMENT_CANDIDATE' or obj.get('semanticMappingApproved') is not False:
                raise ValueError('semantic authority incorrectly granted')
            if obj.get('sourceDigest')!=synthetic_source_digest(address) or obj.get('sourceEdition')!='synthetic-hsn-v1':
                raise ValueError('source digest/edition mismatch')
            if obj.get('previousAcceptedHead')!=previous or obj.get('originalCaseHead')!=parent_row.get('head'):
                raise ValueError('source ancestry mismatch')
            if obj.get('hostAuthenticated') is not False or obj.get('authorityEffect')!='NONE':
                raise ValueError('host authority claim')
            original_obj={k:v for k,v in obj.items() if k!='ruleDigest'}
            # Node JSON.stringify preserves authoring insertion order; Python input
            # preserves parsed JSON key insertion order too.
            computed_rule_digest=digest(json.dumps(original_obj,separators=(',',':'),ensure_ascii=False).encode())
            if computed_rule_digest!=obj.get('ruleDigest') or entry.get('ruleDigest')!=computed_rule_digest:
                raise ValueError('rule digest differs from actual code')
            line_digest=digest(raw.encode())
            if entry.get('lineSha256')!=line_digest:
                raise ValueError('line source digest mismatch')
            seq=i+1
            next_head=digest(f'{previous}\n{line_digest}\n{seq}\n{parent_row.get("head")}'.encode())
            if (entry.get('previousCodeHead')!=previous or entry.get('acceptedCodeHead')!=next_head
                or entry.get('parentCaseHead')!=parent_row.get('head') or entry.get('seq')!=seq):
                raise ValueError('ledger ancestry/hash mismatch')
            if entry.get('phase')!=('CODE_PRIMARY_100' if seq<=100 else 'CODE_DESCENDANT_1000'):
                raise ValueError('phase boundary mismatch')
            if entry.get('inheritedRouteChecks')!=seq*(seq+1) or entry.get('status')!='ACCEPTED_LOCAL_ONLY':
                raise ValueError('cumulative tests or status inconsistent')
            if entry.get('hostVerified') is not False or entry.get('canPublish') is not False:
                raise ValueError('test receipt authorized an external effect')
            if entry.get('fullLatticeNodesVisited')!=1728 or entry.get('action')!='APPEND_EXECUTABLE_CODE_ROUTE':
                raise ValueError('coordinate catalog not used or non-code action')
            if not entry.get('falseFriendMutationRejected') or entry.get('attackChecks',0)<20:
                raise ValueError('adversarial test not recorded')
            attacks+=entry['attackChecks'];previous=next_head;seen.add(address)
        except (ValueError,TypeError,KeyError,AttributeError) as e:
            errors.append(f'INVALID_CODE_OR_RECEIPT_AT_{i+1}:{type(e).__name__}');break
    if summary.get('sourceCodeHashSha256')!=digest(source):errors.append('COMPILED_SOURCE_DIGEST_MISMATCH')
    if summary.get('ledgerSha256')!=digest(ledger_bytes):errors.append('LEDGER_FILE_DIGEST_MISMATCH')
    if summary.get('finalCodeHead')!=previous:errors.append('FINAL_CODE_HEAD_DIFFERENT')
    if summary.get('registeredExecutableRoutes')!=len(seen) or summary.get('unregisteredCoordinates')!=1728-len(seen):
        errors.append('1728_NODE_COVERAGE_MISCLAIM')
    if summary.get('hostVerified') is not False or summary.get('canPublish') is not False:
        errors.append('RELEASE_AUTHORITY_MISCLAIM')
    if summary.get('inheritedRegressionsRun')!=len(ledger)*(len(ledger)+1):
        errors.append('CUMULATIVE_EXECUTION_COUNT_MISMATCH')
    if summary.get('adversarialCasesRun')!=attacks:
        errors.append('ADVERSARIAL_EXECUTION_COUNT_MISMATCH')
    return {'status':'VERIFIED_LOCAL_CODE_ROUTES_ONLY' if not errors else 'HOLD_INVALID',
            'errors':errors,'acceptedCodeDeltas':len(seen),'distinctAddresses':len(seen),
            'catalogSize':1728,'unregistered':1728-len(seen),
            'codeSha256':digest(source),'ledgerSha256':digest(ledger_bytes),'head':previous,
            'authority_effect':'NONE','host_verified':False}

def main():
    if len(sys.argv)!=5:
        print('usage: verify-symbiosis-code.py parent-ledger.jsonl compiled.mjs ledger.jsonl summary.json',file=sys.stderr)
        return 2
    out=independently_verify(*sys.argv[1:]);print(json.dumps(out,indent=2,sort_keys=True))
    return 0 if out['status']=='VERIFIED_LOCAL_CODE_ROUTES_ONLY' else 1
if __name__=='__main__':raise SystemExit(main())
