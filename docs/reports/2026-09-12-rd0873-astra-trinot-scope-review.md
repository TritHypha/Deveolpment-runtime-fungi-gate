# RD-0873 triNot scope: independent GPT-6 Astra review

Date: 2026-09-12
Provider/model: GPT-6 Astra (independent review worker)
Review status: **REVISE-SCOPE, NON-AUTHORING**

This is an independent architectural and semantic review of the proposed
singleton scope. It does not authorize `.fungi` authoring, consumer switching,
TypeScript retirement, corpus assurance, or SLIDE/VOK admission. The review was
read-only: no files changed, no queue was read, and no full-corpus run was
performed.

## Exact build point

The review inspected Galerina `main` HEAD
`30c5c8be8d94db3b47bade0f7024371f8b9588c6`, tree
`d222695b9505206530ce9da3a70196ce774c79e5`. The selected source remains
`packages-ts/galerina-core-logic/src/index.ts`, symbol `triNot` (lines 83-85),
13,409 bytes, SHA-256
`2bdc2a8f8743da317fa769aebb056317622839da018c0a4897765bce8402e91a`. The
existing focused harness is 2,990 bytes, SHA-256
`d4a24950cf3c2a8d62e53b2e6b573e3873dc2fe82055cdfaf5c6919d14e02166`; the
product target `packages/fungi/products/galerina/rd0873-core-logic/tri-not.fungi`
is absent.

## Findings

**CONFIRMED — bounded semantic candidate.** The TypeScript mapping is
`-1 -> 1`, `0 -> 0`, `1 -> -1`; `-0` is returned as positive zero. The private
`assertTri` validation and `invertTri` helper are semantic obligations of the
retained TypeScript shadow. The existing package-owned `src/self-hosted/tri-ops.fungi`
already contains a `triNot` flow, so any product twin must record reuse and
provenance explicitly.

**BLOCKING — test scope bleed.** The original plan said to narrow and retarget
the existing four-operation differential suite. That would remove or alter
`triAnd`, `triOr`, and `triNor` coverage. Keep that suite unchanged and add a
separately named product-target test that exercises only `triNot` and asserts
product ownership.

**BLOCKING — host boundary unspecified.** `Tri` is an unbranded numeric union;
it does not by itself prove runtime validation or Fungi `Verdict` identity.
The actual adapter must perform exact primitive membership checks for
`{-1, 0, 1}`, canonicalize zero, and reject invalid values before coercive WASM
ingress. Exact comparisons against the current source and existing Fungi asset
show that raw unwrapped WASM changes behavior: `NaN`, infinities, `null`,
`undefined`, objects, `1.5`, strings and booleans do not preserve the
TypeScript `TypeError` contract; raw surplus `2` traps instead. These are
boundary observations, not defects in the absent target.

**PARTIAL — compiler/profile identity.** The source, existing test, launcher and
compiler-manifest hashes match the scope record. They do not yet bind the
executed compiler distribution, checker/emitter dependencies or WASM assembler.
The scalar profile digest has no canonical owner/path in the manifest. The
profile is plausible for a validated K3 scalar, but physical or brand
enforcement remains unknown.

**BLOCKING — stale build binding.** The original manifest named HEAD
`5180110132f...` and tree `0d14f8f...`; review evidence must bind to the current
head/tree and distinguish any later target/test commit.

**BLOCKING — input accounting ambiguity.** The primary source fits the
16,384-byte step cap at 13,409 bytes, but source plus the existing test is
16,399 bytes. The manifest must say whether the cap covers the primary source
only or the entire admitted payload and must fail closed if the runner counts
the larger payload.

## Minimum evidence before authoring or acceptance

1. Use the revised additive-test scope and preserve the existing four-operation
   suite.
2. Name the validating adapter and its exact `Tri`/Fungi scalar boundary;
   validate before WASM ingress and test refusal without coercion.
3. Record the profile owner/path and the executed compiler/checker/emitter/
   assembler closure.
4. Record unambiguous input accounting and hold on cap overflow.
5. Run strict compiler/governance checks, interpreter/WASM differential tests
   over `-1`, `0`, `1`, positive-zero and reachable invalid values, plus a
   controlled wrong-result test proving the harness can fail.
6. Bind source, target, test and toolchain hashes to one unchanged head and
   obtain a fresh independent review of that same snapshot.

## Decision

Keep `triNot` as the next singleton product-runtime candidate, but revise the
scope record as above. No `.fungi` source or focused test was authored during
this review. Missing, stale, contradictory, or over-cap evidence remains
`HOLD`.

## Review provenance

The reviewer was dispatched as a separate GPT-6 Astra worker through the Codex
collaboration layer. The request envelope was advisory and non-authorizing; the
orchestrator did not expose a byte-preserving prompt/response file for a
durable digest, so this receipt records the model and exact audited build point
but does not claim a cryptographic digest for the worker exchange.
