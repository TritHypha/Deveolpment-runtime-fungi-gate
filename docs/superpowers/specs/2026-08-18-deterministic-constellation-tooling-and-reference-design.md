# Deterministic constellation tooling and reference documentation design

## Status

Approved design direction, awaiting written-spec review before implementation.
No `.fungi` source, conversion batch, production consumer, or authority state is
changed by this design.

## Purpose

This programme reduces agent errors and repeated context use before controlled
TypeScript-to-Fungi conversion resumes. It replaces repeated manual inspection
with small deterministic tools that prove their own detectors, preserve exact
repository and graph identities, and emit one bounded result per run.

It also adds the missing Scribe-like language reference surface: exported
`.fungi` declarations are parsed by the canonical compiler and rendered as a
reproducible public reference. Internal symbols remain available through the
code graph without becoming public documentation.

The design extends existing owners rather than introducing a new plugin or a
large cross-repository skill.

## Chosen architecture

Implement five tightly bounded changes:

1. a shared graph-project identity resolver;
2. a constellation preflight command;
3. a conversion gate that writes one durable run card;
4. an AST-backed `@galerina/docs` reference generator; and
5. registration fixes for the graph-routing CLI and Lyth detached-scalar KATs.

The tools share stable status and exit contracts but do not merge repository
authority. Galerina owns semantic source and checked snapshots, SLIDE owns
physical compilation, VOK owns exact-subject admission, and Lyth supplies
non-authorizing proof-work evidence.

## Common tool contract

Every new command must:

- expose a pure core separated from filesystem, process, graph, and Git adapters;
- run paired must-pass and must-fail known-answer tests before grading real work;
- refuse when its own self-test fails;
- emit deterministic JSON with a schema version and tool version;
- use repository-relative locators and cryptographic digests, never absolute
  machine paths;
- record repository HEAD, graph build point, completeness, freshness, and the
  exact command owner without copying source bodies into an index;
- distinguish `ALLOW`, `HOLD`, `REFUSED`, and `ERROR` without collapsing an
  unavailable or stale owner into success or absence;
- use exit `0` for `ALLOW`, exit `1` for a valid `HOLD` or policy refusal, and
  exit `2` for malformed input, unavailable prerequisites, detector failure, or
  inability to persist the required report;
- write output atomically and refuse if the durable report cannot be written;
- perform no commit, push, source deletion, consumer switch, or production
  registration.

An aggregate gate must include a controlled failing-child fixture proving that
one child denial changes the aggregate verdict. Merely checking that each child
self-test is green is insufficient.

## 1. Graph-project identity resolver

### Problem

The TypeScript-to-Fungi sandbox derives a graph project name from the physical
worktree path. The current clean worktree is indexed under the governed logical
name `Galerina`, so the derived path-shaped project name produces
`IDENTITY_COMMAND_FAILED` even while the correct graph is fresh.

### Design

Add one shared resolver under `scripts/lib/graph-project-identity/`. It consumes
a logical project key and a repository root, queries the registered graph
owner, and accepts an identity only when:

- the logical alias maps to a declared project name;
- the returned graph root resolves to the same repository/worktree owner;
- the graph build point equals the exact Git HEAD required by the caller; and
- a bounded known symbol resolves from that graph.

Initial aliases are:

| Logical key | Graph owner | Component scope |
|---|---|---|
| `galerina` | `Galerina` | repository root |
| `slide` | `SLIDE` | repository root |
| `vok` | `SLIDE` | verified-object-kernel boundary only |
| `lyth` | `lyth-weaver` | repository root |

Aliases are configuration, not guesses derived from case-folded paths. A root,
HEAD, case, or component mismatch returns `REFUSED` or `ERROR`; the resolver
never silently selects a similarly named project.

The resolver is used by the sandbox, the graph-routing probe, and the
constellation preflight. It returns a small identity envelope rather than graph
contents.

## 2. Constellation preflight

Add `scripts/constellation-preflight.mjs` with this initial surface:

```text
node scripts/constellation-preflight.mjs --profile detached-scalar --json
node scripts/constellation-preflight.mjs --self-test
```

The detached-scalar profile checks:

- exact Galerina, SLIDE, and Lyth repository HEADs and clean/declared custody;
- exact codebase-memory build points and bounded symbol probes;
- the VOK component boundary inside the SLIDE owner;
- installed private Fungi skill identity and release-audit status without
  exposing skill bodies;
- availability of the Galerina converter, duplicate/shadow detector, SLIDE/VOK
  focused checks, and the registered Lyth KAT command;
- the adopted Galerina snapshot to canonical GIR to SLIDE package to VOK v3
  receipt route; and
- output-root writability without publishing any candidate.

Each repository remains a separate owner envelope. The aggregate takes the
least-authoritative required status; one green repository cannot upgrade a
stale or unavailable sibling.

The preflight is read-only apart from its explicitly selected output report.
It never indexes every repository automatically and never creates cross-owner
graph edges.

## 3. Conversion gate and run card

Add `scripts/fungi-conversion-gate.mjs`. It is the one command used before a
bounded pilot or a report-bearing conversion commit:

```text
node scripts/fungi-conversion-gate.mjs --manifest <repo-relative.json> --out <repo-relative.json>
node scripts/fungi-conversion-gate.mjs --self-test
```

The manifest contains between one and ten source requests. Each request names
one repository-relative TypeScript file, one graph-qualified symbol, the exact
source digest, and the requested sandbox output. Absolute, escaping, generated,
ambiguous, dirty, or duplicated identities are refused.

### Gate roster

The roster is one exported data structure and initially contains:

1. constellation preflight;
2. source and graph identity;
3. semantic classifier completeness;
4. candidate parser/type/effect/governance checks;
5. exact and normalized whole-corpus duplicate/shadow checks;
6. real-source output-path policy, including explicit refusal of test-overlay-
   only publication;
7. retained TypeScript byte identity;
8. checked snapshot and canonical GIR binding;
9. SLIDE physical package publication;
10. independent re-admission and VOK v3 receipt verification;
11. Lyth proof-work KAT as non-authorizing evidence; and
12. commit-policy checks: at least 40 new real `.fungi` files when a conversion
    report is present, 50 expected, at most one report, report-only streak below
    two, and complete tracked plus untracked corpus comparison.

### Run card

The gate writes one compact JSON card instead of requiring an agent to reread
large reports. It contains:

- schema/tool version and run identifier;
- one owner envelope per repository;
- exact source, candidate, snapshot, GIR, physical package, profile, and VOK
  receipt digests where applicable;
- one terminal outcome per request: `CONVERTED`, `BLOCKED`, or
  `MANUAL_REVIEW`;
- stable blocker/reason codes and repo-relative evidence locators;
- proof that the original `.ts` bytes remain present and unchanged;
- duplicate/shadow and commit-policy counts;
- explicit statements that no consumer switch, retirement, commit, or push
  occurred; and
- aggregate `ALLOW`, `HOLD`, `REFUSED`, or `ERROR`.

The card contains no source bodies, private skill text, secret, signing key,
absolute path, or unlabelled inferred relationship. Full logs remain with their
owning tools and are referenced by digest and locator.

## 4. Galerina reference generator

### Existing owner

`@galerina/docs` already converts governed App Kernel route policy into
fail-closed OpenAPI. Extend that package rather than creating another
documentation owner.

### Version 1 scope

Version 1 documents exported `.fungi` declarations only. Internal and private
symbols stay searchable in codebase-memory but are not emitted into the public
reference. TypeScript public bindings and cross-repository constellation pages
are later, separately reviewed extensions.

The canonical Galerina parser and checked AST are the only declaration source.
The existing regex-only project-graph extractor is navigation evidence and must
not drive the reference. The extractor must preserve all supported exported
declaration kinds, including flows, types, records, enums, guards, statics, and
bitfields.

### Intermediate model

Add a versioned `GalerinaReferenceManifest` containing:

- package and module identity;
- qualified declaration name and kind;
- exact public signature, parameters, return type, effects, qualifiers, and
  value-state information available from the checked AST;
- contracts, guards, Hallmarks, and capability metadata when present in the
  canonical model;
- repo-relative source locator, byte range, source digest, and build point;
- declaration visibility and owning package; and
- generator version and deterministic manifest digest.

Descriptions are omitted unless they come from a parser-recognised governed
documentation attachment. Version 1 does not invent a new comment syntax.
An optional later sidecar may add prose by qualified symbol and exact source
digest, but it may never override signatures, types, effects, governance, or
visibility.

### Outputs

Add a `galerina docs reference` command producing:

```text
build/reference/reference.json
build/reference/README.md
build/reference/packages/<package>.md
build/reference/site/index.html
```

The JSON manifest is the machine output. Markdown and static HTML are derived
views. Generation is stable-sorted and byte-deterministic for a pinned source
tree. Generated files are never hand-edited.

The reference may include labelled graph-derived caller or consumer links only
as optional navigation evidence with the graph build point and `INFERRED` or
`ASSERTED` provenance. A stale or unavailable graph cannot block exact AST
reference generation, but it omits those optional links and records why.

### Validation

Before publication the generator verifies:

- every emitted declaration exists in the checked AST at the pinned source
  digest;
- every exported supported declaration appears exactly once;
- no private/non-exported declaration appears;
- all type and declaration links resolve with exact case;
- no case-only, qualified-name, or output-path collision exists;
- no absolute path, private marker, secret, or source body enters the manifest;
- repeated generation at the same build point is byte-identical; and
- a controlled mutation of an exported signature turns the freshness/parity
  gate red.

It never executes application flows, host callbacks, response calls, or user
code to manufacture examples.

## 5. Registration and routing fixes

### Graph-routing CLI

Repair the `codex-querying-galerina-graphs` probe entry-point detection on
Windows by comparing normalised file URLs/paths rather than raw
`process.argv[1]`. Preserve the current exported API and gold fixtures. Add an
exact Windows-path invocation fixture that proves the documented CLI prints its
envelope and exits correctly.

This is an integration-only skill update; it does not broaden graph authority.

### Lyth KAT registration

Register the three detached-scalar KATs under one package command, for example:

```text
npm run verify:detached-scalar
```

The command runs the adapter, schema, and domain-capability KATs in fixed order,
fails on the first non-zero child, and emits a compact summary. The constellation
preflight and conversion gate invoke this registered command rather than three
remembered shell lines.

## Context and token discipline

The operating docs adopt progressive disclosure without creating another
large skill:

- load the graph-routing contract and the relevant Fungi skill once;
- consume the preflight and run card before opening individual logs;
- open exact source only for the selected one-to-ten requests;
- do not load old receipt directories, unrelated conversion batches, generated
  indexes, or whole repository reports as examples;
- reopen evidence when it changed, is ambiguous, or is needed for final
  verification—"read once" is an optimisation, not an authority rule; and
- use deterministic gates for repeated checks rather than visual rereading.

Shared tools are registered by locator in the dev-tool index. They are not
copied into SLIDE, Lyth, VOK, or skill repositories, and duplicate/shadow audits
must treat a copied tool as a defect.

## Tests

The implementation must include:

- alias resolution for Galerina, SLIDE, VOK, and Lyth plus wrong-case,
  wrong-root, stale-HEAD, unavailable-owner, and ambiguous-owner controls;
- Windows and POSIX command-entry fixtures;
- preflight ALLOW, required-owner HOLD, stale, unavailable, and malformed
  envelopes;
- aggregate conversion-gate ALLOW, injected child DENY, child execution error,
  report-write failure, and tampered-card controls;
- one-to-ten request bounds, retained `.ts`, output-root, symlink, dirty-source,
  duplicate, shadow, test-overlay, 39/40/50 file, report-count, and report-streak
  controls;
- exact chain tampering at source, candidate, snapshot, GIR, physical package,
  profile, and VOK receipt;
- Lyth command success and each child-failure propagation;
- exported `.fungi` fixtures for every supported declaration kind;
- private/internal exclusion, duplicate qualified names, case-only collisions,
  broken type links, unsupported AST nodes, stale output, and deterministic
  repeat generation;
- a mutation proving a changed public signature invalidates prior reference
  output; and
- proof that no tool can commit, push, delete TypeScript, switch consumers, or
  grant production authority.

All gate and generator tests must be included in the repository's registered
verification cadence and dev-tool index.

## Delivery sequence

1. Implement and test the shared graph-project identity resolver.
2. Repair and test the Windows graph-routing CLI.
3. Implement the constellation preflight and its result schema.
4. Register and verify the Lyth detached-scalar package command.
5. Implement the conversion-gate roster and atomic run card.
6. Close the remaining duplicate/shadow and real-source path controls.
7. Add the checked-AST reference manifest to `@galerina/docs`.
8. Add deterministic Markdown and static HTML renderers plus validation.
9. Register all tools in the dev-tool index and phase-close cadence.
10. Run focused verification and independent review.
11. Run the approved outside-worktree ten-source pilot only after every prior
    step is green.

Bulk `.fungi` conversion, production consumer switching, TypeScript retirement,
and publication/push remain outside this design.
