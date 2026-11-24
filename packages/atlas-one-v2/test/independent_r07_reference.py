"""Independent zero-dependency Python reference, not a model/hardware experiment."""
from fractions import Fraction as F
from itertools import product

BASIS = (0, 1, 2, 3)

def run(sign):
    # sign +1 Bell Phi+, sign 0 dephased equal mixture, sign -1 Bell Phi-
    rho = {(0, 0): F(1, 2), (3, 3): F(1, 2),
           (0, 3): F(sign, 2), (3, 0): F(sign, 2)}
    z = (1, -1, -1, 1)
    zz = sum(rho.get((i, i), F(0)) * z[i] for i in BASIS)
    x = {0: 3, 3: 0, 1: 2, 2: 1}
    xx = sum(rho.get((i, x[i]), F(0)) for i in BASIS)
    return zz, xx

expected = {1: (F(1), F(1)), 0: (F(1), F(0)), -1: (F(1), F(-1))}
assert all(run(s) == v for s, v in expected.items())
print('Python Fraction reference: 3/3 quantum-classical fixture cases PASS; zero host/model calls')
