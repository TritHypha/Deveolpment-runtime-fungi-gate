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
| GIR bytes | 546 |
| GIR digest | `sha256:baf5af6f31e0e80e6999dc34feb5857f835abcea5edb3bedb6aac27b38f2facb` |
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

## Existing-wave smoke

The same route was then exercised over the other three direct literal-match
twins already present in the bounded wave. This is a four-file smoke, not a
corpus scan or a new authoring batch. Each source had zero diagnostics in the
same eight local checks and retained `authorityReleased: false`.

| Fungi source | Source digest | Snapshot digest | GIR digest | Arms |
| --- | --- | --- | --- | ---: |
| `packages-ts/galerina-core-config/src/self-hosted/environment-mode.fungi` | `sha256:52025e4c248afd31cb8659d2eed85e78ef03d1e8e49eb02f15bbb8c90e03a1ba` | `sha256:67d6cc03d1e2357286eae33db2a90183431ab0329727f0d179e6d5c89f3e6852` | `sha256:baf5af6f31e0e80e6999dc34feb5857f835abcea5edb3bedb6aac27b38f2facb` | 5 |
| `packages-ts/galerina-core-logic/src/self-hosted/omni-uncertain.fungi` | `sha256:cb082aff60c220d820b7970a75ead50a3329acf4ffbb25e2adfe9af77ac933be` | `sha256:1127c81e6e9abc9accf343f30acb8f1ef42a17867788dc54b9c97a82d9d6283e` | `sha256:4fa4b90112fe3e1b0a7324224d3db6f94ac94f90730f59228d488207b8977584` | 7 |
| `packages-ts/galerina-core-runtime/src/self-hosted/terminal-scope.fungi` | `sha256:3798a6ec392e80f0567767807bc6f341f034d7381a576496e5bb9d367e052d8e` | `sha256:948aae96596363a80ebe23d7f71fbaaca4a8f9241fa1b697ec5e8f336ace4c08` | `sha256:2189f08c11f5114f29abf255558f91dd8b3a525eb5b0876ba20a01a21a7fd4fd` | 5 |
| `packages-ts/galerina-data-model/src/self-hosted/response-safe-classification.fungi` | `sha256:b5cfec5a48c9e4bd0f36a7104fa85191aab184c089312d3dc761bd95d361aca8` | `sha256:249471f6ec3ba96388d89a41673c72bc3386456d091fdd0f3bf6680c13c4254d` | `sha256:bcc162ae403b8d3c6dfb6f844c62a6c1f69b9a89c724f01750f11f2a7f667383` | 2 |

The composite `isTaskEffect` flow remains outside this String literal-match
edition and stays held under the original bounded-wave decision.

## External integration seam

The current SLIDE V2-C validator and detached scalar adapter cannot consume
this pilot honestly. The pilot root is a 23-entry String-match edition with a
dedicated semantic profile, registry identity, metadata fields, type id 5 for
String, and terminator id 5. SLIDE currently admits a 21-entry V2-C root,
requires its registered profile and registry set, uses type id 6 for String,
and accepts only terminators 1 through 4. Lyth's adapter and VOK KAT route
additionally require the scalar manifest and `trit.scalar.v1` profile. Reusing
that route would mislabel the String program, so no SLIDE/VOK receipt is
claimed.

There are two bounded implementation seams for a future owner-approved
integration: retarget the emitter to the registered V2-C immutable-value
operations (String type 6, UTF-8 encoding 1, opcode 23 equality and ordinary
Boolean branches) and add a dedicated String adapter/profile; or register a
new String-match V2-C edition end to end in SLIDE, Lyth and VOK. Until one
seam is implemented and independently reviewed, the owner queue decision,
consumer switch and bulk `.fungi` authoring remain closed.

## Fresh differential check

On 2026-09-10 the four package-owned conversion tests for the same bounded
twins were run again against their retained TypeScript shadows. The command
covered environment mode, Omni uncertainty, terminal scope and response-safe
classification. All eight focused assertions passed (8/8, zero failures,
zero skips) in 438 ms. This is a change-focused differential check; it does
not rescan the 2,720-file corpus and it does not create new `.fungi` source.

## Remaining gate

The current SLIDE detached scalar profile accepts only the existing scalar GIR
registry and terminator set. It cannot yet consume this String-match GIR
edition. Therefore exact-subject SLIDE re-derivation, VOK terminal admission,
and an independent review at this build point are still absent. The owner
queue decision, TypeScript-retirement decision, consumer switch and bulk
`.fungi` authoring remain closed until those receipts are mutually bound.
