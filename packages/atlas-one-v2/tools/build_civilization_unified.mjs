/** Source-safe owner-local executable build, not a hosted Atlas/Site publisher. */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {CivilizationUnifiedBuild,CIVILIZATION_SCHEMA} from '../src/civilization-unified.mjs';
const root=process.argv[2],meta=process.argv[3],out=process.argv[4];
if(!root||!meta||!out){console.error('Usage: node tools/build.mjs /private/ariadne.json /private/meta145-output /private/new-output');process.exit(2)}
const files=['node_glyphs_1728.json','perspectives_144.json','sphere_reviews_144.json','house_syntheses_12.json','house_sphere_followups_1728.jsonl'];
const originalAriadneBytes=readFileSync(root),metaManifestBytes=readFileSync(join(meta,'META145_GLYPH_MEMORY.json'));
const artifactBytes=Object.fromEntries(files.map(name=>[name,readFileSync(join(meta,name))]));
const memoryPolicy=JSON.parse(readFileSync(join(meta,'functional_memory_replay.json'),'utf8'));
const engine=new CivilizationUnifiedBuild({originalAriadneBytes,metaManifestBytes,artifactBytes,memoryPolicy});
const complete=engine.build();mkdirSync(out,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
const emit=(name,object)=>{const b=Buffer.from(JSON.stringify(object,null,2)+'\n');writeFileSync(join(out,name),b);return hash(b)};
const outputs={
 'nodes_1728.json':emit('nodes_1728.json',complete.nodeCatalog),
 'sphere_execution_144.json':emit('sphere_execution_144.json',complete.sphereExecutions),
 'functional_modules_12.json':emit('functional_modules_12.json',complete.modules),
 'meta145_unified_build.json':emit('meta145_unified_build.json',complete.metaBuild)
};
const candidate=JSON.parse(readFileSync(join(meta,'candidate_edges.json'),'utf8'));
if(!Array.isArray(candidate)||candidate.length!==1363||candidate.some(e=>e.semanticAccepted===true))throw Error('SOURCE_CANDIDATE_BOUNDARY_MISMATCH');
const manifest={schema:'atlas.one.civilization.unified-delivery/v1',project:'Atlas ONE',sourceAriadneSHA256:complete.metaBuild.originalAriadneSha256,
 predecessorMeta145Digest:complete.metaBuild.meta145InputDigest,moduleCount:12,sphereCount:144,nodeCount:1728,localWorkFunctionFixtureChecks:144,
 computationalSphereNodeMatrixExistingVerifiedPairs:248832,candidateEdgesUnreviewed:candidate.length,
 originalHouseSphereFollowupsReused:1728,outputs,sourceDataPublic:false,actualModelRuns:0,actualResidentMacroturns:0,realHostEffects:0,
 identityVerified:false,workRightsVerified:false,publicCANONAdoption:false,ironEmpireCanonChange:false,
 currentStatus:'LOCAL_TESTED_SOURCE_BUILD_NOT_HOSTED'};
manifest.releaseDigest=hash(Buffer.from(JSON.stringify(manifest)));
emit('build_receipt.json',manifest);
console.log(JSON.stringify({status:complete.metaBuild.status,nodes:complete.nodeCatalog.length,spheres:complete.sphereExecutions.length,modules:complete.modules.length,head:complete.metaBuild.sphereChainHead,releaseDigest:manifest.releaseDigest},null,2));
