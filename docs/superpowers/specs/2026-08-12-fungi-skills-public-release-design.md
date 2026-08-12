# Fungi skills public-release design

## Status

Approved under the owner's standing full-auto, zero-trust direction on 2026-08-12. Conversion slices remain paused until both skill repositories are independently release-ready and their GitHub visibility is verified.

## Problem

The `writing-fungi` and `translating-typescript-to-fungi` repositories have GitHub remotes but are private. Their current public-release scripts validate only the working tree. Making either repository public would expose every reachable Git object, so a clean current checkout is insufficient evidence. Neither repository currently runs its release gate automatically on GitHub.

## Considered approaches

### Immediate visibility change

Change each repository to public because its current release check passes.

Rejected: this trusts only the current checkout and could expose a secret, private marker, absolute path, or unpublished dependency retained in history.

### Current-tree hardening only

Add more current-file patterns and then change visibility.

Rejected: this still leaves reachable Git history outside the checked evidence and permits later changes to bypass local-only verification.

### Pin-bound repository release gate

Recommended and selected. Complete one repository before starting the other:

1. Preserve and review existing changes.
2. Add a failing test proving the current gate accepts forbidden content that exists only in reachable history.
3. Extend the gate to validate the current tree and every reachable blob with bounded reads and explicit refusals.
4. Add an automated GitHub workflow that runs the repository gate and official skill validator.
5. Verify Apache-2.0 licensing, notices, contribution and security policies, agent metadata, public links, and absence of local/private material.
6. Commit and push the exact repository changes.
7. Change GitHub visibility to public only after the remote commit matches the verified local commit.
8. Verify the anonymous public repository view, default branch, licence, workflow, and clone URL.

This sequence is then repeated independently for the translation skill.

## Release-gate boundaries

The release gate must:

- inspect all regular current files outside `.git`;
- reject files larger than the stated bound rather than silently skipping them;
- enumerate reachable commits and blobs through Git with checked exit status;
- reject malformed object identifiers, unsupported object output, or Git command failure;
- scan each unique reachable blob once;
- reject local absolute paths, private classification markers, private sibling dependencies, unfinished placeholders, private-key material, and high-confidence service-token prefixes;
- keep repository-specific semantic requirements already enforced by each script;
- expose a deterministic self-test or focused test entry suitable for local and GitHub execution.

The gate is release hygiene evidence, not proof that Galerina syntax, compiler behaviour, SLIDE admission, VOK execution, or TypeScript retirement is correct.

## Publication boundary

Publication is an external and difficult-to-reverse disclosure. A repository may become public only when:

- the tracked worktree is clean at the intended commit;
- local and remote `main` identify the same commit;
- focused tests, public-release audit, and official skill validation pass at that commit;
- the full reachable-history scan passes;
- repository documentation contains no claim that depends on a still-private companion repository;
- no other branch or tag introduces unchecked history;
- the GitHub visibility change succeeds and a fresh unauthenticated-style repository query reports `PUBLIC`.

No Galerina conversion slice resumes as part of this design.

## Failure handling

Any uncertain history entry, scan error, remote mismatch, workflow failure, or visibility mismatch is a refusal. The other repository is not used to average away or override that refusal. A failed publication attempt leaves the repository private while the fault is repaired.

## Verification

Each repository must provide fresh evidence for:

- the focused release-gate test;
- `node scripts/check-public-release.mjs`;
- `python <skill-creator-root>/scripts/quick_validate.py .`;
- `git diff --check`;
- exact local/remote commit equality;
- final GitHub `visibility: PUBLIC` and public clone metadata.

The final report records the two exact commits and visibility results separately.
