"""Synthetic Wikipedia/Wikidata payloads ONLY. Never claim they are live source facts."""
import sys,pathlib,tempfile,json
root=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root/'src'));sys.path.insert(0,str(root/'tests'))
from test_wikimedia_bridge import composed
from wikimedia_bridge import initialize_evidence_db,store_unreviewed_candidate
raw,a,page,pp,entity,candidate=composed()
with tempfile.TemporaryDirectory() as directory:
    db=initialize_evidence_db(pathlib.Path(directory)/'evidence.sqlite')
    result=store_unreviewed_candidate(db,candidate,page,entity)
    print(json.dumps({'testType':'SYNTHETIC_OFFLINE_NOT_WIKIMEDIA_LIVE','status':result['status'],
       'candidateAddress':candidate['hsn'],'candidateTopic':candidate['openalexTopicId'],
       'storedSources':result['sources'],'storedCandidateEdges':result['candidates'],
       'unreviewedStatements':result['wikidataStatementsUnreviewed'],
       'realWikimediaFetches':0,'canonAmendments':0},indent=2))
