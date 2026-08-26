# Product-family package readiness pre-native recheck

Status: `HOLD PENDING FRESH IMMUTABLE REVIEW AT NATIVE BOUNDARY`

This receipt supersedes the verification counts in
`product-family-package-readiness-closure-2026-08-26.md`. It does not replace
that historical receipt and does not authorize `.fungi`, `.gate`, signing,
integration or publication work.

## Exact implementation identity

- Branch: `codex/product-family-package-readiness`
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

## Final sequential estate

- Package concurrency: 1.
- Test-file concurrency: 1.
- Executed: 100/100 packages.
- Passed: 97 packages.
- Failed: 3 packages.
- Tests counted by the runner in passing packages: 3,296.
- Observed package outputs across all packages: 10,235 tests, 10,227 passing
  and 8 failing.
- Timeouts: 0.
- Wall time: 476,755 milliseconds (476.755 seconds).

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

## Audit-map position

- Prepared: 8/9 tasks, 89%.
- Fully closed: 6/9 tasks, 67%.
- Open gates: fresh immutable review, live Git Custody integration, KB
  publication hygiene, the signing ceremony and the explicit owner reopening
  of native authoring.

## Derived-evidence position

- Historical graph/index commit: `93b3e3670e07ccebca5a3d855a6766ad9e54e709`.
- Current code-index fixed point: `0e53a9fbbfe20ed47f3ff843717dcc3d4da88a41`.
- Repository graph checks: 9/9 PASS.
- Historical external full graph:
  `Galerina-product-family-readiness-pre-native-93b3e3670-full`.
- External graph counts: 65,694/65,694 nodes and 167,582/167,582 edges;
  skipped files: 0; indexed HEAD matches the graph/index commit exactly.
- Exhaustive generator contracts: 19/19 PASS with explicit KB and SLIDE roots.
- Code index and derived registry: 987 identities.
- Contract registry: 3,938 contracts across 2,974 `.fungi` files.
- Documentation index: 299 indexes covering 2,007 documents.
- KB index: 1,956 documents.
- Unit registry: 157 currencies, checked read-only so the `.fungi` twin was
  not regenerated.

The historical external graph cannot close the repaired target. A final exact
zero-skipped graph and fresh immutable review remain mandatory before Git
integration.

## Disposition

`HOLD PENDING FRESH IMMUTABLE REVIEW AT NATIVE BOUNDARY`

All known repairable non-native setup failures are closed. Integration remains
closed until the final graph and independent review pass. The next product
implementation action after integration would create or admit the scalar-1
native artifact, so execution still stops before every `.fungi` and `.gate`
write.
