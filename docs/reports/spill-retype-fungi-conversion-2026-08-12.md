# Spill retype TypeScript-to-Fungi conversion report

## Result

Exported TypeScript `spillRetype()` now has an exact package-owned Fungi twin,
`spillRetypeFungi()`. The candidate returns the full governed downgrade record
and executes through an independently published and re-admitted physical
`.slide` package. TypeScript and every production consumer remain active.

## Exact custody

| Asset | Bytes | SHA-256 |
|---|---:|---|
| `hardening-residency.ts` | 29,904 | `94f7201206ca406d3d7768dfaab781e78e160a2ad9b550a9ccafabba4fd17ad8` |
| `hardening-trust-boundary.fungi` | 1,880 | `0d4d13d03c220337dbce267674ff9e52fb822c6067e6529a4874f376f66fee4d` |
| differential test | 3,125 | `77945869e02ac891d225b1b599ce24477a93f2c8389efe97a93535fb3e3264ea` |
| physical SLIDE/VOK test | 7,732 | `645c3f6a057815dc7c51904376a748d9147b0f4d4ca0b70f4abb279015020268` |

The Galerina implementation build point before closure publication is
`ed3bdd9b5346c9c98564649e32c66ed21903d5ed`. The supporting SLIDE build point
is `4024d3951291173a4cfe3b771bbd2a62a9678953`. The external record descriptor
is pinned at
`sha256:3ab4859da05845ad51766ce99885f3cf0987549f947e9bae7cdbd619ed4cc1d2`.
The parent/no-successor profile correctly exposes no registry-set identity.

## Boundary finding and repair

The first physical build refused. Reduction proved that Verdict-valued record
fields, zero-argument flows, Strings and record construction already worked.
The actual mismatch was the camelCase external member `retypedTo`: the Fungi
and authenticated record-descriptor layers admit it, while internal reference
GIR identifiers are lower-snake.

The repair preserves both boundaries. SLIDE maps ordered fields to internal
`field_1`, `field_2`, and `field_3` slots while retaining the exact external
names, order and type IDs in the authenticated descriptor. V2C independently
checks the ordered member types. K3 remains Verdict; no coercion to Int and no
grammar relaxation was accepted.

## Verification

- strict Fungi check: zero errors and zero governance warnings;
- focused hardening differential: 3/3;
- SLIDE record/compiler neighborhood: 36/36;
- physical `.slide`/VOK proof: 1/1, zero skips;
- compiler package: 6,374/6,374;
- Golden Pack: 11/11 checked and 11/11 execution vectors;
- canonical aggregate owner: 100/100 packages, 9,594 tests, zero failures in
  290.2 seconds;
- retirement owner and self-test: 1,440 executable-family paths, 127 source
  Fungi assets, and conserved staged-index partitions.

The physical proof rejects surplus arguments, insufficient execution fuel,
source mutation, receipt field mutation, every safe-value envelope byte
mutation and physical `.slide` mutation.

## Authority limits

This is a reference-only conversion proof. It does not switch a consumer,
retire TypeScript/MJS, prove runtime residency, authorize production, sign a
release, establish platform durability or close the bootstrap fixpoint. Full
tooling, normal phase-close and monolithic memory evaluation remain excluded
because they are linked to the previously observed crash; repository-wide
closure therefore remains `UNKNOWN`.
