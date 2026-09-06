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
