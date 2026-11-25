import {createAtlasHome} from './home.mjs';
import {CHRONOFORGE_VIEW} from './chronoforge.mjs';
const h=createAtlasHome();console.log(JSON.stringify({welcome:h.welcome(),example:h.openNode('H05.S06.N12'),workDoor:h.openDoor('SWARMCHAT_WORK'),quietDoor:h.openDoor('QUIET'),chronoforge:CHRONOFORGE_VIEW,unboundWork:await h.inspectWork(null,null)},null,2));
