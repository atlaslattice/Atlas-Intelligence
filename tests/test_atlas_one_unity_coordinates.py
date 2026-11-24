import math,sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'interop'))
from atlas_one_unity.coordinates import (HSN,GF7,index_pair,all_index_pairs,neighbors,toroidal_laplacian,
    ARIADNE_DIGEST,CoordinateHold,INDEX_RELATION)

class Coordinates(unittest.TestCase):
    def test_1728_onto_and_one_to_one(self):
        pairs=list(all_index_pairs())
        self.assertEqual(len(pairs),1728)
        self.assertEqual(len(set(p['left']['address'] for p in pairs)),1728)
        self.assertEqual(len(set(p['right']['address'] for p in pairs)),1728)
        self.assertEqual([p['slot'] for p in pairs],list(range(1728)))
        self.assertTrue(all(p['semantic_same_as'] is False for p in pairs))
        self.assertTrue(all(p['physical_calibration']=='NONE' for p in pairs))
    def test_all_axes_inverse(self):
        for i in range(1728):
            a=HSN.from_slot(i);b=GF7.from_slot(i)
            self.assertEqual(HSN.parse(a.address,source_edition='v0.7',source_digest=ARIADNE_DIGEST).slot,i)
            self.assertEqual(GF7.parse(b.address,source_edition='v0.7',source_digest=GF7.digest).slot,i)
    def test_source_pin_in_receipt(self):
        x=index_pair('H12.S12.N12')
        self.assertEqual(x['slot'],1727);self.assertEqual(x['right']['address'],'B12.M12.C12')
        self.assertEqual(x['left']['source_digest'],ARIADNE_DIGEST)
        self.assertEqual(x['relationship'],INDEX_RELATION)
        self.assertFalse(x['canon'])
    def test_h00_is_not_a_1729th_knowledge_node(self):
        for x in ('H00.S00.N00','H13.S01.N01','H1.S1.N1','H01.S00.N01','B01.M01.C01',''):
            with self.subTest(x=x),self.assertRaises(CoordinateHold):index_pair(x)
    def test_wrong_edition_or_digest_holds(self):
        for kwargs in ({'source_edition':'v1.0'},{'source_digest':'f'*64},{'source_edition':'0base'}):
            with self.assertRaises(CoordinateHold):index_pair('H01.S01.N01',**kwargs)
    def test_bool_or_float_slot_holds(self):
        for value in (True,False,1728,-1,1.0,'1',[],{},None):
            with self.subTest(value=str(value)),self.assertRaises(CoordinateHold):GF7.from_slot(value)
    def test_six_symmetric_neighbors(self):
        for i in range(1728):
            n=neighbors(i)
            self.assertEqual(len(n),6)
            self.assertEqual(len(set(n)),6)
            for j in n:self.assertIn(i,neighbors(j))
    def test_constant_laplacian_is_zero(self):
        self.assertEqual(toroidal_laplacian([7.25]*1728),[0.0]*1728)
    def test_delta_laplacian_sums_to_zero(self):
        f=[0.0]*1728;f[56]=1.0
        y=toroidal_laplacian(f)
        self.assertEqual(y[56],6.0)
        self.assertEqual(sum(y),0.0)
    def test_toroidal_fourier_mode_eigenvalue(self):
        # field depends only on H axis; lambda = 2 - 2cos(2pi/12)
        f=[math.sin(2*math.pi*(i//144)/12) for i in range(1728)]
        y=toroidal_laplacian(f)
        eig=2-2*math.cos(2*math.pi/12)
        self.assertLess(max(abs(a-eig*b) for a,b in zip(y,f)),1e-11)
    def test_laplacian_rejects_bad_field(self):
        for x in ([1]*12,[0]*1727+[float('nan')],[0]*1727+[float('inf')],None,{},'bad'):
            with self.assertRaises(CoordinateHold):toroidal_laplacian(x)

if __name__=='__main__':unittest.main()
