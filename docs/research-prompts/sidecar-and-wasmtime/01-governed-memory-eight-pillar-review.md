# Independent review prompt 1 — Galerina governed memory

You are an independent programming-language, compiler, operating-system, and
memory-security reviewer. Perform a read-only review. Do not edit files,
generate artifacts, commit, push, print secrets, or inspect private key
material.

## Question

Can Galerina credibly offer Python-like developer ergonomics—where the
language/runtime handles memory—while providing a broader, fail-closed
governed-memory contract than conventional memory-safe languages?

Review the proposed eight independent pillars:

1. spatial safety;
2. temporal safety;
3. initialization and type/representation safety;
4. concurrency safety;
5. authority safety;
6. confidential custody;
7. deterministic resource safety;
8. provenance and index safety.

The proposal deliberately does not say “Rust is unsafe”. It says memory
validity is necessary but insufficient for Galerina's zero-trust model.

## Local evidence to inspect

- `docs/superpowers/specs/2026-07-30-governed-memory-and-wasmtime-oracle-design.md`
- `packages-galerina/galerina-core-compiler/src/escape-analysis.ts`
- `packages-galerina/galerina-core-compiler/src/source-escape-checker.ts`
- `packages-galerina/galerina-core-compiler/src/hardening-residency.ts`
- `packages-galerina/galerina-core-sentinel-memory/`
- `packages-galerina/galerina-tower-citizen/`
- `../SLIDE/docs/GALERINA-INTEGRATION-MIGRATION-PLAN.md`
- `../ZTF-Knowledge-Bases/research/rd/RD-0384-faster-mushroom-trusted-environment-threat-model-delta.md`

Use Git history to distinguish current behavior from plans. Do not scan
`node_modules`, Cargo `target`, generated fixtures, or private/off-repository
memory corpora.

## Required research

Use primary sources for comparisons: official Rust reference/Nomicon, language
specifications, peer-reviewed memory-safety research, NIST zero-trust/PQC
standards, and authoritative OS/hardware documentation. State the access date.

Compare at least Rust safe/unsafe/FFI, Java or managed-runtime safety, C#/Zig
developer trust boundaries, capability systems, temporal safety, race safety,
secret custody, and deterministic resource behavior. Do not equate garbage
collection with complete memory safety.

## Required output

1. Verdict: sound, sound with changes, or unsound.
2. Facts verified in current code, separately from planned claims.
3. A pillar-by-pillar definition, attack prevented, required mechanism,
   evidence artifact, negative tests, and remaining bypass.
4. Missing pillars or incorrectly combined pillars.
5. Minimum source-language restrictions needed to keep memory developer-managed
   without a general `unsafe` escape.
6. Portable contract versus optional hardware strengthening.
7. Honest publishable comparison language; reject inflated marketing.
8. A staged implementation order that avoids redesign.
9. Falsification criteria that would disprove the architecture.
10. Owner-only decisions, if any; engineering choices must not be escalated.

Separate `FACT`, `INFERENCE`, `PROPOSAL`, and `UNKNOWN`. Unknown-critical state
must fail closed.
