# Slice 70 Tritsocket Packed-Length Plan

**Goal:** Adjudicate `packedLen` against the complete JavaScript numeric domain
and the pinned signed-i32 physical profile.

- [x] Locate the exact source and callers through the code graph.
- [x] Verify the retirement tranche, replacement state and declared floor.
- [x] Compare binary64 addition/division/floor behavior with physical `Int`.
- [x] Run the complete owning-package test lane.
- [x] Refuse i32 narrowing, clamping and caller-only proof substitutes.
- [x] Update the live register, Slice 70 report and TODO.
- [x] Review both private skills and run queue/path/whitespace checks before
  committing the exact adjudication locally without pushing.
