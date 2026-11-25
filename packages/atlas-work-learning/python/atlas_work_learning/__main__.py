"""Entrypoint with predictable, bounded local numerical threading."""
import os

# Apply only within this invocation, before importing NumPy/BLAS. The caller may
# opt into a different positive bound through this dedicated variable.
_threads = os.environ.get("ATLAS_WORK_LEARNING_THREADS", "1")
if not _threads.isdigit() or not 1 <= int(_threads) <= 8:
    raise SystemExit("ATLAS_WORK_LEARNING_THREADS must be between 1 and 8")
for _key in ("OPENBLAS_NUM_THREADS", "OMP_NUM_THREADS", "MKL_NUM_THREADS", "NUMEXPR_NUM_THREADS"):
    os.environ[_key] = _threads

from .cli import main

raise SystemExit(main())

