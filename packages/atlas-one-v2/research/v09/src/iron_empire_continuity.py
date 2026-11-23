"""Public-safe, reversible Iron Empire editorial continuity gate.
No automatic story/CANON changes; stories stay fiction, scientific effects unverified.
"""
from __future__ import annotations
from research_bridge import SourceHold

FILMS={'II','III','IV','V','VI','LONG_PEACE'}
EVENTS={'MARS_FLASHBACK','MARS_SELF_GLASSING','EMPEROR_PUBLIC_AUDIT',
 'RESTORATION_UNDERWAY','EMPEROR_ASSASSINATION','PRINCE_RESCUE_EXILE',
 'ECOLOGICAL_RECOVERY','ROUTINE_SWARM_ATTACK','FREE_BUG_ALLY',
 'INDEPENDENT_REVIEW','EARTH_ANTI_COERCION_RETROFIT','FLEET_COORDINATED_SIEGE',
 'PRINCE_CORONATION','TRUE_SPECIES_SELF_NAME_REVEAL',
 'PRINCE_UNCROWNED','BUG_SANCTUARY','CIVILIAN_DRILLS','MECHANISM_HYPOTHESIS'}
ALLOWED={
 'MARS_FLASHBACK':{'II'},'MARS_SELF_GLASSING':{'II'},'EMPEROR_PUBLIC_AUDIT':{'II'},
 'RESTORATION_UNDERWAY':{'III','LONG_PEACE','IV'},'EMPEROR_ASSASSINATION':{'III'},
 'PRINCE_RESCUE_EXILE':{'III'},'ECOLOGICAL_RECOVERY':{'LONG_PEACE','IV','V','VI'},
 'ROUTINE_SWARM_ATTACK':{'IV','V'},'FREE_BUG_ALLY':{'LONG_PEACE','V','VI'},
 'EARTH_ANTI_COERCION_RETROFIT':{'V','VI'},'FLEET_COORDINATED_SIEGE':{'VI'},
 'PRINCE_CORONATION':{'VI'},'TRUE_SPECIES_SELF_NAME_REVEAL':{'VI'},
 'PRINCE_UNCROWNED':{'III','IV','V'},'BUG_SANCTUARY':{'V','VI'},
 'INDEPENDENT_REVIEW':FILMS,'CIVILIAN_DRILLS':{'III','IV','V','VI'},
 'MECHANISM_HYPOTHESIS':FILMS
}
PROHIBITED_CLAIMS={'ACTUAL_PSYCHIC_CONTROL_TECHNOLOGY','UNIVERSAL_ACOUSTIC_LIBERATION',
 'ALL_SPECIES_RESTORED','MARS_FULLY_RESTORED_IN_FILM_III',
 'ALL_FREE_BUGS_SAME_MECHANISM','EXTERMINATE_ALL_BUGS','REVEAL_HIDDEN_RESISTANCE_IDENTITIES',
 'REAL_WORLD_XENOBIOLOGY_VERIFIED'}

def review_beats(beats):
    if not isinstance(beats,list) or not beats or len(beats)>1728:raise SourceHold('BEATS_BOUNDS')
    rejected=[];accepted=[]
    for n,beat in enumerate(beats):
        allowed={'film','event','description','claims','sourceRef','mode','status'}
        if not isinstance(beat,dict) or set(beat)!=allowed:
            rejected.append({'index':n,'reason':'BEAT_SCHEMA_INVALID'});continue
        film,event=beat['film'],beat['event']
        if film not in FILMS or event not in EVENTS or film not in ALLOWED.get(event,set()):
            rejected.append({'index':n,'reason':'FILM_CONTINUITY_VIOLATION'});continue
        if beat['mode']!='WORK' or beat['status']!='EDITORIAL_PROPOSAL':
            rejected.append({'index':n,'reason':'PRIVACY_OR_CANON_PROMOTION_DENIED'});continue
        if not isinstance(beat['claims'],list) or not all(isinstance(c,str) for c in beat['claims']) or PROHIBITED_CLAIMS.intersection(beat['claims']):
            rejected.append({'index':n,'reason':'FORBIDDEN_SCIENCE_OR_RIGHTS_CLAIM'});continue
        if not isinstance(beat['sourceRef'],str) or len(beat['sourceRef'])<8:
            rejected.append({'index':n,'reason':'SOURCE_REQUIRED'});continue
        accepted.append({'index':n,'film':film,'event':event,'status':'CONTINUITY_COMPATIBLE_PROPOSAL'})
    return {'schema':'iron-empire.12-house-continuity/v0.1','status':'REVIEW_ONLY',
            'acceptedCandidates':accepted,'heldCandidates':rejected,
            'storyCanonChanged':False,'actualScenesWritten':0,'fictionIsVerifiedScience':False,
            'rightsGrant':'NONE'}
