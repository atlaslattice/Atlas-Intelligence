import pathlib,sys,unittest,tempfile,sqlite3,copy,hashlib
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'src'))
from wikimedia_bridge import *

TITLE='Magnetic confinement fusion'
URL='https://en.wikipedia.org/wiki/Magnetic_confinement_fusion'

def source_records():
    topic={'id':'https://openalex.org/T10346','ids':{'openalex':'https://openalex.org/T10346','wikipedia':URL}}
    article={'id':1234,'key':'Magnetic_confinement_fusion','title':TITLE,'latest':{'id':6789,'timestamp':'2026-11-23T00:00:00Z'},
             'content_model':'wikitext','license':{'title':'Creative Commons Attribution ShareAlike 4.0','url':'https://creativecommons.org/licenses/by-sa/4.0/'},
             'source':'== Introduction ==\nPhysics context\n== References ==\n<ref>Ref</ref>\n'}
    pp={'query':{'pages':[{'pageid':1234,'title':TITLE,'pageprops':{'wikibase_item':'Q98765'},'revisions':[{'revid':6789}]}]}}
    ent={'entities':{'Q98765':{'id':'Q98765','lastrevid':4321,'labels':{'en':{'value':TITLE}},
           'sitelinks':{'enwiki':{'site':'enwiki','title':TITLE}},
           'claims':{'P31':[{'id':'Q98765$A1','rank':'normal','mainsnak':{'snaktype':'value','property':'P31',
                 'datavalue':{'type':'wikibase-entityid','value':{'id':'Q834'}}},'references':[{'hash':'synthetic'}]}],
                 'P356':[{'id':'Q98765$A2','rank':'normal','mainsnak':{'snaktype':'value','property':'P356',
                 'datavalue':{'type':'string','value':'10.1234/example'}}}]}}}}
    node={'coordinate':'H01.S05.N10','nodeDigest':'a'*64,'registryDigest':ARIADNE_SHA,'role':'DOMAIN_SPECIALIZATION'}
    return topic,article,pp,ent,node

def composed():
    raw=source_records();topic,page,pp,ent,node=raw
    anchor=openalex_topic_anchor(topic);w=parse_page_response(page,URL);p=parse_pageprops_response(pp,w['pageId']);e=parse_entity_response(ent,p['qid'])
    c=prepare_hsn_candidate(node,anchor,w,p,e,consent=True)
    return raw,anchor,w,p,e,c

class Validity(unittest.TestCase):
    def test_topic_id_and_wikipedia_link(self):
        r=openalex_topic_anchor(source_records()[0]);self.assertEqual(r['topicId'],'T10346');self.assertEqual(r['article']['title'],TITLE)
    def test_wikipedia_link_absent_held_not_mapped(self):
        self.assertEqual(openalex_topic_anchor({'id':'T10346','ids':{}})['status'],'NO_WIKIPEDIA_ANCHOR')
    def test_article_url_normalization(self):
        self.assertEqual(normalize_wikipedia_url(URL)['articleUrl'],URL)
    def test_no_host_spoofing(self):
        for x in ['https://en.wikipedia.org.evil.test/wiki/X','http://en.wikipedia.org/wiki/X',
                   'https://en.wikipedia.org/wiki/X?x=y','https://en.wikipedia.org/wiki/X#fragment',
                   'https://en.wikipedia.org/wiki/User:XYZ','https://en.wikipedia.org/wiki/Special:Random',
                   'https://en.wikipedia.org/wiki/X/Y','https://en.wikipedia.org/wiki/X%00Y']:
            with self.subTest(x=x),self.assertRaises(WikimediaHold):normalize_wikipedia_url(x)
    def test_topic_id_rejects_concept_namespace(self):
        with self.assertRaises(WikimediaHold):openalex_topic_anchor({'id':'C1111','ids':{}})
    def test_topic_cannot_claim_approval(self):
        with self.assertRaises(WikimediaHold):openalex_topic_anchor({'id':'T10346','ids':{},'sameAsVerified':True})
    def test_server_side_revision_parser_preview(self):
        url=page_structure_request(6789)
        self.assertIn('action=parse',url);self.assertIn('oldid=6789',url)
        fixture={'parse':{'revid':6789,'sections':[{'line':'References','level':'2'}],
         'categories':[{'*':'Fusion research'}],'externallinks':['https://doi.org/10.1234/example','https://doi.org/10.456/other']}}
        x=parse_page_structure_response(fixture,6789)
        self.assertEqual(x['sections'][0]['heading'],'References');self.assertEqual(x['externalLinkHosts'],['doi.org'])
        self.assertEqual(x['scientificCitationsVerified'],0)
    def test_server_parser_revision_drift_holds(self):
        with self.assertRaises(WikimediaHold):parse_page_structure_response({'parse':{'revid':6788}},6789)
    def test_only_readonly_request_templates(self):
        a=normalize_wikipedia_url(URL)
        self.assertIn('/w/rest.php/v1/page/',page_metadata_request(a))
        self.assertIn('formatversion=2',qid_lookup_request(TITLE))
        self.assertIn('wbgetentities',entity_request('Q98765'))
    def test_requests_reject_injections(self):
        for q in ['Q0','Q1|Q2','P42','Q999%2Fbad']:
            with self.subTest(q=q),self.assertRaises(WikimediaHold):entity_request(q)
    def test_metadata_parsed_with_license_and_source_hash(self):
        _,a,w,p,e,c=composed();self.assertEqual(w['revisionId'],6789);self.assertEqual(w['sourceSHA256'],digest(source_records()[1]['source']));self.assertFalse(w['textStored'])
        self.assertEqual([s['heading'] for s in w['headings']],['Introduction','References'])
        self.assertIn('BY_SA',w['license']['id'])
    def test_license_unknown_holds(self):
        t,a,*_=source_records();a['license']['url']='https://example.com/license'
        with self.assertRaises(WikimediaHold):parse_page_response(a,URL)
    def test_title_mismatch_holds(self):
        t,a,*_=source_records();a['title']='Nuclear fusion'
        with self.assertRaises(WikimediaHold):parse_page_response(a,URL)
    def test_unrevisioned_page_holds(self):
        t,a,*_=source_records();a['latest']['id']=None
        with self.assertRaises(WikimediaHold):parse_page_response(a,URL)
    def test_page_text_not_stored_in_record(self):
        t,a,*_=source_records();w=parse_page_response(a,URL);self.assertNotIn('Physics context',canonical(w))
    def test_page_too_large_holds(self):
        t,a,*_=source_records();a['source']='A'*2_000_001
        with self.assertRaises(WikimediaHold):parse_page_response(a,URL)
    def test_pageprops_qid(self):
        self.assertEqual(parse_pageprops_response(source_records()[2],1234)['qid'],'Q98765')
    def test_pageprops_page_mismatch_holds(self):
        with self.assertRaises(WikimediaHold):parse_pageprops_response(source_records()[2],999)
    def test_pageprops_missing_qid_holds(self):
        raw=source_records()[2];raw['query']['pages'][0]['pageprops']={}
        with self.assertRaises(WikimediaHold):parse_pageprops_response(raw,1234)
    def test_entity_sitelink_and_label(self):
        e=parse_entity_response(source_records()[3],'Q98765');self.assertEqual(e['enwikiTitle'],TITLE);self.assertEqual(e['statementCount'],2)
    def test_entity_cc0_and_no_autotruth(self):
        e=parse_entity_response(source_records()[3],'Q98765');self.assertEqual(e['license']['id'],'CC0_STRUCTURED_DATA');self.assertEqual(e['statements'][0]['status'],'STRUCTURED_SOURCE_CANDIDATE_NOT_VERIFIED')
    def test_entity_disallowed_property_not_ingested(self):
        a=source_records()[3];a['entities']['Q98765']['claims']['P999']=[{'bad':'x'}]
        self.assertEqual(parse_entity_response(a,'Q98765')['statementCount'],2)
    def test_entity_missing_revision_holds(self):
        ent=source_records()[3];ent['entities']['Q98765']['lastrevid']=None
        with self.assertRaises(WikimediaHold):parse_entity_response(ent,'Q98765')
    def test_entity_biography_holds(self):
        ent=source_records()[3];ent['entities']['Q98765']['claims']['P31'][0]['mainsnak']['datavalue']['value']['id']='Q5'
        with self.assertRaises(WikimediaHold):parse_entity_response(ent,'Q98765')
    def test_full_topic_page_qid_hsn_candidate(self):
        *_,c=composed();self.assertEqual(c['openalexTopicId'],'T10346');self.assertEqual(c['hsn'],'H01.S05.N10');self.assertEqual(c['status'],'REVIEW_CANDIDATE_NOT_CANON');self.assertFalse(c['humanAccepted'])
    def test_fails_on_private_mode(self):
        raw,a,w,p,e,c=composed()
        with self.assertRaises(WikimediaHold):prepare_hsn_candidate(raw[4],a,w,p,e,mode='PALACE',consent=True)
        with self.assertRaises(WikimediaHold):prepare_hsn_candidate(raw[4],a,w,p,e,consent=False)
    def test_meta_scope_not_assumed_topic(self):
        raw,a,w,p,e,c=composed();raw[4]['role']='EPISTEMIC_META'
        with self.assertRaises(WikimediaHold):prepare_hsn_candidate(raw[4],a,w,p,e,consent=True)
    def test_bad_ontology_digest_holds(self):
        raw,a,w,p,e,c=composed();raw[4]['registryDigest']='f'*64
        with self.assertRaises(WikimediaHold):prepare_hsn_candidate(raw[4],a,w,p,e,consent=True)
    def test_page_query_revision_change_holds(self):
        raw,a,w,p,e,c=composed();p['revisionId']+=1
        with self.assertRaises(WikimediaHold):prepare_hsn_candidate(raw[4],a,w,p,e,consent=True)
    def test_article_attribution_is_revision_pinned(self):
        raw,a,w,p,e,c=composed();self.assertIn('oldid=6789',w['attribution']['revisionUrl'])
        self.assertIn('creativecommons.org',w['attribution']['licenseUrl'])
    def test_sitelink_mismatch_holds(self):
        raw,a,w,p,e,c=composed();e['enwikiTitle']='Another Thing'
        with self.assertRaises(WikimediaHold):prepare_hsn_candidate(raw[4],a,w,p,e,consent=True)
    def test_qid_mismatch_holds(self):
        raw,a,w,p,e,c=composed();p['qid']='Q999'
        with self.assertRaises(WikimediaHold):prepare_hsn_candidate(raw[4],a,w,p,e,consent=True)
    def test_canonical_db_is_append_only_unreviewed(self):
        *_,w,p,e,c=composed()
        with tempfile.TemporaryDirectory() as d:
            db=initialize_evidence_db(pathlib.Path(d)/'evidence.sqlite')
            a=store_unreviewed_candidate(db,c,w,e)
            self.assertEqual((a['sources'],a['candidates'],a['wikidataStatementsUnreviewed']),(2,1,2))
            b=store_unreviewed_candidate(db,c,w,e)
            self.assertEqual(b['candidates'],1)
            self.assertEqual(db.execute("SELECT count(*) FROM sqlite_master WHERE name LIKE '%canon%'").fetchone()[0],0)
    def test_tamper_digest_rejected(self):
        *_,w,p,e,c=composed();c['status']='CANON_APPROVED'
        with tempfile.TemporaryDirectory() as d:
            db=initialize_evidence_db(pathlib.Path(d)/'test.db')
            with self.assertRaises(WikimediaHold):store_unreviewed_candidate(db,c,w,e)
    def test_wrong_snapshot_rejected(self):
        *_,w,p,e,c=composed();w['revisionId']+=1
        with tempfile.TemporaryDirectory() as d:
            db=initialize_evidence_db(pathlib.Path(d)/'test.db')
            with self.assertRaises(WikimediaHold):store_unreviewed_candidate(db,c,w,e)
    def test_no_text_in_database(self):
        *_,w,p,e,c=composed();db=sqlite3.connect(':memory:');db.executescript(DDL);store_unreviewed_candidate(db,c,w,e)
        rows=str(db.iterdump())
        s=' '.join(x[0] for x in db.execute('select meta_json from sources'))
        self.assertNotIn('Physics context',s)
    def test_statement_reference_count_unverified(self):
        *_,w,p,e,c=composed();self.assertEqual(e['statements'][0]['referenceCount'],1)
        self.assertEqual(e['statements'][0]['status'],'STRUCTURED_SOURCE_CANDIDATE_NOT_VERIFIED')

if __name__=='__main__':unittest.main()
