# SLIDE V2-D exit-gate adjudication

- Date: 2026-07-29
- Branch: `codex/slide-v2-architecture`
- Decision: semantic-memory V2-D exit gate satisfied
- Replacement authority: none

## Direct evidence

| Gate | Evidence | Result |
|---|---|---|
| Canonical reconstruction | `8b137394`; importer-owned graph, region, object, and guard records | 11/11 |
| Whole-vector refusal | Exact 791-byte fixture plus every single-byte mutation | 791/791 refused |
| Named semantic negatives | `a9903387`; direct memory/guard/ceiling/forbidden-surface cases | 69/69 |
| Semantic binding | `ed910667`; domain-separated digest only after independent admission | 2/2 |
| Detached execution | `59c8e582`; guarded instruction-driven runtime | 6/6 |
| Runtime accounting | 16 steps, 56 copied bytes, depth 3, 12 semantic bytes, one guard | exact |
| Failure ordering | Out-of-range index emits registered failure 4 before observation | verified |
| Independent implementation | SLIDE `4557a1b`; zero-dependency validator/runtime and eleven-case differential | 13/13 |
| Frozen predecessors | R1/V2-A/V2-B/V2-C regression suites | 246/246 |

The complete Galerina V2-D suite passes 111/111.

The exact V2-D profile contains one region, one object, and one guard, so pure
record reordering is not representable. Surplus and duplicate mutations test
the relevant cardinality/admission boundary. Invalid fourth-Verdict refusal
remains frozen R1/V2-A evidence because V2-D function 3 has an `Int32` input,
not a Verdict input.

## Fail-closed result

Malformed, missing, surplus, unsupported, out-of-budget, or semantically
misbound input releases no partial graph, memory plan, semantic digest,
runtime accounting, native certificate, or authority. A failed V2-D path
cannot select AST, WAT/Wasm, interpreter, host, broker, Tower Citizen, or
Tri-Pipe as a fallback.

## What this does not prove

This gate does not certify native memory safety, optimizer preservation,
machine-code equivalence, final-artifact binding, hostile FFI or handle
behavior, runtime isolation, container admission, driver admission, or
production authority. It removes no existing Galerina component.

## Next boundary

V2-E must bind the Galerina producer receipt and source map to the admitted
V2-D body and semantic digest without putting frontend-specific evidence into
frontend-neutral GIR identity. Only after V2-E and later native
post-optimization/final-artifact gates may an AST or WAT/Wasm cut be proposed.
