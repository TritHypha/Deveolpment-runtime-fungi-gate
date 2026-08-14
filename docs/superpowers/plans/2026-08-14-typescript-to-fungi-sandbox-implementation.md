# TypeScript-to-Fungi Sandbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` (recommended) or
> `superpowers:executing-plans` to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a non-authorizing sandbox dev tool that processes exactly ten
graph-pinned TypeScript symbols per pilot batch, emits `.fungi` only for the
closed supported subset, records `BLOCKED` and `MANUAL_REVIEW` refusals without
stopping siblings, and never changes the source `.ts` files.

**Architecture:** A small ESM library resolves exact repository and graph
identity, classifies TypeScript through the pinned compiler API, lowers only an
allow-listed scalar AST, proves the candidate through Galerina and physical
SLIDE/VOK, and atomically publishes an immutable candidate plus JSON receipt.
The CLI is orchestration only. Batch mode continues through all ten requests
and appends deterministic JSONL outcomes. No Git mutation is reachable.

**Tech Stack:** Node.js ESM, TypeScript compiler API 5.9.3 from the pinned core
compiler workspace, codebase-memory MCP CLI 0.9.0+dumpswap, Galerina compiler
`dist`, independent sibling SLIDE APIs, `node:test`, strict JSON and SHA-256.

## Global Constraints

- Work on `codex/rd-0792-synthesize-only`; do not push.
- Keep every input `.ts` byte-for-byte unchanged and record its SHA-256 before
  and after conversion.
- Use codebase-memory first. `CONVERTED` requires `index_status.stale=false`,
  exact `indexed_head_sha === git HEAD`, and one exact file+symbol graph result.
- Process at most ten requests per batch in version 1. The pilot manifest has
  exactly ten requests.
- Terminal outcomes are exactly `CONVERTED`, `BLOCKED`, or `MANUAL_REVIEW`.
- Unknown syntax, unresolved identity, dirty source, missing physical SLIDE,
  evidence failure, output collision, or source mutation fails closed.
- The tool cannot commit, push, delete TypeScript, edit package registration,
  claim retirement, or release production authority.
- Any later repository commit containing this plan or implementation remains
  forbidden until the same commit contains at least 40 new `.fungi` files
  (expected 50), exactly one report, whole-corpus exact and alpha-shadow checks,
  and a report-only streak below two. This implementation stays uncommitted
  until that gate is satisfied.
- Alpha-renamed shadow detection preserves literal values, types, operators and
  control-flow shape; it normalizes identifiers only. A separate non-authorizing
  template-similarity note may generalize literals but cannot pass a collision.
- Tests execute a bounded ten-case pilot, not the whole conversion queue.

---

## Task 1: Lock contracts, identity, and deterministic journal

**Files:**
- Create: `scripts/lib/ts-to-fungi-sandbox/contracts.mjs`
- Create: `scripts/lib/ts-to-fungi-sandbox/identity.mjs`
- Create: `scripts/lib/ts-to-fungi-sandbox/journal.mjs`
- Test: `scripts/tests/ts-to-fungi-sandbox.test.mjs`

- [x] Write failing tests for canonical relative `.ts` paths, absolute/escape/
  symlink refusal, clean tracked source custody, exact SHA-256, exact graph HEAD,
  unique file+symbol discovery, immutable record shape and append-only JSONL.
- [x] Define frozen constants for schema `galerina.ts-to-fungi-sandbox.v1`, tool
  version `1`, outcomes, stable blocker IDs, ten-request ceiling and byte limits.
- [x] Resolve the repository root without serializing an absolute path. Require
  regular non-symlink source and sandbox directories and reject generated or
  untracked source.
- [x] Query `codebase-memory-mcp cli index_status --project <name>` and
  `search_graph` via argument arrays, parse stdout as strict JSON, compare the
  independent indexed build point to `git rev-parse HEAD`, and require exactly
  one matching symbol in the requested file.
- [x] Use `git status --porcelain=v1 -- <path>` plus `git ls-files --error-unmatch`
  to refuse dirty/untracked source. Rehash after analysis and before publication.
- [x] Serialize records with a locale-independent sorted-key canonicalizer;
  append one UTF-8 JSON line with exclusive-create/versioned paths and no
  absolute-path fields.
- [x] Run: `node --test --test-name-pattern="identity|journal" scripts/tests/ts-to-fungi-sandbox.test.mjs`

## Task 2: Implement fail-closed TypeScript classification

**Files:**
- Create: `scripts/lib/ts-to-fungi-sandbox/typescript-api.mjs`
- Create: `scripts/lib/ts-to-fungi-sandbox/classifier.mjs`
- Test: `scripts/tests/ts-to-fungi-sandbox.test.mjs`

- [x] Write failing tests for supported primitive literal constants and scalar
  functions, plus declarations, binary64, collections, callbacks, async,
  closures, host calls, coercion, `null`/`undefined`, unknown syntax and
  unresolved calls.
- [x] Load TypeScript only from
  `packages-galerina/galerina-core-compiler/node_modules/typescript`, record its
  exact version, and fail `MANUAL_REVIEW` if unavailable or outside the repo.
- [x] Parse with `ts.createSourceFile`, locate exactly one declaration matching
  the graph symbol and byte range, and walk every descendant node.
- [x] Admit only Boolean/String/safe integer literal constants and total scalar
  functions with explicit primitive annotations, immutable locals, structured
  `if`/`return`, allow-listed unary/binary operators and no calls in version 1.
- [x] Emit a closed inventory of syntax kinds, types, operators, identifiers,
  source range and completeness. Known unsupported semantics map to stable
  `BLOCKED` identifiers; unknown or truncated analysis maps to `MANUAL_REVIEW`.
- [x] Run: `node --test --test-name-pattern="classifier" scripts/tests/ts-to-fungi-sandbox.test.mjs`

## Task 3: Lower admitted scalar AST to documented Fungi

**Files:**
- Create: `scripts/lib/ts-to-fungi-sandbox/lowerer.mjs`
- Test: `scripts/tests/ts-to-fungi-sandbox.test.mjs`

- [x] Write failing tests for deterministic zero-argument constant flows,
  primitive parameters, Boolean operations, comparisons, immutable locals,
  `if`/`return`, name sanitization, string escaping and unsupported-node refusal.
- [x] Require an unforgeable classifier record created inside the module; the
  lowerer cannot accept caller Booleans or arbitrary raw source.
- [x] Emit only `@version 1` and documented `pure flow` syntax. Example constant:

  ```fungi
  @version 1
  /// Non-authorizing sandbox candidate; TypeScript remains the oracle.
  pure flow snapshotKeyContext() -> String {
    return "galerina.snapshot.epoch.key.v1"
  }
  ```

- [x] Keep the source binding in the receipt, not in execution-affecting padding.
  Refuse collisions rather than manufacture distinct code.
- [x] Reparse the emitted source before returning it and require one expected
  flow with no parser errors.
- [x] Run: `node --test --test-name-pattern="lowerer" scripts/tests/ts-to-fungi-sandbox.test.mjs`

## Task 4: Build mandatory compiler, duplicate, and physical evidence

**Files:**
- Create: `scripts/lib/ts-to-fungi-sandbox/evidence.mjs`
- Test: `scripts/tests/ts-to-fungi-sandbox.test.mjs`

- [x] Write failing tests for parser/type/effect/governance/GIR failure, exact
  duplicate, alpha-renamed shadow, source mutation, missing SLIDE, altered
  `.slide`, altered receipt and VOK refusal.
- [x] Import `parseProgram`, `checkTypes`, `checkEffects`, `verifyGovernance`,
  `emitGIR`, `hashGIR` and `executeFlow` from the core compiler `dist`; require
  zero error diagnostics and deterministic double-compiled GIR hash.
- [x] Enumerate tracked `.fungi` with `git ls-files -z -- '*.fungi'`; reject an
  exact byte duplicate or identifier-alpha-renamed whole-corpus shadow. Preserve
  literals and operators in the terminal shadow fingerprint.
- [x] Resolve SLIDE from `GALERINA_SLIDE_REPO` or the sibling `../SLIDE` only for
  local sandbox evidence. Compile candidate bytes, publish to a temporary
  directory, independently prepare/re-admit, execute, VOK-verify, and prove
  source/artifact/receipt mutation refusal. Record only repository-relative or
  content-addressed evidence, never a local absolute path.
- [x] Mark `CONVERTED` only when every mandatory gate is green; otherwise publish
  no candidate and return `MANUAL_REVIEW` with the failing gate.
- [x] Run: `node --test --test-name-pattern="evidence" scripts/tests/ts-to-fungi-sandbox.test.mjs`

## Task 5: Add atomic inspect, batch, and verify commands

**Files:**
- Create: `scripts/lib/ts-to-fungi-sandbox/controller.mjs`
- Create: `scripts/ts-to-fungi-sandbox.mjs`
- Create: `scripts/fixtures/ts-to-fungi-sandbox-pilot.json`
- Modify: `package.json`
- Test: `scripts/tests/ts-to-fungi-sandbox.test.mjs`

- [x] Write failing CLI tests for inspect, a mixed ten-request batch, audit-only
  exit behavior, batch continuation, output collision, deterministic repeat,
  receipt verification/tampering and original-TypeScript byte retention.
- [x] `inspect` processes one strict request. `batch` requires 1..10 unique
  requests and continues after refusals. `verify` rehashes source/candidate and
  reruns mandatory non-mutating evidence.
- [x] Write all partial files beneath a fresh temporary directory and rename into
  the dedicated sandbox only after evidence succeeds. Never overwrite an
  existing candidate, receipt, summary or journal entry.
- [x] The committed pilot manifest contains exactly ten graph-pinned requests:
  supported primitive constants, a binary64 blocker, a mutable-collection
  blocker and one missing-symbol manual-review case.
- [x] Add root scripts `sandbox:ts-to-fungi` and
  `test:ts-to-fungi-sandbox`; do not add any commit/push/registration command.
- [x] Run: `node --test scripts/tests/ts-to-fungi-sandbox.test.mjs` and require
  exactly ten top-level tests, zero failures and zero skips.

## Task 6: Run the bounded pilot and reconcile evidence

**Files:**
- Create only in ignored/test temporary sandbox output; do not register or
  commit generated candidates.
- Modify this plan only to check completed tasks.

- [x] Run the exact ten-request pilot in audit-only mode against the independently
  fresh graph and record its deterministic outcome census.
- [x] Confirm every source `.ts` SHA-256 is unchanged and no `.ts` path was
  deleted, renamed or rewritten.
- [x] Confirm each converted candidate passed exact and alpha-shadow checks,
  parser/type/effect/governance/GIR, physical SLIDE, independent re-admission,
  VOK and mutation negatives.
- [x] Confirm blocked/manual siblings appear in JSONL and summary and did not
  prevent supported siblings from completing.
- [x] Run the bounded ten-test suite again, then root package syntax checks and
  the dev-tool index publisher/check if `package.json` changes require it.
- [x] Run `git diff --check`, verify no secrets or absolute local paths in
  tracked artifacts, and verify `git status` contains only intended files.
- [x] Do not commit until a later wave supplies at least 40 new `.fungi`, exactly
  one report and all user-mandated commit guards.

## Self-review

- [x] Confirm every design requirement has a named implementation task and test.
- [x] Confirm no placeholder, `TODO`, permissive fallback or caller-mintable
  success Boolean exists.
- [x] Confirm the TypeScript compiler, graph, Galerina and SLIDE versions/build
  points are recorded without absolute paths.
- [x] Confirm the public tool never exposes private skill contents or commits.
- [x] Confirm the pilot and tests are bounded to ten, while commit gates remain
  at least 40 new `.fungi` and exactly one report.
