# RD-0873 String snapshot/GIR pilot

Date: 2026-09-10
Status: **HOLD_NON_AUTHORIZING**
Authorizing: **false**

The versioned String literal-match route is implemented in the compiler at
`main` HEAD `75f502f04`. This is a bounded
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
| Snapshot digest | `sha256:ecfb51c7aae2b2e1c393fc4620d3871aebfc14fdc057b3a18e6bee83d0763e78` |
| GIR bytes | 542 |
| GIR digest | `sha256:4ad87835500c84d1069694744877ccc044fd6f7fbb91d832fbbe1e506c611592` |
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
| `packages-ts/galerina-core-config/src/self-hosted/environment-mode.fungi` | `sha256:52025e4c248afd31cb8659d2eed85e78ef03d1e8e49eb02f15bbb8c90e03a1ba` | `sha256:ecfb51c7aae2b2e1c393fc4620d3871aebfc14fdc057b3a18e6bee83d0763e78` | `sha256:4ad87835500c84d1069694744877ccc044fd6f7fbb91d832fbbe1e506c611592` | 5 |
| `packages-ts/galerina-core-logic/src/self-hosted/omni-uncertain.fungi` | `sha256:cb082aff60c220d820b7970a75ead50a3329acf4ffbb25e2adfe9af77ac933be` | `sha256:b6371a7c4706db2921fe0a2f847cba2619e65dc42ab1572c21ea90affce79172` | `sha256:a42ab429f360d6f972935162262b8b64ce42fadf6941e7783d7baaa0850e0b7f` | 7 |
| `packages-ts/galerina-core-runtime/src/self-hosted/terminal-scope.fungi` | `sha256:3798a6ec392e80f0567767807bc6f341f034d7381a576496e5bb9d367e052d8e` | `sha256:4018e1af6b76766a50054301fc83d76c08c1024b5d633eeeecd16137faa89e04` | `sha256:0e78655cfb86e7467aee5a5f4768e6fdaaef971ef69872f6b4ea0bd1807f4630` | 5 |
| `packages-ts/galerina-data-model/src/self-hosted/response-safe-classification.fungi` | `sha256:b5cfec5a48c9e4bd0f36a7104fa85191aab184c089312d3dc761bd95d361aca8` | `sha256:7752243d7e2515b579c596c784c11eccfd3c0033e6d5e08ee932eee9ebbbbe6e` | `sha256:8af23e1d71cba5e1c0a053ddf45c86c507020e084387bcd9201dfc744ce8fcf9` | 2 |

The composite `isTaskEffect` flow remains outside this String literal-match
edition and stays held under the original bounded-wave decision.

## External integration seam

The SLIDE V2-C validator now admits this 23-entry String-match edition through
its dedicated registry. The detached compiler is committed locally at SLIDE
`962f880` and the Lyth adapter at `a68eeb5`; both carry the String profile,
provider, compiler, UTF-8 numeric model and registry identity explicitly. A
new one-file constellation test exercised compiler materialization, Lyth's
independent root-23 structure and work bound, and VOK's dedicated lease and
receipt module. It passed with exact literal execution and a numeric-input
refusal; all outputs remain `authorityReleased: false`.

This is still a local non-authorizing observation. The required independent
review, owner queue decision and exact-head continuity across the three
repositories are not yet recorded, so the consumer switch and bulk `.fungi`
authoring remain closed.

## Fresh differential check

On 2026-09-10 the four package-owned conversion tests for the same bounded
twins were run again against their retained TypeScript shadows. The command
covered environment mode, Omni uncertainty, terminal scope and response-safe
classification. All eight focused assertions passed (8/8, zero failures,
zero skips) in 438 ms. This is a change-focused differential check; it does
not rescan the 2,720-file corpus and it does not create new `.fungi` source.

## Direct SLIDE observation

The emitted `isEnvironmentMode` GIR was passed to SLIDE's V2-C preparation and
execution surface at the same local build point. Preparation returned the
registered String-match identity with a conservative work bound of 12. Seven
inputs were exercised: the four admitted literals returned `1`, while a
near-miss, case change and empty string returned `0`. Every execution receipt
was `slide.v2c.string-match.execution-receipt.v1` with
`authorityReleased: false`; the observed GIR digest was
`sha256:4ad87835500c84d1069694744877ccc044fd6f7fbb91d832fbbe1e506c611592`.

SLIDE's complete test command then reported 1,033 passes, zero failures and
nine cancellations. The cancellations were existing unrelated tests that
look for the old sibling paths `Galerina/packages-galerina/...`; they did not
exercise this route. This direct observation is not a Lyth or VOK admission.

## Remaining gate

Exact-subject SLIDE, Lyth and VOK String-match execution now exists locally,
but the constellation is author verification only. An independent review,
owner queue decision and exact-head continuity receipt at Galerina `75f502f04`,
SLIDE `962f880` and Lyth `a68eeb5` are still absent. The TypeScript-retirement
decision, consumer switch and bulk `.fungi` authoring remain closed until those
receipts are mutually bound.
