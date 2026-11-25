from pathlib import Path
import json
r=Path(__file__).resolve().parent
lanes=['Desktop and office','Files and cloud','Photos and image','Design and publishing','Video and motion','Audio and music','Games and creativity','Browser and privacy','Identity and account','Network and cybersecurity','Source stewardship','Native Atlas interop']
checks=['Exact upstream source','Code license and notices','Asset and trademark rights','Release signature and provenance','Build reproducibility and SBOM','Runtime security and sandbox','Source formats and migration','OS-specific device support','Accessibility and responsive UI','Consent and account boundaries','Threat response and recovery','Native service ABI and rollback']
units=[]
for i,lane in enumerate(lanes,1):
 for j,check in enumerate(checks,1):
  units.append({'id':f'APP.L{i:02d}.C{j:02d}','lane':lane,'check':check,'status':'PROPOSED_UNEXECUTED','evidence_id':None,'source':'atlas.apps/v1','ariadne_coordinate':None,'semantic_assignment':'NOT_INFERRED','host_acceptance':False})
assert len(units)==144
(r/'data/assessment_144.json').write_text(json.dumps({'schema':'atlas.os.apps.acceptance-144/v1','all_proposed':True,'rows':units},indent=2),encoding='utf-8')
print('proposed acceptance checks:',len(units))
