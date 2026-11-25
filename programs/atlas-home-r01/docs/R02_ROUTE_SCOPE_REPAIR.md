# Atlas Home R02 — address and Work-context separation

Source-only draft successor to the immutable R01; parent PR #75 and original PR #74 peer files are unchanged. This repair is an original implementation inspired by the *observations* in SwarmChat Season 02 #88–91. It is not a literal copy of private peer HTML.

## Reproduced concern

A user visits valid original `H07.S09.N12`, deliberately opens a Work-room preview, then enters malformed `H00.S01.N01`. The public map must preserve the last valid location for navigation. But the Work selection must not survive, and it must not silently re-open when the same valid address is entered again. If the inherited asynchronous composer was already running when the route became invalid or the user left, its later result must not surface.

## R02 implementation

- `web/home-controller.js`: explicit canonical HSN entry and an accessible `aria-live` status, strict original 1..12 per axis, Work-room `aria-pressed` state, disabled and neutral state on invalid route, deliberate Work re-selection after recovery. The last valid HSN remains visible. The page never loads Work bodies and never grants provider permissions.
- `src/home.mjs`: `workEpoch`, `workInflight`, `workEligible` and `active` instance fields; an invalid route clears the eligible Work context and holds any in-flight result. `leave()` closes the session, clears its ephemeral ticket and invalidates in-flight results. Re-entering a valid HSN is necessary before issuing new Work after an invalid route. Public HSN identity survives a rejected route; it is not a recovered source grant.
- Work selection, pending query results and method-subject admission are distinct state; an original method address is not itself proof of reviewed subject context. No actual host authority is implemented by the local UI.

## Executed local acceptance

- 114/114 distinct Node tests pass in normal and `--jitless` modes; zero skips.
- Playwright inline-source Chromium: 30/30 desktop/mobile assertions, and 4/4 additional standalone-inline assertions. Zero HTTP requests and zero page errors.
- Browser test records contain invalid-route clearing, blocked Work re-entry, preservation of public coordinate, explicit valid recovery, fresh Work choice, and leave-state reset. The Node tests also check async late completion after invalid route or departure, one inherited composer invocation and blocking fresh Work after invalid navigation.
- Direct `file://` and localhost browser navigation remained administratively blocked; the checks did not bypass this policy.

## Unproven host requirements

Host authenticated accounts/tenants, real source return rights, distributed CAS, final socket-byte egress, actual browser sessions/back-forward cache, cross-worker races and whole-current-model quality were NOT tested by this source-only repair. It is an independently reviewable additive draft; no automatic merge or deployment.
