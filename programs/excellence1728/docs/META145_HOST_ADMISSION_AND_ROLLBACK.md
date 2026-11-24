# META145 v0.4 — existing-host admission and rollback contract

Status: **TESTED_LOCAL / DRAFT_PR / HOST_DEPLOYMENT_HOLD**.

The 1,728-step Atlas Excellence compiler, source registry and evidence ledger already exist. This additive module does NOT create a new issuer, broker, room, identity, model, tool registration, or server. It never writes to Work, CANON, D1 or the user's private creative spaces.

## Mount point (integration requirement, not a live deployment)

The current `atlaslattice/Atlas-Intelligence/server.ts` has no publisher-verified identity issuer or Work-room ACL service injected. Thus do **not** turn this route on there yet. An authorized publisher with a genuine issuer and ACL can mount the feature before the host's catch-all route:

```js
import {loadHostedExcellenceProgram} from './programs/excellence1728/integrations/excellence-host.mjs';
import {mountMeta145HostBound} from './programs/excellence1728/integrations/meta145-host-admission.mjs';

await mountMeta145HostBound(existingExpressApp, {
  enabled: publisherControlledExplicitOptIn,      // false by default
  isEnabled: () => publisherCurrentRuntimeFlag, // checked at request and egress
  loadProgram: loadHostedExcellenceProgram,      // exact existing SHA-pinned program
  manifestBytes: ownerPrivateReceiptRawBytes,    // loaded from existing permitted Work source
  expectedManifestSha256: expectedPinFromTrustedOperatorConfig,
  authenticate: hostCurrentIssuer.verifyRequest, // cannot be a header/self-declared boolean
  authorize: hostWorkAcl.checkCurrent,          // must check same tenant, purpose and room
});
```

These functions **must be real existing-host, verified callbacks**. No example callback is a production issuer. Never use a placeholder that returns `allowed:true` for actual traffic. The manifest pin must be independently chosen by trusted deployment configuration, never passed through HTTP query/header input. Expected source registry SHA: `07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6`; expected Excellence plan SHA: `47084b895a6317db16275a92c3878a340d31af15fb9ab479db7101953c18e49c`. The original private registry and full strategy source must stay owner-private.

### Admission contract

For each GET request the publisher must independently verify:

- Issuer-signed, unexpired user session at **READ**, not just a user-agent-supplied string.
- `subject`, `tenant`, `issuer`, and `session` are all present. `verified:true` must only originate in a verified issuer adapter.
- Current Work authorization for `ATLAS_META145_WORK_SOURCE_READ`, `ATLAS_META145_READ_ONLY`, and for a review, the **exact requested `roomId`**. The Work ACL must enforce actual room membership and source scope. HSN and engineering coordinates are different semantic namespaces.
- The returned permission revision must be bound to the current host ACL state, not invented by the caller.
- Re-verify the issuer and authorization at **RETURN**; same subject, tenant, issuer, session, permission revision, scope and room, or return identical `HOLD` with `data:null`.
- `GET` only; no private body reads; zero storage writes. Denied and nonexistent authorized room bodies are indistinguishable to a caller. `no-store` headers prevent shared caching.

**No host attestation can be inferred from this module.** Even a successful callback result is marked `HOST_CALLBACK_REPORTED_SOURCE_ONLY_NOT_ATTESTED`. Actual issuer proof, Work ACL and D1 restore epoch must be validated at deployment. Production should also verify origin/CSRF policy if an authenticated browser cookie is used and ensure HTTPS/TLS enforcement. Do not trust forwarded client headers as identity.

### Rollback, canary and stops

1. **Off by default:** `mountMeta145HostBound(...,{enabled:false})` does not register a route.
2. **Operator rollback:** the host-owned `isEnabled()` callback is checked before admitting a request and again immediately before JSON egress. Set false to deny subsequent requests (including an in-flight request at RETURN), without modifying shared source state.
3. **Canary:** use a dedicated disposable test tenant and room, never a resident Brain/Palace/Play room. Verify 200 for correctly authorized status/review, 403 for anonymous/revoked/tenant drift/room mismatch/revision drift, 400 malformed request, 405 POST, no cross-account leaks.
4. Verify actual Site/commit served, not merely a staging artifact or GitHub SHA. Preserve source version, rollback receipt and Work room `room+seq` if a real Work handoff occurs. No post is implemented here.
5. A D1 Time Travel/restore event must invalidate cached issuer/ACL revision checks using independent issuer epoch. This adapter does **not** implement D1 restoration or cross-host fresh-state proofs.
6. Without independent CI runner logs and owner-scoped authorizer, leave draft and deployment HOLD.

### Current CI blocker

GitHub issue https://github.com/atlaslattice/Atlas-Intelligence/issues/15 documents the isolated public smoke run 45240063934, job 137921988371, `steps=[]`, `runner_id=0`. The connected GitHub API reports zero steps and returns 404 BlobNotFound for job logs. Root cause UNKNOWN. Check the account's GitHub Actions settings and job annotations; if no owner-remediable issue is documented, use GitHub Support with exact run/job IDs. Never disable protections or assume billing is the cause.

CI workflow `.github/workflows/meta145-source-ci.yml` is an additive **candidate**. Once GitHub actually admits a runner and executes steps, record that run and re-evaluate the exact current PR HEAD. No workflow proposal grants a hosted pass.

### Verification to repeat before merging

```sh
node --test programs/excellence1728/integrations/meta145-native-source-port.test.mjs programs/excellence1728/integrations/test/meta145-native-excellence.integration.test.mjs programs/excellence1728/integrations/test/meta145-host-admission.test.mjs
npm run test:excellence
```

The known executable local evidence is a signed **fixture** issuer using HMAC for tests. That synthetic fixture is NOT the production issuer. Full real-host canary awaits actual authorized host callbacks, current Work database access, CI runner admission, and publisher control. Never claim a source-only `allowed:true` call proves signed-in principal authentication.
