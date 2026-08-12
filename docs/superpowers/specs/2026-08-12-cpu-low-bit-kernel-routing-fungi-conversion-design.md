# CPU low-bit kernel routing Fungi conversion design

## Scope

Translate the exported, deterministic `requiresLowBitKernel` decision in
`packages-galerina/galerina-cpu-kernels/src/index.ts` into a new package-owned
Fungi asset. Preserve TypeScript as the executing consumer and differential
authority.

## Source custody and semantics

The source file is pinned at repository commit
`8c63db5f4b4d347d1c2fe67640a9338cd42ed167` with SHA-256
`2a4d5069f3e5a9143a30ab0a96e391ea68e5fd2c6486af0c386c173ad13ccc7d`.
The exported function reads exactly two fields from `CpuKernelPlan` and returns
`true` when either:

- `inputType` is `i2_s` or `ternary`; or
- `operation` is `ternary_matmul` or `low_bit_decode`.

Every other typed pair returns `false`. Its production caller is
`validateCpuKernelPlan`, which uses the result to require a declared SIMD
feature; `createCpuKernelReport` reaches the decision through that validator.

## Chosen shape

Create
`packages-galerina/galerina-cpu-kernels/src/self-hosted/low-bit-kernel-routing.fungi`
with one pure flow:

```fungi
pure flow requiresLowBitKernel(inputType: String, operation: String) -> Bool
```

The flow accepts only the two observed projections rather than the whole plan
record. Four ordered, terminal Boolean checks return `true`; a final explicit
return yields `false`. This is byte-exact over all 42 declared data-type and
operation pairs. Unknown physical Strings also return `false`, matching the
JavaScript predicate without granting low-bit status to an unrecognised label.

The package manifest owns the new asset through `packageGraph.loadedAssets`.

## Rejected alternatives

1. Marshal the complete `CpuKernelPlan` record. The decision observes only two
   Strings, so record admission adds optional-tile, array, number and descriptor
   authority without improving parity.
2. Put the flow in compiler core. CPU kernels are an optional constellation
   package; moving its policy into Core would reverse the Core-first dependency
   boundary.
3. Convert `validateCpuKernelPlan` in the same slice. That function also owns
   arrays, optional records, diagnostics, positive-integer rules and SIMD
   membership. Those require separate ledgers and target proofs.

## Decision and effect ledger

| Source expression | Subject | Terminal | Fungi construct | Effects | Failure exit | Evidence |
|---|---|---:|---|---|---|---|
| `inputType === "i2_s"` | `Bool` | yes on true | `if` | none | continue | declared String union |
| `inputType === "ternary"` | `Bool` | yes on true | `if` | none | continue | declared String union |
| `operation === "ternary_matmul"` | `Bool` | yes on true | `if` | none | continue | declared String union |
| `operation === "low_bit_decode"` | `Bool` | yes on true | `if` | none | continue | declared String union |
| no predicate matched | closed negative | yes | final `return false` | none | explicit false | source disjunction |

## Proof boundary

- Differential proof covers all 42 declared pairs plus empty, case-changed,
  padded, NUL-containing, decomposed-Unicode and unrelated Strings.
- Candidate-specific strict checking must report zero errors and warnings.
- Physical proof publishes one `.slide`, independently re-admits it, and
  verifies typed Boolean VOK receipts across declared and hostile vectors.
- Wrong arity/type, invalid Unicode, inadequate work, source mutation, receipt
  mutation, safe-value-envelope mutation and artifact mutation must refuse.
- No null, NaN, `else`, `else if`, exception syntax, `for`, `while`, or `loop`.
- No registry widening, limit increase, consumer switch, retirement, release,
  signing or production authority.
