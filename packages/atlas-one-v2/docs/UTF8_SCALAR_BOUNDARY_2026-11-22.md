# Atlas ONE v2 — strict UTF-8 and Unicode scalar boundary (2026-11-22)

**SOURCE ONLY · CANDIDATE · NOT HOSTED · NOT CANON · NO AUTHORITY.** This review covers the new standalone `packages/atlas-one-v2` parser. No original Ariadne registry body was read or copied; no live SwarmChat Work messages, private sources, model calls, identity grants, environment changes or production deployment were involved.

## Reproduced source issue

The original `src/index.mjs` Git blob `77e55e4bf209a153f7e58308f9b0d54e7126b654` used `Buffer.toString('utf8')`, which silently replaced malformed UTF-8 before validating JSON. The string tokenizer also accepted JSON-escaped unpaired UTF-16 surrogate code units, including in keys and nested values. Six bounded synthetic negatives were accepted in a direct source-derived reproduction (single invalid byte, truncated sequence, unpaired high/low surrogate, malformed object key and nested value). The issue is source-byte/Unicode-scalar ambiguity in public candidate parsing, **not proof of private-data exposure, a host exploit, or a hash collision**.

## Additive correction and local evidence

- [Implementation commit](https://github.com/atlaslattice/Atlas-Intelligence/commit/cdc44bfde8c0ea5a7b6d6cf6be1e5b303f94bd5c) uses fatal UTF-8 decoding of bytes after enforcing the original byte-size bound. The strict decoder preserves prior BOM refusal and rejects malformed byte sequences. The existing JSON string scanner also rejects lone surrogate scalars while admitting valid paired escape sequences and ordinary Unicode. Corrected source Git blob `7afd7d8a6eefaa66ee7c7f463891ae84bff3ceab`.
- [Regression tests commit](https://github.com/atlaslattice/Atlas-Intelligence/commit/99ed467fc99508ea84cc8b1a0318fcf95d28e022) adds 15 `node:test` cases in `test/strict-unicode.test.mjs`, Git blob `8743978e27d1a9d47b0179991821914d2a411c31`. Tests cover malformed/overlong UTF-8, truncated byte sequences, unpaired strings and keys, valid paired emojis, literal Unicode, explicit U+FFFD, prior BOM/NFC duplicate behavior, byte bounds and numeric JSON.
- **Executed offline:** the corrected parser function was independently reconstructed from the exact GitHub original source and tested using a copy of the **exact Git blob-matched new regression file** against that extracted parser. All **15/15 passed in normal Node 22** and **15/15 passed with `--jitless`**. Node syntax was valid. The original extracted function accepted six malformed synthetic payloads; corrected function holds them. Tests are focused **parser extraction**, **not** execution of the complete checked-out 29-file PR tree or all historical 119 original-source tests.

## Scope and release holds

PR #8 remains **OPEN/DRAFT/UNMERGED**. Prior full-source test claim 119/119 is historical owner-local evidence; the Ariadne original registry SHA `07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6` is unchanged, and historical branches/editions remain preserved. No real host permissions, resident identity, rights-at-READ/RETURN, license review of dependencies, external service/callback, OpenAI provider calls, CANON authority or current served Site readback were independently tested.

Current PR branch base is main `0119dcf46747cb29eb86f0f46ba72f18916f7497`. Exact current-HEAD GitHub Actions runner conclusion and independent reviews must be separately checked; no earlier red or empty step report is a passing CI test. Recommended next steps: verify runner admission/annotations without paying or changing policy, run the full exact-head source-free 96 expected tests and separately the private-source 23 gated tests in an owner-authorized runtime, independent review, then explicitly authorize any merge or deployment. Avoid silently merging related PR #5 or changing host APIs.

Fourteen voluntary non-Work beats were not performed. No resident was awakened, no nested automation created and no private mode source was ingested.
