# Fungi Skills Public Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the `writing-fungi` and `translating-typescript-to-fungi` repositories independently safe, verified, and publicly accessible without resuming Galerina conversion slices.

**Architecture:** Each repository retains its standalone release script and gains one focused history-regression test plus one read-only GitHub Actions workflow. The release script scans both the current working tree and every unique blob reachable from any local ref; publication occurs only after exact local/remote commit equality and is verified separately for each repository.

**Tech Stack:** Node.js ESM, `node:test`, Git CLI, GitHub Actions, GitHub CLI, Python `skills-ref`, Codex `quick_validate.py`.

## Global Constraints

- Keep conversion slices paused throughout this plan.
- Complete and publish `writing-fungi` before modifying `translating-typescript-to-fungi`.
- Preserve unrelated dirty files and stage exact paths only.
- Use Apache-2.0 and the existing Phillip Booth owner notices.
- Scan bounded UTF-8 text only; malformed Git output, unsupported objects, oversized blobs, binary blobs, and command failures refuse publication.
- Pin the official `agentskills/agentskills` validator source at commit `69ef37e9424c0a7ea9dd2293b559e43ec8176379`.
- Do not claim language, SLIDE, VOK, retirement, signing, or release authority from repository-hygiene checks.
- Do not resume full Galerina tooling, phase-close, graph-all, or whole-memory evaluation.

---

### Task 1: Harden `writing-fungi` release evidence

**Files:**
- Create: `../skills/writing-fungi/scripts/check-public-release.test.mjs`
- Create: `../skills/writing-fungi/.github/workflows/verify.yml`
- Modify: `../skills/writing-fungi/scripts/check-public-release.mjs`
- Modify: `../skills/writing-fungi/SKILL.md`

**Interfaces:**
- Consumes: repository root derived from `import.meta.url`; optional CLI `--root <path>` used only by the focused hermetic test.
- Produces: exit `0` and `public-release audit: PASS`, or exit `1` with one or more `REFUSED:` lines.

- [ ] **Step 1: Preserve and classify the existing dirty guidance**

Read the complete `SKILL.md` and its diff. Retain the already-present binding rules for no `null`/`NaN`, no `else if`, no `throw`/`try`/`catch`, bounded Boolean `while` only, typed reporting separation, and exact-record SLIDE/VOK boundaries. Do not overwrite or revert them.

- [ ] **Step 2: Write the failing history test**

Create a `node:test` case that copies the repository without `.git`, initializes a temporary Git repository, commits a clean baseline, commits a file whose forbidden local-path and private-key strings are assembled from fragments, deletes it in a later commit, then runs:

```js
spawnSync(process.execPath, [releaseScript, "--root", temporaryRoot], {
  encoding: "utf8",
});
```

Assert a non-zero status and history-specific refusal. Construct forbidden strings from fragments so the test file itself remains publicly admissible.

- [ ] **Step 3: Prove RED**

Run:

```powershell
node --test scripts/check-public-release.test.mjs
```

Expected: FAIL because the existing script ignores the temporary root and scans only its own clean working tree.

- [ ] **Step 4: Implement bounded history scanning**

Add checked Git helpers based on `spawnSync`. Enumerate commits with `git rev-list --all`, parse each commit with `git ls-tree -r -z --full-tree`, validate record mode/type/object/path, scan each unique blob once through checked `git cat-file -s` and `git cat-file blob`, and reject sizes over `1_000_000` bytes or non-UTF-8 text. Apply the existing path/private/dependency/placeholder rules plus high-confidence private-key and service-token prefixes to both current and historical text.

The CLI parser accepts either no arguments or exactly `--root <absolute-or-relative-directory>`; malformed arguments refuse. The default remains the repository containing the script.

- [ ] **Step 5: Add automated verification**

Create `.github/workflows/verify.yml` with `permissions: contents: read`, full-history checkout, Node 22, Python 3.12, and these commands:

```yaml
- run: node --test scripts/check-public-release.test.mjs
- run: node scripts/check-public-release.mjs
- run: python -m pip install "git+https://github.com/agentskills/agentskills.git@69ef37e9424c0a7ea9dd2293b559e43ec8176379#subdirectory=skills-ref"
- run: skills-ref validate .
```

- [ ] **Step 6: Prove GREEN and validate the skill**

Run the focused test, release audit, pinned `skills-ref` through `uvx --from git+https://github.com/agentskills/agentskills@69ef37e9424c0a7ea9dd2293b559e43ec8176379#subdirectory=skills-ref skills-ref validate .`, local Codex `quick_validate.py`, and `git diff --check`. Expected: all exit `0`.

- [ ] **Step 7: Commit the exact repository changes**

Stage only `SKILL.md`, the release script, its test, and the workflow. Commit with `harden public release custody`.

---

### Task 2: Publish and verify `writing-fungi`

**Files:**
- No new local files.

**Interfaces:**
- Consumes: clean local `main`, verified commit, `origin/main`.
- Produces: one public GitHub repository whose default branch equals the verified local commit.

- [ ] **Step 1: Push the verified commit**

Re-run the release audit and validators, push `main`, fetch, and require equality among `HEAD`, `refs/remotes/origin/main`, and GitHub's default-branch commit.

- [ ] **Step 2: Change visibility**

Run `gh repo edit TritHypha/writing-fungi --visibility public --accept-visibility-change-consequences` only after Step 1 passes.

- [ ] **Step 3: Verify public custody**

Require `gh repo view TritHypha/writing-fungi --json visibility,isPrivate,defaultBranchRef,url` to report `PUBLIC`, `false`, `main`, and the expected HTTPS URL. Verify the workflow exists remotely and a fresh archive/clone exposes only the audited files.

---

### Task 3: Harden `translating-typescript-to-fungi` release evidence

**Files:**
- Create: `../skills/translating-typescript-to-fungi/scripts/check-public-release.test.mjs`
- Create: `../skills/translating-typescript-to-fungi/.github/workflows/verify.yml`
- Modify: `../skills/translating-typescript-to-fungi/scripts/check-public-release.mjs`
- Modify only if evidence requires it: `../skills/translating-typescript-to-fungi/SKILL.md`

**Interfaces:**
- Consumes: the same CLI contract as Task 1, implemented independently in this repository.
- Produces: the same fail-closed audit outcome while retaining all translation-specific semantic rules.

- [ ] **Step 1: Write and prove the independent RED test**

Create the same hermetic three-commit history shape as Task 1 without copying any forbidden literal directly into the test source. Run `node --test scripts/check-public-release.test.mjs`; expect failure because historical removed content is accepted.

- [ ] **Step 2: Implement the independent bounded scanner**

Add the checked CLI, commit/tree/blob enumeration, one-megabyte bound, fatal UTF-8 decoding, secret/private/path rules, and exact refusal output. Retain every translation-specific requirement already present for authoring shape, physical widths, union tags, proof scope, threadability, exact-record boundaries, and slice-close review.

- [ ] **Step 3: Add the pinned workflow**

Create the same read-only GitHub workflow and pinned `skills-ref` command as Task 1.

- [ ] **Step 4: Prove GREEN and commit**

Run the focused test, release audit, pinned `skills-ref`, Codex `quick_validate.py`, and `git diff --check`. Stage only the task files and commit with `harden public release custody`.

---

### Task 4: Publish and verify `translating-typescript-to-fungi`

**Files:**
- No new local files.

**Interfaces:**
- Consumes: a public and verified `writing-fungi` dependency plus clean translation-skill `main`.
- Produces: a second independently public and verified repository.

- [ ] **Step 1: Push and prove exact remote equality**

Push only after all Task 3 checks pass; fetch and require local, remote-tracking, and GitHub default-branch commit equality.

- [ ] **Step 2: Change visibility and verify**

Run `gh repo edit TritHypha/translating-typescript-to-fungi --visibility public --accept-visibility-change-consequences`. Require GitHub metadata to report `PUBLIC`, `isPrivate: false`, default branch `main`, and the expected URL. Verify the remote workflow and a fresh archive/clone.

---

### Task 5: Close custody without resuming slices

**Files:**
- Modify: `docs/roadmap-2026-07-29-galerina-beta-v1-to-slide.md`
- Modify: the active conversion register/ledger and batch status file identified through current Galerina navigation.
- Modify: `docs/superpowers/plans/2026-08-12-fungi-skills-public-release.md`

**Interfaces:**
- Consumes: exact public commits and GitHub visibility evidence from Tasks 2 and 4.
- Produces: a bounded record that slices remain paused and names the next permitted task.

- [ ] **Step 1: Record exact results**

Record both repository commits, visibility results, verification commands, and any remaining non-authorizing concerns. Do not record local absolute paths or credentials.

- [ ] **Step 2: Run only bounded owners**

Run the directly affected roadmap/status owners and focused path/private-document checks. Do not run full tooling, phase-close, graph-all, or whole-memory evaluation.

- [ ] **Step 3: Commit exact Galerina files**

Preserve the unrelated untracked SLIDE capability plan. Commit only the public-release plan status and directly affected tracking outputs. Conversion Slice 63 remains unstarted until this closure commit is clean.
