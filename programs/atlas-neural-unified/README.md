# ATLAS ONE · Unified Neural Fabric (source-only v0.1)

**One BGE semantic embedding space → 1,728 original Ariadne node activations → optional true/shuffled Geometree routing → 144 Sphere and 12 House learned gates → one E145 read-only summary → the existing WorkLearning permission/return gateway.**

This is an **original additive source implementation**. It **does not** create a new foundation model, run 1,728 resident minds, replace the installed WorkLearning 0.2.0 release, install a hosted service, or turn every typed Atlas component into a neuron. It keeps user data and CANON outside the learned weight update. The `0.2.0` predecessor is pinned and preserved.

## The actual neural computation

Let `N ∈ R[1728×384]` be the **existing frozen pretrained node embeddings** and `q ∈ R[384]` an embedding from the **existing frozen BGE encoder**:

```
raw = N @ q
routed = (1 - alpha) * raw + alpha * mean(raw[neighbor_ports])
logits[i] = routed[i] + house_gate[house(i)] + sphere_gate[sphere(i)]
```

The 12×12×12 topology is source-addressed and exact. `alpha=0, use_gates=False` is byte-identical to original `N @ q` for the tested arrays. Internal `SHUFFLED_MATCHED` uses an equal-degree, equal-operation budget without rewriting any external HSN identity. Gate parameters are 12+144=156 local scalars; they are initialized to zero. They can **actually** be optimized on explicitly synthetic fixtures; **no user corpus or production BGE weights are trained**. E145 is a read-only summary outside the 1,728 latent nodes.

The topology itself is a hypothesis. No held-out human evidence shows an advantage over flat/shuffled controls yet. Geometric mixing was measured locally slower on self-query canaries. That loss is retained.

## Every component belongs to one architecture, not one permissions pool

`data/COMPONENT_PORTS.json` maps **33 typed components** and **144 proposed OSS extension ports** to one `fabricId`. The components include the existing MICA and Omega/WorkLearning neural code, Ariadne, Geometree, Alexandria, Atlas ONE, AtlasGPT, SwarmChat Workboard, Graph Fabric, Meta145/E145, glyphs, neuromorphic numerics, research/evaluation, and existing OpenAI Responses/MCP interfaces. Non-neural components attach as typed services; CANON and source permissions remain hard external gates. Eight protected/voluntary source planes are anonymous isolation slots in the public manifest, not harvested Work data. No new permission issuer, watcher, cron job or second broker is created.

The **144 OSS features remain proposed**, not 144 installed native algorithms. Source status, license, and exact missing-code checks must precede adoption. The original Ariadne ontology's *knowledge* IDs remain distinct from `NEURO.Mxx.Fxx` *engineering* IDs.

## Local execution

Python >=3.11, NumPy installed; Node >=20 for the optional gateway port. No internet, provider calls or model downloads are needed.

```bash
cd programs/atlas-neural-unified
python -m unittest discover -s test -v
node --test test/one-brain-port.test.mjs
python examples/demo_synthetic.py
```

Optional **real existing gateway** regression (requires the exact authorized WorkLearning source tree, not a hosted account):

```bash
ATLAS_WORKLEARNING_SOURCE_ROOT=/path/to/atlas-work-learning \
  node --test test/worklearning-actual-gateway.test.mjs
```

To stage a **reversible** additive WorkLearning 0.2.0 source import, pass the exact extracted source tree and a **new empty target**. It pins `src/index.mjs` and `src/gateway.mjs`, appends one export, and adds the numerical module without modifying the original source or installed skill:

```bash
python integration/stage_worklearning.py \
  --source /path/to/original/atlas-work-learning \
  --addon . --target /path/to/NEW-staged-copy
```

For a **private exact-source replay**, supply the already-authorized original Ariadne source bytes and original node-vector `.npz` bytes. The public package intentionally contains neither. The private receipt reports sanitized aggregate tests only; it is not a new human quality evaluation.

## Host boundary and next decisive experiment

The existing WorkLearning `createWorkLearningGateway` and MICA's `createWorkshopEntry` remain the only authorized serving seams. `src/one-brain-port.mjs` accepts actual WorkLearning WeakMap-branded results when supplied the **real** gateway functions, rechecks them, and prepares **node IDs only**; it never publishes results or returns source bodies. A local mock test is explicitly not a host IAM test. The live SwarmChat Site still needs a trusted serving/egress binding before this computation becomes hosted.

Next: pin the same source and corpus snapshot; compare baseline BGE (`alpha=0`), true Geometree, matched shuffled Geometree and flat control on a **new** human-reviewed, family/time-disjoint cross-House panel. Keep identical candidate pools, trainable parameters, active compute budget and rights decisions. Report Recall@k, nDCG/MRR, answer entailment, abstentions, root independence, dissent, revocation escapes, p50/p95 cold/warm costs, and all losses. Only human/root-authorized review may promote a learned routing change.
