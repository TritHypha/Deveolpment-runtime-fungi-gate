# Task 2 report — bounded detached-authority closure audit

## Status

Implemented and committed locally; not pushed. The Task 2 detector and its
focused tests are green at implementation commit
`dab487d19f0c85bd458b4de6108f890d3e081203`.

Milestone closure remains **HOLD — independent audit pending**. This authoring
session performed a scoped self-review and fresh verification, but did not
self-certify the security detector as independently audited.

## Commits

- Implementation and tests:
  `dab487d19f0c85bd458b4de6108f890d3e081203`
  (`feat: audit detached authority closure`).
- This report is committed separately. Its SHA is supplied in the task handoff
  because a commit cannot truthfully contain its own SHA.

Both commits are local-only. No push, pull request, merge or registration was
performed.

## RED evidence

Before production code existed:

```text
node --test scripts/tests/detached-slide-authority-path.test.mjs
```

Exit: `1`. Exact cause: `ERR_MODULE_NOT_FOUND` for
`scripts/audit-detached-slide-authority-path.mjs`, imported from the focused
test. The same exact missing-module RED was reproduced after amending the test
to the Task 2 API and result contract, before creating the detector.

A later focused false-positive regression test planted the benign module
`forecast.ts`. It failed as `AST_REENTRY`, demonstrating that substring-only
module matching was unsafe. The matcher was then narrowed to delimited module
segments; the regression passed without weakening the planted red fixtures.

## Implementation evidence

- Exports the exact async surface
  `auditDetachedAuthorityPath({ repoRoot, entryFiles, expectedHead,
  maximumFiles = 256, maximumEdges = 2048 })`.
- Returns a recursively frozen exact `DetachedAuthorityAuditV1` record with
  only the twelve planned fields.
- Queries Git and the maintained codebase-memory CLI through the repository's
  owned-process runner with finite timeout and output bounds. The programmatic
  surface selects the graph project by
  `GALERINA_DETACHED_AUTHORITY_GRAPH_PROJECT`; the CLI uses
  `--graph-project`. Neither route accepts a caller-provided freshness
  Boolean, and both independently bind graph root, graph build point,
  repository HEAD and `stale: false`.
- Uses the pinned repository TypeScript compiler API to parse static imports,
  re-exports, literal dynamic imports, renamed imports and namespace
  call/property surfaces. Parse ambiguity, non-literal imports, missing files,
  outside-root imports and unapproved package imports refuse.
- Resolves only canonical repository-relative regular files, rejects symlinks
  and case-variant duplicates, reads each admitted source twice, and compares
  exact bytes before using it.
- Applies explicit caller and hard file/edge ceilings. Any ceiling hit returns
  `DETACHED_AUTHORITY_ANALYSIS_TRUNCATED` with status `REFUSED`.
- Computes `rulesetDigest` from deterministic sorted rule data without
  ambient locale sorting.
- Preserves CLI exit algebra: `0` PASS, `1` material forbidden authority,
  `2` malformed/stale/unresolved/truncated/internal refusal.
- The exact package allow-list is empty in this slice. No package dependency is
  admitted implicitly.

## Tests

Fresh post-implementation-commit evidence:

- `node --test scripts/tests/detached-slide-authority-path.test.mjs` —
  **13/13 PASS**, exit `0`.
- `node --test scripts/tests/owned-process-tree.test.mjs scripts/tests/bounded-closure-receipt.test.mjs` —
  **8/8 PASS**, exit `0`.
- `node --test --test-name-pattern "^4 classifier admits primitive literals" scripts/tests/ts-to-fungi-sandbox.test.mjs` —
  **1/1 PASS**, exit `0`.
- `node --check scripts/audit-detached-slide-authority-path.mjs` and the
  focused test — both exit `0`.
- `git diff --check` for the test plus `git diff --no-index --check` for the
  new detector — no whitespace findings.

The broader proportional sandbox command completed rather than hanging:

```text
node --test scripts/tests/owned-process-tree.test.mjs scripts/tests/ts-to-fungi-sandbox.test.mjs scripts/tests/bounded-closure-receipt.test.mjs
```

It reported **43/57 PASS** and exit `1`. All 14 failures are outside the
Task 2 paths: seven refuse because the independent SLIDE repository is
unavailable, and seven refuse because the older sandbox's own canonical graph
project discovery command returns nonzero in this explicitly named worktree.
The directly used owned-process, receipt and TypeScript parser seams pass in
the isolated commands above. No unrelated sandbox control was changed.

## Graph evidence

A moderate post-commit refresh was rejected as evidence because it excluded
`scripts/` and returned the stale pre-implementation build point despite
saying `status: indexed`.

A full refresh then returned:

- project: `Galerina-detached-authority-detectors`;
- indexed head:
  `dab487d19f0c85bd458b4de6108f890d3e081203`;
- nodes: `63829`, expected nodes: `63829`;
- edges: `164237`, expected edges: `164237`.

A separate status read reported `ready`, `stale: false`, matching graph and
Git heads, and the exact worktree root. A graph probe resolved exported
`auditDetachedAuthorityPath` in
`scripts/audit-detached-slide-authority-path.mjs`.

## Review notes

- Self-review found and fixed the `forecast.ts` substring false positive
  through a new RED/GREEN regression.
- The receipt contains locators, digests, edge identifiers and freshness/result
  metadata only; fixture source bodies and absolute paths are absent.
- Every Task 1 planted class remains red-capable with its exact identifier.
  Unresolved closure and truncation remain refusals, not material findings or
  PASS.
- The implementation/test commit contains exactly:
  `scripts/audit-detached-slide-authority-path.mjs` and
  `scripts/tests/detached-slide-authority-path.test.mjs`.
- No compiler behavior, runtime behavior, conversion report, package script,
  phase-close registration, generated index, Task 3 fixture or Task 4
  composition was changed.

## Concerns

- Independent read-only review is still required for false negatives,
  false positives, truncation and receipt leakage at the exact landed build
  point. No subagent was used because the task explicitly prohibited it.
- The wider sandbox suite remains environment-red as recorded above. Those
  refusals are not hidden or reclassified as green.
- After this report commit, the external graph must be refreshed again before
  any current-HEAD freshness claim or focused audit run.

## Fix Round 1

### Status

The independent HOLD findings were reproduced and fixed in the Task 2 scope.
The fix is local-only and remains **HOLD — independent re-review pending**.
This section supersedes the earlier description of ambient graph-project
selection; neither the exported API nor the CLI now accepts a graph project.

### RED evidence

The adversarial tests were committed first at
`71828e8f7f63e66f221f7547a2039c3970a3ec98` and the full graph was refreshed
to that exact head: 63,830 nodes, 164,239 edges, expected counts equal, and
`stale: false`.

The exact-head focused run then reported **12/22 PASS**, exit `1`, with ten
intended failures:

- a forbidden default declaration imported under a benign default name passed;
- an assignment alias of a forbidden named import passed;
- a namespace member destructured under a benign name passed;
- CommonJS literal `require()` and TypeScript import-equals `require()` failed
  to enter the closure and their forbidden surfaces passed;
- non-literal and unapproved package `require()` forms passed;
- an ambient graph-project value selected graph authority;
- a PATH-prepended executable redirected the bare graph command;
- the CLI accepted `--graph-project`; and
- the CLI required the removed caller-selected graph argument.

An additional inline CommonJS surface (`require('./helper.cjs').emitGIR()`)
was planted after the first fix pass. Its focused run was **0/1 PASS**, exit
`1`, because the detector still returned PASS. After the syntax-aware inline
surface fix, the same test was **1/1 PASS**, exit `0`.

### Implementation evidence

- Default imports resolve the target module's default exported declaration
  before call-surface classification. Named imports, namespace property calls,
  assignment aliases and namespace destructuring propagate exact forbidden
  symbol rules without substring matching.
- Literal CommonJS `require()` and TypeScript import-equals `require()` enter
  the same bounded local closure as ESM imports. Recognised bindings and inline
  property surfaces retain alias resistance. Non-literal and unapproved package
  forms refuse; forbidden package dependencies remain material findings.
- Graph authority is discovered from the unique project whose canonical root
  equals the independently canonicalised repository root. The selected status
  must bind that root, its worktree root, the indexed head, graph-reported Git
  head, `ready`, and `stale: false` to the expected head.
- The maintained graph executable is resolved from the fixed user-local
  provider location, not PATH, an environment-selected project, a CLI project
  flag, or a caller-supplied provider. Its regular-file/non-symlink identity and
  maintained `+dumpswap` version contract are checked before use.
- Repository HEAD is read independently from bounded, stable Git administrative
  files, including worktree `gitdir`/`commondir`, loose refs and bounded
  `packed-refs`; no bare Git executable is trusted. HEAD is checked before and
  after traversal.
- The audit has a 60-second whole-audit deadline. Child commands inherit the
  remaining time, and traversal checks the deadline. File and edge hard ceilings
  remain unchanged. The closure queue now uses a pending set plus ordered binary
  insertion instead of repeated `includes()` and full-array sorting.

### GREEN evidence

The first complete fix run reported **22/23 PASS**. The sole failure was a
bounded project enumeration reaching the initial 35-second inner child cap in
the third independent CLI audit; it returned graph unavailable rather than
the expected unresolved-closure refusal. The inner command cap was raised to
50 seconds while retaining the stricter 60-second whole-audit deadline.

Fresh pre-commit verification of the final bytes:

- `node --test scripts/tests/detached-slide-authority-path.test.mjs` —
  **24/24 PASS**, exit `0`, 144.665 seconds;
- targeted three-process CLI exit algebra — **1/1 PASS**, exit `0`,
  110.710 seconds;
- `node --test scripts/tests/owned-process-tree.test.mjs scripts/tests/bounded-closure-receipt.test.mjs` —
  **8/8 PASS**, exit `0`;
- targeted TypeScript classifier seam — **1/1 PASS**, exit `0`;
- syntax checks for production and focused test — both exit `0`; and
- `git diff --check` — exit `0`, no whitespace findings.

The fix commit contains the production detector, focused adversarial tests and
this report. Its SHA is supplied in the handoff because a commit cannot contain
its own SHA. A full graph refresh and exact-head post-commit verification are
required before final freshness is claimed.

### Review notes and limitations

- The executable provider no longer inherits PATH authority. The remaining
  dependency trust boundary is the installed bytes at the fixed user-local
  maintained-provider path: the repository has no source-controlled executable
  digest or stronger provider attestation primitive. Replacement of those
  installed bytes by an actor who can write that location is outside this
  detector's proof; malformed, missing, symlinked, wrong-version or ambiguous
  graph/project state fails closed.
- Unique-project discovery is intentionally slower in a fresh process (about
  30 seconds in this environment). It is bounded, and a process caches only the
  root-derived unique project while every audit still rechecks exact status,
  root, current Git head, indexed head and `stale: false`.
- The earlier 14 broader sandbox refusals remain external-environment results:
  seven independent-SLIDE-unavailable refusals and seven older sandbox graph
  discovery nonzero refusals. No unrelated sandbox control was weakened.
- Exact frozen `DetachedAuthorityAuditV1`, receipt confidentiality, canonical
  relative locators, case-variant duplicate refusal, stable ruleset digest and
  CLI exit algebra `0/1/2` are preserved.

## Fix Round 2

### Status

The second independent HOLD findings were reproduced at an exact committed
RED checkpoint and fixed only within Task 2. The work remains local-only and
**HOLD — independent re-review pending**. Task 3 registration was not started.

### RED evidence

The new adversarial controls were committed before production changes at
914ee7fdfd44969d0255c4d70bef75f7c712a69a. A full graph refresh at that
exact checkpoint reported 63,855 nodes and 164,389 edges, with expected counts
equal, matching graph/Git heads, ready, and stale: false.

The provider-authentication suite then failed at import time with exact
ERR_MODULE_NOT_FOUND for scripts/lib/detached-authority-provider.mjs. The
focused detector suite was **25/36 PASS**, exit 1, with eleven intended RED
controls:

- a default export passed through a default re-export barrel;
- a later assignment alias passed;
- constant-computed and unresolvable-computed namespace members passed;
- aliased CommonJS loader, inline member and destructured member forms passed;
- aliased non-literal and package loads passed instead of refusing;
- the locally shadowed require control was misclassified;
- a spoofed USERPROFILE redirected provider discovery; and
- provider authentication had no pinned byte-identity seam.

The strict source-byte ceiling was already red-capable and passed at the RED
checkpoint; it was retained as a regression control.

### Implementation evidence

- Forbidden export rules now propagate through a bounded module-level
  re-export fixpoint, including default re-export barrels.
- Binding analysis is flow-sensitive within lexical scopes. Initialisers and
  later assignments propagate authority, benign reassignment clears it, local
  shadowing does not inherit an outer binding, and branch/loop joins retain
  ambiguity rather than silently erasing authority.
- Constant string property expressions are folded within a depth bound.
  Unresolvable computed access from an authority-tainted namespace refuses
  instead of passing.
- CommonJS dependency discovery tracks the intrinsic require loader through
  aliases and assignments while distinguishing a lexically shadowed require.
  Literal local loads enter the exact closure; non-literal and package loads
  refuse under the empty package allow-list. Inline, namespace and destructured
  surfaces retain forbidden-symbol authority.
- The provider path derives from native os.userInfo().homedir, not
  environment-sensitive os.homedir(), PATH, a caller argument or a graph
  project environment variable. Owned provider children receive an environment
  rebound to that native home.
- The maintained provider executable is pinned to exact version
  codebase-memory-mcp 0.9.0+dumpswap and SHA-256
  445dff9d06d613a33a5943c17cc808eca438b1a4922140e9d73400f7ac84bd7f.
  Authentication rejects missing, non-regular, symlinked, oversized,
  wrong-digest and wrong-version providers, and rechecks the exact file
  snapshot after the bounded version process. Provider digest and version are
  inputs to the stable ruleset digest.
- The 4 MiB per-source byte ceiling is applied before reads and parsing and is
  part of the deterministic rules. The unchanged hard ceilings are 4,096 files
  and 32,768 edges. Deadline checks surround asynchronous metadata/source I/O,
  TypeScript loading and parsing, import collection, the bounded re-export
  fixpoint, surface analysis passes and the final HEAD read.

### GREEN evidence

The first targeted production rerun was **10/11 PASS**. Its sole failure proved
that the authenticated graph child still inherited the spoofed USERPROFILE;
rebinding its explicit owned-process environment to the native home made that
exact control **1/1 PASS**, exit 0.

Provider authentication is **3/3 PASS**, exit 0, covering missing/wrong digest,
authenticated bytes with wrong version, and symlink refusal.

The first complete regression run was **31/36 PASS**. All five failures had one
root cause: the CommonJS walker passed the absent body of a TypeScript declare
function to a syntax predicate. The body-less declaration guard then made the
affected AST, TypeScript, legacy execution and ceiling subset **4/4 PASS**,
exit 0.

Fresh verification of the corrected working bytes:

- node --test scripts/tests/detached-slide-authority-path.test.mjs —
  **36/36 PASS**, exit 0, 212.899 seconds;
- node --test scripts/tests/detached-authority-provider.test.mjs —
  **3/3 PASS**, exit 0;
- node --test scripts/tests/owned-process-tree.test.mjs
  scripts/tests/bounded-closure-receipt.test.mjs — **8/8 PASS**, exit 0;
- targeted TypeScript classifier/parser seam — **1/1 PASS**, exit 0;
- syntax checks for both production modules — exit 0; and
- git diff --check — exit 0, no whitespace findings.

The earlier broader sandbox result remains truthfully external-environment
red: 14 refusals, split between seven independent-SLIDE-unavailable cases and
seven older sandbox graph-discovery nonzero cases. No unrelated control was
changed to conceal or reclassify them.

### Review notes and limitations

- The 60-second in-process audit deadline is cooperative, not a hard
  interruption of synchronous TypeScript parsing. Owned provider commands have
  hard process-tree timeouts. Total in-process input is deterministically
  bounded by the unchanged file/edge hard ceilings and the new strict 4 MiB
  per-file ceiling; checks between I/O, parse and bounded analysis passes stop
  further work after expiry.
- Provider upgrades are reviewed fail-closed changes: changed installed bytes
  refuse until the source-controlled digest/version contract is deliberately
  updated. The residual trust boundary is the reviewed pinned digest and the
  operating system's execution of the authenticated fixed-path bytes; no
  caller-selected provider or self-reported version alone grants authority.
- The exact frozen receipt schema, source-body confidentiality, canonical
  relative locators, case-sensitive duplicate controls, stable ruleset digest,
  file/edge ceilings and CLI exit algebra 0/1/2 remain unchanged.
- A full graph refresh plus independent status and symbol/content probes is
  required at the final fix/report commit before any final freshness claim.

## Fix Round 3

### Status

The third independent HOLD findings were reproduced at the exact committed
RED checkpoint `f088a91b01e9014204d8f43d3f5e1f89f6f741c3` and fixed only within
Task 2. Production fixes are committed locally at
`8cacdd7fe4a4b85552d8eaf151c8bab114fdd3c7`. Task 3 registration remains
closed, and the result remains **HOLD — independent re-review pending**.

The Fix Round 2 statement that branch and loop joins retained ambiguity was
too broad. Conditional-expression side effects and switch/try assignment
branches were still discarded or traversed without a conservative merge.
This round corrects that overstatement and supplies exact RED/GREEN evidence.

### RED evidence

The two new test files were committed before production changes. At that RED
checkpoint:

- the eight-case detector subset was **2/8 PASS**, exit `1`; the only passing
  controls were benign switch/try joins and lexically shadowed
  `module.require`;
- conditional-expression, switch/try, `module.require` closure,
  `module.require` nonliteral/package refusal, escaped-loader, and hostile
  environment controls all failed as planted; and
- the provider suite was **3/5 PASS**, exit `1`, because the authenticated
  command seam did not exist and neither new TOCTOU control could call it.

A full graph refresh was invoked with HEAD at the RED commit, returning 63,903
nodes and 164,696 edges, but production edits were already present in the
working tree. That refresh is explicitly excluded as proof of the committed
RED contents. No MCP structural-freshness claim is made from it.

### Implementation evidence

- Conditional-expression scopes now merge their side effects. Switch paths
  model possible matching clauses and fall-through; try/catch/finally paths
  conservatively merge successful and exceptional assignment states. A known
  forbidden symbol on any continuing branch remains material, while
  unresolved authority refuses.
- CommonJS discovery treats unshadowed `module.require` as an intrinsic static
  loader, closes literal local namespace and inline-member forms, and refuses
  nonliteral/package loads under the empty allow-list. Direct loader aliases
  remain supported. Loader escape through parameters, call/new arguments,
  object/class properties, arrays, returns, yields, or unsupported property
  assignment refuses; lexical `require` and `module` shadows remain benign.
- `runAuthenticatedProviderCommand` validates bounded arguments and performs a
  canonical direct-file snapshot, pinned SHA-256 check, and stable
  identity/size/mtime comparison immediately before and after every provider
  command. The version, project enumeration, and index-status invocations all
  use this seam and fail closed on any mismatch.
- Provider children no longer receive a spread of ambient variables. Native
  user-home values are used for home/profile. On Windows, a validated
  deterministic system/Git path is supplied because experiments proved that
  omitting PATH lets Windows inherit the hostile parent value; no caller or
  ambient PATH selects the provider or graph project.

### GREEN evidence

The first full rerun was **42/44 PASS**, exit `1`. Both failures were existing
supported CommonJS alias controls: an initially over-broad generic escape rule
mistook `const load = require` for a container escape. Moving refusal to actual
unsupported sinks made the two aliases plus the escaped-parameter control
**3/3 PASS**, exit `0`.

Fresh verification of the corrected bytes:

- round-three detector subset — **8/8 PASS**, exit `0`, 70.032 seconds;
- complete focused detector suite — **44/44 PASS**, exit `0`, 306.162
  seconds, including the bounded 112.608-second three-process CLI tail;
- provider authentication — **5/5 PASS**, exit `0`;
- owned-process and bounded-receipt support — **8/8 PASS**, exit `0`;
- targeted TypeScript classifier/parser seam — **1/1 PASS**, exit `0`;
- syntax checks for both production modules and both focused tests — exit `0`;
  and
- `git diff --check` — exit `0`, no whitespace findings.

The hostile-environment diagnostic isolated PATH as the only failing planted
variable. Each of `CODEBASE_MEMORY_DB`, `CODEBASE_MEMORY_HOME`,
`CODEBASE_MEMORY_PROJECT`, `HOME`, `NODE_OPTIONS`, `NODE_PATH`, `PYTHONHOME`,
and `PYTHONPATH` independently remained PASS/FRESH. After the deterministic
validated child-path fix, the complete hostile-variable control passed.

### Graph evidence and limitations

Direct provider status after the production commit was `ready` but correctly
`stale: true`: graph head remained at the RED commit while Git HEAD was the
production commit. This is reported separately from MCP state and is not a
freshness claim. The controller owns the final full MCP refresh and exact-head
symbol/content probes after the report commit.

Authentication narrows but does not eliminate concurrent replacement risk:
the provider is re-hashed with stat identity before and after each command,
but the detector does not claim protection against an attacker able to replace
bytes while preserving all checked evidence during execution. The
deterministically selected installed Git-for-Windows binary is canonical and
not ambient-selected, but is not source-digest-pinned; it remains a protected
installation trust boundary. Repository HEAD is nevertheless resolved
independently from bounded stable Git metadata and cross-checked against the
provider's graph status.

Exact frozen `DetachedAuthorityAuditV1`, receipt confidentiality, canonical
relative locators, case-sensitive duplicate controls, deterministic work
bounds, stable ruleset digest, and CLI exit algebra `0/1/2` remain unchanged.

## Fix Round 4

### Status

The fourth independent HOLD finding was reproduced at the exact committed RED
checkpoint `9bdaf8caa425f19494a03e6eee6d6c9b43c70278` and fixed only within
Task 2. The production checkpoint is
`717011e884c590ac68e26e3144b9b7b79aa8655e`; it remains local-only and
**HOLD — independent re-review pending**. Task 3 registration remains closed.

### RED evidence

Four controls were added and committed before production changed. The targeted
run at the RED checkpoint was **1/4 PASS**, exit `1`, in 44.252 seconds:

- chained aliases of the intrinsic `module` object followed by renamed
  `require` destructuring passed without entering the hidden helper closure;
- literal module indexing was recognised, but concatenated, bound-constant and
  computed-destructuring `require` keys were omitted, producing only one of
  four required exact closure edges;
- an unresolved computed property on the intrinsic module object passed
  instead of refusing; and
- the benign locally shadowed `module` control correctly passed with no edges.

The temporary RED fixture directory was owned by the focused test and removed
by its `finally` cleanup. Custody was clean before the RED commit. A subsequent
run while the graph still indexed the prior report commit refused as stale;
that run is excluded from implementation evidence rather than presented as a
GREEN result.

### Implementation evidence

- CommonJS binding analysis now carries a bounded module-object state through
  lexical aliases and object-binding patterns, including renamed and computed
  destructuring.
- Deterministic string keys are folded through literals, constant bindings,
  parentheses and bounded string concatenation. The analysis uses the resolved
  key to map the module object's `require` property to the existing intrinsic
  loader state.
- An unresolved computed property on an intrinsic module object records a
  loader escape and refuses instead of returning PASS. Non-`require` properties
  remain benign, and a lexically shadowed local `module` never acquires the
  intrinsic module-object state.
- Existing direct `module.require`, ordinary `require` aliases, loader-escape
  refusal, namespace handling, canonical closure and forbidden-surface rules
  are unchanged.

### GREEN evidence

The controller full-indexed the exact production checkpoint before execution:
63,906 of 63,906 nodes and 164,726 of 164,726 edges. The four-case targeted
run was then **4/4 PASS**, exit `0`, in 43.680 seconds.

Fresh verification at the same clean production checkpoint:

- complete focused detector suite — **48/48 PASS**, exit `0`, 311.131
  seconds, including the bounded 109.391-second three-process CLI tail;
- provider authentication — **5/5 PASS**, exit `0`;
- owned-process and bounded-receipt support — **8/8 PASS**, exit `0`;
- targeted TypeScript classifier/parser seam — **1/1 PASS**, exit `0`;
- syntax checks for both production modules and both focused tests — exit `0`;
  and
- `git diff --check` — exit `0`, no whitespace findings.

### Review notes and limitations

This round closes the confirmed module-object property family with a bounded
state and constant-key model rather than matching only the two reported source
strings. Constant folding is intentionally limited to deterministic bounded
string expressions; unresolved intrinsic-module properties refuse. The benign
shadow control ensures that this conservative rule does not manufacture
authority for a local `module` binding.

The report commit necessarily advances HEAD beyond the indexed production
checkpoint. No post-report graph freshness or MCP structural-freshness claim is
made here. The controller and independent reviewer own the final full index and
their own exact-head symbol/content probes.

The exact frozen receipt schema, source-body confidentiality, canonical
relative locators, case-sensitive duplicate controls, deterministic file/edge/
byte bounds, stable ruleset digest, and CLI exit algebra `0/1/2` remain
unchanged.
