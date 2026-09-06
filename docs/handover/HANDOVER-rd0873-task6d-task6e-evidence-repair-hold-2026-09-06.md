# RD-0873 Task 6D/6E evidence repair hold — 2026-09-06

## Exact baseline

- Galerina repair worktree branch: `codex/rd0873-task6d-workflow-repair`.
- Repair baseline: `077c1cb136aca17ca335ff96aba326a7cbf20926`.
- AGENTS Task 6E baseline: `bc22960337f20fb3e0c17863432f6ba823af1608`.
- Governing approved plan: blob `0d2b67984be29be3b60f6f69d0b6ae62a4a8a18e`,
  200,858 bytes, SHA-256
  `f22370f85bdb1520e734aaeff8af9cd4e3afb7181084f6c38dc589f5593c413a`.

## Decision

`HOLD`. Task 6F must not be dispatched and no observation fixture, approval
receipt, merge, push, signing, graph/index refresh, Task 7 activity or `.fungi`
authoring may claim this evidence path is ready.

## Confirmed gaps

1. The baseline workflow has the four required dispatch inputs but only validates
   their syntax. It does not bind `producerCommit` to `GITHUB_SHA`, check out the
   private AGENTS commit with a protected read-only identity, run the two native
   producer lanes, upload the four closed artifacts, cross-verify the opposite
   platform's artifacts, or verify an evidence commit.
2. The required protected environment `rd0873-task6-evidence` is absent from
   Galerina. The only repository secret listed is `ZTF_KB_READ_TOKEN`; it has no
   demonstrated authority to read AGENTS and must not be repurposed.
3. The approved AGENTS Task 6E controlled-runner test does not consume
   `GALERINA_TASK6C_R_FRAME_PATH` or `GALERINA_TASK6C_R_PROFILE_PATH`.
   With both variables deliberately set to nonexistent paths, its exact test
   name still passed. Therefore the Task 6D harness currently proves only that
   Task 6E can validate its own generated fixture, not that it validates the
   captured producer bytes.

## Required repair sequence

1. Establish a separately scoped, read-only GitHub App installation for the
   private AGENTS repository and configure its app identity/private key only in
   the protected Galerina environment. Do not use a personal token, the KB token,
   or a write-capable credential.
2. Create the protected environment with the required reviewer and branch-policy
   decisions. Its policy must be recorded before a workflow can treat it as
   protected.
3. Amend Task 6E test-first so the controlled runner reads only the two explicit
   captured byte paths, rejects absent/non-regular/oversized data before reading,
   and calls the two-argument pinned verifier on those bytes. Re-run its
   independent review. This is a new Task 6E revision.
4. From the reviewed Galerina Task 6D baseline, add the workflow orchestration
   and focused static/refusal tests required by the governing plan. It must use
   the repaired Task 6E commit, hardwired repositories and immutable action pins;
   no caller selects paths, commands, repositories, refs, runners, limits or
   credentials. This is a new Task 6D revision.
5. Treat every later observation/fixture/approval as invalidated by either
   revision and restart Tasks 6E–6F as the governing plan requires.

## Publication custody

- The repair worktree is based directly on the reviewed Task 6D commit and was
  clean before this handover was written.
- AGENTS `main` is locally 28 commits ahead of cached `origin/main`, spanning
  19 paths and 4,060 insertions / 198 deletions. It must receive an independent
  range review before any non-force push; the binary-review commit is not an
  isolated one-commit publication.
- No remote dispatch or Git state change was made by this investigation.

## Next safe action

Use the exact approved plan as the design source, obtain the missing protected
GitHub App/environment configuration, then begin red tests for the Task 6E
byte-binding correction. Do not implement the Task 6D workflow against guessed
secret or environment names.
