"""Synthetic controls for projection semantics, not frozen-source review evidence."""
import copy
import json
import pathlib
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'src'))
from research_bridge import (FrozenTopicCoverage, SourceHold, ARIADNE_SHA,
                             OPENALEX_SHA, COVERAGE_SCOPES, canonical, sha256)

NODE = 'H01.S01.N01'


def fixture():
    nodes = {f'H01.S01.N{i:02d}': {'name':f'Synthetic domain {i}',
                                   'kind':'DOMAIN_SPECIALIZATION'} for i in range(1, 5)}
    nodes['H01.S08.N01'] = {'name':'Synthetic meta lens', 'kind':'EPISTEMIC_META'}
    rows = [{'T_ID':'T'+str(10000+i*10), 'Status':'SYNTHETIC_UNREVIEWED'} for i in range(1, 6)]
    def edge(tid, target, rank, ordinal, score=None):
        return {'topicId':tid, 'topicLabel':'Synthetic '+tid, 'candidateHsn':target,
                'rank':rank, 'score':score,
                'scoreType':'UNCALIBRATED_HEURISTIC_NOT_PROBABILITY' if rank==1 else 'NOT_REPORTED',
                'sourceStatus':'SYNTHETIC_UNREVIEWED', 'sourceRowOrdinal':ordinal,
                'candidateRole':'PRIMARY' if rank==1 else 'ALTERNATE',
                'sourceVerifiedExact':False, 'sourceReviewerAccepted':False,
                'authorityEffect':'NONE', 'approved':False}
    edges = [edge('T10030',NODE,1,1,.2), edge('T10010',NODE,1,2,.1),
             edge('T10020',NODE,1,3,.3), edge('T10040',NODE,3,4),
             edge('T10050',NODE,2,5), edge('T10040','H01.S01.N02',1,4,.5),
             edge('T10010','H01.S01.N03',2,2)]
    return {'nodes':nodes}, rows, edges


class TopicCoverageTests(unittest.TestCase):
    def setUp(self):
        self.reg, self.rows, self.edges = fixture()
        # Mocks isolate projection logic. Only the separate private integration
        # receipt exercises exact real registry and frozen crosswalk bytes.
        with patch('research_bridge.load_registry', return_value=self.reg), \
             patch('research_bridge.load_topics', return_value=(self.rows,self.edges)):
            self.coverage = FrozenTopicCoverage('SYNTHETIC_REGISTRY', 'SYNTHETIC_CSV')

    def observation(self, ids=None, **changes):
        return {'hsn':NODE, 'scope':'PRIMARY', 'limit':2,
                'visibleTopicIds':['T10010','T10020'] if ids is None else ids,
                'observationRef':'synthetic-control:graph-cap-two',
                'source':{k:v for k,v in self.coverage.source.items() if k!='proof'}, **changes}

    def test_caps_zero_partial_exact_and_above_total(self):
        for cap, visible in [(0,0),(1,1),(3,3),(5,3)]:
            with self.subTest(cap=cap):
                r=self.coverage.node(NODE,scope='PRIMARY',limit=cap)
                self.assertEqual((r['counts']['visible'],r['counts']['total'],r['counts']['omitted']),
                                 (visible,3,3-visible))
                self.assertEqual(r['truncated'],visible<3)
                self.assertEqual(r['capReached'],visible==cap)

    def test_scope_denominators_are_not_interchangeable(self):
        self.assertEqual([self.coverage.node(NODE,scope=s)['counts']['total'] for s in COVERAGE_SCOPES], [3,2,5])
        r=self.coverage.node(NODE,scope='PRIMARY')
        self.assertEqual((r['counts']['primary'],r['counts']['alternate'],r['counts']['allCandidates']), (3,2,5))

    def test_missing_or_unknown_scope_does_not_choose_implicit_denominator(self):
        with self.assertRaises(TypeError): self.coverage.node(NODE)
        for scope in [None,'ALL','ACCEPTED','primary',True]:
            with self.subTest(scope=scope), self.assertRaises(SourceHold):
                self.coverage.node(NODE,scope=scope)

    def test_source_score_and_id_orders_preserved_separately(self):
        r=self.coverage.node(NODE,scope='PRIMARY',limit=3,order='TOPIC_ID')
        self.assertEqual(r['sourceTopicOrder'],['T10030','T10010','T10020'])
        self.assertEqual(r['candidateTopicOrder'],['T10020','T10030','T10010'])
        self.assertEqual(r['presentationTopicOrder'],['T10010','T10020','T10030'])
        t=r['topics'][0]
        self.assertEqual((t['sourceRowOrdinal'],t['sourceOrderPosition'],t['candidateOrderPosition'],t['presentationPosition']), (2,2,3,1))
        self.assertEqual(t['candidateRankWithinTopic'],1)
        self.assertEqual(t['scoreType'],'UNCALIBRATED_HEURISTIC_NOT_PROBABILITY')

    def test_candidate_order_uses_candidate_rank_before_primary_score(self):
        r=self.coverage.node(NODE,scope='ALL_CANDIDATES',limit=5,order='CANDIDATE_RANK_THEN_HEURISTIC_SCORE')
        self.assertEqual(r['presentationTopicOrder'],['T10020','T10030','T10010','T10050','T10040'])
        self.assertEqual([t['candidateRankWithinTopic'] for t in r['topics']],[1,1,1,2,3])
        self.assertIsNone(r['topics'][-1]['primaryHeuristicScore'])

    def test_source_order_retains_csv_order_without_mutation(self):
        before=copy.deepcopy(self.edges)
        r=self.coverage.node(NODE,scope='PRIMARY',limit=3,order='SOURCE_ORDER')
        self.assertEqual(r['presentationTopicOrder'],['T10030','T10010','T10020'])
        self.assertEqual(self.edges,before)

    def test_verified_snapshot_and_returned_receipts_cannot_alias_mutations(self):
        first=self.coverage.node(NODE,scope='PRIMARY',limit=3)
        self.reg['nodes'][NODE]['name']='changed after construction'
        self.edges[0]['topicId']='T99999'
        with self.assertRaises(TypeError):self.coverage.registry['nodes'][NODE]['name']='changed cached source'
        with self.assertRaises(TypeError):self.coverage.edges[0]['topicId']='T99998'
        with self.assertRaises(TypeError):self.coverage.rows[0]['Status']='APPROVED'
        with self.assertRaises(TypeError):self.coverage.source['registrySha256']='0'*64
        with self.assertRaises(AttributeError):self.coverage.by_node[NODE].append({})
        with self.assertRaises(AttributeError):self.coverage.source={}
        first['source']['registrySha256']='1'*64
        first['topics'][0]['sourceReviewerAccepted']=True
        second=self.coverage.node(NODE,scope='PRIMARY',limit=3)
        self.assertEqual(second['nodeName'],'Synthetic domain 1')
        self.assertEqual(second['source']['registrySha256'],ARIADNE_SHA)
        self.assertEqual(second['presentationTopicOrder'],['T10010','T10020','T10030'])
        self.assertTrue(all(t['sourceReviewerAccepted'] is False for t in second['topics']))

    def test_uncovered_domain_and_meta_remain_empty(self):
        for node in ['H01.S01.N04','H01.S08.N01']:
            with self.subTest(node=node):
                r=self.coverage.node(node,scope='ALL_CANDIDATES',limit=5)
                self.assertEqual(r['counts']['total'],0)
                self.assertEqual(r['topics'],[])
                self.assertFalse(r['truncated'])

    def test_global_union_and_alternate_only_coverage_not_added_naively(self):
        c=self.coverage.summary()['counts']
        self.assertEqual((c['primaryCoveredNodes'],c['alternateCoveredNodes'],c['anyCandidateCoveredNodes']), (2,2,3))
        self.assertEqual((c['alternateOnlyNodes'],c['uncoveredDomainNodes']), (1,1))
        self.assertEqual((c['primaryLinks'],c['alternateLinks'],c['allCandidateLinks']), (4,3,7))

    def test_local_candidates_do_not_grant_acceptance_or_host_proof(self):
        r=self.coverage.node(NODE,scope='ALL_CANDIDATES')
        self.assertEqual(r['status'],'LOCAL_SOURCE_PROJECTION')
        self.assertEqual(r['counts']['semanticAccepted'],0)
        self.assertEqual(r['authorityEffect'],'NONE')
        self.assertFalse(r['hostGraphVerified'])
        self.assertTrue(all(t['semanticAccepted'] is False for t in r['topics']))
        self.assertEqual(self.coverage.summary()['actualProviderRequests'],0)

    def test_cap_type_and_bounds(self):
        for cap in [True,False,None,'5',2.5,-1,4517]:
            with self.subTest(cap=cap), self.assertRaises(SourceHold):
                self.coverage.node(NODE,scope='PRIMARY',limit=cap)

    def test_unknown_node_and_presentation_order_rejected(self):
        for node in ['H00.S01.N01','H01.S00.N01','H01.S01.N13','H12.S12.N12',None]:
            with self.subTest(node=node), self.assertRaises(SourceHold):
                self.coverage.node(node,scope='PRIMARY')
        with self.assertRaises(SourceHold):self.coverage.node(NODE,scope='PRIMARY',order='BEST_MATCH')

    def test_observed_order_is_not_rewritten_to_source_or_rank_order(self):
        r=self.coverage.observe_graph(self.observation(['T10030','T10010']))
        self.assertEqual(r['presentationTopicOrder'],['T10030','T10010'])
        self.assertTrue(r['observationChecks']['matchesSourceOrderPrefix'])
        self.assertFalse(r['observationChecks']['displaySortedByTopicId'])
        self.assertFalse(r['observationChecks']['matchesCandidateOrderPrefix'])
        self.assertFalse(r['hostGraphVerified'])
        self.assertEqual(r['order'],'OBSERVED_RETURN_ORDER')

    def test_missing_rows_are_retained_as_finding_not_explained_by_cap(self):
        r=self.coverage.observe_graph(self.observation(['T10010']))
        self.assertEqual((r['counts']['visible'],r['counts']['total'],r['counts']['omitted']),(1,3,2))
        self.assertFalse(r['observationChecks']['countMatchesCap'])
        self.assertEqual(r['observationChecks']['countExpectedAtCap'],2)

    def test_duplicate_visible_ids_and_over_cap_rejected(self):
        for ids in [['T10010','T10010'],['T10010','T10020','T10030']]:
            with self.subTest(ids=ids),self.assertRaises(SourceHold):
                self.coverage.observe_graph(self.observation(ids))

    def test_primary_graph_cannot_silently_include_alternate(self):
        with self.assertRaises(SourceHold):
            self.coverage.observe_graph(self.observation(['T10040']))
        r=self.coverage.observe_graph(self.observation(['T10040'],scope='ALTERNATE'))
        self.assertEqual(r['counts']['total'],2)

    def test_observation_source_edition_and_both_digests_bound(self):
        for key in ['registryEdition','registrySha256','crosswalkEdition','crosswalkSha256']:
            x=self.observation();x['source'][key]='different'
            with self.subTest(key=key),self.assertRaises(SourceHold):self.coverage.observe_graph(x)

    def test_observation_ref_required_and_unknown_authority_field_rejected(self):
        for x in [self.observation(observationRef=''),self.observation(hostVerified=True),
                  self.observation(source=None),self.observation(visibleTopicIds='T10010')]:
            with self.subTest(x=x),self.assertRaises(SourceHold):self.coverage.observe_graph(x)

    def test_write_has_every_node_and_explicit_scope_with_reproducible_digest(self):
        with tempfile.TemporaryDirectory() as td:
            path=pathlib.Path(td)/'coverage.json'
            a=self.coverage.write(path)
            before=path.read_bytes();b=self.coverage.write(path)
            self.assertEqual(before,path.read_bytes());self.assertEqual(a,b)
            output=json.loads(before)
            self.assertEqual(set(output['nodes']),set(self.reg['nodes']))
            self.assertTrue(all(set(v)==set(COVERAGE_SCOPES) for v in output['nodes'].values()))
            digest=output.pop('digest')
            self.assertEqual(digest,sha256(canonical(output).encode()))

    def test_constructor_rejects_changed_original_registry_bytes(self):
        with tempfile.TemporaryDirectory() as td:
            path=pathlib.Path(td)/'registry.json';path.write_text('{}')
            with self.assertRaisesRegex(SourceHold,'SOURCE_DIGEST_MISMATCH'):
                FrozenTopicCoverage(path,'unused.csv')

    def test_constructor_rejects_changed_frozen_crosswalk_bytes(self):
        with tempfile.TemporaryDirectory() as td:
            path=pathlib.Path(td)/'topics.csv';path.write_text('changed')
            with patch('research_bridge.load_registry',return_value=self.reg):
                with self.assertRaisesRegex(SourceHold,'SOURCE_DIGEST_MISMATCH'):
                    FrozenTopicCoverage('synthetic-registry',path)


if __name__=='__main__':unittest.main()
