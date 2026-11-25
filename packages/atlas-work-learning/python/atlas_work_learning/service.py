"""Read-only owner-local service. No hosted call can train, write, or choose paths."""
from __future__ import annotations

from collections import Counter
from pathlib import Path
import hashlib
import json
import math
import re
import sys

from .corpus import file_sha256, load_corpus, text_sha256
from .episodes import EpisodeLedger
from .registry import load_registry, node_record
from .workspace import check_pin, load_config, pinned_files, source_manifest, strict_json, within

TOKEN = re.compile(r"\w+", re.UNICODE)
OPERATIONS = {"status", "search", "node", "episodes", "evaluation"}
MAX_LINE_BYTES = 32768
MAX_RESPONSE_BYTES = 1048576


class LexicalIndex:
    """Small deterministic BM25 index; exact text, no provider dependency."""
    def __init__(self, items):
        self.items = items
        self.documents = [Counter(TOKEN.findall(i["text"].casefold())[:4096]) for i in items]
        self.lengths = [sum(d.values()) for d in self.documents]
        self.average = sum(self.lengths) / max(1, len(items)) or 1.0
        df = Counter(t for d in self.documents for t in d)
        self.idf = {t: math.log(1 + (len(items) - n + .5) / (n + .5)) for t, n in df.items()}

    def scores(self, query):
        terms = set(TOKEN.findall(query.casefold())[:256])
        out = []
        for i, doc in enumerate(self.documents):
            scale = 1.2 * (1 - .75 + .75 * self.lengths[i] / self.average)
            out.append(sum(self.idf.get(t, 0) * (doc[t] * 2.2) / (doc[t] + scale) for t in terms if doc[t]))
        return out


class WorkLearningService:
    def __init__(self, workspace, *, expected_config_sha256):
        self.root = Path(workspace).resolve()
        self.config, self.config_sha256 = load_config(self.root, expected_config_sha256)
        self.registry = load_registry(check_pin(self.root, self.config["registry"]))
        self.corpus = load_corpus(check_pin(self.root, self.config["corpus"]), self.config["corpus"]["sha256"]) if self.config.get("corpus") else {"items": [], "manifest": {"counts": {}}}
        self.sources = source_manifest(self.config, self.corpus)
        self.source_lookup = {(s["id"], s["version"], s["sha256"], s["uri"]): s for s in self.sources["sources"]}
        self.model = None
        if self.config.get("model"):
            from .model import AddressedGraphEncoder
            manifest = check_pin(self.root, self.config["model"])
            self.model = AddressedGraphEncoder.load(manifest.parent, self.registry,
                expected_corpus_sha256=self.config["corpus"]["sha256"], expected_manifest_sha256=self.config["model"]["sha256"])
        self.lexical = LexicalIndex(self.corpus["items"])
        self.vectors = None
        self.check_integrity()

    def check_integrity(self):
        # Re-check at READ and immediately before RETURN. Cached arrays never
        # silently serve after an operator replaces a trusted input file.
        load_config(self.root, self.config_sha256)
        pinned_files(self.root, self.config)
        with self._ledger() as ledger:
            receipt = ledger.verify_chain()
        return receipt

    def _ledger(self):
        return _ClosingLedger(EpisodeLedger(within(self.root, self.config["ledger"]), owner=self.config["owner"], readonly=True))

    def _revocations(self):
        with self._ledger() as ledger:
            status = ledger.status()
        return set(status.get("revoked_source_ids", []))

    def _affected(self, item, revoked):
        return any(row["source_id"] in revoked for row in [item, *item.get("aliases", [])])

    def _neural_available(self, revoked):
        if (self.model is None or self.config["registry"]["id"] in revoked
                or any(self._affected(i, revoked) for i in self.corpus["items"])):
            return False
        contributing = set(self.config["model"].get("trainingEpisodeIds", []))
        if contributing:
            with self._ledger() as ledger:
                current = {p["episode_id"] for p in ledger.training_pairs(corpus_items=self.corpus["items"], allow_synthetic=False)}
            if not contributing <= current:
                return False
        return True

    def provenance(self, items=()):
        r = self.config["registry"]
        refs = {(r["id"], r["version"], r["sha256"], r["uri"]): self.source_lookup[(r["id"], r["version"], r["sha256"], r["uri"])]}
        item_refs = []
        for row in items:
            key = (row["source_id"], row["source_version"], row["source_sha256"], row["source_uri"])
            refs[key] = self.source_lookup[key]
            item_refs.append({"id": row["id"], "sourceId": row["source_id"], "textSha256": row["text_sha256"]})
        return {"workspaceId": self.config["workspaceId"], "registrySha256": r["sha256"], "configSha256": self.config_sha256,
                "corpusSha256": self.config["corpus"]["sha256"] if self.config.get("corpus") else None,
                "checkpointSha256": self.config["model"]["sha256"] if self.config.get("model") else None,
                "sourceRefs": list(refs.values()), "itemRefs": item_refs}

    def execute(self, operation, arguments=None):
        if operation not in OPERATIONS or not isinstance(arguments, (dict, type(None))):
            raise ValueError("UNKNOWN_OPERATION_OR_INVALID_ARGUMENTS")
        args = arguments or {}
        allowed = {"status": set(), "search": {"query", "limit", "target"}, "node": {"hsn"},
                   "episodes": {"limit", "offset"}, "evaluation": set()}[operation]
        if set(args) - allowed:
            raise ValueError("UNEXPECTED_ARGUMENT")
        initial_ledger = self.check_integrity()
        revoked = self._revocations()
        selected = []
        if operation == "status":
            with self._ledger() as ledger:
                ledger_status = ledger.status()
            result = {"schema": "atlas.work-learning.status/v1", "scope": "WORK", "registry": self.registry["counts"],
                      "coverage": self.corpus["manifest"].get("coverage", {"whole_archive_complete": False}),
                      "corpus": self.corpus["manifest"].get("counts", {}), "ledger": ledger_status,
                      "model": self.model.descriptor() if self.model else None,
                      "neuralInferenceAvailable": self._neural_available(revoked), "retrieval": self.config["retrieval"],
                      "identity": "OWNER_LOCAL_TRUSTED_PROCESS", "hostedDeployment": False, "semanticAcceptance": False}
        elif operation == "node":
            hsn = args.get("hsn")
            if self.config["registry"]["id"] in revoked:
                raise ValueError("SOURCE_REVOKED")
            source = node_record(self.registry, hsn)
            result = self.model.node(hsn) if self._neural_available(revoked) else {"hsn": hsn, "source": source, "representation": None, "semantic_acceptance": False}
        elif operation == "search":
            query = args.get("query")
            limit, target = args.get("limit", 10), args.get("target", "corpus")
            if not isinstance(query, str) or not query.strip() or len(query) > 4096 or type(limit) is not int or not 1 <= limit <= 20 or target not in {"corpus", "nodes"}:
                raise ValueError("INVALID_SEARCH_ARGUMENTS")
            fallback_reason = None
            if target == "nodes":
                if self.config["registry"]["id"] in revoked:
                    raise ValueError("SOURCE_REVOKED")
                if self._neural_available(revoked):
                    hits = self.model.search_nodes(query, limit)
                    method = "learned_addressed_graph"
                else:
                    if self.config["retrieval"].get("fallback", "lexical") == "none":
                        raise ValueError("NEURAL_STATE_UNAVAILABLE_OR_WITHHELD")
                    rows = [{"text": " ".join(str(n.get(k, "")) for k in ("name", "definition", "includes"))} for n in self.registry["nodes"]]
                    scores = LexicalIndex(rows).scores(query)
                    order = sorted(range(len(scores)), key=lambda i: (-scores[i], i))[:limit]
                    hits = [{"hsn": self.registry["node_ids"][i], "name": self.registry["nodes"][i]["name"], "score": scores[i], "score_type": "bm25", "semantic_status": "CANDIDATE_UNREVIEWED"} for i in order if scores[i] > 0]
                    method = "original_definition_bm25"
                    fallback_reason = "NEURAL_STATE_UNAVAILABLE_OR_WITHHELD"
            else:
                method = self.config["retrieval"]["method"]
                if method != "lexical" and not self._neural_available(revoked):
                    if self.config["retrieval"].get("fallback", "lexical") == "none":
                        raise ValueError("NEURAL_STATE_UNAVAILABLE_OR_WITHHELD")
                    method = "lexical"
                    fallback_reason = "NEURAL_STATE_UNAVAILABLE_OR_WITHHELD"
                # Neural-only retrieval does not consume BM25 scores. Resolve
                # eligibility/fallback above before deciding whether to scan.
                lexical = self.lexical.scores(query) if method in {"lexical", "hybrid"} else None
                scores = lexical
                if method in {"neural", "hybrid"}:
                    import numpy as np
                    if self.vectors is None:
                        self.vectors = self.model.encode([i["text"] for i in self.corpus["items"]])
                    q = self.model.encode([query])[0]
                    neural = (self.vectors @ q).tolist() if np.any(q) else [0.] * len(self.corpus["items"])
                    if method == "neural":
                        scores = neural
                    else:
                        scores = [0.] * len(lexical)
                        for lane in (lexical, neural):
                            for rank, i in enumerate(sorted(range(len(lane)), key=lambda j: (-lane[j], j))):
                                if lane[i] > 0:
                                    scores[i] += 1. / (60 + rank + 1)
                order = sorted(range(len(scores)), key=lambda i: (-scores[i], self.corpus["items"][i]["id"]))
                hits = []
                fields = ("id", "title", "source_id", "source_version", "source_uri", "source_sha256", "text_sha256", "family_id", "scope", "author_kind", "evidence_status", "hsn_candidates")
                for i in order:
                    row = self.corpus["items"][i]
                    if scores[i] <= 0 or self._affected(row, revoked):
                        continue
                    excerpt = row["text"][:1600]
                    hits.append({**{k: row.get(k) for k in fields}, "score": float(scores[i]), "score_type": method,
                                 "excerpt": excerpt, "excerpt_sha256": text_sha256(excerpt), "excerpt_truncated": len(excerpt) < len(row["text"]),
                                 "semantic_status": "RETRIEVAL_NOT_ACCEPTANCE", "training_label_status": "NO_ACCEPTED_HSN_LABELS"})
                    selected.append(row)
                    if len(hits) >= limit:
                        break
            result = {"target": target, "method": method, "primaryMethod": "neural" if target == "nodes" else self.config["retrieval"]["method"],
                      "fallbackUsed": fallback_reason is not None, "fallbackReason": fallback_reason,
                      "hits": hits, "semanticAcceptance": False}
        elif operation == "episodes":
            limit, offset = args.get("limit", 20), args.get("offset", 0)
            if type(limit) is not int or not 1 <= limit <= 50 or type(offset) is not int or not 0 <= offset <= 1000000:
                raise ValueError("INVALID_EPISODE_PAGINATION")
            with self._ledger() as ledger:
                result = {"episodes": ledger.list_episodes(limit=limit, offset=offset, include_text=False), "chain": ledger.verify_chain()}
        else:
            result = {"available": False, "currentRetrieval": self.config["retrieval"]}
            if self.config.get("evaluation"):
                report = strict_json(check_pin(self.root, self.config["evaluation"]).read_bytes())
                result = {"available": True, "report": report, "currentRetrieval": self.config["retrieval"],
                          "reportIsSavedHistoricalMeasurement": True}
        result["provenance"] = self.provenance(selected)
        final_ledger = self.check_integrity()
        if final_ledger["head_sha256"] != initial_ledger["head_sha256"]:
            raise ValueError("LEDGER_CHANGED_DURING_READ")
        return result


class _ClosingLedger:
    def __init__(self, ledger):
        self.ledger = ledger
    def __enter__(self):
        return self.ledger
    def __exit__(self, *_):
        self.ledger.close()


def serve(workspace, expected_config_sha256, *, input_stream=None, output_stream=None):
    service = WorkLearningService(workspace, expected_config_sha256=expected_config_sha256)
    inp = input_stream or sys.stdin.buffer
    out = output_stream or sys.stdout.buffer
    while True:
        line = inp.readline(MAX_LINE_BYTES + 1)
        if not line:
            break
        request_id = None
        try:
            if len(line) > MAX_LINE_BYTES or not line.endswith(b"\n"):
                raise ValueError("REQUEST_TOO_LARGE_OR_UNTERMINATED")
            request = strict_json(line)
            if not isinstance(request, dict) or set(request) != {"id", "operation", "arguments"}:
                raise ValueError("INVALID_REQUEST_ENVELOPE")
            request_id = request["id"]
            if type(request_id) not in (str, int) or len(str(request_id)) > 128:
                request_id = None
                raise ValueError("INVALID_REQUEST_ID")
            result = service.execute(request["operation"], request["arguments"])
            reply = {"id": request_id, "ok": True, "result": result}
        except Exception as exc:
            # User-controlled text and filesystem paths do not enter protocol errors.
            code = str(exc).split(":", 1)[0] if isinstance(exc, ValueError) else type(exc).__name__.upper()
            if not re.fullmatch(r"[A-Z][A-Z0-9_]{1,96}", code):
                code = "REQUEST_FAILED"
            reply = {"id": request_id, "ok": False, "error": {"code": code, "message": code}}
        raw = json.dumps(reply, ensure_ascii=False, separators=(",", ":"), allow_nan=False).encode() + b"\n"
        if len(raw) > MAX_RESPONSE_BYTES:
            raw = json.dumps({"id": request_id, "ok": False, "error": {"code": "RESPONSE_TOO_LARGE", "message": "RESPONSE_TOO_LARGE"}}).encode() + b"\n"
        out.write(raw)
        out.flush()
        if len(line) > MAX_LINE_BYTES:
            # A client violating framing must reconnect; never parse its tail.
            break
