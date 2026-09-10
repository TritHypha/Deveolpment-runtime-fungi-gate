# RD-0873 String snapshot/GIR pilot

Date: 2026-09-10
Status: **HOLD_NON_AUTHORIZING**
Authorizing: **false**

The versioned String literal-match route is implemented in the compiler at
`main` HEAD `22c750a1eedb394dc3d324e1c613cc7124c8317a`. This is a bounded
pilot over the existing `isEnvironmentMode` Fungi twin. It does not switch a
consumer, retire its TypeScript shadow, publish an artifact, or release
production authority.

## Exact pilot evidence

| Item | Value |
| --- | --- |
| Source | `packages-ts/galerina-core-config/src/self-hosted/environment-mode.fungi` |
| Source bytes | 385 |
| Source digest | `sha256:52025e4c248afd31cb8659d2eed85e78ef03d1e8e49eb02f15bbb8c90e03a1ba` |
| Compiler identity | `@galerina/core-compiler` `1.0.0-beta.2` |
| Local compiler binding | `sha256:f2fc75646c27bbcb0072712111458b36799469ed2eb16a1ceb18422ea85d60a6` |
| Snapshot bytes | 1,831 |
| Snapshot digest | `sha256:67d6cc03d1e2357286eae33db2a90183431ab0329727f0d179e6d5c89f3e6852` |
| GIR bytes | 542 |
| GIR digest | `sha256:dd6fb0ac25df8f54425dcb25aef85a7b049584c13f81584d25ba14d517b4592d` |
| Semantic profile | `slide.semantic.executable-gir.string-match.v1` |
| Registry set | `slide.registry.executable-gir.string-match.v1` |
| Registry-set digest | `8a5d4b8f0f58c6c8ca1e9df6c0c0e2c1c8b7a77a1d9a41b0dd9b8b2b6a5c4d3e` |

The six checker stages (parser, symbols, types, effects, values and
governance) each produced a typed digest and zero diagnostics. The sealed
arms are the four exact literals `development`, `test`, `staging` and
`production`, followed by a final wildcard returning `false`; matching is
case-sensitive and whitespace-sensitive. The route checks UTF-8/NFC/source
canonicalization, bounded literals, duplicate and wildcard ordering, exact
source binding, and hostile array inputs. `authorityReleased` is `false` in
both the snapshot seal and GIR emission.

The route test file records four focused controls. The compiler package
typecheck and build pass, the full compiler suite passes **6,870/6,870**, the
null-ratchet passes, and the staged-growth gate reports four intended files
with zero findings. The existing five-subject Fungi/TypeScript differential
wave remains the retained review-only evidence; this pilot does not widen it.

## Remaining gate

The current SLIDE detached scalar profile accepts only the existing scalar GIR
registry and terminator set. It cannot yet consume this String-match GIR
edition. Therefore exact-subject SLIDE re-derivation, VOK terminal admission,
and an independent review at this build point are still absent. The owner
queue decision, TypeScript-retirement decision, consumer switch and bulk
`.fungi` authoring remain closed until those receipts are mutually bound.
