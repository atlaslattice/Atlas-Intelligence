import copy
import hashlib
import json
import os
from pathlib import Path
import sqlite3
import tempfile
import unittest
from unittest.mock import patch

import integrations.adapters as adapter_module

from integrations.adapters import (CATALOG_SHA, SOURCE_SHA, DeliveryOutbox, IntegrationHold,
    LocalFileAdapter, LocalOwnerAuthorizer, SourceRegistry, canonical, digest)

ROOT = Path(__file__).resolve().parents[1]


def synthetic_fixture():
    """Public test data. Deliberately not a replacement Ariadne ontology."""
    houses, spheres, nodes, items = {}, {}, {}, []
    index = 0
    for h in range(1,13):
        hid=f'H{h:02d}';houses[hid]={'id':hid,'name':f'Synthetic House {h}','children':[]}
        for s in range(1,13):
            sid=f'{hid}.S{s:02d}';houses[hid]['children'].append(sid)
            spheres[sid]={'id':sid,'name':f'Synthetic Sphere {h}-{s}','parent':hid,'children':[]}
            items.append({'id':f'N144-{h:02d}-{s:02d}','sphere':sid,'suggestedMode':'WORK' if index<104 else 'QUIET'})
            index+=1
            for n in range(1,13):
                nid=f'{sid}.N{n:02d}';spheres[sid]['children'].append(nid)
                node={'id':nid,'name':f'Synthetic Node {h}-{s}-{n}','parent':sid,
                      'kind':'DOMAIN_SPECIALIZATION' if s<=7 else 'EPISTEMIC_META',
                      'definition':'Synthetic positive scope about forces.',
                      'includes':'Synthetic force observations.', 'excludes':'Synthetic design intentions are excluded.'}
                node['source_record_sha256']=digest(node);nodes[nid]=node
    return (canonical({'houses':houses,'spheres':spheres,'nodes':nodes}).encode(),
            canonical({'schema':'SYNTHETIC_TEST_ONLY','items':items}).encode())


class IntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        private_root=os.environ.get('CUPWAKE_PRIVATE_SOURCE_ROOT')
        if private_root:
            private=Path(private_root)
            cls.source=(private/'inputs/ariadne_v07_atlas.json').read_bytes()
            cls.catalog=(private/'peer-inputs/next144-civilizational-capabilities.json').read_bytes()
            cls.real_source=True
        else:
            cls.source,cls.catalog=synthetic_fixture();cls.real_source=False
            # Test-only seam: the production API has no switch to relax its pins.
            pins=patch.multiple(adapter_module,SOURCE_SHA=digest(cls.source),CATALOG_SHA=digest(cls.catalog))
            pins.start();cls.addClassCleanup(pins.stop)
        cls.registry = SourceRegistry(cls.source, cls.catalog)

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name)
        self.box = DeliveryOutbox(self.path / 'outbox.sqlite', self.registry)
        self.files = LocalFileAdapter(self.path / 'files')
        self.auth = LocalOwnerAuthorizer(expires_at=10000)

    def env(self, node='H01.S01.N01', platform='ATLAS', **kwargs):
        return self.registry.projection(node, platform, 'test-run', 12, **kwargs)

    def drain(self, **kwargs):
        return self.box.drain(kwargs.pop('adapter', self.files), kwargs.pop('authorizer', self.auth), 'worker-1', now=lambda: 1, **kwargs)

    def test_original_bytes_pin(self):
        with self.assertRaisesRegex(IntegrationHold, 'ORIGINAL_SOURCE'): SourceRegistry(self.source+b' ', self.catalog)

    def test_catalog_bytes_pin(self):
        with self.assertRaisesRegex(IntegrationHold, 'PINNED_NEXT144'): SourceRegistry(self.source, self.catalog+b' ')

    def test_all_1728_original_identities(self):
        original = json.loads(self.source)
        for nid, node in original['nodes'].items():
            i = self.registry.identity(nid)
            self.assertEqual(i['declaredSourceRecordSha256'], node['source_record_sha256'])
            self.assertEqual(i['computedOriginalRecordSha256'], digest(node))

    def test_declared_and_computed_hashes_distinct(self):
        i = self.registry.identity('H01.S01.N01')
        self.assertNotEqual(i['declaredSourceRecordSha256'], i['computedOriginalRecordSha256'])

    def test_domain_meta_axis(self):
        self.assertEqual(self.registry.identity('H01.S07.N12')['sourceRole'], 'DOMAIN_SPECIALIZATION')
        self.assertEqual(self.registry.identity('H01.S08.N01')['sourceRole'], 'EPISTEMIC_META')

    def test_all_6912_projections_bind_source(self):
        count = 0
        for nid in self.registry._nodes:
            for platform in ['ATLAS','ARIADNE','SWARMCHAT','IRON_EMPIRE']:
                self.assertTrue(self.registry.verify_projection(self.env(nid,platform))); count += 1
        self.assertEqual(count, 6912)

    def test_1248_work_and_480_optional_proposals(self):
        accepted = held = 0
        for nid in self.registry._nodes:
            try: self.env(nid,route='PROPOSAL_EVIDENCE'); accepted += 1
            except IntegrationHold as e:
                self.assertEqual(str(e), 'VOLUNTARY_MODE_SEPARATION'); held += 1
        self.assertEqual((accepted,held),(1248,480))

    def test_all_nodes_independent_work_review(self):
        for nid in self.registry._nodes:
            payload=self.env(nid)['payload']
            self.assertIsNone(payload['initiative'])
            self.assertFalse(payload['proposalBodyImported'])

    def test_projection_cannot_contain_private_body(self):
        e=self.env();e['payload']['privateBody']='secret';e['payloadSha256']=digest(e['payload'])
        with self.assertRaisesRegex(IntegrationHold, 'PAYLOAD_SCHEMA'): self.box.enqueue(e)

    def test_correctly_rehashed_false_acceptance_rejected(self):
        e=self.env();e['payload']['semanticAcceptance']=True;e['payloadSha256']=digest(e['payload'])
        with self.assertRaisesRegex(IntegrationHold, 'ESCALATION'): self.box.enqueue(e)

    def test_source_substitution_rejected(self):
        e=self.env();e['payload']['identity']['declaredSourceRecordSha256']='f'*64;e['payloadSha256']=digest(e['payload'])
        with self.assertRaisesRegex(IntegrationHold, 'SOURCE_IDENTITY_SUBSTITUTION'): self.box.enqueue(e)

    def test_correctly_rehashed_mode_laundering_rejected(self):
        nid=next(n for n in self.registry._nodes if self.registry._catalog[n[:7]]['suggestedMode']!='WORK')
        e=self.env(nid);e['payload']['sourceProposalSuggestedMode']='WORK';e['payloadSha256']=digest(e['payload'])
        with self.assertRaisesRegex(IntegrationHold, 'PROJECTION_SUBSTITUTION'): self.box.enqueue(e)

    def test_source_scope_exclusion_only_preserved(self):
        n='H01.S01.N01';s=self.registry.scope_match(n,'intentions')
        self.assertEqual(s['reason'],'EXCLUSION_TEXT_ONLY')
        e=self.env(n,scope_explanation=s)
        self.assertEqual(e['payload']['scopeMatch']['reason'],'EXCLUSION_TEXT_ONLY')
        self.assertFalse(e['payload']['semanticAcceptance'])

    def test_source_scope_positive_and_identity(self):
        self.assertEqual(self.registry.scope_match('H01.S01.N01','forces')['reason'],'AFFIRMATIVE_TEXT_ONLY')
        self.assertEqual(self.registry.scope_match('H01.S01.N01','H01.S01.N01')['reason'],'IDENTITY_ONLY')

    def test_scope_cannot_grant_semantics(self):
        s=self.registry.scope_match('H01.S01.N01','forces');s['semanticAcceptance']=True
        with self.assertRaisesRegex(IntegrationHold,'SCOPE_IS_NOT_ACCEPTANCE'):self.env(scope_explanation=s)

    def test_fiction_source_metadata_no_activity(self):
        e=self.env(platform='IRON_EMPIRE')
        self.assertEqual(e['payload']['fiction']['context'],'SOURCE_SCHEMA_REVIEW_ONLY')
        self.assertEqual(e['payload']['fiction']['source']['status'],'PROPOSED_NOT_LOCKED_CANON')
        self.assertFalse(e['payload']['fiction']['storyEdited'])

    def test_fiction_optin(self):
        with self.assertRaisesRegex(IntegrationHold,'VOLUNTARY'):self.registry.fictional_review('H01.S01.N01')

    def test_fiction_consent(self):
        for consent in ['UNKNOWN','DENIED']:
            with self.assertRaisesRegex(IntegrationHold,'CONSENT'):self.registry.fictional_review('H01.S01.N01',opt_in=True,consent=consent)

    def test_fiction_timeline_negative(self):
        with self.assertRaisesRegex(IntegrationHold,'CONTINUITY'):self.registry.fictional_review('H01.S01.N01',opt_in=True,consent='GRANTED',film='V',event='PRINCE_CORONATION')

    def test_fiction_timeline_positive_stays_candidate(self):
        r=self.registry.fictional_review('H01.S01.N01',opt_in=True,consent='GRANTED',film='VI',event='PRINCE_CORONATION')
        self.assertEqual(r['status'],'FICTIONAL_REVIEW_CANDIDATE');self.assertEqual(r['canonEffect'],'NONE')

    def test_fiction_unknown_event_hold(self):
        with self.assertRaisesRegex(IntegrationHold,'CONTINUITY'):self.registry.fictional_review('H01.S01.N01',opt_in=True,consent='GRANTED',film='III',event='FEDERATION_FOUNDING_CONFIRMED')

    def test_fiction_mixed_units_hold(self):
        with self.assertRaisesRegex(IntegrationHold,'MIXED_UNITS'):self.registry.fictional_review('H01.S01.N01',opt_in=True,consent='GRANTED',quantities=[{'value':1,'unit':'kg'},{'value':1,'unit':'J'}])

    def test_fiction_historical_namespace_collision(self):
        with self.assertRaisesRegex(IntegrationHold,'NAMESPACE'):self.registry.fictional_review('H01.S01.N01',opt_in=True,consent='GRANTED',historical_namespace='H01')

    def test_local_end_to_end_all_four_systems(self):
        es=[self.env(platform=p) for p in ['ATLAS','ARIADNE','SWARMCHAT','IRON_EMPIRE']]
        self.assertEqual(self.box.enqueue_many(es),4)
        r=self.drain();self.assertEqual(r['processed'],4)
        self.assertEqual(self.box.summary()['states'],{'LOCAL_DELIVERED':4})
        self.assertTrue(self.box.verify()['valid'])
        self.assertEqual(len(list((self.path/'files').glob('*/*.json'))),4)

    def test_replay_exactly_once_local_files(self):
        e=self.env();self.assertTrue(self.box.enqueue(e));self.drain()
        self.assertFalse(self.box.enqueue(e));self.assertEqual(self.drain()['processed'],0)
        self.assertEqual(self.box.summary()['total'],1)

    def test_same_request_different_payload_conflict(self):
        e=self.env();self.box.enqueue(e)
        s=self.registry.scope_match('H01.S01.N01','forces');other=self.env(scope_explanation=s)
        self.assertEqual(other['requestId'],e['requestId'])
        with self.assertRaisesRegex(IntegrationHold,'IDEMPOTENCY'):self.box.enqueue(other)

    def test_batch_atomic_invalid_row(self):
        good=self.env();bad=copy.deepcopy(self.env('H01.S01.N02'));bad['payload']['semanticAcceptance']=True
        with self.assertRaises(IntegrationHold):self.box.enqueue_many([good,bad])
        self.assertEqual(self.box.summary()['total'],0)

    def test_batch_atomic_conflict(self):
        e=self.env();self.box.enqueue(e)
        conflicting=self.env(scope_explanation=self.registry.scope_match('H01.S01.N01','forces'))
        with self.assertRaises(IntegrationHold):self.box.enqueue_many([self.env('H01.S01.N02'),conflicting])
        self.assertEqual(self.box.summary()['total'],1)

    def test_expired_grant_no_send(self):
        self.box.enqueue(self.env());self.auth.expires_at=0
        self.assertEqual(self.drain()['outcomes'][0]['state'],'HELD')
        self.assertEqual(len(list((self.path/'files').rglob('*.json'))),0)

    def test_revoked_before_send(self):
        self.box.enqueue(self.env());self.auth.revoke()
        self.assertEqual(self.drain()['outcomes'][0]['state'],'HELD')

    def test_rights_rechecked_at_dispatch(self):
        self.box.enqueue(self.env())
        def grant(e,phase,now):
            if phase=='DISPATCH':self.auth.revoke()
            return self.auth(e,phase,now)
        self.assertEqual(self.drain(authorizer=grant)['outcomes'][0]['state'],'HELD')

    def test_wrong_node_grant_rejected(self):
        self.box.enqueue(self.env())
        def grant(e,phase,now):
            g=self.auth(e,phase,now);g['requestId']='other';return g
        self.assertEqual(self.drain(authorizer=grant)['outcomes'][0]['state'],'HELD')

    def test_local_grant_cannot_authorize_remote_callback(self):
        self.box.enqueue(self.env())
        class Remote:
            def send(_,e,g):raise AssertionError('MUST_NOT_CALL')
            def readback(_,e,r,g):raise AssertionError('MUST_NOT_CALL')
        r=self.drain(adapter=Remote())
        self.assertEqual(r['outcomes'][0]['reason'],'LOCAL_GRANT_CANNOT_AUTHORIZE_HOST')

    def test_return_revocation_records_already_written(self):
        self.box.enqueue(self.env());outer=self
        class Revoke(LocalFileAdapter):
            def send(self,e,g):
                r=super().send(e,g);outer.auth.revoke();return r
        r=self.drain(adapter=Revoke(self.path/'files'))
        self.assertEqual(r['outcomes'][0]['state'],'SENT_RETURN_HELD')
        self.assertEqual(len(list((self.path/'files').rglob('*.json'))),1)

    def test_revocation_during_readback(self):
        self.box.enqueue(self.env());outer=self
        class Revoke(LocalFileAdapter):
            def readback(self,e,r,g):
                result=super().readback(e,r,g);outer.auth.revoke();return result
        self.assertEqual(self.drain(adapter=Revoke(self.path/'files'))['outcomes'][0]['state'],'SENT_RETURN_HELD')

    def test_readback_mismatch_held(self):
        self.box.enqueue(self.env())
        class Bad(LocalFileAdapter):
            def readback(self,e,r,g):return '0'*64
        self.assertEqual(self.drain(adapter=Bad(self.path/'files'))['outcomes'][0]['state'],'SENT_RETURN_HELD')

    def test_transient_failure_retry_without_starvation(self):
        self.box.enqueue_many([self.env(),self.env('H01.S01.N02')])
        class FailFirst(LocalFileAdapter):
            def send(self,e,g):
                if e['payload']['identity']['coordinate']=='H01.S01.N01':raise OSError('temporary')
                return super().send(e,g)
        r=self.drain(adapter=FailFirst(self.path/'files'))
        self.assertEqual([o['state'] for o in r['outcomes']],['RETRY','LOCAL_DELIVERED'])
        self.assertEqual(self.drain()['processed'],1)
        self.assertEqual(self.box.summary()['states'],{'LOCAL_DELIVERED':2})

    def test_process_crash_after_send_and_lease_recovery(self):
        e=self.env();self.box.enqueue(e);claim=self.box.claim('old',1,lease_seconds=1)
        self.files.send(e,self.auth(e,'DISPATCH',1))
        # Worker died before acknowledgement; later same request ID gives same file.
        recovered=self.box.drain(self.files,self.auth,'new',now=lambda:3)
        self.assertEqual(recovered['outcomes'][0]['state'],'LOCAL_DELIVERED')
        self.assertEqual(len(list((self.path/'files').rglob('*.json'))),1)
        with self.assertRaisesRegex(IntegrationHold,'STALE_WORKER'):self.box.finish(claim,'LOCAL_DELIVERED')

    def test_unexpired_claim_excludes_second_worker(self):
        self.box.enqueue(self.env());self.box.claim('worker-a',1,lease_seconds=30)
        self.assertIsNone(self.box.claim('worker-b',2))

    def test_release_hold_retries_exact_payload(self):
        e=self.env();self.box.enqueue(e);self.auth.revoke();self.drain()
        self.box.release_hold(e['requestId'],'HELD','Owner local grant renewed')
        self.auth=LocalOwnerAuthorizer(expires_at=10000)
        self.assertEqual(self.drain()['outcomes'][0]['state'],'LOCAL_DELIVERED')

    def test_event_history_append_only(self):
        self.box.enqueue(self.env())
        with sqlite3.connect(self.box.db_path) as db:
            with self.assertRaisesRegex(sqlite3.IntegrityError,'APPEND_ONLY'):db.execute('DELETE FROM events')
        self.assertTrue(self.box.verify()['valid'])

    def test_callback_receipt_not_promoted_to_host_proof(self):
        e=self.env();self.box.enqueue(e)
        class Remote:
            def send(_,e,g):return {'requestId':e['requestId'],'payloadSha256':e['payloadSha256'],'receiptRef':'synthetic://remote-receipt','idempotencyKeyHonored':True,'hostVerified':True}
            def readback(_,e,r,g):return e['payloadSha256']
        def grant(e,p,n):
            g=self.auth(e,p,n);g['kind']='HOST_CALLBACK_REPORTED';return g
        r=self.drain(adapter=Remote(),authorizer=grant)
        self.assertEqual(r['outcomes'][0]['state'],'CALLBACK_RECEIPT_RECORDED')
        self.assertEqual(self.box.summary()['hostedChangesVerified'],0)
        with sqlite3.connect(self.box.db_path) as db:receipt=json.loads(db.execute('SELECT receipt FROM deliveries').fetchone()[0])
        self.assertFalse(receipt['hostVerified'])

    def test_lost_remote_ack_does_not_blindly_resend(self):
        self.box.enqueue(self.env()); calls=[]
        class Remote:
            def send(_,e,g):calls.append(e['requestId']);raise TimeoutError('committed but ACK lost')
            def readback(_,e,r,g):raise AssertionError('not reached')
        def grant(e,p,n):
            g=self.auth(e,p,n);g['kind']='HOST_CALLBACK_REPORTED';return g
        r=self.drain(adapter=Remote(),authorizer=grant)
        self.assertEqual(r['outcomes'][0]['state'],'SENT_RETURN_HELD')
        self.assertEqual(self.drain(adapter=Remote(),authorizer=grant)['processed'],0)
        self.assertEqual(len(calls),1)
        self.assertTrue(self.box.verify()['valid'])

    def test_expired_external_dispatch_requires_reconciliation(self):
        self.box.enqueue(self.env());claim=self.box.claim('dead',1,lease_seconds=1)
        self.box.mark_dispatch(claim,'EXTERNAL')
        self.assertIsNone(self.box.claim('new',3))
        self.assertEqual(self.box.summary()['states'],{'SENT_RETURN_HELD':1})
        self.assertTrue(self.box.verify()['valid'])

    def test_direct_state_tampering_detected(self):
        e=self.env();self.box.enqueue(e)
        with sqlite3.connect(self.box.db_path) as db:db.execute("UPDATE deliveries SET state='LOCAL_DELIVERED'")
        with self.assertRaisesRegex(IntegrationHold,'DELIVERY_STATE_EVENT_MISMATCH'):self.box.verify()

    def test_direct_receipt_tampering_detected(self):
        self.box.enqueue(self.env());self.drain()
        with sqlite3.connect(self.box.db_path) as db:db.execute("UPDATE deliveries SET receipt='{}'")
        with self.assertRaisesRegex(IntegrationHold,'RECEIPT_EVENT_MISMATCH'):self.box.verify()

    def test_returned_fiction_pin_cannot_mutate_registry(self):
        e=self.env(platform='IRON_EMPIRE');original=e['payload']['fiction']['source']['sha256']
        e['payload']['fiction']['source']['sha256']='f'*64;e['payloadSha256']=digest(e['payload'])
        self.assertEqual(self.env(platform='IRON_EMPIRE')['payload']['fiction']['source']['sha256'],original)
        with self.assertRaisesRegex(IntegrationHold,'PROJECTION_SUBSTITUTION'):self.box.enqueue(e)
        review=self.registry.fictional_review('H01.S01.N01',opt_in=True,consent='GRANTED')
        review['source']['sha256']='f'*64
        self.assertEqual(self.registry.fictional_review('H01.S01.N01',opt_in=True,consent='GRANTED')['source']['sha256'],original)

    def test_stale_drain_worker_does_not_overwrite_new_lease(self):
        self.box.enqueue(self.env());outer=self
        class Slow(LocalFileAdapter):
            def send(self,e,g):
                outer.box.claim('new-worker',1000)
                return super().send(e,g)
        r=self.drain(adapter=Slow(self.path/'files'))
        self.assertEqual(r['outcomes'][0]['state'],'LEASE_LOST')
        self.assertEqual(self.box.summary()['states'],{'INFLIGHT':1})
        self.assertTrue(self.box.verify()['valid'])

    def test_nonfinite_lease_and_clock_rejected(self):
        self.box.enqueue(self.env())
        for n in [float('inf'),float('-inf'),float('nan')]:
            with self.assertRaises(IntegrationHold):self.box.claim('worker',1,lease_seconds=n)
            with self.assertRaises(IntegrationHold):self.box.claim('worker',n)

    def test_completion_requires_matching_receipt(self):
        self.box.enqueue(self.env());claim=self.box.claim('worker',1)
        with self.assertRaisesRegex(IntegrationHold,'DELIVERY_RECEIPT_REQUIRED'):self.box.finish(claim,'LOCAL_DELIVERED')
        self.assertEqual(self.box.summary()['states'],{'INFLIGHT':1})

    def test_synthetic_fixture_rejected_by_unmodified_production_trust(self):
        source,catalog=synthetic_fixture()
        with patch.multiple(adapter_module,SOURCE_SHA=SOURCE_SHA,CATALOG_SHA=CATALOG_SHA):
            with self.assertRaisesRegex(IntegrationHold,'ORIGINAL_SOURCE_BYTES_REQUIRED'):SourceRegistry(source,catalog)


if __name__=='__main__':unittest.main()
