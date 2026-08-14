# TypeScript-to-Fungi sandbox design

## Status

Approved design direction, awaiting written-spec review before implementation.
The sandbox is non-authorizing and keeps TypeScript as the differential oracle.

## Purpose

The sandbox reduces repetitive conversion work without pretending that every
TypeScript construct has an exact Fungi representation. It accepts one pinned
TypeScript symbol at a time, determines whether the complete observed runtime
contract is supported, and either generates a candidate plus evidence or
records why generation is refused.

The tool never deletes, rewrites, supersedes, or retires the source TypeScript.
It never grants production authority and never commits or pushes.

## Chosen approach

Use a compiler-API classifier and allow-listed lowerer backed by the existing
Galerina parser, checker, GIR emitter, physical SLIDE publisher, independent
re-admission and VOK verifier.

This is preferred over an overlay-only generator because overlays demonstrate
bounded post-border decisions rather than semantic translation. It is also
preferred over unconstrained model-generated source because unsupported
JavaScript semantics must produce a refusal, not a plausible-looking program.

## Command surface

The initial command is a sandbox-only dev tool:

```text
ts-to-fungi-sandbox inspect --file <repo-relative.ts> --symbol <qualified-name> --out <sandbox-dir>
ts-to-fungi-sandbox batch --manifest <repo-relative.json> --out <sandbox-dir>
ts-to-fungi-sandbox verify --receipt <repo-relative.json>
```

Inputs must resolve inside the repository, identify a single graph-discovered
symbol, and include the exact Git build point and source SHA-256. Output paths
must resolve inside a dedicated ignored or test-fixture sandbox. The tool
refuses absolute, escaping, ambiguous, missing, generated, or dirty source
identities.

## Outcome switch

Every requested symbol has exactly one terminal result:

- `CONVERTED`: a candidate was generated and all configured evidence gates
  passed.
- `BLOCKED`: the source uses a known unsupported semantic. The result lists
  stable blocker identifiers, exact source locations, observed runtime
  obligations and the required conversion exit.
- `MANUAL_REVIEW`: the tool cannot prove that its classifier saw the complete
  behavior or cannot establish source identity. No candidate is emitted.

Batch processing continues after `BLOCKED` and `MANUAL_REVIEW` results.
Results are deterministic, append-only JSONL records plus a summary. A batch
exit is non-zero when any request is not `CONVERTED`, unless the caller
explicitly selects audit-only mode. Audit-only mode still grants no authority.

## Initial supported subset

Version 1 may lower only symbols whose entire observed contract fits all of
these rules:

- one function or constant with a unique graph and source identity;
- primitive `boolean`, bounded integer, and admitted String values;
- closed literal unions represented by an explicit tag mapping;
- local immutable bindings, total arithmetic admitted by an exact numeric
  profile, comparisons, Boolean operations and structured `if`/`return`;
- calls only to separately converted, receipt-bound supported helpers;
- no ambient state, retained alias, identity-sensitive value, callback,
  exception, promise, generator, closure state, dynamic import or host API;
- no JavaScript coercion, prototype/inheritance observation, getters, proxies,
  sparse arrays, mutable collections, live typed-array views, `null`,
  `undefined`, `NaN`, infinities, negative zero or binary64 behavior unless
  an explicit admitted border/profile preserves it;
- statically bounded control flow accepted by the Fungi checker and selected
  physical profile.

Declarations may produce a binding/schema proposal, but declaration erasure is
reported as `BLOCKED` for executable conversion and earns no retirement
credit.

## Components

### Source identity resolver

Uses the codebase graph first, then reads the exact source bytes. It binds the
repository-relative path, qualified symbol, byte range, Git build point and
SHA-256. Graph freshness must be independently exact; otherwise the result is
`MANUAL_REVIEW`.

### Semantic classifier

Walks the TypeScript compiler AST and produces a closed feature inventory.
Every AST node and resolved call must be either allow-listed or mapped to a
stable blocker. Unknown syntax, unresolved calls, erased public borders and
analysis truncation fail closed.

### Fungi lowerer

Consumes only an admitted classifier record. It creates `@version 1` source
using documented Galerina syntax, stable names and an explicit source-binding
header. It cannot accept raw source text or classifier Booleans from callers.

### Evidence builder

Builds source differential vectors, parser/type/effect/governance checks, GIR,
duplicate and alpha-renamed shadow checks, physical SLIDE publication,
independent re-admission, VOK receipt verification and mutation-negative
vectors. A candidate becomes `CONVERTED` only when every mandatory gate is
green.

### Journal and batch controller

Writes one immutable outcome record per symbol. It records blockers without
stopping convertible siblings, prevents duplicate scope credit, and refuses
overwriting a prior candidate or outcome unless an explicit new source build
point creates a new versioned record.

## Evidence record

Each record contains:

- schema version and tool version;
- source build point, relative path, SHA-256, qualified symbol and byte range;
- classifier feature inventory and completeness result;
- terminal outcome and stable blocker identifiers;
- candidate path and SHA-256 only for `CONVERTED`;
- differential vector manifest and results;
- parser, type/effect, governance, GIR, duplicate/shadow, SLIDE, re-admission
  and VOK results;
- explicit statements that TypeScript remains the oracle and no consumer
  switch or retirement occurred.

No private skill content, local absolute path, secret or signing key may enter
the journal.

## Failure and safety behavior

Malformed input, stale graph identity, unsupported syntax, incomplete call
resolution, source mutation during analysis, output collision, compiler
failure, physical admission failure or receipt mismatch produces
`MANUAL_REVIEW` or `BLOCKED` and no candidate. Partial output is written to
a temporary sandbox location and published atomically only after all evidence
passes.

The tool does not invoke Git commit or push. Existing repository custody
remains binding: a report-bearing commit requires at least 40 new Fungi files,
expects 50, permits one report, keeps the report-only streak below two, and
requires exact and normalized whole-corpus duplication checks.

## Testing

Tests must cover:

- supported constants and total scalar functions;
- every allow-listed AST and type construct;
- each known blocker category and unknown-node fallback;
- ambiguous, stale, dirty, moved and mutated source identities;
- retained TypeScript bytes after successful conversion;
- mixed batches where convertible items complete and blocked items are logged;
- duplicate and normalized-shadow collisions;
- malicious paths, symlinks, output overwrites and journal tampering;
- differential boundary vectors for integers, Strings, tags and control flow;
- changed Fungi source, physical artifact and receipt refusal;
- deterministic repeat output from the same exact build point;
- proof that no Git commit, push, source deletion, production registration or
  retirement action is reachable from the tool.

## Delivery sequence

1. Implement the identity resolver, outcome schema and blocker journal.
2. Implement the classifier with refusal-only fixtures.
3. Add the minimal scalar lowerer.
4. Connect existing compiler, duplicate/shadow and physical evidence gates.
5. Add batch continuation and atomic sandbox publication.
6. Run an audit-only pilot over known converted and blocked symbols.
7. Consider broader language support only through separately reviewed,
   evidence-backed feature additions.

Production consumer switching and TypeScript retirement are outside this
design and require separate owner-approved plans and receipts.
