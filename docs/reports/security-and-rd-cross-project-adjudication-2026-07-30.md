# Security and R&D cross-project adjudication

Date: 2026-07-30

Status: current-source adjudication; implemented findings carry fresh tests;
unbuilt suggestions remain non-authorizing

## Bound review inputs

The four independent security reviews were read as untrusted evidence and
bound before checking current source:

| Review | SHA-256 |
|---|---|
| `SEC-01-galerina-security-audit.md` | `31e8d54adf28291f9c11f895969d24814366d2898c9cbd0c8e727408c0b46a7e` |
| `SEC-02-zt-galerina-graph-ascii-v3-security-audit.md` | `3b4a6f20e8603d118413e1bb1bda0020ca97e27d6e28055c3764b2bf27923455` |
| `SEC-03-slide-security-audit.md` | `1f7339521497c4769960a8e702084cca09cc3d68b603676b56d968bd8128047a` |
| `SEC-04-trilowlevel-v2-security-audit.md` | `2d2df9dfdb909d39d470cbe0cb9adb18237bab620b2c6282651652d009d95162` |

The source folder name is preserved as received (`ai-reviews/secuirty`).
These reviews do not become authority through citation.

## Current-source decisions

| Finding family | Current decision | Fresh evidence |
|---|---|---|
| TLS custom verdict replaced certificate admission | **FIXED** | Real HTTPS negative first returned 200 without a client certificate. TLS is now mandatory and a custom resolver is an additional total K3 factor. Missing certificate + custom ALLOW denies; dual ALLOW admits; DENY, INDETERMINATE, throw and out-of-domain values deny. API package 22/22 |
| Disposable TLS private halves looked like custody material | **FIXED by explicit fixture identity** | Files are renamed `TEST-ONLY-*`, the fixture boundary explains that they are public disposable vectors, generator output uses the same names, and the real TLS suite remains 22/22. No runtime OpenSSL dependency was introduced |
| Encoded local-path slug | **STALE/FIXED** | The tracked-file path audit includes double-dash and bare slug shapes, proves them with planted fixtures and reports the current tree clean |
| Remote download piped into an interpreter | **FIXED and governed** | All ten live occurrences were removed. `audit-remote-shell-install.mjs` scans source/docs, refuses download-to-shell forms, proves a planted defect and safe control, runs at phase close and is covered by the 81/81 audit meta-gate |
| Signing-refusal coverage | **STALE/FIXED** | Current reconnaissance is 51/51 refusal codes with a test mention; the report's earlier count is not current evidence |
| Myco persisted index as hostile input | **FIXED for the admitted metadata cache** | Closed bounded schema, canonical root-relative paths, realpath/symlink containment, pre-parse byte limit, collection budgets, duplicate refusal and locale-independent persistence ordering. Galerina mirror 69/69 plus typecheck; upstream commit is pinned |
| Native-prefixed enum member misclassified as FFI | **FIXED in the compiler** | A RED regression proved that `NativeDiagnosticSeverity.Error` incorrectly observed `native.call`. Inference now requires an actual call expression for the legacy `Native*.*` convention, while the paired `NativeBridge.invoke()` control remains privileged. Focused effect suite 70/70; full compiler package exits green |
| SLIDE contract lived only in an untracked predecessor | **FIXED** | Fifteen exact live V2 contract/handoff files now live in `SLIDE/contracts/v2`, with a closed file-set manifest and explicit digest-suite ID. Mutation, missing, surplus and unsupported-suite fixtures refuse; SLIDE 35/35 |
| Full digest-suite migration | **PENDING** | The contract now identifies `sha256.v1` through a closed registry and refuses unknown suites, but no dual-read transition, anti-downgrade migration or retirement proof exists |
| GATE v3 prototype findings | **DEFERRED, NON-AUTHORITATIVE** | The prototype remains outside the Galerina/SLIDE authority path. Unknown types, global ceilings, terminal sanitization and symlink containment are mandatory before its work resumes |
| Predecessor repository history | **SUPERSEDED, NOT AUTHORITY** | The predecessor working tree remains unborn/untracked. Its live contract was copied byte-exactly into committed SLIDE; remaining predecessor material is historical/source evidence only |

## Zero-trust adoption scores

Dimensions are `authority / fail-close / integrity / memory / injection /
determinism / resource / compatibility / evidence / benefit`.

| Construction | Dimensions | Weighted | Decision |
|---|---|---:|---|
| Mandatory TLS certificate gate plus custom K3 factor | `10/10/9/8/10/10/9/9/10/9` | **9.50** | **ADOPTED** |
| Bounded, contained Myco persisted-index contract | `10/10/9/8/10/10/10/9/10/9` | **9.60** | **ADOPTED** |
| Remote-installer shell-pipe refusal gate | `9/10/9/8/10/10/9/10/10/9` | **9.40** | **ADOPTED** |
| Call-shape-aware native-effect inference | `9/10/9/8/9/10/9/10/10/9` | **9.30** | **ADOPTED** |
| Repository-owned, digest-checked SLIDE V2 contract | `10/10/10/8/10/10/9/9/10/8` | **9.55** | **ADOPTED** |
| Independent compiled-NFA invariant verifier for TriRegex | `9/10/9/8/9/10/10/10/10/8` | **9.35** | **ADOPT-CANDIDATE** |
| Seed-bound TriRegex generated corpus and replay receipt | `9/10/9/8/9/10/9/10/10/8` | **9.25** | **ADOPT-CANDIDATE** |
| Myco content-verified evidence tier | `PENDING` | — | Hash scope, cost model, semantic digest, atomic publication and absence-claim contract are incomplete |
| Full digest-suite migration | `PENDING` | — | Dual-suite transition and downgrade/retirement evidence are incomplete |

No hard veto applies to the four adopted constructions. A hard veto remains
on any index, graph, cache, topology or learned/neural result authorizing
execution or policy.

## Whole-project R&D integration

### Myco

The immediate security work treats `.myco/index.json` as an untrusted,
optional metadata cache. A crafted parent path previously caused a search to
read outside the requested root; the reproduced exploit is now a permanent
negative test. The next research layer must separate:

- `METADATA_FRESH`;
- `CONTENT_VERIFIED`;
- `INDETERMINATE`.

Only the content-verified tier may support a security-sensitive absence
statement. A semantic index digest must exclude observational timestamps.
Publication needs atomic/durable evidence and seeded fault replay before the
index can graduate beyond advisory acceleration.

### TriRegex

The current non-backtracking matcher and cost certificate remain useful, but
the compiler currently trusts its own emitted graph and derived tables. The
next defensive slice should independently recompute and verify:

- every branch/jump target is in range;
- resting-slot maps are bijective and complete;
- closure rows have exact widths and no surplus bits;
- `matchOnConsume`, EOL resolution and fresh-end results match an independent
  walk;
- the cost certificate equals a separate recomputation;
- malformed or unverifiable compiled state is a terminal veto.

A seeded generated corpus should bind the seed, syntax profile, budgets,
implementation/source identity, corpus digest, chunk partitions, mutations
and planted anti-neuter fault. This is implementation-ready research, but the
standalone upstream TriRegex working tree already contains uncommitted owner
work. Its mirror rule forbids editing the Galerina copy first, so implementation
waits for a clean upstream reconciliation rather than overwriting that work.

### SLIDE and VPEG

Contract provenance is now repository-owned. VPEG, deterministic graph/cache
and neural proposal lanes remain proposal-only. They may reduce search or
recomputation after an independent deterministic checker proves the resulting
graph; they can never supply ALLOW, omit a gate, relax a budget or replace
source/policy/toolchain/target identity.

### External `.fungi` package staging

The staging tree was inspected in place and left untouched. Its audit proves
flat peer topology, quarantine and candidate identity; it does not prove
semantic parity or runtime suitability. Four candidates are present:

| Candidate | Frontend | Admission decision |
|---|---:|---|
| `galerina-substrate-math` | strict pass | reference/floor package; not a retirement candidate |
| `galerina-target-gpu` | strict pass | quarantine; status and executable parity evidence incomplete |
| `galerina-target-native` | strict pass after compiler fix | quarantine; no status/parity evidence |
| `galerina-target-wasm` | strict pass | quarantine; written vectors have not been executed |

No candidate is copied into Galerina merely because it parses. Admission
requires a complete dossier, source-identity reconciliation, differential
execution, negative/mutation evidence, package-policy checks and an executable
SLIDE ABI.

## Required next evidence

1. Reconcile the dirty standalone TriRegex source without discarding owner
   changes, then implement the invariant verifier test-first upstream and
   re-vendor exact source.
2. Design and falsify Myco content-verified evidence tiers before adding
   hashes to the hot search path.
3. Keep GATE v3 outside authority until all four reported input/resource/output
   boundaries have hostile fixtures and total refusals.
4. Complete Galerina platform durability and crash recovery before beta
   authority.
5. Do not publish cross-runtime benchmark claims until SLIDE executes equivalent
   admitted workloads.

## Zero-trust adoption score

- R&D complete: yes for the scored bounded constructions; no for each
  `PENDING` item
- dimensions: recorded per construction above
- weighted score: recorded per construction; no aggregate score
- hard vetoes: graph/cache/neural authority remains rejected
- decision: adopt verified fixes; implement scored TriRegex controls after
  upstream reconciliation; retain incomplete work as pending
- required exit evidence: listed above
- re-score trigger: changed trust boundary, upstream source reconciliation,
  completed digest/content-verification R&D, or new hostile evidence
