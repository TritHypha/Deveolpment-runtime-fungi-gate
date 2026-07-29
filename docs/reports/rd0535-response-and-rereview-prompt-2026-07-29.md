# Response to RD-0535 and re-review prompt

**Status:** VERIFIED-CURRENT for the measurements and commands named below;
PROPOSED for the remaining label-lint design.

**Date:** 2026-07-29

## Answer

RD-0535's central architectural judgement is accepted: native-first SLIDE,
with detached executable GIR as the cut point and Wasm retained as an optional
compatibility/differential oracle, is the current direction. The review is
also right that falsifiable release gates and the zero-trust rules are stronger
than an aspirational platform claim.

The status-label finding was real in class, but its 14/38 measurement is no
longer the current tree. A fresh mechanical scan of every `.md` and `.txt`
under `triLowLevel-v2` found:

- 38 documents total;
- 28 containing at least one charter status label;
- 10 containing none.

The ten current gaps are:

1. `17-FIRST-VERTICAL-SLICE.md`
2. `20-V2-A-REGISTRY-DESCRIPTOR.txt`
3. `22-V2-B-AUDIT-RESOURCE-DESCRIPTOR.txt`
4. `22-V2-B-CAPABILITY-DESCRIPTOR.txt`
5. `22-V2-B-DATABASE-RESOURCE-DESCRIPTOR.txt`
6. `22-V2-B-HTTPS-RESOURCE-DESCRIPTOR.txt`
7. `24-V2-C-REGISTRY-DESCRIPTOR.txt`
8. `25-V2-D-REGISTRY-DESCRIPTOR.txt`
9. `26-V2-E-FRONTEND-RECEIPT-AND-SOURCE-MAP.md`
10. `27-GENERAL-GALERINA-FRONTEND-HANDOFF.md`

This is not closed. A mechanical mass edit would be unsafe: seven of the ten
are canonical descriptor text whose exact bytes are digest-bound. Injecting a
status label into those files would change the artifact being specified.
The correct PROPOSED enforcement is:

- narrative documents carry an in-document charter label;
- canonical byte descriptors carry status in a digest-bound registry or exact
  sidecar mapping, without changing their bytes;
- the lint validates both directions, rejects stale sidecar entries, and
  refuses a normative narrative document with no status.

No status-label lint exists yet, so this remains an explicit open tooling item.

## Is `triLowLevel-v2` out of date?

It is not the implementation repository. Its README already identifies it as
the architecture/planning source and points to `../SLIDE` as the independent
implementation home. Therefore "zero source code in `triLowLevel-v2`" is true
but no longer evidence that SLIDE itself has no implementation.

Current verified implementation evidence is:

- independent `SLIDE`: 3 source files, 4 exact test files, 30/30 tests;
- Galerina compiler: all 53 tracked self-hosted `.fungi` stages explicitly
  governed as loaded assets, with zero unexplained compiler graph orphans;
- Galerina SLIDE lane: 477/477 tests from exactly 25
  `slide-*.test.mjs` files;
- combined lane: Galerina 477/477 plus separately named independent SLIDE
  30/30, with no independent result inferred from Galerina evidence;
- five-child Galerina aggregate: unit 5,823, e2e 4/4, R6 10/10, fidelity 9/9,
  and SLIDE 477/477;
- compiler build evidence: deterministic SHA-256 over the exact 534
  Git-tracked compiler source/test inputs, with missing, malformed, untracked,
  set-drifted, and content-mismatched refusal tests.

Relevant local Galerina commits are `6127ea9c` (explicit compiler asset
governance) and `ddf9986b` (SLIDE lane and deterministic build evidence).
Relevant independent SLIDE status is on branch
`codex/v2c-independent-frontend`; no branch has been pushed by this work.

## What RD-0535 still correctly leaves open

- No native LLVM/LLD production backend or benchmark release claim exists.
- Driver/hardware knowledge-library and privileged-helper designs still need
  their own implementation/security review.
- In-process native loading remains blocked pending its written TCB policy and
  isolation evidence.
- Ten planning documents/descriptors still lack enforced status association.
- A planning checkbox is not implementation evidence.

## Later-chapter answer: component handovers and tooling evidence

The 2026-07-29 follow-on handovers do not authorize removing Galerina
components:

- `SLIDE/docs/NESTING-AND-XOR-DECISION.md` rejects the recalled “three XOR”
  explanation. Arithmetic Trit XOR remains type-separated from authority;
  typed, total K3 decisions remain the authority algebra. The exact historical
  `while -> if -> if -> while` mutation shape still needs a dedicated
  negative/control regression.
- RD-0580 says WAT/Wasm is removed only from a future mandatory native hot
  path, after replacement evidence. It remains an optional backend and
  differential oracle; no present physical deletion is authorized.
- RD-0581 is a useful but partial component manifest. Its highest-value
  obligations are a single canonical K3 binding, proposal-only Tri-Pipe,
  receipt-producing Tower Citizen, and backend-neutral witnessed Tri-Fuse.
  Its cited Galerina facts must be re-verified at source before implementation.

The generator-governance chapter now has thirteen live repository-output
generators plus one fail-closed graph orchestrator and one external-output
memory generator. Fresh evidence through Galerina commit `497b02e9` is:

- the focused generator fixture suite passes 25/25, the graph-orchestrator
  injected-failure fixture passes 1/1, the package-graph core passes 27/27,
  and the KB-graph core passes 31/31;
- the contract-registry anti-vacuous self-test finds 1,331 contracts;
- the live generator audit passes 13/13 after exact declared-write,
  provenance, second-run idempotence, and non-mutating-check verification;
- package-graph governance preflights all 97 registered packages before
  publishing any output, enumerates all 195 outputs without a wildcard, and
  makes the underlying CLI check non-mutating. Its live preflight exposed a
  real `.mjs` resolution defect and 15 unexplained ownership sets; the
  extension bug is regression-tested and the ownership sets are now explicit.
  One dormant benchmark sampler remains visibly justified as an allowed
  orphan rather than being counted as live;
- the private KB index and KB graph bind their explicitly selected external
  corpus by SHA-256 without publishing absolute paths. The memory graph binds
  and checks its selected external tree in place. `graph-all` now runs all six
  children, separates generate/check modes, aggregates results, and propagates
  every refusal instead of returning success unconditionally;
- the read-only live `graph-all --check` passes 5/6 and correctly refuses the
  memory child because four candidate memory trees exist and none is
  authorized. That owner-only selection remains red and is recorded in
  SLIDE `QUESTIONS-FOR-OWNER.md` at commit `5f3b2ff`;
- the tooling-contract audit deliberately remains red on the same 21 named
  Task 8 dispositions. That red is tracked work, not a release-green claim;
- generated Task 9 outputs remain a separate unstaged working set and were
  not mixed into the manual generator commit.

Independent SLIDE code at commit `8a28199` remains 30/30 from four separately named
suites. Neither repository branch was pushed.

## Prompt for the RD-0535 reviewer

```text
Re-review the native-first SLIDE / triLowLevel v2 work as a hostile,
evidence-first architecture and implementation auditor. Do not modify any
repository.

Resolve every path below relative to the shared GitHub workspace root.

Read these two documents first:
1. ZTF-Knowledge-Bases/RD-0535-trilowlevel-v2-review-native-first-slide-and-the-label-discipline-gap.md
2. Galerina/docs/reports/rd0535-response-and-rereview-prompt-2026-07-29.md

Then read these follow-on handovers:
3. SLIDE/docs/NESTING-AND-XOR-DECISION.md
4. ZTF-Knowledge-Bases/RD-0580-HANDOVER-what-tll-v2-changes-in-galerina-component-removal.md
5. ZTF-Knowledge-Bases/RD-0581-galerina-named-component-manifest.md

Then review all three scopes, without treating one as a substitute for another:
- planning/architecture: triLowLevel-v2/
- independent implementation: SLIDE/
- Galerina integration: Galerina/

Answer the response, not merely the original review:

1. Re-measure charter status-label coverage across all 38 triLowLevel-v2
   .md/.txt documents. Use two independent measurement methods and reconcile
   any disagreement. List every unlabelled file.
2. Decide whether canonical, digest-bound descriptor .txt files should carry
   an in-band label or an exact sidecar/registry status. Treat any byte change
   as a potential protocol change. Propose a fail-closed bidirectional lint
   that detects missing and stale status associations.
3. Read in full at minimum 00, 02, 05, 06, 17, 19, 27, README, TODO, and every
   currently unlabelled narrative document. State exactly what you did not
   read.
4. Inspect the actual SLIDE source and tests. Verify that independent code does
   not import Galerina implementation code and that its evidence is separately
   named rather than counted as Galerina evidence.
5. Inspect Galerina commits 6127ea9c and ddf9986b and the current working-tree
   diff. Check exact SLIDE corpus discovery, empty/uncountable refusal, child
   exit propagation, NODE_TEST_CONTEXT removal, compiler asset ownership, and
   deterministic compiler build evidence.
   Also inspect current Galerina commit 497b02e9, independent SLIDE code commit
   8a28199, and its question-ledger commit 5f3b2ff. Never infer that unstaged
   generated artifacts belong to the manual commit.
6. Try to falsify the build-evidence contract: missing evidence, malformed
   schema, altered tracked content with preserved/older timestamps, added or
   removed tracked inputs, untracked source, deleted tracked source, and Git
   enumeration failure. Report any path that can still false-green.
7. Re-run, or state why you could not run:
   - in SLIDE: npm.cmd test
   - in Galerina/packages-galerina/galerina-test: npm.cmd test
   - in Galerina:
     node packages-galerina/galerina-test/dist/cli.js slide --json
   - the programmatic runSlide call with independentRoot ../SLIDE
   - node packages-galerina/galerina-test/dist/cli.js all --core --json
8. Challenge the native-first decision again. Separate verified current facts,
   proposed architecture, experiments, blocked work, and rejected ideas. Do
   not infer native safety, performance, admission, or twenty-year
   compatibility from test counts.
9. Try to falsify the thirteen live repository-generator contracts, the
   external memory check, and graph-all orchestration. Confirm exact declared
   write sets, provenance, second-run semantic idempotence, and non-mutating
   check modes. For package graphs, verify all 97 registered package sets, all
   195 explicit outputs, `.mjs` internal-edge resolution, no partial
   publication, and the one visible dormant-sampler exception. Reconcile the
   external KB corpus digests, memory source digest, all-six child coverage,
   and nonzero child-refusal propagation. Reconcile the intentional 21-tool
   Task 8 red set; do not call the phase close green while it remains, and do
   not choose one of four memory trees by file count.
10. Re-evaluate RD-0580/RD-0581 against current Galerina source. Distinguish
    “cut from the future mandatory path” from physical deletion. Test the
    claimed K3 duplication, Tower/Tri-Pipe authority shapes, Tri-Fuse backend
    coupling, and WAT AST dependency. Treat either handover as advisory until
    its facts reproduce.
11. Give findings first, ordered by severity, with exact file/line evidence.
   Record your coverage and instrument limitations. If the response is wrong,
   say so plainly; if a prior RD-0535 measurement is now stale, distinguish
   historical accuracy from current accuracy.
```
