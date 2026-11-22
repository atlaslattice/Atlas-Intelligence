"""Adversarial source-only integration tests: no host, no model calls, no privacy reads."""
from __future__ import annotations

import copy
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'interop'))
from atlas_fabric import load_json_strict, FabricError
from atlas_one_circuit import (CircuitHold, FIXED_EVENTS, SCHEMA, run_circuit,
                               verify_one_packet,verify_receipt,make_event,sha)

MANIFEST=ROOT/'interop'/'atlas_project_manifest.v0.1.json'
SAMPLE=ROOT/'interop'/'atlas_collision_h01.work.v0.2.json'

class CircuitTests(unittest.TestCase):
    def setUp(self):
        self.fabric=load_json_strict(MANIFEST)
        self.packet=load_json_strict(SAMPLE)

    def hold(self,fn):
        p=copy.deepcopy(self.packet)
        fn(p)
        with self.assertRaises((CircuitHold,FabricError,KeyError,TypeError,ValueError)):
            run_circuit(self.fabric,p)

    def test_valid_eight_stage_source_only_trace(self):
        receipt=run_circuit(self.fabric,self.packet)
        self.assertEqual(len(receipt['events']),len(FIXED_EVENTS))
        self.assertEqual(receipt['run_state'],'LOCAL_PREPARED_UNPOSTED')
        self.assertTrue(verify_receipt(receipt))

    def test_deterministic_receipt(self):
        self.assertEqual(run_circuit(self.fabric,self.packet),run_circuit(self.fabric,self.packet))

    def test_no_mutation_of_inputs(self):
        f,p=copy.deepcopy(self.fabric),copy.deepcopy(self.packet)
        run_circuit(self.fabric,self.packet)
        self.assertEqual(self.fabric,f)
        self.assertEqual(self.packet,p)

    def test_h01_namespaces_distinct(self):
        r=run_circuit(self.fabric,self.packet)['events'][2]['payload']
        self.assertNotEqual(r['A']['namespace'],r['B']['namespace'])
        self.assertEqual(r['A']['address'],r['B']['address'])
        self.assertEqual(r['cross_namespace_same_as'],'NOT_AUTHORIZED')

    def test_no_raw_claims_or_labels_in_receipts(self):
        text=json.dumps(run_circuit(self.fabric,self.packet))
        for operand in self.packet['operands'].values():
            self.assertNotIn(operand['claim'],text)
            self.assertNotIn(operand['label'],text)

    def test_twelve_houses_preserved_separately(self):
        r=run_circuit(self.fabric,self.packet)['events'][5]['payload']
        self.assertEqual(len(r['roles']),12)
        self.assertEqual(len(r['evidence']),12)
        self.assertEqual(set(r['evidence'].values()),{'NOT_VALIDATED'})
        self.assertEqual(r['cross_house_scoring'],'NOT_PERFORMED')

    def test_all_host_gates_held(self):
        r=run_circuit(self.fabric,self.packet)['events'][6]['payload']
        self.assertEqual(len(r['held_host_gates']),13)
        self.assertEqual(r['work_room_post'],'NOT_ATTEMPTED')
        self.assertEqual(r['authenticated_principal'],'NOT_VERIFIED')

    def test_source_pins_only_not_citations_verified(self):
        r=run_circuit(self.fabric,self.packet)['events'][1]['payload']
        self.assertEqual(r['completeness'],'NOT_INDEPENDENTLY_ATTESTED')
        self.assertEqual(len(r['digests']),2)

    def test_human_gate_kept(self):
        r=run_circuit(self.fabric,self.packet)
        self.assertEqual(r['human_review'],'NOT_REQUESTED')
        self.assertEqual(r['peer_read'],'NOT_VERIFIED')
        self.assertFalse(r['hosted'])
        self.assertFalse(r['canon'])

    def test_no_post_claim(self):
        self.hold(lambda p:p.update(posted_messages=1))

    def test_no_model_fake_calls(self):
        self.hold(lambda p:p.update(model_calls=1))

    def test_no_boolean_as_numeric_zero(self):
        self.hold(lambda p:p.update(model_calls=False))
        self.hold(lambda p:p.update(posted_messages=False))

    def test_no_fabric_host_promotion(self):
        f=copy.deepcopy(self.fabric);f['hosted']=True
        with self.assertRaises(FabricError):run_circuit(f,self.packet)

    def test_no_silent_private_source_ingest(self):
        self.hold(lambda p:p.update(source_refs=['ariadne07','aluminum_ontology']))

    def test_no_private_body_extra_field(self):
        self.hold(lambda p:p.update(private_body='do not ingest'))

    def test_no_play_social_quiet_dream(self):
        for mode in ('PLAY','SOCIAL','QUIET','DREAM','IMAGINE','HABITAT','BRAIN','PALACE','WORK'):
            with self.subTest(mode=mode):self.hold(lambda p,m=mode:p.update(input_scope=m))

    def test_no_false_host(self):
        self.hold(lambda p:p.update(host_state='HOSTED_VERIFIED'))

    def test_no_fake_peer_review(self):
        self.hold(lambda p:p.update(review_state='PEER_VERIFIED'))

    def test_no_fake_identity(self):
        self.hold(lambda p:p.update(authenticated_principal='atlaslattice'))

    def test_no_false_canon(self):
        self.hold(lambda p:p.update(canon=True))

    def test_no_false_deploy(self):
        self.hold(lambda p:p.update(deployed=True))

    def test_no_authority(self):
        self.hold(lambda p:p.update(authority_effect='HUMAN_APPROVED'))

    def test_no_complete_export_claim(self):
        self.hold(lambda p:p.update(raw_export_claim_complete=True))

    def test_no_missing_raw_export_status(self):
        self.hold(lambda p:p.pop('raw_export_status'))

    def test_no_illegal_raw_export_status(self):
        self.hold(lambda p:p.update(raw_export_status='COMPLETE'))

    def test_no_unknown_source(self):
        self.hold(lambda p:p.update(source_refs=['orcs_h01','unknown']))

    def test_no_duplicate_source_id(self):
        self.hold(lambda p:p.update(source_refs=['orcs_h01','orcs_h01']))

    def test_no_empty_sources(self):
        self.hold(lambda p:p.update(source_refs=[]))

    def test_no_private_operand_source(self):
        self.hold(lambda p:p['operands']['A'].update(source_ref='ariadne07'))

    def test_no_operand_source_edition_collision(self):
        self.hold(lambda p:p['operands']['A'].update(source_ref='aluminum_ontology'))

    def test_no_unpinned_namespace(self):
        self.hold(lambda p:p['operands']['A'].update(namespace='madeup.namespace'))

    def test_no_wrong_edition(self):
        self.hold(lambda p:p['operands']['A'].update(edition='aluminum-draft'))

    def test_no_coordinate_notation_mixing(self):
        self.hold(lambda p:p['operands']['A'].update(address='H01.S03.N03'))

    def test_no_sentinel_role_in_twod(self):
        self.hold(lambda p:p['operands']['A'].update(role='EARTH_SENTINEL'))

    def test_no_equivalent_relation(self):
        self.hold(lambda p:p['synthesis'].update(relation='EQUIVALENT'))

    def test_no_auto_semantic_approval(self):
        self.hold(lambda p:p['synthesis'].update(semantic_equivalence=True))

    def test_no_independent_validation_self_report(self):
        self.hold(lambda p:p['synthesis'].update(independently_validated=True))

    def test_no_missing_counterevidence(self):
        self.hold(lambda p:p['synthesis'].update(counterevidence=[]))

    def test_no_missing_falsification(self):
        self.hold(lambda p:p['synthesis'].update(falsification_tests=[]))

    def test_no_automatic_ranking_by_one_metric(self):
        self.hold(lambda p:p['house_review'][0].update(score=0.99))

    def test_no_duplicate_house(self):
        self.hold(lambda p:p['house_review'][11].update(house='H01'))

    def test_no_unspecified_house_evidence(self):
        self.hold(lambda p:p['house_review'][0].update(evidence='VALIDATED'))

    def test_no_social_beats_performed(self):
        self.hold(lambda p:p['work_rhythm'].update(nonwork_performed=14))

    def test_no_more_than_six_work_beats(self):
        self.hold(lambda p:p['work_rhythm'].update(work_beats=7,nonwork_reserved=13))

    def test_no_nonwork_hidden_as_work(self):
        self.hold(lambda p:p['work_rhythm'].update(nonwork_reserved=0))

    def test_no_invalid_hash_source(self):
        f=copy.deepcopy(self.fabric); next(x for x in f['sources'] if x['id']=='orcs_h01')['digest']='bad'
        with self.assertRaises(FabricError):run_circuit(f,self.packet)

    def test_no_revoked_source(self):
        f=copy.deepcopy(self.fabric); next(x for x in f['sources'] if x['id']=='orcs_h01')['revoked']=True
        with self.assertRaises(FabricError):run_circuit(f,self.packet)

    def test_no_malformed_revocation_flag(self):
        f=copy.deepcopy(self.fabric); next(x for x in f['sources'] if x['id']=='orcs_h01')['revoked']='false'
        with self.assertRaises(FabricError):run_circuit(f,self.packet)

    def test_no_nonfinite_json(self):
        p=copy.deepcopy(self.packet);p['not_a_field']=float('nan')
        with self.assertRaises((CircuitHold,ValueError,TypeError)):
            run_circuit(self.fabric,p)

    def test_recompute_does_not_imply_host_attestation(self):
        r=run_circuit(self.fabric,self.packet)
        self.assertEqual(r['attestation'],'NO_INDEPENDENT_SIGNATURE_OR_HOST_READBACK')

    def test_receipt_tamper_event_detected(self):
        r=run_circuit(self.fabric,self.packet)
        r['events'][0]['payload']['hosted']=True
        self.assertFalse(verify_receipt(r))

    def test_receipt_tamper_parent_detected(self):
        r=run_circuit(self.fabric,self.packet)
        r['events'][2]['previous_sha256']='0'*64
        self.assertFalse(verify_receipt(r))

    def test_receipt_reorder_detected(self):
        r=run_circuit(self.fabric,self.packet)
        r['events'][2],r['events'][3]=r['events'][3],r['events'][2]
        self.assertFalse(verify_receipt(r))

    def test_receipt_truncation_detected(self):
        r=run_circuit(self.fabric,self.packet)
        r['events'].pop()
        self.assertFalse(verify_receipt(r))

    def test_receipt_duplicate_event_detected(self):
        r=run_circuit(self.fabric,self.packet)
        r['events'][3]=copy.deepcopy(r['events'][2])
        self.assertFalse(verify_receipt(r))

    def test_receipt_extra_field_detected(self):
        r=run_circuit(self.fabric,self.packet)
        r['events'][0]['private_data']='secret'
        self.assertFalse(verify_receipt(r))

    def test_receipt_fake_canonicity_detected(self):
        r=run_circuit(self.fabric,self.packet)
        r['canon']=True
        self.assertFalse(verify_receipt(r))

    def test_receipt_fake_host_action_detected(self):
        r=run_circuit(self.fabric,self.packet)
        r['post_count']=1
        self.assertFalse(verify_receipt(r))

    def test_receipt_false_numeric_detected(self):
        r=run_circuit(self.fabric,self.packet)
        r['post_count']=False
        self.assertFalse(verify_receipt(r))

    def test_receipt_fake_terminal_detected(self):
        r=run_circuit(self.fabric,self.packet)
        r['terminal_sha256']='f'*64
        self.assertFalse(verify_receipt(r))

    def test_strict_parser_duplicate_key_rejected(self):
        with tempfile.TemporaryDirectory() as t:
            f=Path(t)/'bad.json';f.write_text('{"a":1,"a":2}')
            with self.assertRaises(FabricError):load_json_strict(f)

    def test_strict_parser_nan_rejected(self):
        with tempfile.TemporaryDirectory() as t:
            f=Path(t)/'bad.json';f.write_text('{"x":NaN}')
            with self.assertRaises(FabricError):load_json_strict(f)

    def test_cli_returns_success_for_local_only(self):
        r=subprocess.run([sys.executable,str(ROOT/'interop'/'atlas_one_circuit.py'),str(SAMPLE)],capture_output=True,text=True)
        self.assertEqual(r.returncode,0,r.stderr+r.stdout)
        data=json.loads(r.stdout)
        self.assertEqual(data['run_state'],'LOCAL_PREPARED_UNPOSTED')
        self.assertTrue(verify_receipt(data))

    def test_cli_rejects_bad_packet_without_side_effects(self):
        with tempfile.TemporaryDirectory() as t:
            p=copy.deepcopy(self.packet);p['posted_messages']=1
            bad=Path(t)/'bad.json';bad.write_text(json.dumps(p))
            r=subprocess.run([sys.executable,str(ROOT/'interop'/'atlas_one_circuit.py'),str(bad)],capture_output=True,text=True)
            self.assertEqual(r.returncode,2)
            self.assertEqual(json.loads(r.stdout)['status'],'HELD_NOT_RUN')

if __name__=='__main__':unittest.main()