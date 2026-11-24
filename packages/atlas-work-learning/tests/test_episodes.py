import copy
from pathlib import Path
import sqlite3
import tempfile
import unittest

from atlas_work_learning.corpus import text_sha256
from atlas_work_learning.episodes import EpisodeLedger


def source_item():
    return {"id": "item-a", "source_id": "source-a", "source_version": "v1", "source_sha256": "a" * 64,
            "text": "Canonical source passage", "text_sha256": text_sha256("Canonical source passage"),
            "scope": "WORK", "family_id": "family-a", "split": "train", "aliases": []}


def episode(i="episode-a", **changes):
    e = {"id": i, "task_id": "task-a", "scope": "WORK", "family_id": "family-a", "split": "train",
         "source_refs": [{"source_id": "source-a", "source_version": "v1", "source_sha256": "a" * 64}],
         "corpus_item_ids": ["item-a"], "input_text": "Resolve the recorded correction", "attempted_output": "An earlier incorrect answer",
         "corrected_output": "The source-supported corrected answer", "author_kind": "model", "reviewer_id": "fixture-reviewer",
         "feedback_kind": "source_supported_correction", "evidence_status": "SOURCE_VERIFIED",
         "verification_refs": [{"id": "receipt-a", "sha256": "b" * 64}], "training_eligible": True}
    e.update(changes)
    return e


class EpisodeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.path = Path(self.temp.name) / "episodes.sqlite"
        self.ledger = EpisodeLedger(self.path, owner="fixture-owner")

    def tearDown(self):
        self.ledger.close(); self.temp.cleanup()

    def test_actual_feedback_pair_requires_known_corpus(self):
        self.ledger.append_episode(episode())
        self.assertEqual(self.ledger.training_pairs(), [])
        pairs = self.ledger.training_pairs(corpus_items=[source_item()])
        self.assertEqual(len(pairs), 1)
        self.assertEqual(pairs[0]["target_text"], episode()["corrected_output"])
        self.assertTrue(pairs[0]["training_eligible"])

    def test_idempotence_and_id_conflict(self):
        a = self.ledger.append_episode(episode())
        b = self.ledger.append_episode(episode())
        self.assertTrue(b["idempotent"])
        self.assertEqual(a["event_sha256"], b["event_sha256"])
        with self.assertRaisesRegex(ValueError, "ID_CONFLICT"):
            self.ledger.append_episode(episode(corrected_output="Changed correction"))
        self.assertEqual(self.ledger.verify_chain()["events"], 1)

    def test_hold_and_revocation_remove_future_pairs_preserve_history(self):
        self.ledger.append_episode(episode())
        self.ledger.set_status("episode-a", "HELD", "Needs additional verification")
        self.assertEqual(self.ledger.training_pairs(corpus_items=[source_item()]), [])
        self.ledger.set_status("episode-a", "ELIGIBLE", "Review resolved")
        self.assertEqual(len(self.ledger.training_pairs(corpus_items=[source_item()])), 1)
        self.ledger.set_status("episode-a", "REVOKED", "Owner withdrew use")
        self.assertEqual(self.ledger.training_pairs(corpus_items=[source_item()]), [])
        self.assertEqual(self.ledger.verify_chain()["events"], 4)
        with self.assertRaisesRegex(ValueError, "TERMINAL"):
            self.ledger.set_status("episode-a", "ELIGIBLE", "Attempted restore")

    def test_source_revocation_and_alias_revocation(self):
        self.ledger.append_episode(episode())
        source = source_item(); source["aliases"] = [{"source_id": "source-alias", "source_version": "v2", "source_sha256": "c" * 64}]
        self.ledger.revoke_source("source-alias", "Withdrawn alias")
        self.assertEqual(self.ledger.training_pairs(corpus_items=[source]), [])
        self.assertEqual(self.ledger.active_revoked_sources(), ["source-alias"])
        self.assertEqual(self.ledger.status()["revoked_source_ids"], ["source-alias"])

    def test_wrong_owner_and_nonwork_refused(self):
        with self.assertRaisesRegex(ValueError, "OWNER_MISMATCH"):
            self.ledger.append_episode(episode(owner="other"))
        with self.assertRaisesRegex(ValueError, "WORK_SCOPE"):
            self.ledger.append_episode(episode(scope="SOCIAL"))
        with self.assertRaisesRegex(ValueError, "OWNER_OR_SCHEMA"):
            EpisodeLedger(self.path, owner="other")

    def test_cannot_train_on_heldout_or_wrong_source_version(self):
        with self.assertRaisesRegex(ValueError, "HELDOUT"):
            self.ledger.append_episode(episode(split="test"))
        self.ledger.append_episode(episode())
        wrong = source_item(); wrong["source_version"] = "v2"
        self.assertEqual(self.ledger.training_pairs(corpus_items=[wrong]), [])
        wrong = source_item(); wrong["split"] = "validation"
        self.assertEqual(self.ledger.training_pairs(corpus_items=[wrong]), [])

    def test_preference_is_not_a_fact_correction(self):
        self.ledger.append_episode(episode(feedback_kind="explicit_preference", evidence_status="REVIEWED"))
        self.assertEqual(self.ledger.training_pairs(corpus_items=[source_item()]), [])
        self.assertEqual(len(self.ledger.training_pairs("preference", [source_item()])), 1)

    def test_unverified_outcomes_require_hold(self):
        with self.assertRaisesRegex(ValueError, "VERIFIED_OUTCOME"):
            self.ledger.append_episode(episode(evidence_status="AUTHOR_REPORTED_UNVERIFIED"))
        self.ledger.append_episode(episode(training_eligible=False, evidence_status="AUTHOR_REPORTED_UNVERIFIED"))
        self.assertEqual(self.ledger.status()["held"], 1)
        with self.assertRaisesRegex(ValueError, "VERIFIED_OUTCOME"):
            self.ledger.set_status("episode-a", "ELIGIBLE", "Unsupported upgrade")

    def test_synthetic_fixture_requires_explicit_opt_in(self):
        self.ledger.append_episode(episode(is_synthetic=True, feedback_kind="synthetic_fixture", evidence_status="SYNTHETIC_FIXTURE_VERIFIED",
                                           source_refs=[], corpus_item_ids=[], family_id="synthetic-fixture"))
        self.assertEqual(self.ledger.training_pairs(), [])
        p = self.ledger.training_pairs(allow_synthetic=True)
        self.assertEqual(len(p), 1); self.assertTrue(p[0]["is_synthetic"])

    def test_hash_mismatch_and_missing_reviewer_refused(self):
        with self.assertRaisesRegex(ValueError, "CONTENT_HASH"):
            self.ledger.append_episode(episode(input_sha256="0" * 64))
        with self.assertRaisesRegex(ValueError, "REVIEWER_ID"):
            self.ledger.append_episode(episode(reviewer_id=""))

    def test_append_only_sql_and_tamper_detection(self):
        self.ledger.append_episode(episode())
        with self.assertRaises(sqlite3.IntegrityError):
            self.ledger.connection.execute("DELETE FROM events")
        with self.assertRaises(sqlite3.IntegrityError):
            self.ledger.connection.execute("UPDATE events SET owner='other'")
        self.ledger.connection.execute("DROP TRIGGER events_no_update")
        self.ledger.connection.execute("UPDATE events SET payload_json='{}'")
        with self.assertRaisesRegex(ValueError, "EVENT_HASH"):
            self.ledger.verify_chain()

    def test_reopen_replays_chain_and_body_free_listing(self):
        self.ledger.append_episode(episode())
        expected = self.ledger.verify_chain()["head_sha256"]
        with EpisodeLedger(self.path, owner="fixture-owner") as second:
            self.assertEqual(second.verify_chain()["head_sha256"], expected)
            self.assertNotIn("input_text", second.list_episodes()[0]["episode"])
            self.assertEqual(second.list_episodes(include_text=True)[0]["episode"]["input_text"], episode()["input_text"])

    def test_summary_omits_extra_bodies_and_nested_reference_content(self):
        value = episode(extra_body="owner-local extended text")
        value["source_refs"][0]["extra_body"] = "nested source body"
        value["verification_refs"][0]["full_report"] = "private receipt body"
        self.ledger.append_episode(value)
        summary = self.ledger.list_episodes()[0]["episode"]
        self.assertNotIn("extra_body", summary)
        self.assertNotIn("extra_body", summary["source_refs"][0])
        self.assertNotIn("full_report", summary["verification_refs"][0])
        self.assertEqual(self.ledger.list_episodes(include_text=True)[0]["episode"]["extra_body"], "owner-local extended text")

    def test_readonly_replays_without_writes_and_blocks_every_mutation(self):
        self.ledger.append_episode(episode())
        before = self.path.read_bytes()
        with EpisodeLedger(self.path, owner="fixture-owner", readonly=True) as reader:
            self.assertEqual(reader.status()["episodes"], 1)
            self.assertEqual(len(reader.training_pairs(corpus_items=[source_item()])), 1)
            for operation in (
                lambda: reader.append_episode(episode("episode-b")),
                lambda: reader.set_status("episode-a", "HELD", "Hold"),
                lambda: reader.revoke_source("source-a", "Withdrawn"),
                lambda: reader._insert("SOURCE_REVOKED", {}),
            ):
                with self.assertRaisesRegex(ValueError, "READ_ONLY_LEDGER"):
                    operation()
            with self.assertRaises(sqlite3.OperationalError):
                reader.connection.execute("INSERT INTO metadata VALUES('test','blocked')")
        self.assertEqual(self.path.read_bytes(), before)

    def test_readonly_missing_ledger_creates_nothing_and_wrong_owner_refused(self):
        missing = self.path.parent / "not-created" / "missing.sqlite"
        with self.assertRaisesRegex(ValueError, "LEDGER_NOT_FOUND"):
            EpisodeLedger(missing, owner="fixture-owner", readonly=True)
        self.assertFalse(missing.parent.exists())
        with self.assertRaisesRegex(ValueError, "OWNER_OR_SCHEMA"):
            EpisodeLedger(self.path, owner="other", readonly=True)

    def test_actor_is_owner_bound_and_default_inherits_trusted_owner(self):
        self.ledger.append_episode(episode())
        before = self.ledger.verify_chain()
        with self.assertRaisesRegex(ValueError, "ACTOR_OWNER_MISMATCH"):
            self.ledger.set_status("episode-a", "HELD", "Hold", actor_id="other")
        with self.assertRaisesRegex(ValueError, "ACTOR_OWNER_MISMATCH"):
            self.ledger.revoke_source("source-a", "Withdrawn", actor_id="other")
        self.assertEqual(self.ledger.verify_chain(), before)
        self.ledger.set_status("episode-a", "HELD", "Hold")
        self.ledger.revoke_source("source-a", "Withdrawn", actor_id="fixture-owner")
        self.assertEqual(self.ledger.status()["held"], 1)
        self.assertEqual(self.ledger.active_revoked_sources(), ["source-a"])


if __name__ == "__main__":
    unittest.main()
