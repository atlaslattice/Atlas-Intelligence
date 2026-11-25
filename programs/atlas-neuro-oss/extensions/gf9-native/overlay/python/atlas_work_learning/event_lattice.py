"""Finite mathematical event primitives alongside the unchanged Atlas network.

This original implementation contains no upstream library code, model weights,
provider calls or hardware adapter. Source review: snnTorch's reset/encoding
interfaces, Brian2's linear-equation reference, Norse/Rockpool temporal state,
Tonic event representations and NIR identity/type contracts. Exact inspected
editions and license declarations are in neuromorphic_sources.json.

``exact_leak`` solves only a constant-drive subthreshold interval. The separately
named sampled LIF helper tests the endpoint and emits at most one binary event;
it does not locate continuous spike times. HSN axes are storage addresses, not
physical coordinates or evidence of semantic understanding.
"""
from __future__ import annotations

from dataclasses import dataclass
import math
import re


NODE_COUNT = 1728
EXPECTED_REGISTRY_SHA256 = "07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6"
MAX_ABS_VALUE = 1e12
MAX_TIME = 1e12
MIN_TAU = 1e-12
MAX_TAU = 1e12
MIN_QUANTUM = 1e-12
MAX_SAMPLES = 100_000
MAX_EVENTS = 100_000
MAX_QUANTA_PER_EVENT = 1_000_000
MAX_TOTAL_QUANTA = 10_000_000
_HSN = re.compile(r"H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])")


class EventLatticeError(ValueError):
    """A bounded numerical or structural contract could not be satisfied."""


def _number(value, name, *, lower=-MAX_ABS_VALUE, upper=MAX_ABS_VALUE):
    if type(value) not in (int, float):
        raise EventLatticeError(f"{name}: finite built-in number required")
    try:
        result = float(value)
    except (OverflowError, ValueError) as exc:
        raise EventLatticeError(f"{name}: numeric overflow") from exc
    if not math.isfinite(result) or not lower <= result <= upper:
        raise EventLatticeError(f"{name}: outside finite bounds [{lower}, {upper}]")
    return result


def _integer(value, name, lower, upper):
    if type(value) is not int or not lower <= value <= upper:
        raise EventLatticeError(f"{name}: integer in [{lower}, {upper}] required")
    return value


def _sequence(value, name, maximum):
    if type(value) not in (list, tuple) or len(value) > maximum:
        raise EventLatticeError(f"{name}: bounded list or tuple required")
    return tuple(value)


def address_to_index(hsn: str) -> int:
    """Map one canonical original address to its existing zero-based slot."""
    if type(hsn) is not str:
        raise EventLatticeError("hsn: canonical string required")
    match = _HSN.fullmatch(hsn)
    if match is None:
        raise EventLatticeError("hsn: canonical Hhh.Sss.Nnn address required")
    h, s, n = map(int, match.groups())
    return 144 * (h - 1) + 12 * (s - 1) + n - 1


def index_to_address(index: int) -> str:
    index = _integer(index, "index", 0, NODE_COUNT - 1)
    h, tail = divmod(index, 144)
    s, n = divmod(tail, 12)
    return f"H{h + 1:02d}.S{s + 1:02d}.N{n + 1:02d}"


@dataclass(frozen=True, slots=True)
class AddressMetadata:
    index: int
    hsn: str
    house: int
    sphere: int
    node: int
    axis_role: str
    registry_kind: str
    expected_registry_sha256: str = EXPECTED_REGISTRY_SHA256
    source_binding_verified: bool = False


def address_metadata(hsn: str) -> AddressMetadata:
    """Return address arithmetic and role metadata, not a source-byte grant.

    Definitions and permissions must still come from the existing verified
    registry and gateway. This helper never claims to have loaded those bytes.
    """
    index = address_to_index(hsn)
    h, s, n = int(hsn[1:3]), int(hsn[5:7]), int(hsn[9:11])
    domain = s <= 7
    return AddressMetadata(index, hsn, h, s, n,
                           "DOMAIN" if domain else "METHOD",
                           "DOMAIN_SPECIALIZATION" if domain else "EPISTEMIC_META")


def exact_leak(value, drive, tau, dt) -> float:
    """Solve dV/dt=(drive-V)/tau for one held-input interval.

    Time and tau use the same caller-declared unit. Inputs are finite and bounded;
    tau is positive. dt=0 is exact identity. ``expm1`` retains the small incoming
    coefficient, while the weighted form avoids cancellation at long intervals.
    The result is subject to ordinary binary64 roundoff, not bitwise ODE truth.
    """
    value = _number(value, "value")
    drive = _number(drive, "drive")
    tau = _number(tau, "tau", lower=MIN_TAU, upper=MAX_TAU)
    dt = _number(dt, "dt", lower=0, upper=MAX_TIME)
    if dt == 0 or value == drive:
        return value
    ratio = dt / tau
    outgoing = math.exp(-ratio)
    incoming = -math.expm1(-ratio)
    result = math.fsum((value * outgoing, drive * incoming))
    return _number(result, "leak result")


@dataclass(frozen=True, slots=True)
class SampledLIFStep:
    voltage: float
    spike: bool


def sampled_lif_step(value, drive, tau, dt, *, threshold=1.0, reset=0.0):
    """Sample the interval endpoint with >= threshold, then hard-reset now.

    At most one binary event is returned per positive interval. Overshoot is
    discarded by this explicitly discrete hard-reset model. dt=0 does not fire
    or reset, even when the initial value already reaches threshold. No
    refractory state, continuous crossing time or multiple-spike claim is made.
    """
    threshold = _number(threshold, "threshold")
    reset = _number(reset, "reset")
    if reset >= threshold:
        raise EventLatticeError("reset must be below threshold")
    endpoint = exact_leak(value, drive, tau, dt)
    if dt == 0:
        return SampledLIFStep(endpoint, False)
    fired = endpoint >= threshold
    return SampledLIFStep(reset if fired else endpoint, fired)


def _quantum(value):
    return _number(value, "quantum", lower=MIN_QUANTUM, upper=MAX_ABS_VALUE)


def _resolution(quantum, *values):
    tolerance = 8.0 * max(math.ulp(value) for value in values)
    if quantum < tolerance:
        raise EventLatticeError("quantum below declared floating-point resolution")
    return tolerance


@dataclass(frozen=True, slots=True)
class DeltaEvent:
    sample_index: int
    quanta: int

    def __post_init__(self):
        _integer(self.sample_index, "sample_index", 0, MAX_SAMPLES - 1)
        _integer(self.quanta, "quanta", -MAX_QUANTA_PER_EVENT, MAX_QUANTA_PER_EVENT)
        if self.quanta == 0:
            raise EventLatticeError("zero quanta are represented by absence of an event")


@dataclass(frozen=True, slots=True)
class DeltaEncoding:
    events: tuple[DeltaEvent, ...]
    sample_count: int
    quantum: float
    initial_reconstruction: float
    final_reconstruction: float
    max_abs_error: float
    max_float_tolerance: float
    total_abs_quanta: int


def encode_delta(samples, quantum, *, initial=0.0,
                 max_samples=MAX_SAMPLES, max_events=MAX_EVENTS,
                 max_quanta_per_event=MAX_QUANTA_PER_EVENT,
                 max_total_quanta=MAX_TOTAL_QUANTA) -> DeltaEncoding:
    """Encode residual relative to the accumulated decoder reconstruction.

    q=trunc((sample-reconstruction)/quantum), then reconstruction += q*quantum.
    Every nonzero q is one record with a signed integer magnitude, not a claim
    about separate physical spike times. The real-arithmetic error is <quantum;
    this implementation checks <=quantum plus its reported binary64 tolerance.
    Local sample indices start at zero. Pass final_reconstruction as ``initial``
    to continue a chunk; offsets belong to the caller's explicit stream record.
    """
    max_samples = _integer(max_samples, "max_samples", 0, MAX_SAMPLES)
    max_events = _integer(max_events, "max_events", 0, MAX_EVENTS)
    max_quanta_per_event = _integer(max_quanta_per_event, "max_quanta_per_event",
                                    1, MAX_QUANTA_PER_EVENT)
    max_total_quanta = _integer(max_total_quanta, "max_total_quanta", 0, MAX_TOTAL_QUANTA)
    values = _sequence(samples, "samples", max_samples)
    quantum = _quantum(quantum)
    initial = reconstruction = _number(initial, "initial")
    _resolution(quantum, initial)
    events = []
    maximum_error = maximum_tolerance = 0.0
    total = 0
    for index, raw in enumerate(values):
        value = _number(raw, "sample")
        tolerance = _resolution(quantum, value, reconstruction)
        difference = math.fsum((value, -reconstruction))
        ratio = difference / quantum
        if not math.isfinite(ratio):
            raise EventLatticeError("delta ratio overflow")
        quanta = math.trunc(ratio)
        if abs(quanta) > max_quanta_per_event:
            raise EventLatticeError("per-event quantum budget exceeded")
        if quanta:
            if len(events) >= max_events or total + abs(quanta) > max_total_quanta:
                raise EventLatticeError("event or total-quantum budget exceeded")
            reconstruction = _number(math.fsum((reconstruction, quantum * quanta)),
                                     "reconstruction")
            tolerance = max(tolerance, _resolution(quantum, value, reconstruction))
            events.append(DeltaEvent(index, quanta))
            total += abs(quanta)
        error = abs(math.fsum((value, -reconstruction)))
        if error > quantum + tolerance:
            raise EventLatticeError("delta reconstruction error bound exceeded")
        maximum_error = max(maximum_error, error)
        maximum_tolerance = max(maximum_tolerance, tolerance)
    return DeltaEncoding(tuple(events), len(values), quantum, initial, reconstruction,
                         maximum_error, maximum_tolerance, total)


def decode_delta(events, sample_count, quantum, *, initial=0.0) -> tuple[float, ...]:
    """Decode one bounded chunk; require sorted, unique local event indices."""
    events = _sequence(events, "events", MAX_EVENTS)
    sample_count = _integer(sample_count, "sample_count", 0, MAX_SAMPLES)
    quantum = _quantum(quantum)
    reconstruction = _number(initial, "initial")
    _resolution(quantum, reconstruction)
    previous, total = -1, 0
    for event in events:
        if type(event) is not DeltaEvent:
            raise EventLatticeError("events must contain DeltaEvent records")
        if not previous < event.sample_index < sample_count:
            raise EventLatticeError("event indices must be unique, ordered and in range")
        previous = event.sample_index
        total += abs(event.quanta)
        if total > MAX_TOTAL_QUANTA:
            raise EventLatticeError("total-quantum budget exceeded")
    result, cursor = [], 0
    for index in range(sample_count):
        if cursor < len(events) and events[cursor].sample_index == index:
            reconstruction = _number(math.fsum((reconstruction, quantum * events[cursor].quanta)),
                                     "reconstruction")
            _resolution(quantum, reconstruction)
            cursor += 1
        result.append(reconstruction)
    return tuple(result)


@dataclass(frozen=True, slots=True)
class HeldCell:
    value: float
    drive: float
    tau: float
    updated_at: float

    def __post_init__(self):
        _number(self.value, "cell.value")
        _number(self.drive, "cell.drive")
        _number(self.tau, "cell.tau", lower=MIN_TAU, upper=MAX_TAU)
        _number(self.updated_at, "cell.updated_at", lower=0, upper=MAX_TIME)


@dataclass(frozen=True, slots=True)
class LatticeState:
    """Fixed canonical slot order, immutable numeric state, one stream clock.

    This is an unspiked held-input state, not an owner/session authority. No
    registry bytes have been loaded and no source-use permission is granted.
    """
    cells: tuple[HeldCell, ...]
    time: float

    def __post_init__(self):
        _number(self.time, "state.time", lower=0, upper=MAX_TIME)
        if type(self.cells) is not tuple or len(self.cells) != NODE_COUNT:
            raise EventLatticeError("state must contain exactly 1728 canonical slots")
        if any(type(cell) is not HeldCell or cell.updated_at > self.time for cell in self.cells):
            raise EventLatticeError("invalid cell type or future cell timestamp")


def new_lattice_state(*, initial=0.0, drive=0.0, tau=1.0, time=0.0) -> LatticeState:
    cell = HeldCell(_number(initial, "initial"), _number(drive, "drive"),
                    _number(tau, "tau", lower=MIN_TAU, upper=MAX_TAU),
                    _number(time, "time", lower=0, upper=MAX_TIME))
    # Sharing immutable cells is safe; updates replace cells rather than mutate.
    return LatticeState((cell,) * NODE_COUNT, cell.updated_at)


def _state_and_time(state, timestamp):
    if type(state) is not LatticeState:
        raise EventLatticeError("LatticeState required")
    timestamp = _number(timestamp, "timestamp", lower=0, upper=MAX_TIME)
    if timestamp < state.time:
        raise EventLatticeError("timestamps must be nondecreasing")
    return timestamp


def update_held_inputs(state: LatticeState, changes, timestamp) -> LatticeState:
    """Advance touched cells with their old drive, then install new held drives.

    Each change is (canonical_slot_index, drive). A batch may change each slot
    once. Equal-time drive updates preserve its voltage. The returned state is
    independent of caller containers and the previous state remains unchanged.
    Untouched cells are advanced lazily when touched or materialized.
    """
    timestamp = _state_and_time(state, timestamp)
    changes = _sequence(changes, "changes", NODE_COUNT)
    validated, seen = [], set()
    for change in changes:
        if type(change) not in (list, tuple) or len(change) != 2:
            raise EventLatticeError("change must be an (index, drive) pair")
        index = _integer(change[0], "index", 0, NODE_COUNT - 1)
        if index in seen:
            raise EventLatticeError("duplicate slot in change batch")
        seen.add(index)
        validated.append((index, _number(change[1], "drive")))
    cells = list(state.cells)
    for index, drive in validated:
        old = state.cells[index]
        value = exact_leak(old.value, old.drive, old.tau, timestamp - old.updated_at)
        cells[index] = HeldCell(value, drive, old.tau, timestamp)
    return LatticeState(tuple(cells), timestamp)


def materialize_lattice(state: LatticeState, timestamp) -> tuple[float, ...]:
    """Read every slot at one time, including inactive decay, without mutation."""
    timestamp = _state_and_time(state, timestamp)
    return tuple(exact_leak(cell.value, cell.drive, cell.tau, timestamp - cell.updated_at)
                 for cell in state.cells)
