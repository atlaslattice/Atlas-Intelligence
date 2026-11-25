"""A harmless, original demonstration of the unified neural computation."""
import json,pathlib,sys,hashlib
import numpy as np
ROOT=pathlib.Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from atlas_neural_unified import AtlasOneNeuralFabric,PreparedWorkboardIndex,prepare_component_record,TypedEdgeReview
rng=np.random.default_rng(145)
rows=rng.normal(size=(1728,384)).astype('float32');rows/=np.linalg.norm(rows,axis=1,keepdims=True)
fabric=AtlasOneNeuralFabric(rows,vector_asset_sha256=hashlib.sha256(rows.tobytes()).hexdigest(),encoder_revision='synthetic-384-encoder',alpha=0.0)
q=rows[0]
assert np.array_equal(fabric.baseline(q),fabric.routed_scores(q))
print('Neural readout',json.dumps({k:fabric.forward(q)[k] for k in ('schema','status','sourceVerified','hits','meta145')},indent=2)[:900])
board=PreparedWorkboardIndex(trusted_bindings={'WORK-001':{'hsn':'H01.S01.N01','sourceId':'work:demo','sourceDigest':'a'*64}})
entry=prepare_component_record(source_id='work:demo',source_revision='v1',source_digest='a'*64,hsn='H01.S01.N01',card_id='WORK-001',component_id='atlas.one')
a=board.put(entry);b=board.put(entry);assert a.revision==b.revision and b.action=='NO_CHANGE'
refs=[board.lookup('H01.S01.N01',consumer=name,purpose_check=lambda _:True,disclosure_check=lambda _:True)['indexRevision'] for name in ('AtlasONE','AtlasGPT','SwarmChatWork','Ariadne')]
assert len(set(refs))==1
board.withdraw('work:demo');assert board.lookup('H01.S01.N01',purpose_check=lambda _:True,disclosure_check=lambda _:True)['references']==[]
print('Workboard source-only',json.dumps({'indexRevision':board.index_revision,'consumers':4,'sourceRevoked':True,'hostVerified':False}))
