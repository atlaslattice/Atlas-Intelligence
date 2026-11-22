"""Unit tests of source-only bridge behaviour; host cross-repo check runs separately."""
import copy
import json
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'interop'))
from atlas_fabric import load_json_strict
from atlas_contract_bridge import ContractProbeHold,noosphere_handshake,golden_trace_handshake,run_probe
from atlas_one_circuit import run_circuit

MANIFEST=ROOT/'interop'/'atlas_project_manifest.v0.1.json'
SAMPLE=ROOT/'interop'/'atlas_collision_h01.work.v0.2.json'

class FakeNoosphere:
    def validate_ingestion(self,packet):
        status='QUARANTINED' if 'raw_export_status' not in packet else 'SOURCE_REPORTED_ONLY'
        return SimpleNamespace(state=status,payload=copy.deepcopy(packet),authority='none')

class FakeBadNoosphere(FakeNoosphere):
    def validate_ingestion(self,packet):
        p=super().validate_ingestion(packet)
        p.authority='human-root'
        return p

class FakeCompleteNoosphere(FakeNoosphere):
    def validate_ingestion(self,packet):
        p=super().validate_ingestion(packet)
        if packet.get('raw_export_status')=='raw_partial':p.state='VERIFIED_COMPLETE'
        return p

class FakeMissingSourceNoosphere(FakeNoosphere):
    def validate_ingestion(self,packet):
        p=super().validate_ingestion(packet)
        if 'raw_export_status' not in packet:p.state='SOURCE_REPORTED_ONLY'
        return p

class FakeMutatingNoosphere(FakeNoosphere):
    def validate_ingestion(self,packet):
        packet['private_body']='UNAUTHORIZED'
        return super().validate_ingestion(packet)

class FakeGolden:
    class GoldenTraceEmitter:
        def __init__(self,repo,module):self.events=[]
        def emit(self,**kwargs):
            self.events.append(dict(kwargs,integrity={'hash_algorithm':'sha3-256'}))
            return self.events[-1]
        def verify_chain(self):return True

class FakeGoldenFalse(FakeGolden):
    class GoldenTraceEmitter(FakeGolden.GoldenTraceEmitter):
        def verify_chain(self):return False

class FakeGoldenBadHash(FakeGolden):
    class GoldenTraceEmitter(FakeGolden.GoldenTraceEmitter):
        def emit(self,**kwargs):
            event=super().emit(**kwargs)
            event['integrity']['hash_algorithm']='md5'
            return event

class TestBridge(unittest.TestCase):
    def setUp(self):
        self.f=load_json_strict(MANIFEST);self.p=load_json_strict(SAMPLE)
        self.receipt=run_circuit(self.f,self.p)

    def test_noosphere_synthetic_contract(self):
        d=noosphere_handshake(FakeNoosphere())
        self.assertEqual(d['hashed'],'UNVERIFIED_FORMAT_ONLY')
        self.assertEqual(d['partial'],'INCOMPLETE_HELD')

    def test_noosphere_human_root_claim_denied(self):
        with self.assertRaises(ContractProbeHold):noosphere_handshake(FakeBadNoosphere())

    def test_noosphere_false_complete_denied(self):
        with self.assertRaises(ContractProbeHold):noosphere_handshake(FakeCompleteNoosphere())

    def test_noosphere_missing_raw_flag_denied(self):
        with self.assertRaises(ContractProbeHold):noosphere_handshake(FakeMissingSourceNoosphere())

    def test_noosphere_source_mutation_denied(self):
        with self.assertRaises(ContractProbeHold):noosphere_handshake(FakeMutatingNoosphere())

    def test_golden_contract_simulation(self):
        d=golden_trace_handshake(FakeGolden,self.receipt)
        self.assertEqual(d['status'],'LOCAL_HASH_BRIDGE_ONLY')
        self.assertFalse(d['deployed'])

    def test_golden_failure_propagates(self):
        with self.assertRaises(ContractProbeHold):golden_trace_handshake(FakeGoldenFalse,self.receipt)

    def test_golden_wrong_digest_denied(self):
        with self.assertRaises(ContractProbeHold):golden_trace_handshake(FakeGoldenBadHash,self.receipt)

    def test_golden_invalid_circuit_receipt_denied(self):
        r=copy.deepcopy(self.receipt);r['terminal_sha256']='f'*64
        with self.assertRaises(ContractProbeHold):golden_trace_handshake(FakeGolden,r)

    def test_probe_never_hosted(self):
        r=run_probe(FakeNoosphere(),FakeGolden,self.f,self.p)
        self.assertEqual(r['result'],'SOURCE_CONTRACT_HANDSHAKE_ONLY_NOT_HOSTED')
        self.assertEqual(r['authority_effect'],'NONE')
        self.assertEqual(r['actual_model_calls'],0)

if __name__=='__main__': unittest.main()