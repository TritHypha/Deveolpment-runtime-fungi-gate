# Slices 99-102 tensor, consensus and confidence design

## Decision

The next four exported Tower-Citizen symbols remain active TypeScript because
the pinned physical checked-Fungi profile cannot conserve their complete
container and numeric contracts.

| Slice | Symbol | Classification |
|---:|---|---|
| 99 | `vAndTensor` | `BLOCKED_BY_TYPED_ARRAY_TRAVERSAL_ABI` |
| 100 | `vAndTensor2D` | `BLOCKED_BY_TYPED_ARRAY_BINARY64_SHAPE_ABI` |
| 101 | `consensusTritN` | `BLOCKED_BY_VERDICT_ARRAY_ACCUMULATOR_ABI` |
| 102 | `collapseConfidence` | `BLOCKED_BY_BINARY64_CONFIDENCE_RECORD_ABI` |

No placeholder Fungi source, host-projected fold, narrowed i32 replacement or
NaN-bearing Fungi value is admitted.

## Exact boundaries

### Slice 99

`vAndTensor` accepts two exact `Int8Array` values, requires equal length,
validates every element as a balanced trit, allocates a same-length
`Int8Array`, computes element-wise K3 minimum, preserves the empty case and
throws on length or element failure. Scalar `vAnd` proves the leaf only. The
physical profile has no exact typed-array length/index/allocation/result ABI.

### Slice 100

`vAndTensor2D` retains the complete Slice 99 boundary and additionally accepts
JavaScript `number` rows and columns, requires finite integer non-negative
shapes and compares the typed-array length with binary64 multiplication. A
signed-i32 Fungi signature would delete fractional, non-finite, signed-zero and
wide-number source behavior before the flow runs.

### Slice 101

`consensusTritN` accepts an arbitrary-length `readonly Verdict[]`, validates
every element, accumulates the signed sum and maps its sign to a Verdict; a tie
and the empty array both return Unknown. No scalar or fixed-arity K3 proof
conserves the array traversal, accumulator width, malformed-element behavior
and empty rule.

### Slice 102

`collapseConfidence` accepts an exact three-field record of JavaScript
binary64 numbers plus an optional binary64 threshold. It requires finite
components in `[0,1]`, validates normalization within `1e-6`, applies a strict
argmax and returns Unknown for NaN, infinity, out-of-range, non-normalized,
ambiguous and low-confidence inputs. Galerina source must not contain NaN, and
the pinned physical profile has no source-equivalent binary64 record ABI. Host
rejection is not the source's typed Unknown result.

## Reopen exits

Reopen only after reviewed physical profiles provide the exact array/typed
array, indexed bounded traversal, result allocation, accumulator width,
binary64 record/default-argument and non-finite-input semantics required by
each source. Every reopened scope still needs differential proof, independent
oracles, real `.slide` publication, VOK re-admission, hostile/mutation/work
refusal and typed receipts.

All four scopes are `PARALLEL_PURE`. Repository-wide closure and the final
codebase-memory build point remain `UNKNOWN`. The private skills already cover
container ABI, JavaScript numeric-domain conservation, no-NaN Fungi source and
no-host-projection; group close must still review them explicitly.
