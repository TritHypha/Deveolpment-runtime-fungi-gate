# Post-SLIDE execution-authority ledger

Status: schema v3 verifier implemented; production receipts not yet issued

This ledger separates useful migration evidence from evidence which may
authorize production execution. The separation is binding and fail closed. A
tracked, strict-clean, hash-pinned or reference-executable source is not thereby
production-authorized.

## RD-0873 conversion and benchmark close - 2026-09-13

The owner-authorized direct Fungi conversion is complete at the development
disposition tier. The manifest classifies all 100 package roots: 94 roots
contain 95 direct buildable leaves, two are manual host/native boundaries and
four have no eligible TypeScript/JavaScript source. The local regeneration
receipt records 95 `.fungi` inputs, zero TypeScript inputs and 475 generated
artifacts totalling 820,572 bytes. The first regeneration found an
`Array.includes` WAT-lowering gap; the compiler repair and repeat build
passed.

The benchmark receipt records 30 measured groups, 18 comparable groups, a
passing 0.4% noise gate, truth audit and benchmark guard. The benchmark sheet,
charts and archive comparison are observational development evidence only.
They do not issue a production SLIDE lease, activate VOK or prove complete
self-hosting. VOK/Rust and native provider work were intentionally excluded.

This closes the bookkeeping checkpoint, not production authority gates. Exact
receipts and the successor route are in
`docs/handover/HANDOVER-rd0873-conversion-benchmark-housekeeping-2026-09-13.md`.

## RD-0361 secret-gate Option-ABI re-baseline - 2026-09-13

At Galerina `main` HEAD `e716fc677d3ca609b016cf76d7f994b67fd36466` / tree
`80aa41e53fd9cacd608bf0ba392b1d8f2c005e0a`, the enforcing twin hash check is
now **29/29**. The prior sole failure was `secret-gate.fungi`; its stale
historical digest was `ce662c325ef9ba682688a4b18097f5020fe54235ce522773f20e13d0cfda3c36`.

The source twin is unchanged since `1cdeb8a0a`; commit `ca2bc2fb5` changed the
compiler/runtime Option ABI from sentinel payloads to explicit registry handles.
That change makes this twin emit six versioned Option/array imports and a
365-byte module instead of the historical 278-byte module. The authoritative
pin now records
`f062217154df66e3a72bc6adc82e47e72392c5a8d56bc8d40442090a8c8c9166`.
Bounded current checks pass: secret-gate differential **1/1**, Option
ABI/wildcard regressions **22/22**, hash-tool self-test **4/4**, and the full
authority hash/admission check **29/29**.

The targeted secret-gate mutation probe is non-vacuous: its anchor check is
**1/1**, the fail-open mutant is killed **1/1**, and restoration leaves no
target file dirty.

This is a controlled identity re-baseline after the cause was demonstrated; it
does not waive R4. Caller-route/shadow-bake proof, independent executable SLIDE
integration and production authority remain required. RD-0361 remains **HOLD**
for those gates, and no consumer switch, TypeScript retirement, production
authority or Fungi translation follows. Full details:
`docs/reports/rd0361-option-abi-drift-2026-09-13.md`.

## Registry durability production release seam - 2026-09-13

The registry durability admission now has two explicit stages. The existing
`admitRegistryDurabilityProfile` function mints a frozen, process-local
candidate and deliberately keeps `authorityReleased: false` and
`productionAuthorizing: false`. The new
`activateRegistryDurabilityProfile` function is the only promotion seam: it
requires a separate owner-signed authorization bound to the candidate's exact
evidence and generation, a bounded validity window, owner-key separation and a
native verifier that returns exactly `true`. Copied candidates, target
substitution, stale or over-broad windows, key-role reuse and verifier failure
refuse closed. A promoted object is immutable, process-local and carries both
authority flags as `true`.

This is an implementation seam, not a production receipt. No real owner
authorization, live native provider, platform durability receipt or production
consumer activation has been issued on this host; the production authority
gate remains **HOLD**. The full app-kernel suite is **233/233**.

## I/O – OS kernel review checkpoint - 2026-09-13

This non-authorizing checkpoint binds the current Galerina implementation point
`main` at `e716fc677d3ca609b016cf76d7f994b67fd36466`. GPT-6 Astra reviewed the
current source and evidence. Bounded kernel admission, host-floor, auth/fuse,
secret, egress, inbound and durability checks pass `152/152` across 17 suites;
the current execution registry records 29 authoritative twins.

The result does not issue a production receipt. General inbound/outbound I/O
operations still refuse in the app-kernel fuse loader, the native durability
production allow-list is empty, and admitted profiles retain
`authorityReleased: false` and `productionAuthorizing: false`. Hostile-code
containment, complete resource limits, authenticated crash/termination evidence,
named-platform restart/power-loss durability and external production authority
remain open. The row stays `72% asserted`.

The focused current-head seam checks remain green: production
durability/boot-posture **12/12** and fuse-loader/composition **37/37**. They
confirm fail-closed refusal and composition boundaries only; they do not issue
a production receipt or complete the general network adapters.

The linked-host executable and bounded Windows checks remain research evidence
only. The older July 28-twin handover is retained as history and must not be
used as the current count. No production array, verification time, consumer
switch or TypeScript retirement changes in this checkpoint. The existing
untracked `gate-selftests-local.json` is outside scope and remains untouched.

## RD-0361 authority-hash and shadow-bake checkpoint - 2026-09-13

This earlier checkpoint is superseded by the re-baseline above; its 28/29
result is retained as the historical pre-repair observation.

This entry records a fresh non-authorizing RD-0361 check at Galerina `main`
HEAD `e716fc677d3ca609b016cf76d7f994b67fd36466` / tree
`80aa41e53fd9cacd608bf0ba392b1d8f2c005e0a`. The execution lane passes
**26/26** across 25 files and the twin syntax/presence audit passes
**103/103** with 29 declared authoritative entries. These are bounded checks;
they do not prove live caller routing or TypeScript-shadow retirement.

The enforcing authority-hash/admission check exits 1 at **28/29**. The sole
failure is
`packages-ts/galerina-framework-app-kernel/src/self-hosted/secret-gate.fungi`:
the ledger pin is
`ce662c325ef9ba682688a4b18097f5020fe54235ce522773f20e13d0cfda3c36`, while the
current derived digest is
`f062217154df66e3a72bc6adc82e47e72392c5a8d56bc8d40442090a8c8c9166`.
WAT assembly is faithful. The mismatch is therefore a fail-closed HOLD; no
digest was repinned.

GPT-6 Astra independently classifies RD-0361 **HOLD**. Reproduction from an
immutable committed compiler/toolchain closure, cause identification, repair,
fresh hash/admission and differential evidence, and caller-route/shadow-bake
proof remain required. The older 29/29 hash-integrity wording is historical
until those checks pass. The full record is
`docs/reports/rd0361-housekeeping-2026-09-13.md`; the compact resume route is
`docs/handover/COMPACT-HANDOFF-rd0361-housekeeping-2026-09-13.md`.

## Current RD-0873 housekeeping and scope checkpoint - 2026-09-12

At the start of this housekeeping pass, the Galerina implementation line was
`main` at `20912999b041bbd409515101809a80320a010d67`, present on `origin/main`,
with a clean worktree. This housekeeping commit adds documentation only. The
latest documentation commit records the completed role
inventory and the Grok plus independent GPT-6 Astra review of the next
translation scope.

The next candidate remains the single `triNot` symbol in
`packages-ts/galerina-core-logic/src/index.ts`. Its target is still absent.
The scope is **REVISE-SCOPE / NON-AUTHORING**: the existing four-operation
differential suite must remain unchanged; a separate additive product-target
test is required; exact host validation must precede coercive WASM ingress; the
compiler/profile closure and input accounting must be recorded; and any
16,384-byte cap overflow is `HOLD`. No consumer switch, TypeScript retirement,
corpus assurance or SLIDE/VOK admission follows from the reviews.

Grok's private review is advisory and non-authorizing; GPT-6 Astra independently
reached `REVISE-SCOPE`. Their records are linked from the current scope report.
The housekeeping refusal, 716 findings and retained hard-linked executable
remain historical/manual-review holds. Memory preflight remains a separate
owner-visible hold: `MEMORY.md` is an index, while stale historical locators
and the missing Galerina working-set owner are not silently rewritten here.

## Housekeeping owner disposition - 2026-09-12

The owner has dispositioned the prior housekeeping report at exact `main`
head `35aae097acc4b4ccfe75a47927958dc471f7e51a`: retain the 716
bounded-execution findings for manual review and retain the hard-linked release
executable in place for manual review. No cleanup, quarantine, execution,
replacement or production authority follows. The exact artifact identity is
in `docs/reports/rd0873-housekeeping-owner-disposition-2026-09-12.md`.

The earlier `HOUSEKEEPING REFUSED` / exit 2 result remains preserved and is
not a clean or production-authority result. Memory preflight remains separate.

## Housekeeping and pause checkpoint - 2026-09-12

The implementation point is `main` at
`fd54e6cdeaee526875598fe9e9ed959e7a37191c`, also present on
`origin/main`. The read-only session housekeeping pass returned
`HOUSEKEEPING REFUSED`/HOLD after 716 existing bounded-execution findings
and a hard-linked release executable were reported. No cleanup, quarantine,
consumer switch, production receipt or translation restart follows from that
finding.

Memory preflight self-tests passed, while the current store still has two
unindexed top-level files lacking the memory-graph frontmatter contract, four
mixed-EOL notes, a missing Galerina working-set owner and report-only case
drift. Stale volatile facts were zero. These are custody and routing findings,
not production-authority evidence. The positive-float classifier remains a
scoped implementation result and does not authorize execution-budget widening.

## Selective-conversion authorization clarification - 2026-09-12

The standing owner direction authorizes selective product/runtime candidate
creation and repair with focused verification. Historical exact-head authoring
proposals do not supersede that direction or create a new permission request
for every source edit. This clarification changes no executable verifier,
cryptographic policy, production receipt, queue classification or allow-list.

Each proof still covers only its exact source, compiler, profile and observed
execution. A repaired candidate may be committed as implementation work while
SLIDE/VOK, platform and production obligations remain open. The production
requirements in this ledger continue to apply to production claims.

The subsequent typed positive-float classifier supplies a Boolean classification
only. It preserves the retained agent validators' NaN/infinity semantics and
rejects malformed or shadowed classifier calls; ordinary numeric guards remain
unchanged. This is scoped implementation evidence, not approval of an infinite
execution budget or a production consumer switch.

## RD-0873 housekeeping checkpoint - 2026-09-11

This checkpoint is non-authorizing and binds the local working model at
`560920cf4ce103722c6d8703f764c203ac8a7945` / tree
`e29f2484685dd1f63e1da5265a3b20db6352c2a1`. Wave 01 has four bounded source
twins and Wave 02 has seven verified existing twins. Waves 03 and 04 remain
held pending explicit semantic-profile admission and physical SLIDE/VOK proof;
TypeScript shadows, queue state and production arrays remain unchanged.

The queue digest is
`60e7118a4fede9eb80b0e6008fedad0f86894fc47be04955b676a287a016a784` with
1,605 rows and zero candidates. The bounded housekeeping run refused with 716
existing audit findings and a hard-linked release executable. No cleanup,
production receipt, consumer switch, corpus rerun or authority release follows
from this entry. Future translation waves require a fixed manifest, bounded
per-shard receipt, exact-head recheck and fail-closed resume point; external
model advice, including Astra, remains advisory.

## Schema-v3 lanes

`candidates` is non-authorizing research and migration evidence. Each entry
binds one tracked package `.fungi` source to its canonical source digest,
decision-graph digest, bounded profile and tracked evidence digest. A valid
candidate remains counted among `unexecutedFungi`.

`fungiSources` contains only hybrid-signed production execution receipts.
Every entry binds the exact source, frontend receipt, decision graph, compiler,
GIR, SLIDE contract, target, policy, verifier, object, admission decision,
affine VOK lease, terminal receipt, platform evidence, release, repository
commit, serial and validity interval.

`hostBridges` contains only hybrid-signed ownership receipts for native and OS
boundaries. Every entry binds the boundary kind, least-authority and capability
policies, retain/replace disposition, replacement identity, target, platform,
isolation, cleanup and ownership evidence.

`verificationTime` is `null` while both production arrays are empty. Once a
production entry exists it must be one canonical ISO instant. That one instant
is used for delegation and receipt validity checks, preventing inconsistent
per-entry clocks. `minimumReceiptSerial` is a monotonic rollback floor; serials
must also be unique across both production lanes.

## Authority and verification

The production verifier is implemented in
`scripts/lib/post-slide-authority-receipts.mjs` and
`scripts/lib/post-slide-authority-ledger.mjs`, and is composed into the live
retirement graph. It reuses the dedicated beta-v1 release-evidence authority:

- the cold hybrid root delegates the repository-evidence role to a bounded
  operational public key;
- Ed25519 and ML-DSA-65 signatures must both verify under the exact role and
  domain-separated context;
- the current pinned revocation snapshot, delegation serial and validity
  window are checked;
- the authority policy and each receipt must bind the exact current repository
  commit;
- source, evidence bundle and canonical envelope bytes are independently read
  from tracked regular contained paths and re-hashed;
- exact in-toto Statement v1 shells and closed Galerina predicates are derived
  again rather than trusting claimed result fields;
- duplicate serials, accessors, proxies, surplus fields, path ambiguity,
  private material, copied evidence, wrong role, stale commit or one bad
  signature component refuse the entire production ledger.

The ledger is limited to 1 MiB and exact canonical UTF-8 JSON. Each source,
evidence bundle and envelope is separately limited to 16 MiB. Candidate source
identity uses canonical `UTF8_LF_V1` bytes so an admitted CRLF checkout has the
same source identity; signed production artifacts remain exact byte identities.

Failure grants no partial set and has no Wasm, Node, cache, driver or
reference-interpreter fallback. The verifier returns no executable handle; it
only proves whether the terminal retirement graph may count a specifically
signed source or boundary as admitted.

## Cryptographic replacement contract

The current `hybrid-ed25519-mldsa65` suite is routed through a versioned
executable suite dispatcher and mirrored in the governed crypto-suite register.
It is not embedded in `.fungi`, `.slide`, VOK or package semantics.

A later replacement follows an overlap migration:

1. add a new suite ID and independent verifier in `planned` state;
2. give a changed key/signature shape a new delegation and envelope schema;
3. cross-verify a hostile golden corpus and activate new signing explicitly;
4. rotate operational keys and reissue current production receipts;
5. set the old suite to `verify-only-retired`, blocking new signatures while
   retaining historical verification; and
6. remove the old implementation only after every retained artifact has been
   migrated or its retention period has ended.

Unknown, planned or schema-mismatched suites refuse. Relabelling an old
signature with a future suite ID does not enter the new verifier. This permits
cryptographic replacement without changing production application logic while
avoiding a silent downgrade or a flag-day loss of historical auditability.

## 2026-09-10 housekeeping checkpoint

This checkpoint records repository assurance only; it grants no production
authority. Local graph and index regeneration completed at committed `main`
source snapshot `6325a782c4ac396c5fcfb0e986d0811ed7205c25`, then committed at
exact `main` head `9125b2f60a0bd411ad7256f767416ad1268b8e07`, with the external
graph exact at 71,071 nodes and 188,293 edges. The final graph fixed point is
10/10. Structural audits are green, while the
report-only Fungi-quality lint has 2,086 findings and one gate self-test remains
open for `audit-conversion-slice-close`.

The full suite is 10,192 tests with 97/100 packages passing. Three packages
remain held by existing example-signing, fixture, and source/path-drift
failures. Phase close is `REFUSED` because exact PROJECT and pinned Git
authority inputs are absent at this head. The production arrays and
`verificationTime` remain unchanged and empty; this entry is evidence of
housekeeping, not an authorization decision.

## Current measured state

The cryptographic verifier implementation is green. Focused evidence is 5/5
for the predicate and hybrid-envelope layer plus 12/12 for the terminal
retirement gate. The tests include source/evidence mutation, forged ML-DSA-65,
surplus fields, path traversal, invalid time and plain text falsely presented
as production authority.

Production activation remains blue. The tracked ledger contains two exact
checked-decision candidates, zero signed production sources and zero signed
host boundaries. The beta-v1 operational release-evidence delegation/public
bundle is also deliberately absent pending the later offline ceremony.
Consequently the live audit still reports 111 unexecuted `.fungi` sources and
38 unowned host boundaries. Those are real admission work, not a missing
verifier and not exemptions.

Verification:

```powershell
node --test scripts/tests/post-slide-authority-receipts.test.mjs
npm.cmd run audit:retirement:selftest
node scripts/ts-retirement-graph.mjs --post-slide --check --json
```

The first two commands must pass. The third must remain non-zero until every
independently derived terminal debt reaches zero.
