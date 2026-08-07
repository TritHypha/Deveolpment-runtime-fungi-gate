# `.gate` — authoring examples, guide, and rules

`.gate` is Galerina's **circuit language**: you declare a *circuit* of registered
parts joined by named-port wires, and the topology is checked fail-closed. This
folder is the practical on-ramp — **five verified circuits**, a **how-to guide**,
the **invariants**, and a **like-for-like map** from `.fungi`.

**Version: `@gate 3.0.0`.** v3 is a named-port language. The earlier v1.2 glyph
dialect (`@version 1.2.0`, `GATE … END`, `✓ × ? ! + -`) is **retired** — the five
examples here were migrated, and each one keeps a short comment legend recording
what its v1.2 shape became.

> `.gate` is *source*. It compiles, alongside `.fungi`, toward one **GIR → WASM**.
> It is not an IR and not the runtime language. **Sign the IR, never the source.**

## Contents

| File | What it gives you |
|---|---|
| **[AI-AUTHORING-GUIDE.md](AI-AUTHORING-GUIDE.md)** | how to author v3: anatomy, endpoints, argument types, canonical patterns, and the hallucination guard |
| **[FUNGI-TO-GATE-COOKBOOK.md](FUNGI-TO-GATE-COOKBOOK.md)** | recipe-first: `if` on a Boolean, then on a number, then sequences, `check`, `match`, and the partition method for a whole flow |
| **[RULES.md](RULES.md)** | the fail-closed invariants, each bound to the diagnostic code that enforces it |
| **[CODES.md](CODES.md)** | the complete diagnostic catalogue — every `GATE-*` code with its name and message, generated from source and drift-gated |
| **[FUNGI-TO-GATE-LIKE-FOR-LIKE.md](FUNGI-TO-GATE-LIKE-FOR-LIKE.md)** | `if` / `check` / `match`, arrays, numbers, hallmarks and contracts — what each becomes in a circuit, and what has no equivalent by design |
| **[GATEREGEX.md](GATEREGEX.md)** | patterns drawn as circuits — numeric, email and quoted-string worked examples; why a pattern that cannot be drawn is refused, and why that is the safety property rather than a limit |

## The examples

All five parse and verify clean through the v3 frontend, and a regression suite
holds them there (see *Verifying*, below).

| File | Pattern |
|---|---|
| [`01-authorized-read.gate`](01-authorized-read.gate) | authorised read + PII redaction — the K3 authority gate and a privacy cut |
| [`02-write-transaction.gate`](02-write-transaction.gate) | governed write (refund) |
| [`03-phi-redaction.gate`](03-phi-redaction.gate) | healthcare PHI — protected fields cut before egress |
| [`04-tenant-scoped-search.gate`](04-tenant-scoped-search.gate) | tenant isolation, a bounded loop, re-authorisation, and a fault terminal — the IDOR-kill shape |
| [`05-token-verify.gate`](05-token-verify.gate) | secret handling — fault on a bad signature, re-auth on the expired arm, token cut before egress |

## Verifying

The standing gate is the regression suite, run from the compiler package:

```bash
node --test packages-galerina/galerina-core-compiler/tests/gate-v3-shipped-examples.test.mjs
```

It asserts the exact `@gate 3.0.0` header, a clean parse and a clean structural
verification for every file here; resolves **all five against real per-circuit
contracts** (in `tests/fixtures/gate-registries/`, kept there because one
`gate.registry.json` beside the examples would be discovered for all five while
each circuit needs its own contract set); and carries self-checks proving both
tiers are load-bearing — a mutated circuit is caught structurally, and a
mutated contract is caught at resolution, so the suite cannot silently pass
over nothing.

The root CLI routes `.gate` directly — `node galerina.mjs check <file>.gate`
reaches the same v3 frontend as the compiler package's own CLI, through one
shared dispatcher. A circuit that resolves also passes the semantic tier:
canonical-graph acyclicity, cut domination and taint-cut separation, the
decision-shape backstop, construction entry, worst-case budget composition,
and terminal-reason vocabularies (`GATE-SEM-001..008` — see
[RULES.md](RULES.md), tier 5).

All five examples resolve — 04/05 through per-use registered variants
(GD-028, owner-ratified): one implementation used at several payload types
registers one contract per use, families declare `variantOf`, and "one
implementation" is digest-checked (`GATE-REGISTRY-016`). The suite pins that
the un-contracted set stays EMPTY.

## What a passing circuit does *not* do

A structurally perfect circuit **never authorizes**. Topology proves reach, not
authority; admission is the signed capability. Every `.gate` file also raises
`FUNGI-GATELANG-002`, which withholds production signing until the sound
compile-time backstop is wired — deliberately fail-closed.

## The one-line summary

Draw the circuit, don't write the code. Every authority part routes all three K3
arms; every sensitive read passes a declared cut before egress; every refusal
names its terminal; and a clean circuit still grants nothing.
