# RD-0873 Task 6D/6E evidence repair hold supplement — 2026-09-06

This append-only supplement records one additional confirmed boundary gap after
the initial Task 6D/6E hold handover.

## Pinned-profile source gap

The approved Task 6E production verifier accepts a caller-provided profile byte
array but requires exactly 1,131 bytes with SHA-256
`8b89fa23a5e84d2c16f885ce8946bf1b7e4547a8f06bf63c66b9e3db60479f0e`.
The corresponding canonical profile text is present only in
`tools/artifact-admission.test.mjs`; no production export or tracked canonical
profile file supplies those bytes.

Task 6D's existing resource harness requires a `profilePath`, but it cannot
derive that path from a caller-independent, reviewed production source. Reading
the test-only constant or reconstructing equivalent JSON in the workflow would
create a mutable or duplicated runtime authority and violates the approved
closed-input design.

## Consequence

The Task 6E repair must establish one reviewed canonical source for the pinned
profile bytes and bind its controlled-runner entry point to those exact captured
bytes. The later Task 6D workflow must consume only that source from the exact
authenticated AGENTS checkout. Do not author a second profile copy in Galerina
or a workflow heredoc.

This does not alter the prior `HOLD`; it narrows the required repair sequence.

## Correction — producer-side canonical literal

Direct source inspection after this supplement was committed found that
`scripts/galerina-source-origin-frame.mjs` also contains the exact canonical
1,131-byte JSON literal and independently pins the same SHA-256 before a frame
is assembled. The earlier statement that the text was present *only* in the
AGENTS test source is therefore superseded.

This does not create a safe workflow input by itself: the Galerina literal is
private to the producer module, is not a tracked profile file or exported
profile-writing interface, and the production command deliberately requires a
supplied `--profile` file before it will create a frame. The remaining hold is
therefore interface and provenance design, not absence of canonical bytes.

Do not extract the literal by parsing source text or create a second workflow
copy merely to bypass that boundary. Any safe profile-provisioning mechanism
must be explicitly scoped, tested and independently reviewed before hosted
evidence is dispatched.

## Independent profile-provisioning review

An independent read-only review resolved the interface question without
expanding Task 6C-R. The protected workflow may read the one fixed producer
source file from the authenticated exact producer checkout, non-evaluatively
capture exactly one supported `PINNED_PROFILE_JSON` literal, and require all of
the following before creating its private no-LF `profile.json` file:

- exactly one match with no escape, alternate form or ambiguity;
- exactly 1,131 UTF-8 bytes and SHA-256
  `8b89fa23a5e84d2c16f885ce8946bf1b7e4547a8f06bf63c66b9e3db60479f0e`;
- no profile bytes, paths, frame bytes, receipts or credentials written to logs
  or a step summary.

This narrow, fixed-source extraction is not a mutable runtime authority: the
workflow has already authenticated and checked out the exact producer commit,
and the producer independently rejects any profile that is not byte-for-byte
equal to its own pinned literal. It must not import or evaluate the producer
module, because that module executes its command entry point at load time.

The preceding blanket prohibition on source parsing is superseded only for
this constrained, independently reviewed extraction. A workflow copy of the
JSON remains prohibited, and no new producer API or CLI option is permitted by
the current Task 6C-R scope. The workflow implementation and its full evidence
contract remain `HOLD` until implemented and independently reviewed.

## Task 6C platform-receipt boundary

Independent review of an uncommitted workflow draft found a second, separate
contract boundary. `runFrozenGitResourceHarness` emits a native resource
receipt with process, tick, RSS and elapsed-time evidence. It is needed to
grade the native collection run, but it is not the canonical Task 6C
platform-observation receipt that Task 6F reserves as its two fixture files.

The existing Task 6C test contract defines that latter receipt separately. It
binds the exact frame and profile bytes, all seven artifact rows, producer Git
identity, both platform pin records, selected tool identities, and the frozen
closed toolchain-difference allowlist. Its per-run resource fields cannot be
compared byte-for-byte to a later observation fixture: doing so would reject a
valid fresh run and would still fail to prove the Task 6C cross-platform
allowlist relation.

The uncommitted workflow draft was therefore isolated and is not a candidate
commit. It must not be reviewed as passing, dispatched, merged or pushed.

The next bounded design step is to identify the approved, workflow-callable
Task 6C receipt construction and strict validation route, or make that route
available under an explicitly reviewed scope. It must create each canonical
platform receipt from the captured frame/profile and decoded artifact evidence,
validate its closed schema, and compare the two platform receipts only through
the frozen allowlist before any Task 6F fixture candidate can exist.
