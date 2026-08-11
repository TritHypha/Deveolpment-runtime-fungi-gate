# Governance qualifier escalation Fungi conversion proof

## Outcome

The compiler's private `qualifierEscalated` decision has an exact
package-owned `.fungi` counterpart with compiler/interpreter/signed-Wasm parity
and physical SLIDE/VOK publication. The existing wide-control registry is now
selected by exact lowered block count; no registry limit or source semantic was
weakened.

## Closed decision

The source ranks `pure = 0`, `flow = 1`, `guarded = 2`, `secure = 3` and
`privileged = 4`. Every other String has fallback rank 0. Escalation is true
only when the after rank is strictly higher than the before rank. The exact
7 by 7 canonical-plus-hostile matrix agrees across the public TypeScript
caller, typed Fungi interpreter and signed/admitted Wasm.

The `.fungi` source expresses the same table-plus-comparison shape as
TypeScript through `qualifierRank` and `qualifierEscalated`. It contains no
null, NaN, `else if`, exception syntax, `for` or `loop`. Unknown admitted
Strings cannot acquire authority above `pure`.

## Exact custody

| Item | Evidence |
|---|---|
| TypeScript reference | SHA-256 `7B368F689A822B7A34E4A7101010DC113B5DB72ACD40C8952F1E7A9E94090D6C` |
| Fungi candidate | SHA-256 `616FBF04F054C8CF073BD3AA9B411872446A2B2A68BCDE8DFDDBA2EE9B534098` |
| Focused differential test | SHA-256 `34C428AE282A2C5665C7D17E7D876B9F07580C59FD5C6E9095F32D2483AAC53D` |
| Physical SLIDE/VOK test | SHA-256 `E2E88F844ED2B12623EDEC9E8535D35252E0FC689516C8F43F7E17035E0DC3D3` |
| Initial Fungi commit | `67d9da49e3fff224fb26557a640ca66acb12c8f0` |
| Prior bounded direct shape | `4c0fba1b908f826f52d3e4fbf7067badb1c94816` |
| Independent SLIDE build point | `71abe869ba5cc5cbe5590e7fb322b293cc40c8e3` |
| Galerina physical source/evidence commit | `a5eda7882e2f278f2c38c9f7f8cbd0c6cdcd2e7e` |

## Verification

- Focused compiler/interpreter/signed-Wasm proof: 2/2 pass.
- Owning compiler package: 6,354/6,354 pass with zero skips or failures.
- SLIDE focused wide-control and neighboring package paths: 71/71 pass.
- Physical Galerina proof: 1/1 pass with zero skips. It publishes one `.slide`,
  independently re-admits it through VOK and verifies the 11 by 11
  canonical-plus-hostile matrix as typed Bool receipts.
- Wrong argument counts/types, an unpaired surrogate, source mutation and a
  one-byte artifact mutation all refuse.
- Programs beyond the unchanged sixteen-block wide-control ceiling refuse.
- Complete package aggregate: 100/100 packages and 9,566 tests pass.
- Generated owners: graph 7/7, semantic outputs 3/3, roadmap outputs 5/5,
  canonical count consumers 7/7, and Golden Pack 11/11 checked plus 11/11
  execution vectors.
- Myco indexes 4,977 files at the closure checkpoint. Primary codebase-memory
  was rebuilt in full at 49,929/49,929 nodes and 133,080/133,080 edges; indexed
  HEAD equals Git HEAD, `stale` is false, and the new physical integration
  test is queryable as a graph file node.

## Resolved blocker

SLIDE already had the required bounded wide-control registry. Build `71abe86`
made the pure-scalar compiler select it exclusively when the exact lowered
function exceeds the parent eight-block ceiling. The source-authoritative rank
helper then fits inside the existing sixteen-block maximum. Registry identity,
limits, re-admission and non-authority fields remain unchanged.

## Authority boundary

`governance-diff.ts`, its private TypeScript `qualifierEscalated`,
`classifyDelta`, `diffGovernance` and every consumer remain active. The
physical proof grants no consumer-switch, bootstrap, production, release or
retirement authority.
