# Executable Fungi Golden Pack design

## Decision

Galerina will carry a deliberately small executable Golden Pack beside the
existing Canonical Example Corpus (CEC). The Golden Pack is a lookup surface,
not a second language specification. It exists so humans and code-generation
tools can copy a minimal construct that the current checker and, where
applicable, runtime have actually accepted.

The owner approved this direction after the Round 7 translation mapping showed
that repeated language-discovery errors came from stale prose, scattered
compiler facts and inferred runtime boundaries.

## Considered approaches

1. **Add another full example corpus.** Rejected because it would duplicate the
   CEC and create two competing authorities.
2. **Generate prose from compiler source only.** Rejected because static feature
   discovery does not demonstrate parsing, checking or execution.
3. **Maintain a minimal executable pack and derive its evidence.** Selected.
   It combines copyable source with observed checker/runtime evidence and can
   fail closed when either drifts.

## Components

- `docs/examples/golden/`: minimal `.fungi` sources and a human-readable index.
- `scripts/fungi-golden-probe.mjs`: bounded serial runner. It strict-checks every
  source, executes only declared vectors, derives exact digests and refuses to
  publish evidence if any assertion fails.
- `scripts/tests/fungi-golden-probe.test.mjs`: isolated regression coverage for
  manifest derivation, source drift and failed-probe publication.
- `build/fungi-capabilities/golden-manifest.json`: tracked, generated lookup
  evidence. This describes only the Golden Pack; it is not an exhaustive
  language-capability declaration.

## Authority boundary

Each example has separate checker and execution states. A clean checker result
never implies runtime parity. An example without a supported Galerina execution
surface remains `NOT_EXECUTED` with a reason; it is not silently upgraded.

The generated manifest grants no package-conversion, retirement, release or
production authority. SLIDE evidence is excluded from the Galerina generator so
Galerina does not acquire a sibling-repository dependency. Cross-project SLIDE
evidence remains in the external Round 8 staging exercise.

## Determinism and provenance

The manifest binds:

- the exact bytes and SHA-256 digest of every golden source;
- the exact declared vectors and observed outputs;
- a digest of the executed Galerina CLI/compiler runtime closure; and
- the probe schema and probe-runner digest.

It contains no timestamps or absolute paths. Re-running it on the same source
and toolchain produces the same bytes. `--check` regenerates in memory and
compares exact bytes with the tracked manifest.

## Failure behavior

- Missing, extra or duplicate examples refuse.
- A checker error, governance warning, timeout, unexpected output or malformed
  case definition refuses the whole run.
- The generator writes through a temporary sibling file and renames it only
  after every assertion passes.
- Failure must leave any previously admitted manifest byte-for-byte unchanged.
- All subprocesses are serial, bounded, hidden on Windows and launched with
  `shell: false`.

## Acceptance evidence

1. The isolated test first fails because the generator is absent.
2. Focused tests prove deterministic output and no publication after failure.
3. Every Golden Pack source reports zero errors and zero governance warnings.
4. Every declared execution vector returns its exact expected value.
5. `--check` reports the committed manifest current.
6. Example, path-leak, documentation-drift and graph checks remain clean.
