# Slice 80 String Array Canonicality Plan

**Goal:** Preserve the complete untrusted JavaScript array canonicality guard
or refuse translation without moving authority into the host.

- [x] Locate the exact source, caller and downstream paths through the graph.
- [x] Record the Array identity, regex, allow-list and ordering semantics.
- [x] Reconcile platform-specific live allow-lists and the physical profile.
- [x] Reject hard-coded, scalarized and precomputed host substitutions.
- [x] Run the complete owning-package lane.
- [x] Record threadability and the exact R&D trigger.
- [x] Update the live register, TODO and Slice 80 report.
- [x] Review both private skills and run bounded audits before a local commit.
