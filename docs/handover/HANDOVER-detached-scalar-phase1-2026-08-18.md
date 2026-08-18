# Detached scalar phase-1 shutdown handover - 2026-08-18

## Resume point

- Repository branch: `codex/detached-scalar-phase1`.
- Current committed HEAD before this handover commit: `155a5635`.
- Previous maintenance commit: `d1ad6696`.
- Controlled real-Fungi pilot close: `349ff230`.
- Publication state: committed locally; never pushed.
- Authority state: no production switch, TypeScript retirement or bulk
  conversion authority.

## Durable completed evidence

- The controlled ten-source pilot remains 10/10 with its TypeScript owners
  retained byte-for-byte and candidates kept outside production loaded assets.
- Package, project, integrity, KB, dev-tool, Fungi source-capability and
  semantic graph checks pass 7/7.
- External codebase-memory project
  `Galerina-detached-scalar-phase1-20260818-155a5635` is indexed at exact HEAD
  `155a5635528e08a951e22fa07655c215f5e6a708`: 57,114/57,114 nodes and
  305,667/305,667 edges. `createSnapshotKeyProvider` resolves as a bounded
  probe.
- The KB document locator now checks the reorganized root plus
  `reference/language`, `reference/galerina` and `reference/specs`. Its focused
  suite passes 8/8; diagnostic-document drift reports 210 codes and zero
  violations.
- Required tracked graph, registry, documentation and boundary outputs were
  regenerated. No maintenance commit changes `.fungi` source.

## Verification that is deliberately not green

The full 100-package run completed at 96/100 packages and 9,589 tests.

1. `galerina-devtools-benchmarks`: four fail-closed
   `SLIDE_COMMIT_MISMATCH` results.
2. `galerina-framework-example-app`: three unsigned/signing-fixture refusals.
3. `galerina-registry`: one refusal-message assertion drift and one package
   hash custody drift.
4. `galerina-test`: five stale overlay-count/source-shape assertions against
   the 2,200-file fixture corpus.

`npm run phase-close:exhaustive` completed with twenty red gates:
`artifact-drift`, `audit:conversion-queue`, `audit:percent-fresh`,
`code-index`, `compiler-stage-twins`, `coverage:codes`,
`doc:roadmap-drift`, `doc:status-drift`, `doc:wat-drift`,
`fungi:corpus-check`, `fungi:golden`, `governance:diff`,
`kernel-fungi-twins`, `path:leak`, `r4-twin-hashes`,
`report-blind-consumers`, `silent-overwrite`, `tests:all-packages`,
`tests:benchmark-integrity` and `tests:tooling`.

Do not weaken signing, version, provenance or fail-closed controls merely to
turn these green.

## Large Fungi corpus gate

The monolithic corpus child remained opaque for about 600,208 ms, reached its
ten-minute cap and failed without useful progress. The proposed bounded repair
is a deterministic shard coordinator with:

- canonical one-time enumeration and stable path-based shards;
- proof of exactly-once coverage with no omission or duplication;
- per-shard timeout/crash isolation and conservative Windows concurrency;
- build-point and tool-digest-bound resume refusal;
- compact shard progress with detailed failure artifacts; and
- exact exit separation for clean, finding and tool refusal.

No new large skill is required. The material saving comes from deterministic
tools and short operator documentation. Implement with red/green known-answer
tests before changing the authoritative gate.

## Worktree custody

- Tracked worktree and staging area were clean at HEAD `155a5635` before this
  handover update.
- Untracked
  `packages-galerina/galerina-devtools-benchmarks/benchmarks/call-chain/Python/`
  contains 2,788 disposable files from the external benchmark probe. It is not
  source or required evidence and must not be committed by convenience.
- The separate main Galerina checkout contains unrelated converter and
  `.fungi` work. It was inspected only for custody and not staged, reverted or
  committed.

## Memory and next safe action

The memory graph self-test passes 9/9, but the live flat-file checker refuses
the reorganized hierarchical `memory_summary` and `raw_memories` siblings.
That is a known tool-layout debt, not proof that the source notes are stale.
The permitted Codex memory extension records this shutdown checkpoint.

On resume, first verify Git HEAD/status and the external graph build point.
Then implement and pressure-test the sharded corpus gate, add compact
failure-only phase-close envelopes, and rerun the exact red set. Do not resume
bulk `.fungi` conversion from this handover alone.
