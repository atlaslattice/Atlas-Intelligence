/** Direct adapter to the ACTUAL existing PR75 composer. No second neural issuer. */
import {createOneFramePeerComposer} from '../../atlas-one-all-peers-r01/src/one-frame-composer.mjs';
import {createAtlasHome} from './home.mjs';
export function createAtlasHomeWithExistingGateway({gateway,rights,requiredClosure,candidates=[]}={}){
 const composer=createOneFramePeerComposer({gateway,rights,requiredClosure,candidates});
 return createAtlasHome({existingComposer:composer});
}
