"""No-network negative-case checks for the public-safe Atlas federation candidate."""
from __future__ import annotations
import copy
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'interop'))
from atlas_fabric import FabricError,validate_fabric,parse_coordinate,namespace_index,load_json_strict

MANIFEST=Path(__file__).resolve().parents[1]/'interop'/'atlas_project_manifest.v0.1.json'

class FabricTests(unittest.TestCase):
    def setUp(self):
        self.root=load_json_strict(MANIFEST)
        self.ns=namespace_index(self.root)
    def bad(self,change):
        d=copy.deepcopy(self.root);change(d)
        with self.assertRaises(FabricError):validate_fabric(d)
    def test_01_valid_fabric_nonhosted(self):
        self.assertEqual(validate_fabric(self.root)['status'],'SOURCE_GRAPH_VALID_NOT_HOSTED')
    def test_02_six_namespace_editions(self):
        self.assertEqual(len(self.ns),6)
    def test_03_ariadne_private_digest_redacted(self):
        self.assertEqual(self.root['sources'][0]['kind'],'PRIVATE_OPAQUE')
        self.assertIsNone(self.root['sources'][0]['digest'])
    def test_04_all_pinned_private_no_uri(self):
        self.assertTrue(all(x.get('url') is None and x.get('raw_body') is None for x in self.root['sources'] if x['kind'] in {'PRIVATE_SHA256','PRIVATE_OPAQUE'}))
    def test_05_no_fake_ontology_match(self):
        self.assertEqual(validate_fabric(self.root)['semantic_approvals'],0)
    def test_06_seventeen_modules(self):
        self.assertEqual(validate_fabric(self.root)['modules'],17)
    def test_07_twenty_proposed_edges(self):
        self.assertEqual(validate_fabric(self.root)['proposed_edges'],20)
    def test_08_all_host_gates_held(self):
        self.assertEqual(validate_fabric(self.root)['held_host_gates'],13)
    def test_09_12_house_case_explicit(self):
        self.assertEqual(len(self.root['example_solution']['houses']),12)
    def test_10_not_20_model_calls(self):
        self.assertEqual(validate_fabric(self.root)['actual_model_turns'],0)
    def test_11_no_auto_approved_crosswalk(self):
        self.assertEqual(len(self.root['crosswalk_candidates']),0)
    def test_12_feedback_cycles_allowed(self):
        self.assertIn('orcs',validate_fabric(self.root)['prerequisite_order'])
    def test_13_valid_onebased_corner(self):
        self.assertEqual(parse_coordinate('ariadne.v07','H12.S12.N12','NODE',self.ns)[-1],(12,12,12))
    def test_14_valid_zerobased_corner(self):
        self.assertEqual(parse_coordinate('providers.0base','H00.S00.N00','NODE',self.ns)[-1],(0,0,0))
    def test_15_same_zerobase_address_sentinel_separate(self):
        a=parse_coordinate('providers.0base','H00.S00.N00','NODE',self.ns)
        b=parse_coordinate('providers.0base','H00.S00.N00','EARTH_SENTINEL',self.ns)
        self.assertNotEqual(a,b)
    def test_16_historical_2d_valid(self):
        self.assertEqual(parse_coordinate('orcs.legacy','H01.S12','NODE',self.ns)[-1],(1,12))
    def test_17_global_sphere_valid(self):
        self.assertEqual(parse_coordinate('uws.early','S144','NODE',self.ns)[-1],(144,))
    def test_18_same_raw_string_not_identity(self):
        self.assertNotEqual(parse_coordinate('orcs.legacy','H01.S03','NODE',self.ns),parse_coordinate('aluminum.draft4','H01.S03','NODE',self.ns))
    def test_19_onebased_zero_rejected(self):
        with self.assertRaises(FabricError):parse_coordinate('ariadne.v07','H00.S01.N01','NODE',self.ns)
    def test_20_onebased_13_rejected(self):
        with self.assertRaises(FabricError):parse_coordinate('ariadne.v07','H13.S01.N01','NODE',self.ns)
    def test_21_zerobase_12_rejected(self):
        with self.assertRaises(FabricError):parse_coordinate('providers.0base','H12.S01.N01','NODE',self.ns)
    def test_22_sentinel_wrong_position_rejected(self):
        with self.assertRaises(FabricError):parse_coordinate('providers.0base','H01.S00.N00','EARTH_SENTINEL',self.ns)
    def test_23_no_twoaxis_sentinel(self):
        with self.assertRaises(FabricError):parse_coordinate('orcs.legacy','H01.S01','EARTH_SENTINEL',self.ns)
    def test_24_no_global_sentinel(self):
        with self.assertRaises(FabricError):parse_coordinate('uws.early','S001','EARTH_SENTINEL',self.ns)
    def test_25_invalid_global_145(self):
        with self.assertRaises(FabricError):parse_coordinate('uws.early','S145','NODE',self.ns)
    def test_26_onebased_2d_3d_confusion(self):
        with self.assertRaises(FabricError):parse_coordinate('aluminum.draft4','H01.S01.N01','NODE',self.ns)
    def test_27_global_uses_no_house(self):
        with self.assertRaises(FabricError):parse_coordinate('uws.early','H01.S01','NODE',self.ns)
    def test_28_raw_1based_unpadded_rejected(self):
        with self.assertRaises(FabricError):parse_coordinate('ariadne.v07','H1.S1.N1','NODE',self.ns)
    def test_29_unknown_namespace_rejected(self):
        with self.assertRaises(FabricError):parse_coordinate('made-up','H01.S01.N01','NODE',self.ns)
    def test_30_unsupported_scheme(self):
        self.bad(lambda d:d['namespaces'][0].update(scheme='ONE_UNIVERSAL_CANON'))
    def test_31_namespace_never_grants_authority(self):
        self.bad(lambda d:d['namespaces'][0].update(mapping_authority='GRANTED'))
    def test_32_duplicate_namespace(self):
        self.bad(lambda d:d['namespaces'].append(copy.deepcopy(d['namespaces'][0])))
    def test_33_missing_pinned_source(self):
        self.bad(lambda d:d['namespaces'][0].update(source_id='missing'))
    def test_34_source_digest_type_bad(self):
        self.bad(lambda d:d['sources'][0].update(digest='bad'))
    def test_35_github_blob_digest_type_bad(self):
        self.bad(lambda d:next(x for x in d['sources'] if x['kind']=='GITHUB_BLOB_SHA1').update(digest='f'*64))
    def test_36_private_source_cannot_have_url(self):
        self.bad(lambda d:d['sources'][0].update(url='https://example.org/secret'))
    def test_37_private_source_body_cannot_be_released(self):
        self.bad(lambda d:d['sources'][0].update(raw_body='PRIVATE CONTENT'))
    def test_38_revoked_source_hold(self):
        self.bad(lambda d:d['sources'][0].update(revoked=True))
    def test_39_source_rights_not_granted(self):
        self.bad(lambda d:d['sources'][0].update(rights_effect='CANON'))
    def test_40_source_url_not_external_forgery(self):
        self.bad(lambda d:next(x for x in d['sources'] if x['kind']=='GITHUB_BLOB_SHA1').update(url='https://evil.example/a'))
    def test_41_cannot_claim_hosted_root(self):
        self.bad(lambda d:d.update(hosted=True))
    def test_42_cannot_claim_canon_root(self):
        self.bad(lambda d:d.update(canon=True))
    def test_43_cannot_claim_authority_root(self):
        self.bad(lambda d:d.update(authority_effect='HUMAN_APPROVED'))
    def test_44_cannot_claim_hosted_module(self):
        self.bad(lambda d:d['modules'][0].update(hosted=True))
    def test_45_cannot_claim_canon_module(self):
        self.bad(lambda d:d['modules'][0].update(canon=True))
    def test_46_private_body_excluded(self):
        self.bad(lambda d:next(x for x in d['modules'] if x['scope']=='PRIVATE').update(content='SYNTHETIC_FORBIDDEN_PRIVATE_TEXT'))
    def test_47_private_scope_rights_required(self):
        self.bad(lambda d:next(x for x in d['modules'] if x['scope']=='PRIVATE').update(rights='PUBLIC_METADATA_ONLY'))
    def test_48_module_source_required(self):
        self.bad(lambda d:d['modules'][0].update(source_ids=['unknown_source']))
    def test_49_duplicate_module_id(self):
        self.bad(lambda d:d['modules'].append(copy.deepcopy(d['modules'][0])))
    def test_50_dangling_edge_denied(self):
        self.bad(lambda d:d['edges'][0].update(to='missing_module'))
    def test_51_fake_edge_deployment_denied(self):
        self.bad(lambda d:d['edges'][0].update(status='HOSTED_VERIFIED'))
    def test_52_edge_authority_denied(self):
        self.bad(lambda d:d['edges'][0].update(authority_effect='AUTO'))
    def test_53_duplicate_edge_id_denied(self):
        self.bad(lambda d:d['edges'].append(copy.deepcopy(d['edges'][0])))
    def test_54_host_prerequisite_cycle_denied(self):
        self.bad(lambda d:d['edges'].append({'id':'cycle','from':'h12-habitat-case','to':'ariadne','kind':'REQUIRES_BEFORE_HOST','status':'PROPOSED_NOT_HOSTED','authority_effect':'NONE'}))
    def test_55_crosswalk_auto_equivalence_denied(self):
        def change(d):
            d['crosswalk_candidates'].append({'from':{'namespace':'ariadne.v07','address':'H01.S01.N01'},'to':{'namespace':'providers.0base','address':'H00.S00.N00'},'relation':'EQUIVALENT','human_approved':False,'deployed':False,'evidence_status':'UNREVIEWED','counterexample':'unknown semantics','source_ids':['ariadne07']})
        self.bad(change)
    def test_56_crosswalk_caller_approved_denied(self):
        def change(d):
            d['crosswalk_candidates'].append({'from':{'namespace':'ariadne.v07','address':'H01.S01.N01'},'to':{'namespace':'providers.0base','address':'H00.S00.N00'},'relation':'RELATED_CANDIDATE','human_approved':True,'deployed':False,'evidence_status':'UNREVIEWED','counterexample':'unknown semantics','source_ids':['ariadne07']})
        self.bad(change)
    def test_57_crosswalk_missing_counterevidence_denied(self):
        def change(d):
            d['crosswalk_candidates'].append({'from':{'namespace':'ariadne.v07','address':'H01.S01.N01'},'to':{'namespace':'providers.0base','address':'H00.S00.N00'},'relation':'RELATED_CANDIDATE','human_approved':False,'deployed':False,'evidence_status':'UNREVIEWED','source_ids':['ariadne07']})
        self.bad(change)
    def test_58_crosswalk_missing_source_denied(self):
        def change(d):
            d['crosswalk_candidates'].append({'from':{'namespace':'ariadne.v07','address':'H01.S01.N01'},'to':{'namespace':'providers.0base','address':'H00.S00.N00'},'relation':'RELATED_CANDIDATE','human_approved':False,'deployed':False,'evidence_status':'UNREVIEWED','counterexample':'unknown semantics','source_ids':[]})
        self.bad(change)
    def test_59_candidate_crosswalk_remains_unreviewed(self):
        d=copy.deepcopy(self.root)
        d['crosswalk_candidates'].append({'from':{'namespace':'ariadne.v07','address':'H01.S01.N01'},'to':{'namespace':'providers.0base','address':'H00.S00.N00'},'relation':'NO_MATCH_CANDIDATE','human_approved':False,'deployed':False,'evidence_status':'UNREVIEWED','counterexample':'distinct scopes','source_ids':['ariadne07','provider_coord']})
        self.assertEqual(validate_fabric(d)['semantic_approvals'],0)
    def test_60_work_budget_over_six_denied(self):
        self.bad(lambda d:d['rhythm'].update(work_beats=7,optional_nonwork_beats=13))
    def test_61_nonwork_budget_understated_denied(self):
        self.bad(lambda d:d['rhythm'].update(optional_nonwork_beats=13))
    def test_62_fictional_model_turn_denied(self):
        self.bad(lambda d:d['rhythm'].update(executed_model_turns=500))
    def test_63_forced_leisure_denied(self):
        self.bad(lambda d:d['rhythm'].update(forced_leisure=True))
    def test_64_host_gate_fake_success_denied(self):
        self.bad(lambda d:d['host_gates'][0].update(state='HOSTED_VERIFIED'))
    def test_65_solution_false_validation_denied(self):
        self.bad(lambda d:d['example_solution']['houses'][0].update(evidence='FIELD_VALIDATED'))
    def test_66_solution_not_all_houses_denied(self):
        self.bad(lambda d:d['example_solution']['houses'].pop())
    def test_67_solution_without_counterevidence_denied(self):
        self.bad(lambda d:d['example_solution'].update(counterevidence=[]))
    def test_68_solution_self_claims_deployment_denied(self):
        self.bad(lambda d:d['example_solution'].update(status='DEPLOYED'))
    def test_69_cross_namespace_collision_approval_denied(self):
        self.bad(lambda d:d['collisions'][0].update(approved=True))
    def test_70_private_source_must_remain_private(self):
        self.bad(lambda d:d['sources'][0].update(publication_scope='PUBLIC_REFERENCE_ONLY'))
    def test_71_strict_duplicate_json_key_denied(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/'bad.json';p.write_text('{"a":1,"a":2}')
            with self.assertRaises(FabricError):load_json_strict(p)
    def test_72_strict_nonfinite_json_denied(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/'bad.json';p.write_text('{"x":NaN}')
            with self.assertRaises(FabricError):load_json_strict(p)

if __name__=='__main__':unittest.main()