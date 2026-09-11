# Selective Fungi conversion scope

Governing principle: **non-fanatical translation**. Choose the language for its
product value and maintainability, not to eliminate an extension. Retaining JS/TS
tooling does not by itself weaken zero-trust. Its inputs, dependencies, actions
and produced artifacts remain subject to the same applicable build checks and
independent verification. A green tool exit or the tool's implementation language
does not confer trust on its output.

Owner direction: 2026-09-11. Most product runtime logic should become Fungi;
development tools and build orchestration should remain JS/TS unless converting
them has a specific benefit. This is an approved scope direction, not a claim
that individual files have already been classified or translated.

This supersedes an interpretation of bulk conversion as removing every JS/TS
file. It is consistent with [RD-0528 section 5b](../security/rd0528-ts-to-fungi-self-hosting-standard.md#5b--scope--dev-tools-may-stay-tsmjs).
Manual implementation is appropriate when there is no direct Fungi construct;
the existing observable behavior and caller contract still determine correctness.

## Target and retained roles

These are planning dispositions, separate from the existing queue's evidence
states. They do not add enum values to that queue or manufacture passing checks.

| Role | Default disposition | Required distinction |
| --- | --- | --- |
| Product runtime: business rules, validation, state transitions and compute | Convert to Fungi, prioritizing reusable cores | Include direct imports, dynamic workers, helpers, plugins and fallback paths used by the shipped product. |
| Development and build orchestration: test runners, benchmark drivers, audits, index/report generators, packaging and CI helpers | Retain JS/TS | Keep their own testing and supply-chain controls; build-time code can affect shipped artifacts without being product runtime. |
| Compiler and user-facing CLI | Evaluate per product; compiler self-hosting remains an existing goal | The compiler is a product in Galerina. Code absent from a generated application may still execute in the distributed compiler. A build wrapper is different from the parsing/checking/emission engine it invokes. |
| Bootstrap and differential shadows | Retain while they are needed for building or comparison | Track these separately from intentionally retained tools; their eventual retirement depends on the replacement path. |
| Mixed tool/runtime file | Split responsibilities or record symbol-level decisions | Retained tooling cannot exempt an executable sibling used at runtime. Do not replace whole files on the basis of one converted symbol. |
| Platform adapters and native boundaries, including Rust/VOK | Retain the appropriate implementation where justified | Record the exact boundary and consumer; wrapping a JS implementation does not count its logic as translated. No forced Rust-to-Fungi rewrite follows from this policy. |
| Declarations, generated artifacts and third-party dependencies | Maintain their owning source/generator or dependency | Preserve API declarations; classify executable generated JS by its consumer role. Do not translate generated copies or vendor code independently. |
| Role not established | Investigate the named boundary | Keep the item visible and proceed with independent ready work; uncertainty is neither retained-tooling proof nor completed conversion. |

Conversion of an otherwise retained tool needs a concrete reason: runtime reuse,
a required self-hosting milestone, a measured operational benefit, or a simpler
maintainable implementation. File extension, a target percentage, and proximity
to other Fungi files are insufficient reasons.

## Classify once, then process continuously

1. Use the existing queue and package graph as an inventory. For each package
   chapter, identify the actual deployment profiles: generated application,
   compiler/CLI, optional service and development-only use. Read distribution
   manifests, entrypoints, imports and dynamic/loaded assets; verify relevant
   graph findings against their owners. Package names and devDependencies alone
   are not classification evidence.
2. Record path, symbol scope if mixed, product/profile, execution role,
   distribution/consumer evidence, retain-or-convert decision, reason, owner,
   source/dependency identity and reclassification trigger. A new runtime import,
   dynamic asset, export, packaging rule or supported profile reopens that item.
3. Keep ready translation, local checking, repair/design, accepted work and
   intentionally retained tooling as separate work lists. Process independent
   ready entries while a difficult entry is repaired. A refused entry and its
   dependants remain visibly incomplete; they are not silently dropped.
4. Use focused checks for changed symbols and affected callers. Run the broader
   package check when its chapter is ready to close. Retaining tools or adding
   one twin does not itself require repeating the full Fungi corpus assurance.
5. Report conversion progress against the declared product-runtime scope, with
   retained tooling, host boundaries and unresolved items shown separately.
   Keep both the total source inventory and the scoped denominator visible;
   every scope revision needs an explicit reason. No new percentage is claimed
   until the role inventory has been reconciled.

Completion of a chapter requires each in-scope runtime item to satisfy the
declared translation stage, with unresolved items explicit. Candidate creation,
verified behavior and production cutover remain distinct milestones. Intentional
retention satisfies a scope disposition, never a translation-success count.

## Immediate application to the existing waves

- Wave 01's four validator candidates remain source-created candidates. Their
  existence alone does not establish complete behavior or production execution.
- Wave 02's seven existing twins retain their individual verification results
  and unresolved semantic/physical findings. A tooling disposition must be
  justified from their consumers before changing their place in the work plan.
- Wave 03's merge/report and vector functions require role review first. If a
  function serves only developer tooling, retain it with that evidence. If it
  serves product runtime, manually implement or repair its representation and
  focused parity checks. Do not simply refuse formerly valid JS inputs and call
  that equivalent; a changed input contract is a separately documented design.
- Wave 04 is profile investigation, not a fourth set of translated product
  files. Apply its findings to runtime work that actually needs those features.

The latest owner direction authorizes this planning change. No new approval is
needed merely to distinguish retained tools from the runtime conversion target.
The maintainer records routine scope and implementation choices under the
standing direction rather than asking for a new approval for each tool. A change
to product behavior or a separately reserved action still needs its own decision.
This document does not issue execution receipts, narrow existing input contracts,
change production admission, or mark a blocked runtime item complete.

## Bounded observations supporting the policy

- Root `package.json` exposes `galerina.mjs` and `fungi.mjs` as command entrypoints
  and `scripts/run-all-tests.cjs` as the test runner. The runner header identifies
  package-test orchestration. These roles differ despite all being JavaScript.
- `scripts/dev-tool-index.mjs` declares generated package/tool documentation and
  coverage outputs. It is a tooling-retention example; final exclusion from a
  particular delivered product still needs that product's packaging evidence.
- `packages-ts/galerina-core-compiler/package.json` exposes a compiler main and
  CLI bin and declares a dependency on devtools-graph-algorithms. The manifest
  is private: this establishes an executable surface, not current publication.
  Calling a package build-related cannot by itself exempt its compiler role.
- `packages-ts/galerina-devtools-project-graph/package.json` exposes `dist` through
  main, exports and files. The word devtools does not settle its actual consumers.

These observations are not a repository-wide runtime-closure audit. The legacy
conversion queue remains unchanged until its owner supports role accounting;
retained executable tools must not be relabeled NO_RUNTIME_BEHAVIOR.

## Architecture cross-check

GPT-6 Astra reviewed the bounded owner files during this decision. Its supported
corrections are incorporated: separate execution role, distribution target and
migration state; distinguish compiler use from application use; keep bootstrap
shadows visible; and do not infer runtime absence from a devtools label. The
review does not establish release contents, complete consumer closure or counts
of files that can be retained. Those remain per-chapter inventory work.
