"""Algebraic cross-indexing. Bijection is a convention, NOT semantic equivalence.

Ariadne HSN v0.7 12^3 source coordinates and synthetic GF7 B/M/C 12^3
acoustic slots are separate named spaces. Never infer an acoustic law from
an index, or reverse an HSN source edition without provenance.
"""
from __future__ import annotations
import re
from dataclasses import dataclass
from collections.abc import Iterable

ARIADNE_DIGEST='07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6'
INDEX_RELATION='ARBITRARY_REVERSIBLE_INDEX_ALIGNMENT_NOT_SEMANTIC_EQUIVALENCE'
SOURCE_AUTHORITY='NONE'
HSN_RE=re.compile(r'H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])\Z')
GF7_RE=re.compile(r'B(0[1-9]|1[0-2])\.M(0[1-9]|1[0-2])\.C(0[1-9]|1[0-2])\Z')


@dataclass(frozen=True)
class Coordinate:
    address:str
    slot:int
    axes:tuple[int,int,int]
    namespace:str
    edition:str
    source_digest:str


class CoordinateHold(ValueError):
    pass


def _point(axes:tuple[int,int,int])->int:
    if len(axes)!=3 or any(type(x) is not int or x<1 or x>12 for x in axes):
        raise CoordinateHold('coordinate_bounds')
    a,b,c=axes
    return ((a-1)*12+(b-1))*12+(c-1)


class Space:
    def __init__(self, namespace:str,edition:str,digest:str,pattern:re.Pattern,prefix:tuple[str,str,str]):
        self.namespace=namespace;self.edition=edition;self.digest=digest
        self.pattern=pattern;self.prefix=prefix
    def parse(self, address:str, *, source_edition:str,source_digest:str)->Coordinate:
        if type(address) is not str or source_edition != self.edition or source_digest != self.digest:
            raise CoordinateHold('edition_or_digest_hold')
        m=self.pattern.fullmatch(address)
        if m is None:
            raise CoordinateHold('coordinate_not_in_source_space')
        axes=tuple(int(x) for x in m.groups())
        return Coordinate(address,_point(axes),axes,self.namespace,self.edition,self.digest)
    def from_slot(self, index:int)->Coordinate:
        if type(index) is not int or index<0 or index>=1728:
            raise CoordinateHold('slot_out_of_range')
        x=index//144+1; y=(index//12)%12+1; z=index%12+1
        axes=(x,y,z)
        names=self.prefix
        address='.'.join(f'{names[i]}{axes[i]:02d}' for i in range(3))
        return Coordinate(address,index,axes,self.namespace,self.edition,self.digest)

HSN=Space('ariadne-reader','v0.7',ARIADNE_DIGEST,HSN_RE,('H','S','N'))
GF7=Space('glyphforge.analytic-plate-slots','v0.7','GF7-SYNTHETIC-NONCALIBRATED',GF7_RE,('B','M','C'))


def index_pair(hsn:str, *, source_edition:str='v0.7', source_digest:str=ARIADNE_DIGEST)->dict:
    a=HSN.parse(hsn,source_edition=source_edition,source_digest=source_digest)
    b=GF7.from_slot(a.slot)
    return {'schema':'atlas.one.coordinate-pair/v0.3','left':{'namespace':a.namespace,'edition':a.edition,
            'address':a.address,'source_digest':a.source_digest},
            'right':{'namespace':b.namespace,'edition':b.edition,'address':b.address,
            'source_digest':b.source_digest},'slot':a.slot,'relationship':INDEX_RELATION,
            'semantic_same_as':False,'physical_calibration':'NONE','authority':'NONE','canon':False}


def all_index_pairs()->Iterable[dict]:
    return (index_pair(HSN.from_slot(i).address) for i in range(1728))


def neighbors(slot:int)->tuple[int,...]:
    """Six directed nearest-neighbor slots on an *abstract periodic* 12x12x12 graph.

    GF7 plate physics does not imply the toroidal boundary used here.
    """
    c=HSN.from_slot(slot)
    out=[]
    for axis in range(3):
        for shift in (-1,1):
            a=list(c.axes)
            a[axis]=((a[axis]-1+shift)%12)+1
            out.append(_point(tuple(a)))
    return tuple(out)


def toroidal_laplacian(field:list[float])->list[float]:
    if type(field) is not list or len(field)!=1728 or any(type(x) not in (int,float) or not (-1e50<x<1e50) for x in field):
        raise CoordinateHold('invalid_1728_field')
    return [6*field[i]-sum(field[j] for j in neighbors(i)) for i in range(1728)]
