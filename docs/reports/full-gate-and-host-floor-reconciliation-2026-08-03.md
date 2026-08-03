# Full gate and host-floor reconciliation - 2026-08-03

## Outcome

Galerina's exhaustive phase-close is green at **87/87**. The app-kernel now
has one explicit, audited bootstrap host seam instead of host access spread
across four implementation files. This is a bounded migration floor, not a
permanent TypeScript exemption and not production SLIDE authority.

## Repaired root causes

1. **Diagnostic identity parsing:** the code-index generator could extend a
   one-line diagnostic definition into the following definition. A bounded
   metadata reader and regression fixture now keep each definition isolated.
2. **Structured Await refusal coverage:** a repeated terminal event for an
   already-terminal task is now tested while sibling work remains active. The
   reducer refuses with `ERR_RUNTIME_AWAIT_TASK_STATE`.
3. **App-kernel host authority:** `host-floor.ts` is the sole declared seam for
   seven exact host/WASM surfaces. It releases frozen, per-consumer slices;
   callers do not receive whole host-module namespaces.
4. **Governance comments:** all 143 governed example forms carry the required
   signed comment, `@cause`, and `@effect` evidence.
5. **Retirement accounting:** the exact host seam is counted in the bounded
   bootstrap floor. The 482 package-source TypeScript paths partition into 29
   twins, 97 compiler-core paths, 17 bounded-floor paths, and 339 migration
   paths. The wider tracked package total is 497.

## Verification evidence

| Evidence | Result |
|---|---:|
| Exhaustive phase-close | 87/87 pass |
| All packages | 98/98 pass |
| App-kernel | 207/207 pass |
| Core runtime | 51/51 pass |
| Tooling | 346 tests pass |
| Benchmark integrity | 60 tests pass |
| GSCM cause/effect coverage | 143/143 |
| Security aggregate | 31 files, zero findings/errors |
| Retirement self-test | finder, twin, floor and partition checks pass |
| Owned Node process cleanup | returned to the one pre-existing MCP process |

The exhaustive run used the same source and test bytes now recorded here.
Subsequent changes were limited to retirement classification, generated
evidence, and documentation; focused checks re-verify those surfaces.

## Honest remaining boundaries

- The direct performance hot-path heuristic still reports 36 review items.
  They are report-only: 31 repeated AST child scans, three synchronous
  ancestry/content reads, and two per-record sorts. No blanket exception was
  added. Each needs measurement before refactoring or disposition.
- Package retirement is not complete: 497 tracked package TypeScript paths,
  111 unexecuted production Fungi sources, 38 unowned host boundaries, 95
  package-local `node_modules` trees, and one nested native package remain.
- External conversion Round 7 produced no candidate or terminal per-row
  evidence and scored 22/100. Its correct preflight is retained outside the
  repository; none of its proposed source is authoritative.
- The app-kernel host seam must retire into independently admitted SLIDE/VOK
  host authority. Its auditability is not permission to expand it.

## Zero-trust invariants retained

- Undeclared host primitives inside the seam refuse.
- Host access outside the seam refuses.
- Returned host capabilities are exact frozen slices.
- No conversion percentage, shadow-bake label, or fallback can authorize
  package deletion.
- Generated graphs are sealed before the flat package root lock is generated.
- No repository change was pushed.
