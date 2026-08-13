# SLIDE capability reconciliation before Slice 63

## Ruling

Slice 63 may resume only for candidates whose complete source boundary fits the
capabilities proved by the pin below. The reconciliation widens reference
evidence; it grants no TypeScript retirement, production admission, signing or
release authority.

## Exact pin

- SLIDE commit: `99a75a6adbd1b16047b475ff7f68f2394dfc2829`
- reference-tool manifest: 91 files
- manifest digest:
  `sha256:8def230609f48f1b348fb5eaeb20ec7241c545b46c094b18f63eea190864bc09`
- reference-only: `true`
- authority released: `false`

The manifest was regenerated through the SLIDE owner after the previous
manifest correctly refused as stale. SLIDE then passed **1,015/1,015 across
101 suites**, the manifest check, forbidden-state audit and path-leak audit.
Galerina independently re-verifies the pinned commit, manifest bytes, every
listed file and all digests; it does not trust the live checkout.

## Capability matrix

| Surface | Earlier Galerina pin `053cc757` | Batch pin `6de4d91` | Reconciled pin `99a75a6` | Slice ruling |
|---|---|---|---|---|
| bounded scalar/String decisions | proved | retained | retained | eligible when the complete TypeScript domain is conserved |
| external record-field identity | absent from the old pin | fixed | retained | eligible only for an already registered exact record profile |
| branch Boolean/Int constants | incomplete reuse | fixed | retained | eligible inside a registered bounded control graph |
| checked bitwise `and` | absent | proved | retained | eligible only for the closed admitted integer profile |
| composable checked arithmetic | absent | absent | proved | eligible only for certified operators and physical widths |
| bounded iteration | absent | absent | certified counted Boolean `while` profile proved | eligible for a statically bounded Boolean `while`; arbitrary iteration remains blocked |
| checked call chains | absent | absent | certified benchmark call chains proved | eligible only when every called flow and boundary is admitted |
| conditional counted benchmark loops | absent | absent | proved | benchmark profile evidence, not general loop authority |
| `Option<Bytes>` plus byte length/index/traversal | absent | absent | absent | blocked |
| general arrays, open records, host APIs, async/effects or Unicode-normalisation parity | absent | absent | absent | blocked unless a separate exact profile is proved |

## Admission procedure

Each new slice must still prove the exact TypeScript/MJS input domain, output,
failure behavior and work bound. It must strict-check the `.fungi`, publish a
physical `.slide`, independently re-admit it through VOK, execute differential
vectors and hostile mutations, and retain the TypeScript consumer until the
retirement gates are met. Unsupported shapes are recorded as `BLOCKED`; they
are not flattened or precomputed in the host.
