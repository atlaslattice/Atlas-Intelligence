# Atlas R16 — source-compatible UTF-8 profile codec and scoped migration

**Status:** tested-local source utility; draft GitHub review only. **Never** hosted rights, active model, CANON, production publisher, automatic Work, or resident consciousness.

## A genuine replay-derived correction

At exact original Ariadne v0.7 registry SHA `07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6`, the source-derived 144-Sphere profile file has its own original pinned raw SHA `a5a9a0097f252397df7a2d3ac59d58724966d33322008d3b8341636564bd0c22`.

R15 incorrectly calculated `profile_sha256` from sorted compact JSON with ASCII escapes. That matches 126/144 source claims; the 18 other records contain a literal U+2019 typographic apostrophe. Recalculating **only the profile digest** from compact lexicographically sorted JSON with `ensure_ascii=False` and UTF-8 matches **144/144** original declared source hashes. The source files and original reported hashes are **unchanged**.

Named serialization domains:

- `atlas.profile.sorted-compact-ascii/v1` — historical R15 local calculation, retained and reviewable.
- `atlas.profile.sorted-compact-utf8/v1` — newly confirmed *original declared profile* digest. This is not an ontology identity rewrite or a new consent source.

**Do not globally replace the JSON hash codec.** R15's requirement/falsifier hashes, source/receipt prefixes, numerical raw F32/F64 wire hashes and release/authority receipts are separate versioned domains. This implementation does not patch them.

## Scoped downstream effects

Exactly **18 of the previous 144 source-bound Sphere scope receipts change**; exactly 216 of the 1,728 subordinate Node source-scope references therefore require a **fresh review** under the corrected profile digest. The 126 unaffected scopes retain byte-for-byte matching legacy and current identities. Existing receipts are preserved verbatim as history; no claim of retroactive specialist, source-rights or host acceptance.

The executable R16 private offline Work circuit performs 1,728 source-node inspections, 12 predicates and 12 negative controls per node, 144 source-derived Sphere contractions, 12 House summaries, and one META145. These are **local computations**, not 1,728 genuine scheduled MacroTurns, independently calibrated science, trained neural weights or resident peers.

## Source-standalone public-safe code

`profile_hash_codec.mjs` accepts a caller-supplied exact profile object and computes both versioned digests after defensively snapshotting plain data without executing object getters or `toJSON`. It never fetches a corpus or acts as a trusted authority. It rejects wrong roles, missing House/Sphere identities, changed source-profile hashes, malformed options, proxies and unknown source pins. A match means only `LOCAL_UTF8_DIGEST_MATCH`, *never* accepted research evidence.

Local public-safe replay:

```sh
node --test tests/test_profile_hash_codec_public.test.mjs
node --jitless --test tests/test_profile_hash_codec_public.test.mjs
```

For the 144 exact private records, invoke the separate owner-private R16 pipeline and JS cross-runtime verifier; do **not** publish registry bodies, source names, acquisition records or private Work/Play/Imagine/Dream/Quiet content.

## Remaining host gates

Review the corrected 18 profile-scope effects, current independently pinned required-set and adverse objections, trustworthy principal and READ/INFERENCE_USE/RETURN, source family/time separation, synchronized final publisher egress, CI runner logs, and measured semantic quality. No merge or hosted deployment by this codec patch.
