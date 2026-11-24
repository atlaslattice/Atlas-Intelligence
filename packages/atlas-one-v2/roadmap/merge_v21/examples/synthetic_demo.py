#!/usr/bin/env python3
"""Source-free synthetic roadmap demo: 1,728 fictitious names, no original source leak."""
import argparse,csv,io,json,pathlib,sys
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'src'))
from compiler import build

def fake():
 d={'houses':{},'spheres':{},'nodes':{}}
 for h in range(1,13):
  hid=f'H{h:02d}';d['houses'][hid]={'id':hid,'name':f'SYNTHETIC House {h}'}
  for s in range(1,13):
   sid=f'{hid}.S{s:02d}';d['spheres'][sid]={'id':sid,'name':f'SYNTHETIC Sphere {sid}','parent':hid}
   for n in range(1,13):
    nid=f'{sid}.N{n:02d}';d['nodes'][nid]={'id':nid,'parent':sid,'name':f'SYNTHETIC specialization {nid}',
     'kind':'DOMAIN_SPECIALIZATION' if s<=7 else 'EPISTEMIC_META',
     'definition':f'Fake source definition {nid}','includes':'fictional fixture positive',
     'excludes':'fictional fixture negative'}
 out=io.StringIO();w=csv.writer(out);w.writerow(['T_ID','OpenAlex_topic_name_source','Candidate_HSN','Other_4_HSN_candidates']);w.writerow(['T_SYNTHETIC','Synthetic placeholder, not live OpenAlex','H01.S01.N01','H01.S01.N02;H01.S01.N03;H01.S01.N04;H01.S01.N05'])
 return d,out.getvalue()
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--out',required=True);a=parser.parse_args();p=pathlib.Path(a.out);p.mkdir(parents=True,exist_ok=True)
 d,c=fake();(p/'source.json').write_text(json.dumps(d));(p/'crosswalk.csv').write_text(c)
 plan,manifest=build(p/'source.json',p/'crosswalk.csv',p/'compiled','synthetic')
 print('SYNTHETIC_SOURCE_ONLY',manifest['roadmapStats'])
