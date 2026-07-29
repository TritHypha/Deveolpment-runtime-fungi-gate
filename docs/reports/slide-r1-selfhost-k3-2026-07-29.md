# SLIDE R1 Self-Hosted K3 Prerequisite

- **Date:** 2026-07-29
- **Branch:** `codex/slide-v2-architecture`
- **Scope:** Galerina's `.fungi` lexer, parser, internal GIR emitter, and GIR
  runtime
- **Result:** the first fixture's K3 control shape now survives the
  self-hosted in-memory pipeline; canonical SLIDE R1 export still does not exist

## What was implemented

The self-hosted stages now preserve:

- `check` as an active keyword, with `deny` and `ambig` remaining contextual
  arm labels;
- the complete generic return type, so `Result<Int,String>` is no longer
  reduced to the ambiguous base name `Result`;
- one explicit `check_k3` GIR node with exactly three labelled `k3_arm`
  successors;
- distinct DENY (`-1`), INDETERMINATE (`0`), and ALLOW (`+1`) execution;
- exact Verdict type/value validation at the K3 use site;
- checked Int32 add, subtract, multiply, and divide with terminal range,
  overflow, and division-by-zero traps;
- exact entry and nested-call arity;
- terminal missing-callee behavior instead of executing an empty-flow
  sentinel and returning the plausible value `Int(0)`.

Malformed, missing, duplicate, or extra K3 successors terminate before an arm
executes. A non-Verdict subject and a forged fourth Verdict value also
terminate. DENY and INDETERMINATE do not evaluate protected ALLOW arithmetic
and must return/terminate from the current flow; an arm that falls through
traps as `ERR_K3_NON_TERMINAL`.

The arithmetic guards select their sign branch before evaluating the
corresponding bound. This matters on current Wasm lowering because Boolean
`and` is eager there: evaluating an inactive checked expression could itself
trap. Boundary and overflow probes now run through the self-hosted Wasm form.

## Zero-trust disposition

This closes four fail-open representations in the self-hosted runtime:

| Previous behavior | Current behavior |
|---|---|
| missing nested flow executed an empty sentinel and returned `Int(0)` | `ERR_MISSING_FLOW` terminal trap |
| missing parameters could resolve through legacy default values | `ERR_ARGUMENT_COUNT` terminal trap |
| surplus arguments were ignored | `ERR_ARGUMENT_COUNT` terminal trap |
| arithmetic used host-width operations or handleable division failure | checked Int32 terminal traps |
| a negative/unresolved K3 arm could structurally fall through | `ERR_K3_NON_TERMINAL` terminal trap |

Known missing entry flows continue to return the existing typed `Err("no such
flow")` subset refusal. That is an explicit non-success outcome; it is not
converted to a value or fallback flow.

## What this proves

For the bounded fixture shape, a `.fungi`-implemented lexical, parsing,
lowering, and reference-runtime chain can retain K3 structure and checked
arithmetic without converting Verdict to Boolean. The emitted in-memory
`FlowEntry` contains an executable body consumed by `runProgram`; the runtime
does not consult the original source AST during that execution.

## What this does not prove

This is a prerequisite, not canonical SLIDE R1:

- the self-hosted GIR records are not the proposed canonical CFG/SSA schema;
- there are no stable numeric type, instruction, edge, K3, or failure IDs;
- there is no deterministic CBOR encoding, bounded importer, or independent
  validator;
- the fixture still uses the current `Result<Int,String>` bridge rather than
  the closed R1 `FixtureFailure` encoding;
- no canonical bytes are bound to the existing preflight decision;
- no fresh-process execution from serialized GIR was performed;
- no `.slide` bundle, native code, memory-profile proof, Tri-Fuse v2 proof,
  admission decision, or benchmark was produced.

The next compiler step remains a dedicated `.fungi` R1 adapter that derives
the preflight facts from checked structures and either materializes the
complete bounded R1 body or returns an explicit unsupported refusal before
any WAT identity/default/walker fallback.

## Verification

```text
node --test \
  tests/slide-r1-selfhost-k3.test.mjs \
  tests/self-hosted-runtime.test.mjs \
  tests/self-hosted-i3-functional-corpus.test.mjs \
  tests/rd0528-fungi-ts-edge-differential.test.mjs
  PASS: 167 tests

node --test tests/wat-p9-runtime-exec-parity.test.mjs
  PASS: 13 tests

npm.cmd test
  PASS: typecheck, build, 5,257 tests
```

The tests cover the three K3 successors, malformed K3 structure, forged
Verdict values, checked arithmetic boundaries and faults, exact arity,
missing nested flow, production/self-hosted fault parity, and self-hosted
Wasm arithmetic guard execution.
