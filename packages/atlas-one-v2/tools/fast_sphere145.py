"""Fast Sphere perspective counts for Atlas ONE, review-only pure Python helper.

No network, model calls, host rights or body retrieval. Original Ariadne bytes,
source-mode evidence, and rights must be verified by a trusted host before use.
Input is an exact SHA-bound source-index TSV and mode metadata JSON.
Matched tokens are LEXICAL candidates, not semantic graph relations or CANON.
"""
from __future__ import annotations
import collections,csv,hashlib,io,json,re

REGISTRY_SHA='07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6'
SHA=re.compile(r'^[0-9a-f]{64}$')
COORD=re.compile(r'^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$')
WORD=re.compile(r'[\w]+')
MODES=frozenset(['WORK','PLAY','SOCIAL','IMAGINE','DREAM','QUIET'])
class SphereSourceHold(ValueError): pass

class IndexedSpherePerspectives:
 """Source-byte-pinned read-only lexical index; may not authorize any Work action."""
 def __init__(self,index_bytes:bytes,expected_index_sha:str,mode_bytes:bytes,expected_mode_sha:str,registry_sha:str=REGISTRY_SHA):
  if registry_sha!=REGISTRY_SHA:raise SphereSourceHold('REGISTRY_EDITION_NOT_ADMITTED')
  for payload,expected in ((index_bytes,expected_index_sha),(mode_bytes,expected_mode_sha)):
   if not isinstance(payload,bytes) or not isinstance(expected,str) or not SHA.fullmatch(expected):raise SphereSourceHold('SOURCE_BYTES_AND_SHA_REQUIRED')
   if len(payload)>3_000_000 or hashlib.sha256(payload).hexdigest()!=expected:raise SphereSourceHold('SOURCE_BYTES_NOT_PINNED')
  try:
   rows=list(csv.DictReader(io.StringIO(index_bytes.decode('utf8')),delimiter='\t'))
   envelope=json.loads(mode_bytes.decode('utf8'))
  except (UnicodeError,ValueError,TypeError) as exc:raise SphereSourceHold('SOURCE_ENCODING_INVALID') from exc
  if len(rows)!=1728 or not isinstance(envelope,dict) or envelope.get('registryDigest')!=REGISTRY_SHA:raise SphereSourceHold('SOURCE_COVERAGE_OR_REGISTRY_MISMATCH')
  metadata=envelope.get('modes')
  if not isinstance(metadata,list) or len(metadata)!=144:raise SphereSourceHold('MODE_INVENTORY_INVALID')
  mode_by={}
  for m in metadata:
   if not isinstance(m,dict) or m.get('sphere') in mode_by or m.get('mode') not in MODES:raise SphereSourceHold('MODE_ENTRY_INVALID')
   mode_by[m['sphere']]=m['mode']
  terms_s=collections.defaultdict(set);terms_h=collections.defaultdict(set);posts=collections.defaultdict(int)
  role_count=collections.Counter();source_ids=[];word_records=[]
  for i,row in enumerate(rows):
   coord=f'H{i//144+1:02}.S{i%144//12+1:02}.N{i%12+1:02}';sphere=coord[:7];house=coord[:3]
   role='DOMAIN_SPECIALIZATION' if (i%144)//12<7 else 'EPISTEMIC_META'
   if row.get('coordinate')!=coord or row.get('node_kind')!=role or sphere not in mode_by or not SHA.fullmatch(row.get('source_sha256','')):raise SphereSourceHold('INDEX_RECORD_IDENTITY_OR_ROLE_INVALID')
   if not isinstance(row.get('node_name'),str) or not isinstance(row.get('sphere_name'),str) or not isinstance(row.get('house_name'),str):raise SphereSourceHold('INDEX_TEXT_INVALID')
   tokens=set(WORD.findall((row['node_name']+' '+row['sphere_name']).lower()))
   terms_s[sphere].update(tokens);terms_h[house].update(tokens);word_records.append(tokens)
   for term in tokens:posts[term]|=1<<i
   source_ids.append(coord);role_count[role]+=1
  if len(mode_by)!=144 or role_count!={'DOMAIN_SPECIALIZATION':1008,'EPISTEMIC_META':720} or sum(v=='WORK' for v in mode_by.values())!=104:raise SphereSourceHold('ROLE_OR_MODE_COUNTS_CHANGED')
  self.index_sha=expected_index_sha;self.mode_sha=expected_mode_sha
  self._rows=rows;self._mode=mode_by;self._spheres=terms_s;self._houses=terms_h;self._posts=posts
  self._role_count=role_count;self._protected_nodes=12*sum(v!='WORK' for v in mode_by.values())
 def _count(self,terms):
  bitset=0
  for term in terms:bitset|=self._posts[term]
  return bitset.bit_count()
 def profiles(self):
  sphere=[];house=[]
  for s,terms in self._spheres.items():
   h=s[:3];domain=int(s[5:7])<=7;opposite=720 if domain else 1008
   sphere.append({'sphere':s,'house':h,'homeNodes':12,'candidateLexicalMatches':self._count(terms),
     'oppositeKindComparisons':opposite,'protectedComparisons':self._protected_nodes,'evaluatedNodes':1728})
  for h,terms in self._houses.items():
   house.append({'house':h,'homeNodes':144,'lexicalCandidates':self._count(terms),
     'epistemicComparisons':720,'evaluatedNodes':1728})
  summary={'evaluations':269568,'sphereScans':248832,'houseScans':20736,
    'lexicalNonzeroCandidatesNotReviewed':sum(s['candidateLexicalMatches'] for s in sphere),
    'oppositeRoleComparisons':sum(s['oppositeKindComparisons'] for s in sphere),
    'nonWorkComparisonExposuresCountedOnly':144*self._protected_nodes}
  return sphere,house,summary
 def sourceStatus(self):
  return {'schema':'atlas.one.sphere-indexed-review/v1','sourceIndexSHA256':self.index_sha,
    'modeMetadataSHA256':self.mode_sha,'registrySHA256Claim':REGISTRY_SHA,
    'status':'LOCAL_SOURCE_INDEXED_NOT_HOSTED','authorityEffect':'NONE','originalRegistryBytesAttested':False,
    'liveWorkRightsVerified':False,'residentReviewsPerformed':0,'postsPerformed':0,
    'nodes':1728,'spheres':144,'houses':12}
