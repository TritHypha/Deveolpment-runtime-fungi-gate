# Independent review prompt — production registry rotation activation

Date: 2026-07-30

You are an independent security and distributed-systems reviewer. Review the
Galerina production operational-key rotation activation design and its current
implementation. Do not edit files. Do not assume that a passing signature,
successful parse, local filesystem, operating system, process memory, callback,
or programming language is trusted. Galerina uses K3 decisions: ALLOW `+1`,
INDETERMINATE `0`, DENY `-1`; only exact ALLOW authorizes and every other
boundary result exits fail-closed.

Repository:

`<WORKSPACE>/Galerina`

Read at minimum:

- `docs/architecture/audit-key-rotation-triple-lock-design-2026-07-10.md`
- `docs/roadmap-2026-07-29-galerina-beta-v1-to-slide.md`
- `packages-galerina/galerina-tower-citizen/src/key-rotation.ts`
- `packages-galerina/galerina-tower-citizen/src/registry-key-rotation.ts`
- `packages-galerina/galerina-framework-app-kernel/src/registry-rotation-authority.ts`
- `packages-galerina/galerina-framework-app-kernel/src/registry-rotation-controller.ts`
- `packages-galerina/galerina-framework-app-kernel/src/registry-runtime.ts`
- `governance/revocation-registry.mjs`
- `scripts/registry-authority-cli.mjs`
- `scripts/registry-index-cli.mjs`

Verified current boundary:

- automatic trigger/readiness/Triple-Lock/switch/canary/fallback/drain/retire
  control is implemented with disposable hybrid keys;
- an authenticated checkpoint is required between phases;
- exact accepted delegation/index/generation identity advances only after
  canary;
- the production loader binds the active epoch, checkpoint-selected immutable
  generation and a pinned signed revocation snapshot;
- the generation core re-signs all candidate manifests, signs the matching
  index, derives a domain-separated content ID, uses exclusive
  same-directory staging/publication, re-opens and re-verifies canonical
  bytes, and keeps verified receipts distinct from host durability-evidence
  receipts;
- the production controller has an empty admitted-adapter digest set and
  refuses every current receipt even if a caller-controlled barrier reports
  `true`;
- the remaining design is the admitted platform durability/custody adapters
  and complete crash/fault matrix;
- the offline root remains manual and must never become an automatic online
  signer.

Also inspect:

- `docs/superpowers/specs/2026-07-30-content-addressed-registry-generation-activation.md`
- `packages-galerina/galerina-framework-app-kernel/src/registry-generation.ts`
- `packages-galerina/galerina-framework-app-kernel/src/registry-generation-store.ts`
- `scripts/registry-generation-cli.mjs`

Answer these questions with file/line evidence:

1. What is the smallest crash-consistent artifact transaction that works on
   Windows 10/11, Debian/Ubuntu, Fedora/Mint and macOS without assuming
   multi-file rename is atomic?
2. Should activation use a content-addressed immutable generation, an atomic
   pointer, a journal, or another construction? State exact invariants and
   recovery rules for every crash point.
3. How must the authenticated rotation checkpoint bind the generation so a
   valid older package/index set cannot replay?
4. How should canary failure restore the old artifact generation and old epoch
   without creating a split-brain interval?
5. Which filesystem operations need regular-file, symlink/reparse-point,
   size, ownership/permission, fsync and TOCTOU checks on each target OS?
6. What is the least-authority custody interface for filesystem-sealed keys,
   TPM/HSM/KMS providers and test-only disposable custody? No private bytes may
   enter logs, checkpoints, graphs or public artifacts.
7. How are every package manifest and the index re-signed and independently
   verified before activation? How is a mixed old-manifest/new-index
   generation made unrepresentable?
8. Which injected callbacks or branded receipts are still forgeable or
   caller-authoritative in a real JavaScript process?
9. Give a crash/fault/mutation test matrix, including power loss at every write,
   truncated writes, stale directory entries, disk-full, access denied,
   antivirus/file-lock interference, replay, duplicate generation, and
   substituted keys.
10. List any claims the present design must not make.

Output:

- executive verdict: sound direction / viable with corrections / redesign;
- prioritized findings with severity and exploit or failure path;
- recommended state machine and artifact schema;
- platform-specific implementation notes;
- exact acceptance tests;
- explicit residual risks;
- no generic advice and no proposal to move authority into a sidecar.
