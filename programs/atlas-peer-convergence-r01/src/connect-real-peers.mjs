/** Static EXACT public peer imports, not redundant reimplementations. */
import {topK} from '../../atlas-geometry-one-r38/src/geometry.mjs';
import {reviewRankStability} from '../../geometry-cleanroom-r0/src/rank-stability.mjs';
import {reviewRequiredClosure} from '../../required-closure/required-closure.mjs';
import {inspectConvergence} from './peer-convergence.mjs';
export const peerImplementations=Object.freeze({topK,rankReview:reviewRankStability,closureReview:reviewRequiredClosure});
export const inspectWithRealPeers=(input)=>inspectConvergence(input,peerImplementations);
