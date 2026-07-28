# `.fungi` Control-Flow Standard Audit

**Date:** 2026-07-29
**Scope:** `examples/**/*.fungi`
**Status:** Example-corpus alternative dispatch remediated

## Rule verified

- One simple Boolean choice may use `if`/`else`.
- One decision with two or more alternative conditions or outcomes uses total
  `match`.
- Every `match` has a `_ =>` terminal/default arm.
- Kleene K3 `Verdict` dispatch uses exhaustive `check`.
- A Boolean refusal guard uses `trap` or an explicit typed error return.
- Multiple `if` statements are retained only when they belong to separate
  functions or are genuinely independent checks whose bodies may all execute.

## Method

1. Myco searched documentation and examples for `if`, `match`, and `check`.
2. Every example file with two or more line-leading `if` statements was
   reviewed at flow scope.
3. Ordered alternative dispatch was converted to `match`, preserving first-arm
   priority.
4. Wildcard paths were made explicit and fail closed.
5. Every validator result used by a decision was checked for its rejection
   sentinel before policy evaluation.
6. Each changed auth-service example was run through
   `galerina check --strict-types`.

## Result

Nineteen changed auth-service examples pass strict checking with:

```text
19/19 files passed
0 compiler errors
0 governance warnings
```

The remaining example files containing more than one textual `if` use one
simple choice in separate flows:

- `stdlibCoreService.fungi`
- `auditWriterService.fungi`
- `routeDispatcherService.fungi`

No reviewed flow retains repeated sequential `if` as an alternative dispatch.

## Zero-trust corrections found during the audit

The control-flow review exposed defects beyond style:

1. `governanceVerifierService.fungi` allowed raw qualifier and Boolean-string
   inputs to reach governance decisions. Both now pass through total allowlist
   validators, and invalid results terminate with `trap`.
2. `capabilityHostService.fungi` could admit an invalid context into effect
   policy; audit/crypto branches could then return allow. Effect and context
   validation now have explicit terminal traps before policy evaluation.
3. `routeDispatcherService.fungi` returned raw method/path values and reflected
   them in an error. Responses now use admitted constants and the denial is
   generic.
4. `proofGraphService.fungi` returned the raw qualifier rather than the admitted
   qualifier. It now returns the validated value.
5. Unknown profiles, effects, qualifiers, types, algorithms, statuses, and
   overlong sanitized values could continue as an empty validator sentinel and
   inherit a default policy. These paths now terminate before the decision.
6. `bytecodeRouterService.fungi`, `economicsRouterService.fungi`, and
   `routingPolicyService.fungi` silently decoded malformed Boolean strings as
   `false`. Each wire flag is now admitted, its sentinel is trapped, and only
   then is it decoded.
7. `manifestVerificationService.fungi` did not include schema validity in its
   trust-level decision, so an invalid version could still be accepted.
   Version validity is now a required trust input and invalid versions and
   out-of-range masks terminate.
8. `governanceService.fungi` reported `governed: true` even when its effect tag
   or qualifier was unknown. Both inputs now use exact total allowlists and
   explicit rejection exits.
9. `capabilityResolverService.fungi` could resolve an unknown effect through
   default availability/tier branches. It now terminates on validator
   rejection.
10. Re-declaring names during redaction produced duplicate bindings across the
   example set. Audit-only bindings now use explicit `audit*` names.
11. Flows declaring `Response` returned unwrapped records. They now use
   `Response.ok(...)`.

## Remaining enforcement work

The rule is documented and the example corpus is remediated, but a source-level
lint gate is still required. The future gate should inspect sibling statements
inside each flow/block, not count `if` tokens per file. It must avoid rewriting
independent checks and must fail closed on an unclassified repeated alternative
dispatch.
