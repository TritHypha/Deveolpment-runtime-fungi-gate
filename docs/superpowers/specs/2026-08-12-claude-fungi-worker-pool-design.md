# Claude Fungi Worker Pool Design

## Purpose

Use up to five Claude CLI sessions to accelerate independent `.ts`/`.mjs` to
`.fungi` slices while Codex remains the product owner. Workers gather bounded
evidence and prepare isolated changes; they do not own admission, profile
widening, integration, completion claims, commits or pushes.

## Worker topology

- Run no more than five sessions concurrently.
- Use the Claude CLI Opus alias with high effort.
- Give every editing session its own CLI-managed Git worktree.
- Assign one exact source symbol and one owning package to each worker.
- Never let two workers edit the same package, queue, roadmap, generated owner,
  shared proof helper or public skill repository.

The first wave is read-only. It produces five source dossiers and proposed
decision/effect ledgers. Codex then verifies the current source, retirement
floor, selected SLIDE/VOK profile and queue scope. Only admitted candidates
enter the second, worktree-isolated implementation wave.

## Required worker authorities

Every worker must read these public skills in full before analysis:

- `../skills/translating-typescript-to-fungi/SKILL.md`
- `../skills/writing-fungi/SKILL.md`

The workspace is supplied to Claude with both skill directories and the SLIDE
repository explicitly mounted. `AGENTS.md`, the exact TypeScript source,
callers, tests, package manifest, live compiler and selected physical profile
remain the source of truth.

## Initial independent scopes

| Slice | Exact scope | Floor at selection |
|---:|---|---|
| 38 | `packages-galerina/galerina-web/src/index.ts#isServerOnlyImport` | none |
| 39 | `packages-galerina/galerina-target-js/src/index.ts#isServerOnlyImport` | none |
| 40 | `packages-galerina/galerina-devtools-provenance/src/analyzer.ts#isGateCall` | none |
| 41 | `packages-galerina/galerina-core-network/src/index.ts#isUnsafeNetworkBackend` | none |
| 42 | `packages-galerina/galerina-cpu-kernels/src/index.ts#requiresLowBitKernel` | none |

`galerina-core-security/src/index.ts#isHighRiskPermissionAction` is excluded:
the current retirement owner declares `bounded-bootstrap-floor`.

## Worker restrictions

- Do not edit during the dossier wave.
- Do not use raw glob or grep for discovery; use the code graph first and Myco
  only for bounded literal checks.
- Do not run graph-all, full tooling, normal phase-close, monolithic memory
  evaluation or repository-wide indexing.
- Do not invent syntax, host APIs, effects, permissions or wire encodings.
- Do not emit null, NaN, `else if`, `throw`, `try`, `catch`, `for` or `loop` in
  Fungi. Iteration is admitted only as a proved bounded Boolean `while`.
- Do not widen a compiler or SLIDE registry limit to admit a candidate.
- Do not alter TypeScript consumers, delete legacy source or claim retirement.
- Do not modify queue decisions, roadmaps, generated owners or public skills.
- Do not commit or push.

## Required dossier return

Each worker returns one compact Markdown result containing:

1. exact source path, symbol and Git build point;
2. source behavior, input/output domain and source digest;
3. callers, tests, constants, types and observable failure behavior;
4. ambient authority and direct/transitive effects;
5. threadability class;
6. retirement floor and evidence source;
7. decision/effect ledger with every terminal exit;
8. selected candidate asset path and physical profile, or an exact blocker;
9. differential, hostile-input, budget and mutation vectors;
10. classification: `CANDIDATE`, `BLOCKED`, `NO_RUNTIME_BEHAVIOR` or
    `SUPERSEDED_BY_EXISTING_FUNGI`.

## Product-owner gate

Codex independently reads every returned source and diff, rechecks floors and
profile domains, binds the accepted design and queue decisions, and runs all
focused checks. Claude output is advice or an isolated patch, never authority.
Unknown evidence remains blocked. Integration uses explicit paths and local
commits only; the owner performs all pushes.

