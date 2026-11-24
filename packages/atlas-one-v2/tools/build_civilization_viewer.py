"""Reproducible, offline, zero-network HTML authoring from exact-source local receipts."""
from pathlib import Path
import json,sys
out=Path(sys.argv[1]);template=Path(__file__).with_name('viewer_template.html').read_text('utf8')
rows={name:json.loads((out/name).read_text('utf8')) for name in ['nodes_1728.json','sphere_execution_144.json','functional_modules_12.json','meta145_unified_build.json','lookup_benchmark.json']}
js=json.dumps({'nodes':rows['nodes_1728.json'],'spheres':rows['sphere_execution_144.json'],'modules':rows['functional_modules_12.json'],'meta':rows['meta145_unified_build.json'],'benchmark':rows['lookup_benchmark.json']},ensure_ascii=False,separators=(',',':')).replace('<','\\u003c').replace('\u2028','\\u2028').replace('\u2029','\\u2029')
if template.count('__ATLAS_DATA__')!=1:raise ValueError('TEMPLATE_ANCHOR_MISMATCH')
path=out/'atlas_one_civilization_observatory.html';path.write_text(template.replace('__ATLAS_DATA__',js),encoding='utf8')
print({'path':str(path),'bytes':path.stat().st_size,'sourceNodes':len(rows['nodes_1728.json']),'spheres':len(rows['sphere_execution_144.json'])})
