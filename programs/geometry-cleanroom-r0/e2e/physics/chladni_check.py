"""Source-attributed physical-cymatics study comparator; no glyph→frequency inference."""
import json,sys,math,pathlib

def evaluate(payload):
    if (type(payload)!=dict or payload.get('schema')!='atlas.physical.published-observations/v1' or
        payload.get('atlasGlyphToHzCalibration')!='NONE' or payload.get('measuredByAtlas') is not False):
        return {'status':'HOLD_UNVERIFIED_PHYSICAL_SOURCE','physicalGlyphMappingEstablished':False}
    pairs=payload.get('pairs')
    if type(pairs)!=list or len(pairs)<3:return {'status':'HOLD_INSUFFICIENT_DATA','physicalGlyphMappingEstablished':False}
    for p in pairs:
        if (type(p)!=dict or set(p)!={'figure','simulatedHz','experimentalHz'} or
            type(p['simulatedHz'])not in (int,float) or type(p['experimentalHz'])not in (int,float) or
            not math.isfinite(p['simulatedHz']) or not math.isfinite(p['experimentalHz']) or
            p['simulatedHz']<=0 or p['experimentalHz']<=0):
            return {'status':'HOLD_INVALID_FREQUENCIES','physicalGlyphMappingEstablished':False}
    d=[x['simulatedHz']-x['experimentalHz'] for x in pairs]
    return {'schema':'atlas.physical.public-literature-replay/v1','status':'PUBLISHED_PAIRS_COMPUTED',
      'sampleCount':len(d),'maeHz':sum(map(abs,d))/len(d),'rmseHz':math.sqrt(sum(v*v for v in d)/len(d)),
      'measuredExperimentalDataExistInExternalPaper':True,'measuredByAtlas':False,
      'boundaryConditionAndMaterialTransferValidated':False,'atlasGlyphToHzEvidence':False,
      'physicalGlyphMappingEstablished':False,'atlasPhysicalExperimentPerformed':False}

if __name__=='__main__':
    p=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else pathlib.Path(__file__).with_name('published_chladni_2026.json'))
    print(json.dumps(evaluate(json.loads(p.read_text())),indent=2))
