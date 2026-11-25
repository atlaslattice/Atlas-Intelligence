# Why the public source does not embed the private Atlas release

The full 144-case audit consumes the owner's exact Work Learning v0.2.0 source-only archive. To protect private source history, **that ZIP is not in this public Git package**.

A caller must provide it explicitly via `ATLAS144_WORKLEARNING_SOURCE_ZIP`; the runner validates SHA-256 `6825c1f83dc3502b0d153c3d4bd925be823a67a6a350b919f4be5c56a2828d9f`. Missing or mismatched source fails rather than counting complete source checks.

This package imports the existing `programs/atlas-neural-unified/` source for Python tests and existing `programs/atlas-neuro-oss/src/native_core.mjs` for JavaScript. The native LIF fix is a small direct patch to the latter module; no second kernel or gateway is created. The 144 JSON receipts are evidence from a local run, not proof about current host authorization.

Source rights for actual user corpus/weights and all private modes remain separate from access to the source-only archive.
