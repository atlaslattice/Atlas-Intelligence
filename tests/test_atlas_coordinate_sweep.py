"""Exhaustive notation sweep (not exhaustive ontology semantic validation)."""
import sys
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'interop'))
from atlas_fabric import namespace_index,load_json_strict,parse_coordinate,FabricError
MANIFEST=ROOT/'interop'/'atlas_project_manifest.v0.1.json'

class TestFullCoordinateSpace(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.namespaces=namespace_index(load_json_strict(MANIFEST))

    def test_1728_ariadne_syntax_and_unique_addresses(self):
        seen=set()
        for h in range(1,13):
            for s in range(1,13):
                for n in range(1,13):
                    addr=f'H{h:02}.S{s:02}.N{n:02}'
                    t=parse_coordinate('ariadne.v07',addr,'NODE',self.namespaces)
                    self.assertNotIn(t,seen)
                    seen.add(t)
        self.assertEqual(len(seen),1728)

    def test_1728_provider_zero_base_syntax_and_unique_addresses(self):
        seen=set()
        for h in range(12):
            for s in range(12):
                for n in range(12):
                    addr=f'H{h:02}.S{s:02}.N{n:02}'
                    t=parse_coordinate('providers.0base',addr,'NODE',self.namespaces)
                    self.assertNotIn(t,seen)
                    seen.add(t)
        self.assertEqual(len(seen),1728)

    def test_three_historical_144_sphere_spaces(self):
        for name in ('orcs.legacy','aluminum.draft4','sheldon.lcp1'):
            with self.subTest(namespace=name):
                seen={parse_coordinate(name,f'H{h:02}.S{s:02}','NODE',self.namespaces)
                      for h in range(1,13) for s in range(1,13)}
                self.assertEqual(len(seen),144)

    def test_144_global_uws_spaces(self):
        self.assertEqual(len({parse_coordinate('uws.early',f'S{s:03}','NODE',self.namespaces)
                              for s in range(1,145)}),144)

    def test_identical_strings_still_have_distinct_editions(self):
        for h in range(1,13):
            for s in range(1,13):
                a=f'H{h:02}.S{s:02}'
                names=['orcs.legacy','aluminum.draft4','sheldon.lcp1']
                refs=[parse_coordinate(n,a,'NODE',self.namespaces) for n in names]
                self.assertEqual(len(set(refs)),3)

    def test_no_numeric_shift_can_prove_semantics(self):
        a=parse_coordinate('ariadne.v07','H01.S01.N01','NODE',self.namespaces)
        b=parse_coordinate('providers.0base','H00.S00.N00','NODE',self.namespaces)
        self.assertNotEqual(a,b)

    def test_earth_sentinel_is_not_an_extra_node(self):
        a=parse_coordinate('providers.0base','H00.S00.N00','NODE',self.namespaces)
        b=parse_coordinate('providers.0base','H00.S00.N00','EARTH_SENTINEL',self.namespaces)
        self.assertNotEqual(a,b)
        self.assertEqual(a[-1],b[-1])

    def test_out_of_bounds_all_schemes(self):
        for n,addr in [('ariadne.v07','H00.S01.N01'),('ariadne.v07','H13.S01.N01'),
            ('providers.0base','H12.S00.N00'),('orcs.legacy','H01.S13'),
            ('aluminum.draft4','H00.S01'),('sheldon.lcp1','H12.S00'),('uws.early','S145')]:
            with self.subTest(n=n,addr=addr),self.assertRaises(FabricError):
                parse_coordinate(n,addr,'NODE',self.namespaces)

if __name__=='__main__': unittest.main()
