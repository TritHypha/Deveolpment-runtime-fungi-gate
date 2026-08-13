# Galerina package `.fungi` conversion agent template

Date: 2026-07-30

Use this template once per direct child of
`<WORKSPACE>/Galerina/packages-galerina`.
Replace every `<PACKAGE>` placeholder before giving it to an AI.

## Current permitted phase: dossier plus external quarantined candidate

SLIDE does not yet provide the frozen executable package ABI, host-effect
boundary and differential harness required to replace a TypeScript runtime.
Therefore the AI must not edit Galerina source. It may inspect the repository,
write exactly one dossier:

`<WORKSPACE>/ZTF-Knowledge-Bases/ai-reviews/reports/package-conversion-<PACKAGE>.md`

and, only when separately assigned, write one candidate under:

`<WORKSPACE>/Galerina-Fungi-Package-Staging/packages-galerina/<PACKAGE>/`

The candidate assignment is governed by the staging workspace's
`HANDOVER.md`, `STAGING-RULES.md` and `AI-ASSIGNMENT-TEMPLATE.md`. All
Galerina, SLIDE, triLowLevel-v2 and Knowledge Base source remains read-only.
Do not install dependencies, regenerate indexes/graphs/builds, change lock
files, commit, push, sign, rotate keys, open private documents or read any
`.env` file. Do not describe a staged `.fungi` candidate as integrated,
executable or an implemented replacement.

## Subject

Package directory:

`<WORKSPACE>/Galerina/packages-galerina/<PACKAGE>`

Cross-check:

- `Galerina/docs/TODO.md`
- `../ZTF-Knowledge-Bases/reference/galerina/galerina-fungi-translation-decision-map.md`
- `Galerina/docs/examples/VERIFIED-NATIVE-OPERATION-BOUNDARY.md`
- `Galerina/docs/roadmap-2026-07-29-galerina-beta-v1-to-slide.md`
- `Galerina/docs/superpowers/plans/2026-07-30-galerina-slide-full-fungi-retirement.md`
- `Galerina/docs/architecture/slide-v2-integration-2026-07-29.md`
- `SLIDE/docs/`
- the package graph and generated package inventory;
- direct provider/consumer packages only.

Use Myco and generated graph/index evidence before broad text searching.
Treat generated evidence as potentially stale until its check mode passes.

## Non-negotiable architecture

1. Galerina source authority is `.fungi`; TypeScript is a temporary executable
   bootstrap/differential oracle.
2. Type comes first and terminality comes second. `if` is for proven Boolean
   facts only. `check` is Verdict-only and must carry all K3/Tri -1 arms; at an
   authority boundary it is one terminal construct, so each arm returns or
   traps (the `if:` arm may call the admitted continuation and return its typed
   result). Use exhaustive `match` for `Int`, `Option`, `Result`, enums and
   every other non-Verdict alternative. An `Int` containing `+1`, `0` or
   `0 - 1` is not a `Verdict` and must not be fed to `check`. Every unknown,
   malformed and non-ALLOW boundary has an explicit fail-closed exit `_=>`.
3. Only exact K3 ALLOW `+1` authorizes. INDETERMINATE `0` and DENY `-1` never
   authorize.
4. Target at most two nested executable control-flow bodies. Depth 3 through 7
   requires a dossier reason; depth 8 is refused and must be extracted into a
   focused `fn` or named `flow`. Never flatten a security/effect border merely
   to meet the style target.
5. Developer-managed raw pointers and manual frees are not admitted. Values
   are flow-owned unless deliberately placed in the governed Global Vault;
   flow-local values must become unreachable/erased at the flow boundary.
6. Every package/plugin is one direct child of `packages-galerina`. Dependencies
   are references to those top-level packages. Never reproduce an npm-style
   nested dependency tree and never add package-local dependency copies.
7. Do not add a sidecar to the trusted path. Temporary compatibility/oracle
   components must remain explicitly non-authorizing.
8. Language, framework and vendor names confer no trust. Verify concrete
   bytes, schemas, effects, capabilities, provenance and runtime behavior.
9. Preserve the existing package name and public contract unless evidence
   proves a governed migration is required.

## Dossier questions

Answer with file/line evidence and label each conclusion `VERIFIED`,
`MEASURED`, `INFERRED`, `DESIGN-ONLY`, `STALE` or `UNRESOLVED`.

1. What does the package actually do? List public entry points, data types,
   effects, capabilities, persistence, cryptography, network/OS/hardware
   contact and error exits.
2. Which files are authoritative behavior, executable bootstrap, tests,
   generated output, fixtures, vendored mirrors or documentation?
3. What direct package dependencies exist? Distinguish runtime, build/test and
   accidental/transitive dependencies. Draw the smallest provider-to-consumer
   graph.
4. Where does the package rely on Node, TypeScript, JavaScript objects,
   exceptions, garbage collection, filesystem/process APIs, Wasm or native
   code? State the future SLIDE host capability needed for each reliance.
5. Which behavior already has a `.fungi` specification or executable twin?
   Identify missing grammar, GIR, effect, emitter, runtime or host ABI support.
6. Map every Boolean branch, K3 decision, multi-alternative branch and exit.
   Flag any place where current code could coerce unknown/error/absence into
   authority or continuation.
7. Map value lifetimes: creation, ownership, aliasing, flow exit, Global Vault
   admission, sealing, zeroization/erasure and persistence. Flag injection,
   use-after-release, stale-index, confused-deputy and cross-flow risks.
8. Build a test-preservation matrix: current positive tests, negative tests,
   mutation/anti-neutering tests, differential oracles, fuzz/property tests,
   audit gates and missing attacks. Nothing security-relevant may be
   represented only by a happy-path test.
9. Recommend a dependency-order tranche. State which upstream `.fungi`/SLIDE
   contracts must freeze before this package can execute and which downstream
   packages it would unblock.
10. Propose the exact future file layout in the same Galerina package
    directory. Do not create it there. If separately assigned a quarantined
    candidate, create only the matching top-level peer directory in
    `Galerina-Fungi-Package-Staging/packages-galerina/`. Include `.fungi`
    sources, retained differential fixtures, generated artifacts and deletion
    gates for `.ts`, package-local `node_modules` and obsolete
    Wasm/Rust/sidecar material.
11. Define the terminal equivalence proof: observable outputs, diagnostics,
    K3 decisions, effects/capabilities, resource limits, timing/determinism
    expectations and security refusals that must match or deliberately
    tighten.
12. Identify anything worth a defensive or scientific paper under
    `Galerina/docs/paper/README.md`. Separate established techniques from the
    project-specific composition and give a falsification experiment.
13. Use your own intuition. Flag material findings outside the expected scope,
    but do not mutate adjacent packages or silently widen authority.

## Required dossier structure

1. Executive verdict and conversion readiness.
2. Evidence table.
3. Current architecture and direct dependency graph.
4. Trust boundaries, K3 exits and attack surface.
5. Lifetime/memory/index analysis.
6. Proposed `.fungi`/SLIDE mapping.
7. Test and mutation preservation matrix.
8. Dependency-order recommendation.
9. Exact blockers and owner-only questions.
10. Research/paper opportunities.
11. Out-of-scope findings.

## Later implementation authorization

Import into Galerina, execution claims and TypeScript retirement are permitted
only after the coordinating Galerina branch records the frozen SLIDE package
ABI and assigns one isolated branch/worktree for this package. Quarantined
candidate authoring may occur earlier under the external staging rules, but
cannot authorize any of those actions. At the integration point:

- do not edit root/shared indexes, registries, package inventories, lock files
  or generated graphs;
- do not edit another package;
- write tests before behavior;
- keep the TypeScript oracle until `.fungi` executes and differential,
  mutation, graph, audit and security gates pass;
- report every shared change required to the coordinator instead of making it;
- never push.

Deletion of the TypeScript oracle is a separate coordinator-owned terminal
gate, not part of the initial translation.
