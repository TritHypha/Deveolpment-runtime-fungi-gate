# Product-family package readiness pre-native recheck

Status: `PRE-FUNGI READY — NATIVE AUTHORING PAUSED`

This receipt supersedes the verification counts in
`product-family-package-readiness-closure-2026-08-26.md`. It does not replace
that historical receipt and does not authorize `.fungi`, `.gate`, signing or
publication work.

## Exact implementation identity

- Integrated branch: `codex/rd-0858-unit4-process-root`
- Reviewed planning checkpoint: `codex/product-family-package-readiness` at
  `f53e11db4d8e370281b59ae5633019ed8a53fe06`.
- Parent: `6d8a91646550245cbf496cf316aad0481836efea`
- Initial implementation commit: `00baabc7944a60cfbe2860f41fd2d37e5de1414a`
- Initial implementation tree: `25bd2e4cdba729f19723e908aa57859872a86b63`
- Toolchain-authentication repair: `35b9832d800e5778f7966ce6535246dee45d80ea`.
- Exact code-index fixed point after repair: `0e53a9fbbfe20ed47f3ff843717dcc3d4da88a41`.
- Initial changed paths: 12, all non-native; repair changed paths are also non-native.
- `.fungi` changes: 0.
- `.gate` changes: 0.
- First unopened native locator:
  `packages/fungi/products/galerina/rd0858-unit4-scalar-oracle/`.

## Repair scope

- The root package runner admits one repository-contained, lockfile-matched
  TypeScript 5.9.3 package when a package has no local compiler. Its complete
  deterministic package-tree digest must match `scripts/toolchain-integrity.json`;
  only a private authenticated copy executes. Ambient launchers, version drift
  and byte substitution refuse before package execution, and the private root
  is removed under a checked temp-root guard.
- Tower Citizen builds every sibling `dist/index.js` prerequisite through the
  governed build-chain tool; its static manifest control derives the required
  list from the tests.
- Benchmark entry points share one absolute-path SLIDE resolver. Conflicting,
  blank or relative environment inputs refuse; an unconfigured main checkout
  retains the sibling default.
- A missing registry directory is treated as zero manifests and reaches the
  existing canonical empty-certified-index refusal. The unsigned auth
  candidate digest was mechanically refreshed for the moved README locators;
  no signature or authority was created.
- One MJS conversion-overlay test normalizes CRLF to LF before matching an
  exact multiline TypeScript source fragment. No native source was changed.

## Focused evidence

- Root runner controls: 14/14 PASS, including a RED-first byte-substitution
  refusal; combined runner/Tower controls are 15/15 PASS.
- Tower Citizen: 516/516 PASS.
- Benchmark package: 113/113 PASS.
- Registry package: 35/35 PASS.
- Registry CLI self-test: 20/20 PASS.
- Neuromorphic package: 18/18 PASS.
- KB graph package: 31/31 PASS with the KB root explicitly admitted.
- Node dependency audit: PASS over 101 manifests and 10 distinct external
  dependencies; the external floor is clean.

## Composite sequential package evidence

- Package concurrency: 1.
- Test-file concurrency: 1.
- Initial run: 100/100 packages executed; 95 packages passed; 3,152 tests were
  counted in passing packages; wall time 476,755 milliseconds (476.755
  seconds).
- Targeted benchmark replay: 113/113 PASS with the explicit SLIDE root.
- Targeted KB-graph replay: 31/31 PASS with the explicit KB root.
- Exact composite: 97/100 packages and 3,296 tests. This is not one
  exact-final-target full-estate run.
- Initial-run observed package outputs: 10,235 tests, 10,227 passing and 8
  failing.
- Initial-run timeouts: 0.

The exact fail-closed set is:

1. `galerina-core-compiler`: 6,717/6,721; four intentional RD-0858
   process-root causal RED controls require the first admitted scalar worker
   and artifact.
2. `galerina-framework-example-app`: 4/7; three production-shape paths refuse
   because the legacy greeting manifest cannot be verified under the current
   public-key estate. No unsigned override was enabled and no signing material
   was fabricated.
3. `galerina-test`: 210/211; one existing `.fungi` file still contains the old
   `packages-galerina` locator. The test remains red because the active stop
   prohibits editing native source.

## Phase-close inventory

The governed phase-close inventory was also invoked sequentially. It remains
non-dispositive: the existing `.fungi` corpus check reached its own 600-second
watchdog and was cleanly refused, while several later package rows encountered
dependencies that had already been returned to the preserved dependency
archive. Those rows are not normalized into PASS and do not replace the
focused or composite package evidence above.

## Audit-map position

- Prepared: 9/9 tasks, 100%.
- Fully closed: 8/9 tasks, 89%.
- Open gates: KB remote publication hygiene, the signing ceremony and the
  explicit owner reopening of native authoring.

## Derived-evidence position

- Implementation commit: `b3d4a41e38ecdbed0b4636eb92c1fc9bcc2ddcda`.
- Repaired tracked graph/index checkpoint: `f53e11db4d8e370281b59ae5633019ed8a53fe06`.
- Repository graph checks: 9/9 PASS.
- Exact external full graph:
  `Galerina-product-family-readiness-final-f53e11db-full`.
- External graph counts: 65,746/65,746 nodes and 167,667/167,667 edges;
  skipped files: 0; indexed HEAD matches the tracked fixed point exactly.
- Exhaustive generator contracts: 19/19 PASS with explicit KB and SLIDE roots.
- Code index and derived registry: 987 identities.
- Contract registry: 3,938 contracts across 2,974 `.fungi` files.
- Documentation index: 299 indexes covering 2,009 documents.
- KB index: 1,956 documents.
- Unit registry: 157 currencies, checked read-only so the `.fungi` twin was
  not regenerated.

The scoped immutable implementation review returned PASS C0/I0/M0. The first
clean-target readback at `4f6a760c3` returned HOLD C0/I1/M0 only because the
TODO, roadmap, plan and this receipt retained older graph and document counts.
Those documentation claims were repaired. The replacement immutable readback
of exact target `f53e11db4`, tree `209bc20d3`, returned `PASS` C0/I0/M0.
A fresh successful fetch then preceded a Git Custody plan whose sole admitted
action was `FAST_FORWARD` into `codex/rd-0858-unit4-process-root`. The active
branch was fast-forwarded, the planning worktree was removed without force and
the fully contained local planning branch was deleted. No push, remote-branch
deletion or unrelated-worktree mutation occurred.

## Disposition

`PRE-FUNGI READY — NATIVE AUTHORING PAUSED`

All known repairable non-native setup failures and local integration steps are
closed. The next product implementation action would create or admit the
scalar-1 native artifact, so execution stops before every `.fungi` and `.gate`
write. KB remote publication and the signing ceremony remain separate HOLDs.
