# Fungi source capability inventory

Date: 2026-08-09

Authority released: no

## Decision

Galerina now derives a bounded AST-level inventory from the exact 111 `.fungi`
paths already owned by the TypeScript-retirement graph. The inventory answers
what the current source corpus actually demands before another SLIDE profile is
selected. It does not say that SLIDE admits a feature merely because the parser
recognises it, and it grants no execution, retirement, signing or production
authority.

The inventory is deliberately separate from any future SLIDE capability
manifest:

```text
Galerina retirement graph -> source paths -> Galerina parser -> demand facts
SLIDE implementation       -> admitted contracts/profiles   -> authority facts
                                                   |
                                     later exact comparison gate
```

Conflating those lanes would turn syntax recognition into a false execution
claim.

## Zero-trust boundary

`scripts/fungi-source-capability-inventory.mjs`:

- accepts only sorted, unique, repository-confined
  `packages-galerina/**/*.fungi` paths from the retirement graph;
- refuses redirected roots, symlinked/redirected inputs, traversal, invalid
  UTF-8, duplicate JSON fields, parser errors and unknown AST kinds;
- bounds the corpus to 4,096 files, 10 MiB per file and 128 MiB total;
- binds every file by SHA-256 and records per-file AST kinds, types, operators,
  method calls, diagnostics and flow count;
- writes deterministic JSON plus a human-readable summary;
- exposes `--check` and participates in `graph-all`, so generator drift is a
  failing repository graph condition.

The explicit AST-kind table is a drift gate. A future compiler construct makes
the inventory refuse until its meaning and reporting treatment are reviewed.

## Measured current demand

All 111 sources parse without an error and contain 814 flows across 1,113,640
bytes. Dominant AST demand includes:

| Feature | Occurrences |
|---|---:|
| function/method calls | 7,229 |
| binary expressions | 6,014 |
| string literals | 4,784 |
| member expressions | 4,679 |
| `if` statements | 2,241 |
| assignments | 2,120 |
| `match` expressions / arms | 371 / 1,207 |
| `while` statements | 340 |
| records | 206 declarations |
| `check` expressions / arms | 93 / 279 |

The most frequent named type demands start with `Int` (523), `String` (415),
`Bool` (380) and `Bytes` (143). This proves that a sequence of isolated
`Array<Int>` ownership profiles cannot by itself complete the production
corpus. Strings, bytes, records, calls and general control must be addressed.

## Next use

The immediate next step is not a new speculative collection subsystem. First,
exercise an existing general SLIDE capability against a real Galerina source.
The current `cold-boot.fungi` decision flow has already been probed through the
existing pure-scalar compiler and returns `1`, `-1`, `-1` for the three exact
presence/integrity vectors. Contract 85 should turn that probe into
manifest-bound, physical `.slide`, receipt-bound package evidence while
retaining its honest decision-surface-only scope.
