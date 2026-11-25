/** Native additive integration with the EXISTING PR75 one-frame composer.
 * Do not copy its trained model, create a second encoder, or imply actual
 * host grants from test callbacks. Ref/source/rights resolution is host-owned.
 */
import {createOneFramePeerComposer} from './one-frame-composer.mjs';
import {createIndrasHearth} from './indra-hearth.mjs';
export function createAtlasOneHearth({gateway,rights,requiredClosure,sourcePhase,candidates=[]}={}){
 const composer=createOneFramePeerComposer({gateway,rights,requiredClosure,candidates});
 return createIndrasHearth({composer,sourcePhase});
}
