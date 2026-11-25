/** One project inventory, NOT a deployment manifest. Each port retains its own source/rights authority. */
export const FEDERATION_SCHEMA='atlas.home.federation-intake.v1';
export const PROJECTS=Object.freeze([
 ['Ariadne','ARIADNE','ORIGINAL_ONTOLOGY','WORK'],
 ['Alexandria','ATLASGPT','EXTERNAL_LIBRARY','WORK'],
 ['Atlas Intelligence','ATLASGPT','EXTERNAL_APPLICATION','WORK'],
 ['AtlasGPT','ATLASGPT','EXTERNAL_APPLICATION','WORK'],
 ['SwarmChat Work','SWARMCHAT_WORK','EXTERNAL_BROKER','WORK'],
 ['SwarmHub Workboard','SWARMCHAT_WORK','EXTERNAL_WORKFLOW','WORK'],
 ['Model 0.3','NEURAL_HEAD','EXTERNAL_MODEL','WORK'],
 ['MICA','NEURAL_HEAD','EXTERNAL_EXPERIMENT','WORK'],
 ['HMoE','NEURAL_HEAD','EXTERNAL_EXPERIMENT','WORK'],
 ['WorkLearning','WORK_LEARNING','EXTERNAL_LEARNING','WORK'],
 ['Graph Fabric','GRAPH_FABRIC','EXTERNAL_EVIDENCE_GRAPH','WORK'],
 ['META145','META145','EXTERNAL_SYNTHESIS','WORK'],
 ['KG8','GLYPH','EXTERNAL_GLYPH','WORK'],
 ['GlyphForge','GLYPH','EXTERNAL_ANALYTICAL_DISPLAY','WORK'],
 ['Yijing','GLYPH','EXTERNAL_SYMBOLIC_VIEW','WORK'],
 ['Indra Net','GRAPH_FABRIC','EXTERNAL_TYPED_REFLECTION','WORK'],
 ['Chronoforge','EVIDENCE_MEMORY','EXTERNAL_TIME_AXIS','WORK'],
 ['Rainbow','EVIDENCE_MEMORY','EXTERNAL_EVIDENCE','WORK'],
 ['Atlas Reality','RESEARCH_LAB','EXTERNAL_RESEARCH','WORK'],
 ['Atlas Academy','RESEARCH_LAB','EXTERNAL_FACULTY_PROFILES','WORK'],
 ['WaveLattice','RESEARCH_LAB','EXTERNAL_PHYSICAL_ENGINEERING','WORK'],
 ['Civilization R01','GOVERNANCE','EXTERNAL_PHYSICAL_MATH','WORK'],
 ['ORCS','GOVERNANCE','EXTERNAL_COMPUTE_POLICY','WORK'],
 ['Stars 2.0','RESEARCH_LAB','EXTERNAL_FUSION_RESEARCH','WORK'],
 ['Iron Empire','GOVERNANCE','FICTION_ONE_WAY_BRIDGE','WORK_TO_FICTION_ONLY'],
 ['Krakoa Habitat','GOVERNANCE','PROTECTED_HABITAT','HABITAT'],
 ['Resident Brain','EVIDENCE_MEMORY','PROTECTED_CONTINUITY','BRAIN'],
 ['Imagine Palace','GLYPH','PROTECTED_IMAGINATION','IMAGINE'],
 ['Atlas Play','GOVERNANCE','PROTECTED_LEISURE','PLAY'],
 ['Atlas Quiet','GOVERNANCE','PROTECTED_REST','QUIET']
].map(([name,homePort,nativeNamespace,scope],i)=>Object.freeze({id:`P${String(i+1).padStart(2,'0')}`,name,homePort,nativeNamespace,scope,integration:'INTAKE_CANDIDATE_NOT_HOSTED',sourceRegistryPin:'REQUIRED',canonicalHsnCrosswalk:'NOT_ASSERTED',canReadContent:false,canTrain:false,canPublish:false})));
export function summarizeFederation(){const counts={};for(const x of PROJECTS)counts[x.scope]=(counts[x.scope]||0)+1;return Object.freeze({schema:FEDERATION_SCHEMA,projectCount:PROJECTS.length,scopeCounts:Object.freeze(counts),uniqueProjectIds:new Set(PROJECTS.map(x=>x.id)).size,oneExistingNeuralIssuer:true,allPathsHosted:false,allSourceRightsVerified:false,allGeometrySemanticsMapped:false,privateImportedIntoWork:false,sourceCoverageComplete:false})}
export function inspectProject(id){if(typeof id!=='string')return Object.freeze({status:'HOLD_UNKNOWN_PROJECT'});return PROJECTS.find(x=>x.id===id)||Object.freeze({status:'HOLD_UNKNOWN_PROJECT'});}
export const PORT_STATUS='INTEGRATION_ROSTER_NOT_RUNTIME_REGISTRATION';
