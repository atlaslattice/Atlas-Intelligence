"""Reversible, exact-source-pinned additive Atlas WorkLearning 0.2.0 stage.

Copies the *source-only* WorkLearning package into a NEW directory and appends
one local-export port + native numerical package, never touching the installed
skill or the user's active workspace. No external network or code execution.
"""
from __future__ import annotations
import argparse,hashlib,json,pathlib,shutil
EXPECTED_INDEX='3437041ef8cceb477cf8a3d442c91215a505da68570210d5ff213b08c8186a70'
EXPECTED_GATEWAY='9a286e5af0f74eb400009b8674cc5f2d2ff95ab4d845d533cd950d3aa2c9ad73'
EXPORT="export {createOneBrainPort} from './one-brain-port.mjs';\n"

def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()

def stage(source, addon, target):
 source,addon,target=map(lambda p:pathlib.Path(p).resolve(),(source,addon,target))
 if target.exists():raise ValueError('DESTINATION_EXISTS')
 if not source.is_dir() or not (source/'src/index.mjs').is_file() or not (addon/'src/one-brain-port.mjs').is_file():
  raise ValueError('SOURCE_REQUIRED')
 if sha(source/'src/index.mjs')!=EXPECTED_INDEX or sha(source/'src/gateway.mjs')!=EXPECTED_GATEWAY:
  raise ValueError('CURRENT_WORKLEARNING_SOURCE_DRIFT')
 if any(p.is_symlink() for p in source.rglob('*')):raise ValueError('SOURCE_SYMLINK_REJECTED')
 root_files={str(p.relative_to(source)):sha(p) for p in source.rglob('*') if p.is_file()}
 shutil.copytree(source,target)
 lib=target/'src/index.mjs'
 with lib.open('a') as f:f.write(EXPORT)
 shutil.copy2(addon/'src/one-brain-port.mjs',target/'src/one-brain-port.mjs')
 shutil.copytree(addon/'atlas_neural_unified',target/'python/atlas_neural_unified',ignore=shutil.ignore_patterns('__pycache__','*.pyc'))
 (target/'python/atlas_work_learning/one_brain.py').write_text('"""Existing WorkLearning -> one shared fabric, optional only."""\nfrom atlas_neural_unified import AtlasOneNeuralFabric, WorkLearningNeuralPort, TypedEdgeReview\n')
 for name,old in root_files.items():
  if name!='src/index.mjs' and sha(target/name)!=old:raise ValueError('PREDECESSOR_SOURCE_MUTATED')
 receipts={'schema':'atlas.one.worklearning-stage/v1','status':'STAGED_LOCAL_ONLY','sourceFileCount':len(root_files),
  'unchangedOriginalFiles':len(root_files)-1,'changedOriginalFiles':['src/index.mjs'],
  'newFiles':['src/one-brain-port.mjs','python/atlas_work_learning/one_brain.py'],
  'newPackage':'python/atlas_neural_unified','originalIndexSha256':EXPECTED_INDEX,
  'originalGatewaySha256':EXPECTED_GATEWAY,'newIndexSha256':sha(lib),
  'originalPinnedGatewayUnchanged':sha(target/'src/gateway.mjs')==EXPECTED_GATEWAY,
  'hostedInstalled':False,'activeWorkspaceChanged':False,'sourceBodiesCopied':False,
  'encoderWeightsChanged':False}
 (target/'ATLAS_ONE_STAGE_RECEIPT.json').write_text(json.dumps(receipts,sort_keys=True,indent=2)+'\n')
 return receipts
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--source',required=True);p.add_argument('--addon',required=True);p.add_argument('--target',required=True);args=p.parse_args()
 print(json.dumps(stage(args.source,args.addon,args.target),indent=2))
