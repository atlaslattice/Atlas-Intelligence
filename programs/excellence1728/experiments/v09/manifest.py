"""Export a private compact signed-by-hash (not issuer signed) source-only adapter receipt."""
import hashlib,json,sys
from pathlib import Path
from vertical import ORIGINAL_SHA,hashobj
fields=['schema','id','sourceSha256','recordSha256','role','module','moduleOutputSha256','subjectNodeId','crossCandidateId','crossSimilarityBp','localStatus','hostStatus','negativeProbeHold','receiptSha256']

def make(root,output):
 root=Path(root)
 rows=[json.loads(x) for x in (root/'SLICES.jsonl').read_text().splitlines()]
 summ=json.loads((root/'META145.json').read_text())
 report={'schema':'atlas.vertical.export/v09','sourceSha256':ORIGINAL_SHA,'slices':[{key:r[key] for key in fields} for r in rows],
  'recordRoot':summ['recordRoot'],'sphereRoot':summ['sphereRoot'],'houseRoot':summ['houseRoot'],'metaRoot':summ['metaRoot'],
  'exportRoot':hashlib.sha256(json.dumps(['ATLAS_VERTICAL_EXPORT_V09',ORIGINAL_SHA,summ['recordRoot'],summ['sphereRoot'],summ['houseRoot'],1728,0],separators=(',',':')).encode()).hexdigest(),
  'localPass':1728,'hostedPass':0,'workPosts':0,'modelCalls':0,'peerTurns':0,'canonChanged':False,'sourceOnly':True}
 raw=json.dumps(report,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()
 Path(output).parent.mkdir(parents=True,exist_ok=True);Path(output).write_bytes(raw)
 return {'schema':'atlas.vertical.export-pin/v09','bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'sourceSha256':ORIGINAL_SHA}
if __name__=='__main__':print(json.dumps(make(sys.argv[1],sys.argv[2]),indent=2))
