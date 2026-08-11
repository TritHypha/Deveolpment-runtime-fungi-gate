# Late security candidate validation — 2026-08-11

## Status

`SUPPRESSED_AT_CURRENT_HEAD` at `b6a6693d5725f0a7b4d7733fc55f54d3636418ba`.

This report validates fifteen candidates raised against earlier revisions. It is a current-source disposition, not release authority. Each candidate was checked against the nearest live control and a focused regression lane. The primary codebase-memory transport remained unavailable, so discovery used the fresh Myco index followed by bounded exact source reads. Codebase-memory freshness remains `UNKNOWN`.

## Validation rule

A candidate is suppressed only when the current source has a reachable narrowing control and a focused test demonstrates the hostile or boundary case. Comments, success flags, generated reports, and earlier green runs are not authority.

## Dispositions

| ID | Candidate | Current disposition | Current control and evidence |
|---|---|---|---|
| SEC-LATE-001 | Standalone compiler HTTP routes lack authentication | `SCOPED / NOT REPORTABLE` | The standalone server refuses every non-loopback bind. External exposure belongs to the authenticated app-kernel/API boundary. Focused tests prove non-loopback refusal and authenticated principal binding. This does not authorize production exposure of the standalone server. |
| SEC-LATE-002 | Signed plugin manifest binds only engine and artifact hash | `SUPPRESSED` | The signature covers the canonical exact metadata snapshot and verification compares every field before load. Certified runtimes also forbid the unsigned-load escape hatch. |
| SEC-LATE-003 | Vault path traversal/namespace escape | `SUPPRESSED` | Mount and path segments are canonically validated and encoded before a request; traversal is refused before transport. |
| SEC-LATE-004 | Concurrent rotation race for one credential | `SUPPRESSED` | One affine in-progress lease exists per credential; overlap is refused before the client is invoked, while different credentials remain concurrent. |
| SEC-LATE-005 | Mutable Vault handle or buffer escape | `SUPPRESSED` | Callers receive only a redacted frozen status or a transient owned copy; scoped callbacks must be synchronous and the copy is wiped at exit. |
| SEC-LATE-006 | SealArena exposes a mutable live buffer | `SUPPRESSED` | `use` supplies a transient copy, forbids return/async escape channels, and wipes the copy on every exit. |
| SEC-LATE-007 | Missing idempotency header bypasses replay protection | `SUPPRESSED` | An enabled policy requires a non-empty bounded key before dispatch and refuses storage failures closed. |
| SEC-LATE-008 | Handler timeout releases its concurrency slot early | `SUPPRESSED` | A timed-out handler retains the slot until the underlying handler promise settles. |
| SEC-LATE-009 | Rate state is shared globally per route | `SUPPRESSED` | Authenticated windows are keyed by route plus required principal identity; the window map is bounded and expired entries are reclaimed. Public routes deliberately share the public identity. |
| SEC-LATE-010 | Required audit failure is swallowed | `SUPPRESSED` | Required runtime evidence reserves capacity before handler effects and exact commit refusal returns `audit_unavailable`. Only routes that do not require runtime evidence use the documented best-effort sink. |
| SEC-LATE-011 | Backtracking/heuristic regex enables synchronous ReDoS | `SUPPRESSED` | Runtime patterns use the certified non-backtracking TriRegex engine, a bounded subject, and a certificate-derived work budget. Uncertified capture/replace forms refuse closed. |
| SEC-LATE-012 | Redirect replays an active request body cross-origin | `SUPPRESSED` | Any redirect with a body is refused; bodyless redirects are re-guarded and re-pinned at every hop with a hard hop limit. |
| SEC-LATE-013 | Plugin input is serialized before validation | `SUPPRESSED` | Descriptor-safe iterative admission creates a detached deeply frozen snapshot before hashing or execution; accessors, proxies, cycles, non-canonical numbers, depth, node count, and size are bounded/refused. |
| SEC-LATE-014 | Compiler rate-limit identity map grows without bound | `SUPPRESSED` | The map has a hard capacity, expired-entry reclamation, validated limits, and fail-closed admission at capacity. |
| SEC-LATE-015 | `String.matchesPattern` ignores TriRegex work certification | `SUPPRESSED` | Work is calculated from Unicode code-point count, per-character bound, and boundary bound; admission refuses when the certificate exceeds runtime policy. |

## Fresh focused evidence

| Lane | Result |
|---|---:|
| compiler ingress, regex, redirects | 17/17 |
| Vault namespace, ownership, rotation, lifetime | 24/24 |
| Spore/SealArena secret lifetime | 21/21 |
| Tower plugin manifest and input admission | 37/37 |
| app-kernel rate, idempotency, timeout, audit | 21/21 |
| authenticated API border | 14/14 |
| **Total** | **134/134** |

## Boundary ruling

No candidate above is an open security blocker for the next bounded conversion slice. This ruling does not widen authority: the standalone compiler server remains loopback-only, optional audit remains non-authorizing, unsigned plugin loading remains forbidden in certified runtime profiles, and no production/release claim follows from focused tests.
