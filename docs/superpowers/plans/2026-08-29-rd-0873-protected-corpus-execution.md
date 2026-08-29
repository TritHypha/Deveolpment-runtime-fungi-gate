# RD-0873 Protected Corpus Execution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development to implement this plan task-by-task,
> with a fresh independent review after every implementation commit.

**Goal:** Repair all five Important findings from the independent Task 3 review
so Corpus Audit v2 can bind the exact checked source/compiler bytes, enforce
independent output limits, classify termination honestly, and observe the
intended Git repository before Tasks 4-7 continue.

**Architecture:** Extend the shared owned-process controller with per-stream
limits and a bounded protected-file manifest. Extend the verified Windows
warden to authenticate and retain the named files and their direct ancestors
before launching the checker. Integrate that protection into the existing
Corpus Audit v2 shard executor, with explicit non-Windows refusal and hardened
AbortSignal, exit and Git handling.

**Tech Stack:** Node.js CommonJS/ESM, `node:test`, Rust 2021, Win32 Job
Objects/file handles, `serde`, `serde_json`, `sha2`, SHA-256, Git.

**Spec:** `docs/superpowers/specs/2026-08-29-rd-0873-protected-corpus-execution-design.md`

## Global Constraints

- Work only in the isolated
  `codex/rd-0873-native-fungi-bootstrap-implementation` worktree.
- Start every unit from a recorded clean commit and commit only its declared
  paths with explicit pathspecs.
- Follow graph-first code discovery, then verify exact local source before
  editing.
- Use RED/GREEN TDD and preserve permanent red-capability controls.
- Use `process.execPath`, argv arrays and `shell:false`; do not add a shell
  command surface or ambient Node lookup.
- Do not copy source into a temporary execution tree and do not refactor the
  main compiler CLI beyond the exact corpus integration.
- Windows x64 is the only v2 protected-execution platform in this chapter.
  Non-Windows v2 must refuse before a checker child starts.
- Preserve the legacy corpus command for non-v2 repository checking.
- Rebuild the warden offline with `--locked`; do not fetch dependencies.
- Preserve unrelated dirt and other worktrees.
- Commit locally only. Do not push, merge, publish, disclose source externally
  or perform destructive cleanup.

---

### Task A: Add independent owned-process stream limits

**Files:**

- Modify: `scripts/lib/owned-process-tree.cjs`
- Modify: `scripts/tests/owned-process-tree.test.mjs`

**Interfaces:**

- `runOwnedProcess({ maxOutputBytes, maxStdoutBytes, maxStderrBytes })`
- returned `stdoutBytes` and `stderrBytes`
- `runOwnedProcessSync` wrapper propagation and buffer sizing

- [ ] **Step 1: Add RED controls**

Add tests proving:

1. stdout and stderr each receive their own 128-byte budget in the same child;
2. 129 stdout bytes with 128 stderr bytes terminates for stdout overflow;
3. 128 stdout bytes with 129 stderr bytes terminates for stderr overflow;
4. raw byte counts are reported even when multi-byte UTF-8 is emitted;
5. zero, negative, unsafe, accessor-bearing and unknown per-stream limit inputs
   refuse before spawn;
6. callers that supply only `maxOutputBytes` preserve current behaviour;
7. the synchronous wrapper propagates unequal stream limits.

- [ ] **Step 2: Prove focused RED**

Run:

```powershell
node --test scripts/tests/owned-process-tree.test.mjs
```

Expected: the new independent-limit/raw-count assertions fail while existing
process ownership and cleanup controls remain runnable.

- [ ] **Step 3: Implement the minimal controller change**

Normalize absent `maxStdoutBytes` and `maxStderrBytes` to
`maxOutputBytes`. Give each `appendBounded` state its own limit, retain its
pre-decode raw count, and include both counts in every result. Size the sync
wrapper buffer from the sum of the two explicit ceilings plus the existing
fixed allowance. Reject accessors/proxies/unknown protection combinations
before spawn.

- [ ] **Step 4: Verify GREEN and mutation capability**

Re-run the focused suite. Temporarily swap the two limit assignments and prove
at least one permanent test fails; restore and re-run green.

- [ ] **Step 5: Commit exact paths**

Verify only the two declared paths are staged and commit:

```text
fix: enforce independent owned-process output limits
```

### Task B: Add the authenticated Windows protected-file set

**Files:**

- Modify: `scripts/lib/owned-process-tree.cjs`
- Modify: `scripts/tests/owned-process-tree.test.mjs`
- Modify: `scripts/native/process-warden/src/main.rs`
- Modify: `scripts/native/process-warden/Cargo.toml`
- Modify: `scripts/native/process-warden/Cargo.lock`
- Regenerate if changed by the existing owner:
  `build/_process-warden-receipt.json`

**Interfaces:**

- asynchronous `runOwnedProcess({ protectedFileSet })`
- stdin schema `galerina.protected-file-set.v1`
- warden setup exit `126` / `WARDEN_SETUP_REFUSED`

- [ ] **Step 1: Add controller and native RED controls**

In the Node suite add closed-shape fixtures for a canonical root and sorted
`{ path, sha256 }` entries. Assert refusal for unknown keys, getters, Proxy,
foreign prototype, empty/oversized set, absolute/traversal/non-NFC path,
unsorted entries, exact duplicate, case alias, bad digest, both protection
modes and synchronous protected-file use.

On Windows add live tests proving:

1. correct manifest lets the child read the exact file;
2. wrong digest exits before a sentinel child can run;
3. the child cannot write, delete or rename a retained file;
4. a direct symlink and a directory junction/reparse ancestor refuse before the
   sentinel child runs;
5. a concurrent replacement attempt cannot substitute bytes;
6. setup error text contains no source body.

- [ ] **Step 2: Prove focused RED**

Run:

```powershell
node --test scripts/tests/owned-process-tree.test.mjs
```

Expected: protected-file-set cases fail because only `protectedReadTree`
exists.

- [ ] **Step 3: Implement controller validation and transport**

Validate exact ordinary records/arrays by descriptors without executing
getters. Enforce the spec limits and canonical ordering. Serialize the admitted
manifest once, verify the UTF-8 length, spawn the verified warden with piped
stdin only when the set exists, write the full buffer and close stdin. Treat
stdin write/setup failures as non-authorizing spawn evidence.

- [ ] **Step 4: Implement native authentication**

Add exact deserialization structs with unknown-field denial. Bound stdin to
4 MiB before parsing. Validate root, count, path and digest constraints
independently. Use Win32 attributes to reject every reparse component, retain
root-to-leaf directory handles with share-read only, open each leaf with
share-read only, verify final handle paths, hash the retained leaf with SHA-256,
and compare the declared digest in constant-time style. Create the suspended
target only after the whole set authenticates. Retain all handles through the
existing Job Object close path.

- [ ] **Step 5: Rebuild offline and verify receipt binding**

Run:

```powershell
cargo test --manifest-path scripts/native/process-warden/Cargo.toml --locked --offline
node scripts/build-process-warden.mjs
node --test scripts/tests/owned-process-tree.test.mjs
```

Expected: Cargo and Node tests pass; the existing build owner reports a binary
whose receipt matches source, manifest, lock and binary hashes.

- [ ] **Step 6: Run controlled mutations**

Change one declared digest, one path and one reparse check independently. Each
must make a permanent live test red. Restore the source, rebuild and re-run
green after every mutation.

- [ ] **Step 7: Commit exact paths**

Stage only the declared Rust/controller/test paths and the tracked generated
receipt if its owner changed it. Do not stage target-cache binaries. Commit:

```text
feat: authenticate protected child input files
```

### Task C: Integrate protected execution into Corpus Audit v2

**Files:**

- Modify: `scripts/audit-fungi-corpus-check.mjs`
- Modify: `scripts/tests/fungi-corpus-shard-execution.test.mjs`
- Modify: `scripts/tests/fungi-corpus-ownership.test.mjs`
- Modify: `governance/phase-close-commands.json` only if its platform contract
  requires an explicit field supported by the existing manifest schema

**Interfaces:**

- `corpusCompilerIdentity(root)` returns ordered compiler file rows plus digest
- `runCorpusShard` supplies exact compiler rows plus current source row
- closed Git adapter and exact AbortSignal snapshot
- numeric exit `128` without diagnostic -> `MISSING_RESULT`

- [ ] **Step 1: Add five-finding RED controls**

Extend the focused corpus suite to prove:

1. source and compiler replacement attempts cannot alter bytes while the child
   runs and cannot mint PASS;
2. cumulative stdout and stderr budgets are independently passed to the process
   owner and raw byte counts drive aggregate accounting;
3. Proxy, inherited-accessor, own-accessor and forged AbortSignal shapes invoke
   zero user traps and refuse before checker authority;
4. plain numeric exit `128` without a code is `MISSING_RESULT`, while exit
   `128` with an exact code remains classifiable;
5. hostile `GIT_DIR`, `GIT_WORK_TREE`, index, object, config, askpass and SSH
   variables cannot redirect or interact with repository observations;
6. v2 on a platform without the verified protection owner refuses before child
   authority, while the legacy command remains available.

- [ ] **Step 2: Prove focused RED**

Run:

```powershell
node --test scripts/tests/fungi-corpus-ownership.test.mjs scripts/tests/fungi-corpus-shard-execution.test.mjs
```

Expected: the new controls expose the five review findings at the recorded base
commit.

- [ ] **Step 3: Bind the compiler/source closure**

Return frozen ordered `{ path, digest }` compiler rows from
`corpusCompilerIdentity` alongside the existing canonical digest. Reuse the
same rows when building each child `protectedFileSet`, add the current
`.fungi` row, sort once, and refuse case aliases or digest disagreements.
Keep the source descriptor held in the controller until the owned child closes,
then verify and close it.

- [ ] **Step 4: Enforce independent cumulative stream budgets**

Compute remaining stdout and stderr capacity separately. Pass
`maxStdoutBytes` and `maxStderrBytes` without a shared maximum. Advance the
cumulative totals from `child.stdoutBytes` and `child.stderrBytes`, not from
decoded string lengths. Zero remaining capacity produces
`OUTPUT_OVERFLOW` before another child starts.

- [ ] **Step 5: Harden signal, exit and Git observations**

Validate native AbortSignal branding with descriptor/proxy checks and the
built-in getter before authority; snapshot the Boolean and never read a user
accessor. Remove the numeric-high-exit crash heuristic. Add the closed Git
environment and `safe.directory` adapter described by the spec to every
repository/tracking observation.

- [ ] **Step 6: Add explicit platform routing**

Require the verified Windows owner for any v2 shard execution. Return the exact
platform refusal before a checker starts elsewhere. Leave the non-v2 legacy
sweep unchanged and document the phase-close behaviour in the focused ownership
test.

- [ ] **Step 7: Verify GREEN and permanent mutations**

Run:

```powershell
node --test scripts/tests/owned-process-tree.test.mjs scripts/tests/fungi-corpus-receipt.test.mjs scripts/tests/fungi-corpus-shards.test.mjs scripts/tests/fungi-corpus-ownership.test.mjs scripts/tests/fungi-corpus-shard-execution.test.mjs
```

Expected: all focused suites pass. Then independently mutate the source digest,
one stream limit, the exit-128 mapping and one Git scrub entry; each permanent
control must fail. Restore and re-run the complete focused command.

- [ ] **Step 8: Run a real bounded Windows WORKSET**

Select two tracked direct `.fungi` files, build an exact WORKSET request using
the production CLI route, and run one shard/concurrency one with small positive
bounds. Expected: terminal protected receipt with no source or diagnostic body
disclosure.

- [ ] **Step 9: Commit exact Task 3 repair paths**

Stage only the declared corpus files and manifest if changed. Commit:

```text
fix: bind Fungi corpus checks to protected bytes
```

### Task D: Independent Task 3 re-review and admission

**Files:** No implementation path is added by this task.

**Evidence inputs:** Task A-C commit hashes, focused commands/output, mutation
receipts, warden build receipt, exact clean status and the original five
findings.

- [ ] **Step 1: Freeze the review package**

Record branch, HEAD, tree, clean/staged status, exact commits and changed paths.
Map every original finding to its implementation and permanent test locator.

- [ ] **Step 2: Assign a fresh independent reviewer**

The reviewer must inspect exact source, not implementation summaries, and run
the focused command. Required output is severity-calibrated
`Critical N / Important N` with explicit disposition of all five originals.

- [ ] **Step 3: Run bounded fix loops if needed**

For any actionable finding, assign a fresh implementer from the rejected exact
base, require RED/GREEN evidence and a narrow fix commit, then send the new
exact HEAD to a fresh reviewer. Maximum five Task 3 repair rounds; an unresolved
finding remains HOLD.

- [ ] **Step 4: Admit Task 3**

Task 3 is accepted only at `Critical 0 / Important 0`, with the full focused
command green and worktree clean at the reviewed HEAD. Update the active RD
ledger and only then begin original-plan Task 4.

## Plan self-review

- Every one of the five original findings has at least one implementation step,
  permanent RED control and independent re-review requirement.
- The process-owner API names agree with the approved spec.
- The native manifest schema, field names and bounds agree with the approved
  spec.
- No step requires network access, a temporary source snapshot, an unbounded
  process, a push, merge or publication.
- Task C cannot mint v2 evidence on a platform without the protected owner.
- No placeholder, `TBD`, deferred decision or optional security control
  remains in this plan.

## Continuation

After Task D admission, resume
`docs/superpowers/plans/2026-08-28-rd-0873-native-fungi-bootstrap.md` at Task 4.
Tasks 4-6 and the bounded model-diverse challenge must close before Task 7 may
author one scalar native `.fungi` slice.
