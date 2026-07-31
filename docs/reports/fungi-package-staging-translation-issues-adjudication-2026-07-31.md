# Fungi package staging translation-issues adjudication

Status: current-tree review complete; no staged candidate admitted

Date: 2026-07-31

Source reviewed:
`../Galerina-Fungi-Package-Staging/TRANSLATION-ISSUES-LOG.md`

This report checks the external translation log against the current Galerina
branch. The staging repository remains untrusted, flat and non-authorizing.
Passing the frontend is evidence about syntax only; it is not execution,
semantic parity, package admission, authority, or permission to delete a
TypeScript oracle.

## Executive ruling

The log was useful and found one real fail-open benchmark-audit defect. It also
contains measurements and two compiler/CLI findings that are stale relative to
the current branch.

- **Confirmed and fixed in Galerina:** comparator results could exist while the
  intended Galerina subject was absent, yet the benchmark audit classified the
  row as merely “not shown.” The audit now raises
  `benchmark-subject-absent` at HIGH severity.
- **Confirmed and fixed in Galerina:** the framework-pipeline subject had
  started failing closed after App Kernel authentication was tightened. Its
  benchmark now supplies an explicit admitted K3 channel verdict rather than
  relying on header presence.
- **Confirmed and fixed in Galerina:** benchmark-source directories and the
  runner/results catalog could previously drift without a refusal. The audit
  now checks duplicate, missing, unexpected, non-publication and unregistered
  benchmark surfaces. Its planted controls pass.
- **Confirmed and fixed in Galerina:** GPU toolchain probes used
  `execFileSync` with `shell: true` on Windows. Direct argv execution now
  removes that injection-prone/deprecated path.
- **Retracted as stale:** `galerina check <file>` does not silently skip files
  on this branch. Four staged files were checked individually and all four
  were actually parsed and verified. Supplying a directory refuses with
  `FUNGI-BACKEND-001` and exit 1.
- **Retracted as stale:** the false `native.call` effect on
  `galerina-target-native` is absent on this branch. The staged file passes the
  current strict frontend with zero errors and zero governance warnings.
- **Still quarantined:** none of the four staged candidates has executable
  SLIDE parity. Target GPU and target native also lack both candidate-status
  and test dossiers; target Wasm lacks its test plan and parity vectors.
- **Architecture conflict resolved:** the 16-file “floor” is a bounded
  bootstrap TCB, not a permanent TypeScript exemption. It may retire only
  after an independently admitted SLIDE replacement carries equivalent
  crypto, host-seam and algorithm evidence.

## Fresh evidence

| Check | Result |
|---|---|
| Staging topology audit | PASS |
| `galerina-substrate-math/src/index.fungi --strict-types` | 0 errors, 0 warnings |
| `galerina-target-gpu/src/index.fungi --strict-types` | 0 errors, 0 warnings |
| `galerina-target-native/src/index.fungi --strict-types` | 0 errors, 0 warnings |
| `galerina-target-wasm/src/index.fungi --strict-types` | 0 errors, 0 warnings |
| Directory passed to `galerina check` | refused, `FUNGI-BACKEND-001`, exit 1 |
| Translation retirement finder | 477 implementation `.ts`; 491 tracked package `.ts`; finder drift 0 |
| Retirement partition | 26 twinned; 97 compiler bootstrap; 16 bounded bootstrap floor; 338 migration program |
| Authority state | 36/39 flips: 7/7 compiler and 29/32 governed |
| Benchmark audit self-test | 15/15 |
| Benchmark package tests | 6/6 test files |
| Publication catalog under stale-only gate | fresh and complete |
| Full live benchmark-integrity audit | refused: 2 HIGH subject-absence findings |

The live full audit remains red for:

1. `spectral-norm`: comparator-only historical result; no admitted
   Galerina/SLIDE subject exists.
2. `framework-pipeline`: historical `latest.json` contains `nodejs: null`
   because the benchmark predates the tightened identity gate.

The framework executable is repaired and its focused probe reaches 10/10
handlers. The runner is also hardened so a filtered `--benchmark` run writes a
separate `<benchmark>-latest.json`; only an unfiltered run may replace
publication `latest.json`. A fresh publication run remains deferred until
executable SLIDE and equivalent workloads exist, as directed by the owner.

## Issue-by-issue adjudication

### 1 — corpus scope

**Confirmed in principle; numeric snapshot superseded.** Existing `.fungi`
must be reconciled, never blindly regenerated from TypeScript. Current
authoritative totals come from `scripts/ts-retirement-graph.mjs`, not an ad-hoc
filesystem census.

### 2.1 — array indexing

**Retraction retained.** `Array.get` plus exhaustive `Some`/`None`/`_` handling
is the deliberate safe access form.

### 2.2 — `for x in xs`

**Translation guidance retained.** External candidates must use admitted
iteration syntax and current real source examples. Frontend acceptance alone
does not establish loop semantics or parity.

### 2.3 — file-path checking

**Stale; retracted.** A file path is the correct current CLI seam. A directory
fails closed. The external handover’s per-file command is therefore correct.

### 3 — target Wasm

**Frontend-only candidate.** Its declared enum tightening may be desirable,
but the parse-boundary refusal, indexed diagnostic paths, array-miss behavior
and semantic parity must be specified and tested before adoption.

Ruling for array misses: an `Array.get(i)` miss while `i < length` is an
internal invariant failure and must refuse. `None` and `_` must not silently
skip an artefact.

### 4.1 — assignment scope

**Confirmed coordination hazard.** The batch assignment supersedes the
one-package placeholder only when it is explicitly issued. An unsubstituted
`<PACKAGE>` authorizes no translation.

### 4.2 — staging audit filename policy

**Fix accepted, audit still incomplete.** Secret-related source filenames are
not credentials. The corrected key/credential and PEM-content rules are
appropriate. However, the current staging audit reports PASS even when
candidate-status, parity vectors and test plans are missing. That PASS proves
flat topology and basic quarantine hygiene only.

### 4.3 — retained TypeScript exceptions

**Confirmed but tightly scoped.** Runtime-under-test source such as Deno
WebGPU is benchmark evidence, not a Galerina package implementation. Every
remaining `.ts` path still needs a recorded bucket and eventual retirement or
explicit non-package evidence role.

### 5 — benchmark subject absence

**Confirmed and fixed at the audit seam.** The inverse of “subject present,
comparator absent” is not harmless. Comparator data without the admitted
subject now blocks publication.

`spore-container` is not subject-absent: its Node lane is the Galerina-owned
Spore engine. `intelligence-search` is present in both the runner catalog and
current results. `framework-pipeline` is a genuine stale-result failure, now
repaired at its authentication input. `spectral-norm` remains a deliberate
future-SLIDE blocker.

The disk observations are also adjudicated:

- `gate-cache` is explicitly admitted as a standalone, non-publication
  microbenchmark.
- `tmf-container` contains only an ignored local `.pdb`, no tracked benchmark
  source, and is therefore not a runnable benchmark surface.
- any future source-bearing directory absent from both the active and
  non-publication catalogs now produces a HIGH refusal.

### 5A.1 — ad-hoc census

**Confirmed.** Use the retirement graph. Its finder self-test and exact
partition are the authority for counts.

### 5A.2 — permanent floor

**Superseded by owner direction.** The floor is temporary bootstrap authority,
not “NEVER retire.” `galerina-substrate-math` may be used as a translation
reference without granting it execution authority. The retirement graph now
states the admitted-SLIDE exit condition explicitly.

### 5A.3 — codemod versus staging

**Both retained with separate roles.** Staging produces untrusted candidate
source, dossiers and test vectors. The governed migration program performs
reconciliation, differential proof, package placement, authority transition,
signing and deletion. A staged candidate cannot bypass that program.

### 5B — reserved identifiers and PowerShell BOM

**Retained as translation guidance.** These are tooling/input hazards, not
reasons to weaken the language or JSON parser.

### 5C — false `native.call`

**Stale; retracted.** The current effect checker distinguishes static
`Native*` members from real native invocations. The strict staged target-native
check is green.

## Candidate admission state

| Candidate | Frontend | Dossier | Execution/parity | Decision |
|---|---|---|---|---|
| `galerina-substrate-math` | green | status + vectors + plan present | no executable SLIDE parity | retain as reference only |
| `galerina-target-gpu` | green | missing status, vectors and plan | absent | quarantine |
| `galerina-target-native` | green | missing status, vectors and plan | absent | quarantine |
| `galerina-target-wasm` | green | status present; vectors and plan missing | absent | quarantine |

Nothing is copied into Galerina until the package contract is executable and
the candidate passes syntax, governance/effects, parity, negative controls,
mutation/anti-neuter evidence, flat dependency admission and deletion gates.

## Zero-trust adoption score

This score applies to the **benchmark publication hardening**, not to the
unverified package candidates.

- R&D complete: yes for the identified benchmark failure classes
- dimensions: authority 10, fail-close/K3 10, integrity 9, memory 8,
  injection 9, determinism 9, resource/recovery 8, compatibility 9,
  evidence 10, benefit/cost 9
- weighted score: **9.2 / 10**
- hard vetoes: none
- decision: **ADOPT-CANDIDATE**, implemented with controls
- required exit evidence: focused self-tests; direct framework subject probe;
  package tests; catalog gate; full publication audit after executable SLIDE
- re-score trigger: a new subject-lane type, benchmark execution model,
  publication format, or external benchmark plugin

The staged package candidates remain **PENDING** because executable parity,
host-boundary authority, dependency/ABI proof and falsifying evidence are
materially incomplete. Assigning them optimistic scores would violate the
scoring standard.

## Resume point

1. Keep all four external candidates quarantined.
2. Strengthen the staging audit so missing dossier evidence cannot produce an
   undifferentiated PASS.
3. Freeze the executable SLIDE package contract.
4. Reconcile candidates in dependency order through the governed migration
   lane.
5. Run the complete benchmark once SLIDE executes identical workloads; then
   regenerate `latest.json`, report and both requested charts together.
