"""Synthetic preflight contracts. No optimizer, owner data, or held-out panel."""
from copy import deepcopy
import inspect
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import numpy as np

from atlas_work_learning.model import AddressedGraphEncoder, ModelConfig
from atlas_work_learning.training import (TrainingConfig, TrainingViewCollisionError,
    audit_training_views, require_unambiguous_training_views, train_model)


def registry():
    names = ('algebra', 'ecology', 'circuits', 'ethics')
    nodes = [{'id': f'H01.S{1+i//2:02d}.N{1+i%2:02d}', 'name': n, 'definition': n + ' synthetic definition'} for i,n in enumerate(names)]
    return {'sha256': 'f'*64, 'edition': 'synthetic-test', 'nodes': nodes,
            'node_ids': [n['id'] for n in nodes], 'node_to_sphere': [0,0,1,1], 'sphere_to_house': [0,0]}


def model(feature_dim=24, max_tokens=256):
    return AddressedGraphEncoder(registry(), ModelConfig(feature_dim=feature_dim, max_tokens=max_tokens, embedding_dim=6, seed=9), _test_fixture=True)


def pair(i, query, target):
    return {'id': f'p{i}', 'family_id': f'family{i}', 'source_id': f'source{i}',
            'source_version': 'v1', 'source_uri': f'fixture://views/{i}', 'source_sha256': str(i)*64,
            'input_text': query, 'target_text': target, 'split': 'train', 'kind': 'synthetic'}


def distinct_tokens(m, count=4):
    seen = {}
    for i in range(1000):
        word = f'syntheticword{i}'
        seen.setdefault(m.features([word])[0].tobytes(), word)
        if len(seen) == count:
            return list(seen.values())
    raise RuntimeError('FIXTURE_TOKEN_SEARCH_FAILED')


def unique_pairs(m):
    a,b,c,d = distinct_tokens(m)
    return [pair(1,a,c),pair(2,b,d)]


class TrainingViewPreflightTests(unittest.TestCase):
    def test_exact_query_duplicates_across_families_hold(self):
        m=model(); pairs=unique_pairs(m); pairs[1]['input_text']=pairs[0]['input_text']
        r=audit_training_views(m,pairs)
        self.assertEqual(r['status'],'HELD_AMBIGUOUS_TRAINING_VIEWS')
        self.assertEqual(r['collision_groups'][0]['reason'],'EXACT_TEXT_REUSE')
        self.assertEqual(r['collision_groups'][0]['axis'],'input')
        self.assertEqual(r['declared_family_count'],2)
        self.assertEqual(r['potential_directed_false_negative_slots'],2)

    def test_exact_target_duplicates_hold_reverse_loss(self):
        m=model(); pairs=unique_pairs(m); pairs[1]['target_text']=pairs[0]['target_text']
        r=audit_training_views(m,pairs)
        self.assertEqual([g['axis'] for g in r['collision_groups']],['target'])
        self.assertEqual(r['held_pair_ids'],['p1','p2'])

    def test_raw_distinct_token_order_is_not_semantic_equivalence(self):
        m=model(); pairs=unique_pairs(m)
        a,b=distinct_tokens(m,2)
        pairs[0]['input_text']=a+' '+b; pairs[1]['input_text']=b+' '+a
        r=audit_training_views(m,pairs); group=r['collision_groups'][0]
        self.assertEqual(group['reason'],'BAG_OR_TRUNCATION_REUSE')
        self.assertEqual(group['distinct_raw_views'],2)
        self.assertEqual(group['distinct_effective_token_bags'],1)
        self.assertEqual(r['semantic_judgments_created'],0)

    def test_hash_bucket_collision_with_different_token_bags(self):
        m=model(); seen={}; collision=None
        for i in range(1000):
            word=f'unrelatedtoken{i}'; key=m.features([word])[0].tobytes()
            if key in seen:
                collision=(seen[key],word); break
            seen[key]=word
        self.assertIsNotNone(collision)
        pairs=unique_pairs(m)
        for p,word in zip(pairs,collision): p['input_text']=word
        group=audit_training_views(m,pairs)['collision_groups'][0]
        self.assertEqual(group['reason'],'DISTINCT_TOKEN_BAGS_IDENTICAL_HASH_FEATURES')
        self.assertEqual(group['distinct_effective_token_bags'],2)

    def test_normalized_case_punctuation_reuse_is_separate(self):
        m=model(); pairs=unique_pairs(m)
        pairs[0]['input_text']='Alpha beta'; pairs[1]['input_text']='ALPHA, BETA!'
        group=audit_training_views(m,pairs)['collision_groups'][0]
        self.assertEqual(group['reason'],'NORMALIZED_TOKEN_REUSE')

    def test_token_truncation_reuse_is_visible(self):
        m=model(max_tokens=1); pairs=unique_pairs(m)
        a,b,c=distinct_tokens(m,3)
        pairs[0]['input_text']=a+' '+b; pairs[1]['input_text']=a+' '+c
        group=audit_training_views(m,pairs)['collision_groups'][0]
        self.assertEqual(group['reason'],'BAG_OR_TRUNCATION_REUSE')

    def test_unique_features_pass_only_uniqueness(self):
        m=model(); r=require_unambiguous_training_views(m,unique_pairs(m))
        self.assertEqual(r['status'],'PASS_VIEW_UNIQUENESS_ONLY')
        self.assertFalse(r['source_rights_verified_by_this_audit'])
        self.assertFalse(r['source_independence_verified'])
        self.assertEqual(r['actual_negative_presentations'],0)

    def test_no_pair_or_weight_mutation(self):
        m=model(); pairs=unique_pairs(m); before=deepcopy(pairs); state=m.state_digest()
        audit_training_views(m,pairs)
        self.assertEqual(pairs,before); self.assertEqual(m.state_digest(),state)

    def test_pair_order_invariance_and_source_revision_binding(self):
        m=model(); pairs=unique_pairs(m); r=audit_training_views(m,pairs)
        self.assertEqual(r,audit_training_views(m,list(reversed(pairs))))
        changed=deepcopy(pairs); changed[0]['source_version']='v2'
        self.assertNotEqual(r['audit_sha256'],audit_training_views(m,changed)['audit_sha256'])

    def test_full_correction_metadata_is_bound(self):
        m=model(); pairs=unique_pairs(m); r=audit_training_views(m,pairs)
        pairs[0]['verification_refs']=[{'uri':'fixture://other','sha256':'a'*64}]
        self.assertNotEqual(r['training_pair_manifest_sha256'],audit_training_views(m,pairs)['training_pair_manifest_sha256'])

    def test_feature_configuration_is_bound(self):
        m=model(); pairs=unique_pairs(m); r=audit_training_views(m,pairs)
        changed=model(feature_dim=48)
        self.assertNotEqual(r['feature_config_sha256'],audit_training_views(changed,pairs)['feature_config_sha256'])

    def test_global_collision_spans_bounded_feature_chunks(self):
        m=model(feature_dim=4096); tokens=distinct_tokens(m,130)
        pairs=[pair(i,tokens[i],tokens[(i+1)%130]) for i in range(130)]
        for i,p in enumerate(pairs): p['id']=f'p{i:03d}'
        pairs[-1]['input_text']=pairs[0]['input_text']
        original=m.features; call_rows=[]
        def bounded(texts):
            call_rows.append(len(texts))
            self.assertLessEqual(len(texts),128)
            return original(texts)
        with patch.object(m,'features',side_effect=bounded):
            r=audit_training_views(m,pairs)
        self.assertIn(128,call_rows)
        self.assertEqual(r['distinct_feature_views'],{'input':129,'target':130})
        self.assertEqual(r['collision_groups'][0]['pair_ids'],['p000','p129'])
        self.assertTrue(r['collision_hash_buckets_exactly_rechecked'])

    def test_guard_pin_drift_holds_without_training(self):
        m=model(); pairs=unique_pairs(m)
        with self.assertRaisesRegex(ValueError,'PREFLIGHT_PIN_MISMATCH'):
            require_unambiguous_training_views(m,pairs,expected_audit_sha256='0'*64)

    def test_guard_collision_exposes_bound_audit(self):
        m=model(); pairs=unique_pairs(m); pairs[1]['input_text']=pairs[0]['input_text']
        with self.assertRaises(TrainingViewCollisionError) as cm:
            require_unambiguous_training_views(m,pairs)
        self.assertEqual(cm.exception.audit['status'],'HELD_AMBIGUOUS_TRAINING_VIEWS')

    def test_non_training_split_rejected_before_body_read(self):
        m=model(); pairs=unique_pairs(m)
        pairs[1]['split']='test'; pairs[1]['input_text']=object()
        with self.assertRaisesRegex(ValueError,'TRAIN_ONLY'):
            audit_training_views(m,pairs)

    def test_duplicate_identity_rejected(self):
        m=model(); pairs=unique_pairs(m); pairs[1]['id']=pairs[0]['id']
        with self.assertRaisesRegex(ValueError,'DUPLICATE_PAIR_ID'):
            audit_training_views(m,pairs)

    def test_opt_in_gate_stops_before_output_and_optimizer(self):
        items=[]
        common='shared preface explains methods evidence conditions assumptions and uncertainty'
        for i in range(4):
            text=common+' '+' '.join([f'topic{i}']*18)
            items.append({'id':f'i{i}', 'family_id':f'f{i}', 'source_id':f's{i}',
                          'scope':'WORK','split':'train' if i<2 else 'validation',
                          'text':text if i<2 else (' '.join([f'val{i}']*27))})
        # A tiny synthetic call exercises admission only. Any optimizer call fails.
        with tempfile.TemporaryDirectory() as temp:
            output=Path(temp)/'blocked-run'
            with patch.object(AddressedGraphEncoder,'loss_and_gradients',side_effect=AssertionError('OPTIMIZER_FORBIDDEN')) as mocked:
                with self.assertRaises(TrainingViewCollisionError):
                    train_model(registry(),{'sha256':'a'*64,'items':items},output,
                                model_config=ModelConfig(feature_dim=24,embedding_dim=6),
                                training_config=TrainingConfig(updates=1),_test_fixture=True,
                                require_unambiguous_views=True)
                mocked.assert_not_called()
            self.assertFalse(output.exists())

    def test_default_is_unchanged_until_explicit_migration(self):
        self.assertIs(inspect.signature(train_model).parameters['require_unambiguous_views'].default,False)


if __name__=='__main__':
    unittest.main(verbosity=2)
