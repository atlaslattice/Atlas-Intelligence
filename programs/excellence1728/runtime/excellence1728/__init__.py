"""Source-defined Atlas engineering program; planned work is never counted as a gain."""
from .model import ProgramError, compile_plan, validate_plan, canonical_bytes, digest, load_json, strict_loads, read_task, query_tasks
from .runner import AcceptanceRunner
from .ledger import EvidenceLedger, WorkBudget, ready_tasks
from .memory import FunctionalMemory
from .meta145 import review_perspective, aggregate_meta145

__all__ = ["ProgramError", "compile_plan", "validate_plan", "canonical_bytes", "digest", "load_json", "strict_loads", "read_task", "query_tasks", "AcceptanceRunner", "EvidenceLedger", "WorkBudget", "ready_tasks", "FunctionalMemory", "review_perspective", "aggregate_meta145"]
__version__ = "0.1.0"
