"""Independent numeric checks and one finite 144-sequence original experiment.

Run this file with the candidate's python directory on PYTHONPATH. Optionally
set EVENT_LATTICE_EVIDENCE to a new receipt path. No upstream package, original
registry body, provider, corpus, checkpoint or model is loaded by these checks.
"""
from __future__ import annotations

from dataclasses import FrozenInstanceError, asdict
from decimal import Decimal, localcontext
import hashlib
import json
import math
import os
from pathlib import Path
import sys
import time
import unittest

from atlas_work_learning import event_lattice as event


_LAST_EXPERIMENT = None


def _sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def _bytes(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"),
                      ensure_ascii=False, allow_nan=False).encode()


def _decimal_oracle(value, drive, tau, dt):
    with localcontext() as context:
        context.prec = 80
        v, u, t, h = map(Decimal.from_float, map(float, (value, drive, tau, dt)))
        return float(u + (v - u) * (-h / t).exp())


def _cases():
    """Predeclare all inputs and generation rules before any result is seen."""
    families = ("zero", "constant", "positive_step", "negative_step",
                "alternating", "slow_ramp", "positive_burst", "negative_burst",
                "sparse_handover", "long_silence", "near_quantum", "full_density")
    cases = []
    for family, name in enumerate(families):
        for variant in range(12):
            quantum = (1 + variant % 4) / 8
            amplitude = (variant + 1) / 8
            tau, dt = (variant + 1) / 8, (variant + 1) / 64
            samples = []
            for step in range(24):
                if family == 0:
                    value = 0.0
                elif family == 1:
                    value = amplitude
                elif family == 2:
                    value = amplitude if step >= 8 else 0.0
                elif family == 3:
                    value = -amplitude if step >= 8 else 0.0
                elif family == 4:
                    value = amplitude if step % 2 else -amplitude
                elif family == 5:
                    value = step * quantum / 16
                elif family == 6:
                    value = amplitude if step % 8 == 0 else 0.0
                elif family == 7:
                    value = -amplitude if step % 8 == 0 else 0.0
                elif family == 8:
                    value = amplitude if step % 6 == 0 else amplitude / 8
                elif family == 9:
                    value = 2 * amplitude if step == 0 else 0.0
                elif family == 10:
                    value = quantum * (1 + (2 ** -20 if step % 2 else -(2 ** -20)))
                else:
                    value = amplitude * (-1 if step % 3 == 0 else 1) * (step % 5) / 4
                samples.append(value)
            times = [step * dt + (100 * tau if family == 9 and step >= 12 else 0)
                     for step in range(24)]
            cases.append({"id": f"EVT-{len(cases) + 1:03d}", "family": name,
                          "family_index": family, "variant": variant, "tau": tau,
                          "dt": dt, "quantum": quantum, "samples": samples,
                          "times": times, "final_time": times[-1] + dt,
                          "slot_rule": "all slots for full_density; eight for sparse_handover; one otherwise",
                          "slot_formula": "(family*144 + variant*12 + step*37 + offset*19) % 1728",
                          "drive_rule": "sample on odd slots, -0.5*sample on even slots"})
    return cases


def _changes(case, step):
    family = case["family_index"]
    count = event.NODE_COUNT if family == 11 else (8 if family == 8 else 1)
    if family == 11:
        indices = list(range(event.NODE_COUNT))
    else:
        indices = [(family * 144 + case["variant"] * 12 + step * 37 + offset * 19)
                   % event.NODE_COUNT for offset in range(count)]
    value = case["samples"][step]
    return [(index, value if index % 2 else -0.5 * value) for index in indices]


def _run_cases():
    cases = _cases()
    predeclared_hash = hashlib.sha256(_bytes(cases)).hexdigest()
    source_pins = {"event_lattice.py": _sha(event.__file__),
                   "test_event_lattice.py": _sha(__file__)}
    started = time.perf_counter()
    observations = []
    for case in cases:
        encoded = event.encode_delta(case["samples"], case["quantum"])
        decoded = event.decode_delta(encoded.events, encoded.sample_count,
                                     encoded.quantum, initial=encoded.initial_reconstruction)
        codec_error = max(abs(x - y) for x, y in zip(case["samples"], decoded))
        if codec_error > case["quantum"] + encoded.max_float_tolerance:
            raise AssertionError((case["id"], "codec error", codec_error))
        state = event.new_lattice_state(tau=case["tau"])
        dense = [0.0] * event.NODE_COUNT
        drives = [0.0] * event.NODE_COUNT
        previous = 0.0
        touched = 0
        for step, timestamp in enumerate(case["times"]):
            elapsed = timestamp - previous
            # Independent dense oracle: no production leak/step helper reused.
            factor = math.exp(-elapsed / case["tau"])
            if elapsed:
                dense = [u + (v - u) * factor for v, u in zip(dense, drives)]
            changes = _changes(case, step)
            for index, drive in changes:
                drives[index] = drive
            state = event.update_held_inputs(state, changes, timestamp)
            touched += len(changes)
            previous = timestamp
        factor = math.exp(-(case["final_time"] - previous) / case["tau"])
        dense = [u + (v - u) * factor for v, u in zip(dense, drives)]
        lazy = event.materialize_lattice(state, case["final_time"])
        parity_error = max(abs(x - y) for x, y in zip(dense, lazy))
        if parity_error > 2e-12:
            raise AssertionError((case["id"], "lazy/dense parity", parity_error))
        encoded_wire = {"initial": encoded.initial_reconstruction,
                        "quantum": encoded.quantum, "samples": encoded.sample_count,
                        "events": [[e.sample_index, e.quanta] for e in encoded.events]}
        observations.append({"id": case["id"], "family": case["family"],
                             "variant": case["variant"], "status": "PASS",
                             "input_sha256": hashlib.sha256(_bytes(case)).hexdigest(),
                             "samples": len(case["samples"]), "event_records": len(encoded.events),
                             "total_abs_quanta": encoded.total_abs_quanta,
                             "max_codec_abs_error": codec_error,
                             "quantum": case["quantum"],
                             "float_error_tolerance": encoded.max_float_tolerance,
                             "codec_bound_verified": codec_error <= case["quantum"] + encoded.max_float_tolerance,
                             "raw_sample_json_bytes": len(_bytes(case["samples"])),
                             "encoded_json_bytes": len(_bytes(encoded_wire)),
                             "lazy_dense_max_abs_error": parity_error,
                             "dense_state_update_evaluations": (len(case["times"]) + 1) * event.NODE_COUNT,
                             "lazy_touched_update_evaluations": touched,
                             "lazy_final_materialization_evaluations": event.NODE_COUNT,
                             "final_state_sha256": hashlib.sha256(_bytes(lazy)).hexdigest()})
    if predeclared_hash != hashlib.sha256(_bytes(cases)).hexdigest():
        raise AssertionError("case definition mutated")
    if source_pins != {"event_lattice.py": _sha(event.__file__),
                       "test_event_lattice.py": _sha(__file__)}:
        raise AssertionError("tested source changed")
    return {"schema": "atlas.event-lattice.experiment/v1", "status": "PASS",
            "kind": "FINITE_SYNTHETIC_NUMERICAL_TESTS", "case_count": len(cases),
            "families": 12, "variants_per_family": 12,
            "predeclared_case_manifest_sha256": predeclared_hash,
            "baseline_commit": "76e6eeefeafbcc1cc4c6f94c00afcb9700fc19ba",
            "baseline_runtime_manifest_sha256": "12ebee51314e983581452cab0bc90faaa5971258af915d6f2c66a8a85b235821",
            "source_sha256": source_pins,
            "python_version": sys.version.split()[0],
            "elapsed_seconds_for_checks": time.perf_counter() - started,
            "passed": len(observations), "failed": 0,
            "max_codec_error_in_quanta": max(o["max_codec_abs_error"] / o["quantum"] for o in observations),
            "max_lazy_dense_abs_error": max(o["lazy_dense_max_abs_error"] for o in observations),
            "total_samples": sum(o["samples"] for o in observations),
            "total_event_records": sum(o["event_records"] for o in observations),
            "total_raw_sample_json_bytes": sum(o["raw_sample_json_bytes"] for o in observations),
            "total_encoded_json_bytes": sum(o["encoded_json_bytes"] for o in observations),
            "feature_statuses": {
                "F049": {"status": "LOCAL_PRIMITIVE", "scope": "held-input subthreshold decay only"},
                "F052": {"status": "LOCAL_PRIMITIVE", "scope": "one endpoint >=, immediate hard-reset, dt=0 identity contract"},
                "F054": {"status": "LOCAL_PRIMITIVE", "scope": "numeric bounds and overflow holds for these primitives"},
                "F061": {"status": "LOCAL_PRIMITIVE", "scope": "residual integer-quantum codec"},
                "F068": {"status": "LOCAL_PRIMITIVE", "scope": "immutable local delta records; no permission-bearing source event schema"},
                "F069": {"status": "LOCAL_PRIMITIVE", "scope": "lazy held-input reference with complete final materialization; no scheduler"},
                "F078": {"status": "LOCAL_PRIMITIVE", "scope": "pure copied temporal transitions"},
                "F089": {"status": "LOCAL_PRIMITIVE", "scope": "reversible address arithmetic and role metadata; original source binding still external"}},
            "limitations": ["No current Atlas model, source registry or weights changed",
                            "No SNN training, continuous spike-time solver or delayed-event scheduler",
                            "No hardware, energy, hosted-authority or retrieval-quality claim",
                            "Lazy state copies and validates 1728-slot tuples; update-call counts exclude that storage work",
                            "Elapsed time is test execution time, not a comparative performance benchmark",
                            "Codec quanta are signed record magnitudes, not resolved physical spike times"],
            "optimizer_updates": 0, "provider_calls": 0, "hardware_calls": 0,
            "resident_conversations": 0, "gf9_batch_count_increment": 0,
            "cases": observations}


class EventLatticeTests(unittest.TestCase):
    def test_all_original_address_roundtrips_and_roles(self):
        roles = {"DOMAIN": 0, "METHOD": 0}
        for index in range(1728):
            hsn = event.index_to_address(index)
            self.assertEqual(event.address_to_index(hsn), index)
            meta = event.address_metadata(hsn)
            self.assertEqual(meta.index, index)
            self.assertEqual(meta.house, index // 144 + 1)
            self.assertEqual(meta.sphere, (index % 144) // 12 + 1)
            self.assertEqual(meta.node, index % 12 + 1)
            self.assertFalse(meta.source_binding_verified)
            roles[meta.axis_role] += 1
        self.assertEqual(roles, {"DOMAIN": 1008, "METHOD": 720})
        self.assertEqual(event.index_to_address(0), "H01.S01.N01")
        self.assertEqual(event.index_to_address(1727), "H12.S12.N12")

    def test_address_invalid_inputs(self):
        for index in (-1, 1728, True, False, 1.0, "1", None, 10**400):
            with self.subTest(index=index), self.assertRaises(event.EventLatticeError):
                event.index_to_address(index)
        for hsn in ("H1.S01.N01", "H01.S1.N01", "H00.S01.N01", "H13.S01.N01",
                    "H01.S13.N01", "H01.S01.N13", "H01.S01.N01\n", " H01.S01.N01",
                    "h01.s01.n01", 0, True, None):
            with self.subTest(hsn=hsn), self.assertRaises(event.EventLatticeError):
                event.address_to_index(hsn)

    def test_leak_independent_high_precision_oracle(self):
        cases = [(0.0, 1.0, 1.0, 1e-14), (1.25, -2.5, 0.3, 1e-12),
                 (1.25, -2.5, 0.3, 0.7), (1e12, 1e-12, 0.25, 20.0),
                 (1.0, -1.0, 1.0, math.log(2)), (1e-12, 1e12, 1e12, 1e-12)]
        for args in cases:
            actual = event.exact_leak(*args)
            expected = _decimal_oracle(*args)
            tolerance = max(8 * math.ulp(expected), 2e-15 * max(abs(args[0]), abs(args[1]), 1e-12))
            self.assertLessEqual(abs(actual - expected), tolerance)
        tiny = event.exact_leak(0.0, 1.0, 1.0, 1e-14)
        self.assertGreater(tiny, 0)
        self.assertLess(abs(tiny / _decimal_oracle(0, 1, 1, 1e-14) - 1), 3e-16)
        self.assertEqual(event.exact_leak(1e12, 1e-12, 1e-12, 1e12), 1e-12)

    def test_leak_identity_equilibrium_and_semigroup(self):
        self.assertEqual(event.exact_leak(3.25, -100, 0.5, 0), 3.25)
        self.assertEqual(event.exact_leak(-7.5, -7.5, 1e-12, 1e12), -7.5)
        for tau in (0.001, 0.3, 10.0):
            first = event.exact_leak(1.2, -0.7, tau, 0.13)
            split = event.exact_leak(first, -0.7, tau, 0.21)
            whole = event.exact_leak(1.2, -0.7, tau, 0.13 + 0.21)
            self.assertLessEqual(abs(split - whole), 2e-15)

    def test_sampled_threshold_reset_and_zero_time(self):
        value = event.sampled_lif_step(0, 2, 1, math.log(2), threshold=1, reset=-0.25)
        self.assertEqual(value, event.SampledLIFStep(-0.25, True))
        self.assertEqual(event.sampled_lif_step(2, 100, 1, 0), event.SampledLIFStep(2.0, False))
        self.assertFalse(event.sampled_lif_step(0, 0.5, 1, 100).spike)
        with self.assertRaises(event.EventLatticeError):
            event.sampled_lif_step(0, 1, 1, 1, threshold=0, reset=0)

    def test_numeric_bounds_and_overflow_hold(self):
        cases = [(float("nan"), 0, 1, 1), (0, float("inf"), 1, 1),
                 (0, 1, 0, 1), (0, 1, -1, 1), (0, 1, 1, -1),
                 (0, 1, 1e-300, 1), (0, 1, 1, 1e13), (1e308, -1e308, 1, 1),
                 (True, 1, 1, 1), (0, True, 1, 1), (0, 1, True, 1),
                 (0, 1, 1, True), (10**400, 0, 1, 1)]
        for args in cases:
            with self.subTest(args=args), self.assertRaises(event.EventLatticeError):
                event.exact_leak(*args)

    def test_residual_codec_defeats_adjacent_delta_slow_ramp(self):
        samples = [i / 100 for i in range(256)]
        encoded = event.encode_delta(samples, 0.25)
        decoded = event.decode_delta(encoded.events, len(samples), 0.25)
        self.assertGreater(len(encoded.events), 0)
        self.assertLessEqual(max(abs(x - y) for x, y in zip(samples, decoded)),
                             0.25 + encoded.max_float_tolerance)
        # Deliberately flawed independent control: every adjacent increment
        # is below the quantum, so this scheme loses the accumulated ramp.
        naive_events = [x - samples[i - 1] for i, x in enumerate(samples) if i and abs(x - samples[i - 1]) >= 0.25]
        self.assertEqual(naive_events, [])
        self.assertGreater(abs(samples[-1] - sum(naive_events)), 10 * 0.25)

    def test_codec_signed_values_and_decoder_oracle(self):
        samples = [0, 0.125, 0.25, 0.875, -0.5, -0.875, 1.0]
        encoded = event.encode_delta(samples, 0.25)
        expected_events = [(2, 1), (3, 2), (4, -5), (5, -1), (6, 7)]
        self.assertEqual([(e.sample_index, e.quanta) for e in encoded.events], expected_events)
        self.assertEqual(event.decode_delta(encoded.events, 7, 0.25),
                         (0, 0, 0.25, 0.75, -0.5, -0.75, 1.0))

    def test_codec_chunked_continuation(self):
        samples = [math.sin(i / 7) for i in range(150)]
        whole = event.encode_delta(samples, 0.1)
        left = event.encode_delta(samples[:57], 0.1)
        right = event.encode_delta(samples[57:], 0.1, initial=left.final_reconstruction)
        events = [(e.sample_index, e.quanta) for e in left.events] + [(e.sample_index + 57, e.quanta) for e in right.events]
        self.assertEqual(events, [(e.sample_index, e.quanta) for e in whole.events])
        self.assertEqual(right.final_reconstruction, whole.final_reconstruction)

    def test_codec_empty_and_silent_budget(self):
        encoded = event.encode_delta([], 0.1, initial=0.5, max_samples=0, max_events=0, max_total_quanta=0)
        self.assertEqual(encoded.final_reconstruction, 0.5)
        self.assertEqual(encoded.events, ())
        self.assertEqual(event.decode_delta((), 0, 0.1), ())
        self.assertEqual(event.encode_delta([0, 0], 0.1, max_events=0).events, ())

    def test_codec_invalid_resolution_types_and_budgets(self):
        calls = [lambda: event.encode_delta([1], 0),
                 lambda: event.encode_delta([1], True),
                 lambda: event.encode_delta([True], 1),
                 lambda: event.encode_delta([float("nan")], 1),
                 lambda: event.encode_delta([1], 1, max_events=0),
                 lambda: event.encode_delta([1, 2], 1, max_samples=1),
                 lambda: event.encode_delta([1], 1e-12),
                 lambda: event.encode_delta([], 1e-12, initial=1e12),
                 lambda: event.encode_delta([1, 0, 1], 1, max_total_quanta=2),
                 lambda: event.encode_delta([1], 1, max_events=True),
                 lambda: event.encode_delta([1], 1, max_events=event.MAX_EVENTS + 1),
                 lambda: event.encode_delta("1", 1),
                 lambda: event.decode_delta([event.DeltaEvent(0, 1)], 1, 1e12, initial=1e12)]
        for call in calls:
            with self.assertRaises(event.EventLatticeError):
                call()

    def test_decoder_rejects_duplicate_unsorted_and_out_of_range(self):
        invalid = [[event.DeltaEvent(0, 1), event.DeltaEvent(0, -1)],
                   [event.DeltaEvent(1, 1), event.DeltaEvent(0, -1)],
                   [event.DeltaEvent(2, 1)], [{"sample_index": 0, "quanta": 1}]]
        for values in invalid:
            with self.assertRaises(event.EventLatticeError):
                event.decode_delta(values, 2, 0.5)
        for sample, count in ((True, 1), (-1, 1), (0, 0), (0, True)):
            with self.assertRaises(event.EventLatticeError):
                event.DeltaEvent(sample, count)
        with self.assertRaises(event.EventLatticeError):
            event.decode_delta([], True, 1)

    def test_input_and_state_immutability(self):
        samples = [0.0, 1.0]
        encoded = event.encode_delta(samples, 0.5)
        samples[1] = 100.0
        self.assertEqual(encoded.final_reconstruction, 1.0)
        with self.assertRaises(FrozenInstanceError):
            encoded.events[0].quanta = 99
        original = event.new_lattice_state()
        changes = [[0, 2.0]]
        updated = event.update_held_inputs(original, changes, 0)
        changes[0][1] = 50
        self.assertEqual(original.cells[0].drive, 0)
        self.assertEqual(updated.cells[0].drive, 2)
        with self.assertRaises(FrozenInstanceError):
            updated.cells[0].value = 1

    def test_lazy_state_single_slot_analytic_reference(self):
        initial = event.new_lattice_state(tau=0.5)
        state = event.update_held_inputs(initial, [(1727, 2)], 0)
        state = event.update_held_inputs(state, [(1727, -1)], 0.25)
        result = event.materialize_lattice(state, 1.0)
        first = _decimal_oracle(0, 2, 0.5, 0.25)
        expected = _decimal_oracle(first, -1, 0.5, 0.75)
        self.assertLessEqual(abs(result[-1] - expected), 2e-15)
        self.assertTrue(all(x == 0 for x in result[:-1]))
        self.assertEqual(initial.cells[-1].drive, 0)

    def test_state_clock_and_same_time_drive_updates(self):
        state = event.new_lattice_state(initial=0.25)
        changed = event.update_held_inputs(state, [(0, 2)], 0)
        self.assertEqual(changed.cells[0].value, 0.25)
        state = event.update_held_inputs(changed, [], 2)
        with self.assertRaises(event.EventLatticeError):
            event.update_held_inputs(state, [(1, 1)], 1)
        with self.assertRaises(event.EventLatticeError):
            event.materialize_lattice(state, 1)
        with self.assertRaises(event.EventLatticeError):
            event.materialize_lattice(state, event.MAX_TIME + 1)

    def test_invalid_state_and_changes_hold_without_mutation(self):
        state = event.new_lattice_state()
        for changes in ([(0, 1), (0, 2)], [(True, 1)], [(1728, 1)], [(0, float("inf"))], [(0,)]):
            with self.assertRaises(event.EventLatticeError):
                event.update_held_inputs(state, changes, 1)
            self.assertEqual(state.cells[0].value, 0)
            self.assertEqual(state.time, 0)
        with self.assertRaises(event.EventLatticeError):
            event.LatticeState((), 0)
        with self.assertRaises(event.EventLatticeError):
            event.HeldCell(True, 0, 1, 0)
        with self.assertRaises(event.EventLatticeError):
            event.LatticeState((event.HeldCell(0, 0, 1, 2),) * 1728, 1)

    def test_144_predeclared_synthetic_sequences(self):
        global _LAST_EXPERIMENT
        _LAST_EXPERIMENT = _run_cases()
        self.assertEqual(_LAST_EXPERIMENT["case_count"], 144)
        self.assertEqual(_LAST_EXPERIMENT["passed"], 144)
        self.assertEqual(_LAST_EXPERIMENT["failed"], 0)


if __name__ == "__main__":
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(EventLatticeTests)
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    destination = os.environ.get("EVENT_LATTICE_EVIDENCE")
    if destination and _LAST_EXPERIMENT is not None:
        _LAST_EXPERIMENT["unit_test_summary"] = {"tests_run": result.testsRun,
            "failures": len(result.failures), "errors": len(result.errors),
            "skipped": len(result.skipped)}
        _LAST_EXPERIMENT["status"] = "PASS" if result.wasSuccessful() else "HOLD"
        path = Path(destination)
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("x") as stream:
            json.dump(_LAST_EXPERIMENT, stream, sort_keys=True, indent=2, allow_nan=False)
            stream.write("\n")
    raise SystemExit(0 if result.wasSuccessful() else 1)
