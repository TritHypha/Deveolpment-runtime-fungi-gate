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
