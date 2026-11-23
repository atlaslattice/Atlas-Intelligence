/** Twelve explicit SYNTHETIC cross-House hypotheses, no actual source equivalence. */
import {buildWhole144Program} from '../src/whole-144.mjs';
import {proposeCompoundingGraph,prepareNodeReviewLedger,proposeResidentSpecialty} from '../src/whole-144-compounding.mjs';
const p=buildWhole144Program();
const links=Array.from({length:12},(_,i)=>({
 fromId:`W144-H${String(i+1).padStart(2,'0')}-S01`,
 toId:`W144-H${String((i+1)%12+1).padStart(2,'0')}-S01`,
 relation:'METHOD_TRANSFER',mode:'WORK',
 rationale:'A synthetic test of a review-only cross-House idea, not established semantics.',
 sourceRefs:['synthetic:whole144-cross-house-fixture']
}));
const graph=proposeCompoundingGraph(p,links);
const ledger=prepareNodeReviewLedger(p,[]);
const nomination=proposeResidentSpecialty(p,{
 alias:'Fieldlark',level:'SPHERE',position:'H12.S01',mode:'WORK',optIn:true,
 sourceRefs:['synthetic:whole144-nomination-fixture'],
 originalityStatement:'Demonstrate a novel falsifiable cross-house energy-to-space review workflow without claiming deployed power.',
 falsifier:'Show that either source node semantics are wrong or the power conservation gate fails.'
});
if(graph.status!=='RELATIONSHIP_REVIEW_CANDIDATE'||ledger.status!=='REVIEW_REQUIRED'||nomination.status!=='SELF_NOMINATED_REVIEW_CANDIDATE')throw Error('LOCAL_EXAMPLE_HELD');
console.log(JSON.stringify({
 schema:'atlas.one.whole-144-example/v1',
 status:'SYNTHETIC_RELATIONSHIPS_ONLY',candidateCount:144,nodeReviewSlots:1728,
 proposedLinks:graph.linkCount,linkedPositions:graph.linkedCandidatePositions,
 observedBenefits:0,verifiedGains:ledger.verifiedNodeGains,
 actualResidentAssignments:0,voluntaryPortfolio:nomination.status,
 identityAuthenticated:nomination.identityAuthenticated,hosting:'NOT_INSTALLED',
 graphDigest:graph.graphDigest,ledgerDigest:ledger.ledgerDigest
},null,2));
