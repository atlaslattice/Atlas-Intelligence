"""1,728 separately addressable original-source engineering acceptance tests.

ATLAS_ARIADNE_V07_SOURCE=/path/to/ariadne_atlas_v07_EXACT.json \
  python -m unittest discover -s tests -p 'test_*.py' -q
The original source file is owner-only and is never included in the public code.
"""
import copy
import json
import os
import pathlib
import sys
import unittest

sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]))
from atlas1728 import (
    ORIGINAL_SHA256, SourceContractError, validate_original, compile_program,verify_node_work_order,
    build_work_order,scope_allows,ordinal,from_ordinal,address,parse_address,scope_role,
    encode_symbol,decode_symbol,assemble_merkle,merkle_proof,verify_merkle_proof,
    geometric_neighbors,topology_summary,local_view_contract, verify_nonpromotion,
)

_SOURCE_PATH=os.environ.get('ATLAS_ARIADNE_V07_SOURCE')
_SOURCE=None
_PROGRAM=None
if _SOURCE_PATH:
    _SOURCE=validate_original(pathlib.Path(_SOURCE_PATH).read_bytes())
    _PROGRAM=compile_program(_SOURCE,private=True)

class OriginalSource1728(unittest.TestCase):
    pass

def make_source_test(i):
    def check(self):
        if _SOURCE is None:self.skipTest('Owner-supplied exact source required')
        task=_PROGRAM['orders'][i]
        h,s,n=from_ordinal(i)
        self.assertEqual(task['canonical'],address(h,s,n))
        self.assertEqual(len(verify_node_work_order(_SOURCE,task)),12)
        self.assertEqual(_SOURCE['nodes'][task['canonical']]['name'],task['nodeName'])
        # A wrong parent or role must never be accepted, even with familiar HSN.
        wrong=dict(task);wrong['sphereId']='H00.S00'
        with self.assertRaises(SourceContractError):verify_node_work_order(_SOURCE,wrong)
        wrong=dict(task);wrong['role']='WRONG_ROLE'
        with self.assertRaises(SourceContractError):verify_node_work_order(_SOURCE,wrong)
        self.assertFalse(scope_allows(None,task['canonical']))
        self.assertFalse(task['approvalEffect']!='NONE')
        self.assertEqual(task['semanticApproval'],'NOT_REVIEWED')
    return check

for i in range(1728):
    h,s,n=from_ordinal(i)
    setattr(OriginalSource1728,f'test_{i+1:04d}_{address(h,s,n).replace(".","_")}',make_source_test(i))

class ContractAndNegativeCases(unittest.TestCase):
    def test_source_absent_does_not_fake_execution(self):
        if not _SOURCE_PATH:self.assertIsNone(_PROGRAM)
    def test_ordinal_fixtures(self):
        self.assertEqual(ordinal(1,1,1),0)
        self.assertEqual(ordinal(12,12,12),1727)
        self.assertEqual(from_ordinal(1727),(12,12,12))
    def test_boolean_axis_rejected(self):
        with self.assertRaises(SourceContractError):address(True,1,1)
    def test_H00_rejected(self):
        with self.assertRaises(SourceContractError):parse_address('H00.S01.N01')
    def test_hsn_suffix_noncanonical(self):
        with self.assertRaises(SourceContractError):parse_address('H01.S01.N01_suffix')
    def test_invalid_ordinal(self):
        with self.assertRaises(SourceContractError):from_ordinal(1728)
    def test_domain_role_7(self):self.assertEqual(scope_role(7),'DOMAIN_SPECIALIZATION')
    def test_method_role_8(self):self.assertEqual(scope_role(8),'EPISTEMIC_META')
    def test_valid_same_house_subject(self):
        self.assertTrue(scope_allows('H05.S06.N12','H05.S11.N04'))
    def test_method_subject_wrong_house(self):
        self.assertFalse(scope_allows('H04.S06.N12','H05.S11.N04'))
    def test_method_subject_method_subject(self):
        self.assertFalse(scope_allows('H05.S11.N01','H05.S11.N04'))
    def test_method_subject_none(self):self.assertFalse(scope_allows(None,'H05.S11.N04'))
    def test_x4_roundtrip(self):
        for idx in (0,1,11,12,143,144,1727):
            hsn=address(*from_ordinal(idx))
            self.assertEqual(decode_symbol(encode_symbol(hsn,'cupwake-x4/v1')),hsn)
    def test_x3_roundtrip(self):
        for idx in (0,1,11,12,143,144,1727):
            hsn=address(*from_ordinal(idx))
            self.assertEqual(decode_symbol(encode_symbol(hsn,'symbiosis-x3/v0.3')),hsn)
    def test_edition_unknown(self):
        with self.assertRaises(SourceContractError):encode_symbol('H01.S01.N01','unverified')
    def test_x4_cross_decode_as_x3_rejected(self):
        v=encode_symbol('H02.S05.N11','cupwake-x4/v1')
        v['edition']='symbiosis-x3/v0.3'
        with self.assertRaises(SourceContractError):decode_symbol(v)
    def test_geometric_12_neighbors(self):
        self.assertEqual(len(geometric_neighbors('H05.S06.N12')),12)
    def test_topology_reciprocal(self):
        topo=topology_summary()
        self.assertEqual(topo['directedStructuralEdges'],20736)
        self.assertEqual(topo['semanticEdgeAcceptances'],0)
    def test_merkle_proof(self):
        leaves=['a'*64,'b'*64,'c'*64,'d'*64,'e'*64]
        root,_=assemble_merkle(leaves)
        for i in range(5):self.assertTrue(verify_merkle_proof(leaves[i],merkle_proof(leaves,i),root))
    def test_merkle_tamper(self):
        leaves=['a'*64,'b'*64,'c'*64]
        root,_=assemble_merkle(leaves)
        self.assertFalse(verify_merkle_proof('f'*64,merkle_proof(leaves,1),root))
    def test_private_mode_play_refused(self):
        x=local_view_contract({'status':'PREPARED_NOT_RELEASED'},mode='PLAY')
        self.assertFalse(x['releaseAuthorized']);self.assertEqual(x['status'],'HOLD_PRIVATE_MODE')
    def test_imagine_mode_refused(self):
        x=local_view_contract({'status':'PREPARED_NOT_RELEASED'},mode='IMAGINE')
        self.assertEqual(x['status'],'HOLD_PRIVATE_MODE')
    def test_unbranded_issuance_refused(self):
        self.assertEqual(local_view_contract({'status':'HOSTED_APPROVED'})['status'],'HOLD_NOT_BRANDED_ISSUANCE')
    def test_untrusted_rights_refused(self):
        self.assertEqual(local_view_contract({'status':'PREPARED_NOT_RELEASED'})['status'],'HOLD_HOST_SOURCE_OR_CLOSURE')
    def test_caller_verified_flags_still_not_release(self):
        x=local_view_contract({'status':'PREPARED_NOT_RELEASED'},required_set_independent=True,host_rights_verified=True)
        self.assertFalse(x['releaseAuthorized']);self.assertTrue(x['finalHostReturnStillRequired'])
    def test_inflated_credit_rejected(self):
        with self.assertRaises(SourceContractError):verify_nonpromotion({'realCollaboratorTurnsCounted':1728})
    def test_owner_source_hash_if_available(self):
        if _SOURCE is None:self.skipTest('Exact owner source not provided')
        self.assertEqual(len(_SOURCE['nodes']),1728)
    def test_all_1728_source_records_have_sha_if_available(self):
        if _SOURCE is None:self.skipTest('Exact owner source not provided')
        self.assertEqual(len({x['source_record_sha256'] for x in _SOURCE['nodes'].values()}),1728)
    def test_every_method_requires_subject_if_available(self):
        if _SOURCE is None:self.skipTest('Exact owner source not provided')
        self.assertEqual(sum(x['kind']=='EPISTEMIC_META' for x in _SOURCE['nodes'].values()),720)
    def test_every_node_workorder_unique_if_available(self):
        if _PROGRAM is None:self.skipTest('Exact owner source not provided')
        self.assertEqual(len({x['workOrderSha256'] for x in _PROGRAM['orders']}),1728)
    def test_plan_root_replay_if_available(self):
        if _PROGRAM is None:self.skipTest('Exact owner source not provided')
        root,_=assemble_merkle([x['workOrderSha256'] for x in _PROGRAM['orders']])
        self.assertEqual(root,_PROGRAM['workOrderMerkleRoot'])

if __name__=='__main__':unittest.main()
