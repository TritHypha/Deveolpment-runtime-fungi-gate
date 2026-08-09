# KB index output-root admission design

Date: 2026-08-09

## Decision

Galerina's Knowledge Base query generator shall write and check generated
outputs only inside the Galerina repository that owns the executing script.
Selecting an external Knowledge Base corpus remains supported through
`--kb-dir`. Selecting an arbitrary production output root does not.

A distinct, explicit hermetic-test contract may substitute a temporary output
root. That contract is test infrastructure, not a supported production mode,
and must fail closed unless every test marker and confinement check passes.

## Problem

`scripts/kb-index.mjs` currently accepts `--root` and derives
`build/kb-index/KB-INDEX.md`, `kb-index.json` and `provenance.json` beneath that
arbitrary root. The separate Knowledge Base repository has its own generator
which owns files with two of the same names but a different schema and human
format. Pointing Galerina's generator at the Knowledge Base root can therefore
replace valid KB-owned outputs before either repository's ordinary check
explains the ownership error.

This is an output-authority defect, not a corpus-selection defect. The
Galerina generator already has `--kb-dir` for choosing the input corpus.

## Invariants

1. A normal build or check derives its output root from the physical location
   of `scripts/kb-index.mjs`, not the caller's current directory.
2. `--kb-dir` changes only the read-only corpus input. It never changes output
   ownership.
3. The production CLI does not accept `--root` as an ordinary option.
4. Every output path is confined beneath the admitted root's
   `build/kb-index` directory before a read, directory creation or write.
5. Existing output formats, query behavior, private-document exclusion,
   provenance semantics and phase-close behavior remain unchanged.
6. Check mode remains non-mutating and returns non-zero for missing, stale,
   foreign or malformed state.
7. The design protects against accidental or malformed cross-root invocation.
   It does not claim to contain a same-user adversary who already has arbitrary
   write authority over either repository.

## Approaches considered

### A. Root-bound generator with a hermetic-test override - adopted

The normal root comes from the script location. Tests use a separately named
override accepted only when an exact test marker is present. This closes the
observed overwrite path without moving artifacts or changing downstream
callers.

### B. Rename Galerina outputs to `build/kb-query-index`

This removes the filename collision but still permits a caller to write a new
directory into the wrong repository. It also requires unnecessary migrations
of phase-close, documentation and local query workflows. It is not sufficient
as the primary boundary.

### C. Shared output-owner sidecar

Both repositories could coordinate through an ownership manifest. This adds a
cross-repository protocol, has a first-write problem when no sidecar exists and
does not prevent other arbitrary-root writes. It may be useful later if tools
must intentionally share an output directory, but that need does not exist.

## Components

### Root admission

`scripts/kb-index.mjs` derives `OWNING_ROOT` relative to its own module URL.
Normal execution uses that root regardless of `process.cwd()`. The production
root must contain the expected Galerina workspace marker and the executing
generator at its expected repository-relative path.

### Hermetic-test admission

The existing temporary-root tests need a controlled substitute. The new
`--test-root PATH` argument requires:

- `GALERINA_KB_INDEX_TEST_MODE=1` in the child environment;
- a `.galerina-kb-index-test-root.json` file whose canonical bytes are exactly
  `{"schema":"galerina.kb-index.test-root.v1","nonProduction":true}\n`;
- a root whose canonical path is neither equal to, inside, nor an ancestor of
  the live Galerina root or the selected Knowledge Base corpus;
- the same output-confinement checks as production.

Failure of any condition is terminal and occurs before reading or writing an
output artifact. The marker bytes and environment name are closed constants in
the implementation and tests; aliases, truthy variants and surplus marker
fields refuse.

### Path confinement

The generator constructs outputs from the admitted root plus fixed path
segments. It rejects absolute injected segments, traversal, a symlinked output
directory, or a resolved output path outside the admitted root. Confinement is
checked before `mkdir` and again before publication so a path replacement
cannot silently redirect the write.

### Corpus selection

`--kb-dir`, `GALERINA_KB_DIR` and the existing sibling default keep their
current precedence. The selected corpus remains read-only, recursively
indexed, private-tag filtered and content-digest bound. Corpus location grants
no output authority.

## Data flow

1. Parse arguments and reject unknown or duplicate options.
2. Derive the owning root from the executing script and select the read-only KB
   corpus path.
3. If and only if the test-only override is requested, validate its environment
   and canonical marker before substituting the temporary root.
4. Validate the root identity and output confinement.
5. Select and validate the read-only KB corpus.
6. Derive the expected Markdown, JSON and provenance bytes.
7. In query mode, read the admitted index only.
8. In check mode, compare without mutation and refuse drift.
9. In build mode, create and publish only the three admitted outputs.

## Refusal behavior

The command returns non-zero without writing when:

- ordinary `--root` is supplied;
- the test-only override lacks its exact environment or marker;
- the admitted root identity is missing or malformed;
- any output path escapes, traverses or resolves through a symlinked output
  boundary;
- the corpus is empty or unreadable;
- check mode finds missing, malformed or stale output.

Messages name the refused boundary and do not disclose private corpus content.
No fallback to the caller's current directory or the selected corpus directory
is permitted.

## Test design

Implementation follows red-green TDD.

1. A regression test first proves the current `--root` invocation can target a
   foreign temporary repository and overwrite its seeded `KB-INDEX.md`.
2. After the fix, the same invocation must refuse and preserve byte-exact
   hashes for every seeded foreign output.
3. Running normally from a different current directory must still write only
   beneath the Galerina-owned root.
4. A test-only root without the environment value refuses without mutation.
5. A test-only root without the canonical marker refuses without mutation.
6. A fully admitted temporary test root retains existing build, check, query,
   code lookup, privacy filtering and provenance tests.
7. Output traversal and symlink/junction redirection controls refuse before
   publication where the platform permits the fixture; the pure confinement
   helper is tested on every platform.
8. Existing dev-tool script tests and the phase-close KB-index step remain
   green.

## Scope exclusions

This change does not:

- alter the KB category generator;
- rename generated files or migrate their schemas;
- make the private corpus public or track Galerina's generated query index;
- authenticate research claims or make affected-scope checks authorizing;
- address the separate atomic process-admission architecture;
- change SLIDE object, contract, signing or production authority.

## Acceptance criteria

- A normal invocation cannot select the Knowledge Base repository as its
  output root.
- The planted foreign-output regression remains byte-identical after refusal.
- Hermetic tests retain full generator coverage through the explicit test
  contract.
- Build, check and query behavior inside the Galerina-owned root is unchanged.
- Focused tests, dev-tool script tests, path/private-document audits and the
  affected documentation gates pass.
- The TODO item is closed only after the regression and full relevant checks
  pass; no broader production-readiness claim follows.
