# Slices 56-58 Tagged Input and Normalisation Adjudication

## Outcome

No new candidate is admitted. All three slices are `BLOCKED`; no placeholder
Fungi asset, queue authority, consumer switch or retirement claim is created.

| Slice | Exact source decision | Owner ruling |
|---:|---|---|
| 56 | `packages-galerina/galerina-core-config/src/posture.ts#isSecurityPosture` | `BLOCKED`: the source is total over JavaScript `unknown`, including an explicit non-String `false` domain. A String-only Fungi/SLIDE twin deletes that domain, and the open `unknown` set cannot be losslessly represented by the closed finite-tag exception. |
| 57 | `packages-galerina/galerina-framework-app-kernel/src/registry-durability-admission.ts#isPlatform` | `BLOCKED`: the same open `unknown` boundary is used inside exact descriptor and host validation. The existing durability Fungi asset receives already-folded Boolean facts; it neither supersedes this predicate nor proves the untrusted object/field ingress. |
| 58 | `packages-galerina/galerina-db-mysql/src/index.ts#isLocalhostHost` | `BLOCKED`: exact behavior composes ECMAScript trim, full Unicode `toLowerCase()` and three-label membership. Case folding currently lowers through a host import and has no admitted physical profile. MySQL, PostgreSQL and OpenSearch contain the same security decision and must not drift. |

## Verified build and ownership facts

- Product-owner build point: `7cdc0db2` on
  `codex/rd-0792-synthesize-only`, with a clean tracked tree before this record.
- Exact source SHA-256 values:
  - Slice 56 file: `dd1f7cb0e933d122969e415ca51c7965a03fde82b95f344b633181e7e8696750`;
  - Slice 57 file: `8af5dc485a086d8be6f90e6c64208606b9e93a1ba3cb09c5d456e09f299cb4e7`;
  - Slice 58 file: `63ffb8a02b933574c364d0f7f3ae72d58529487d1d5111198554bb6a167f5d69`.
- The retirement rows declare no replacement for the three files and no
  floor for Slices 56-58. That absence grants no candidate authority.
- Core Config loads only its existing environment-mode Fungi asset. App Kernel
  already loads the broader registry-durability admission asset, whose flows do
  not classify an untrusted platform value. MySQL has no package Fungi asset.
- Live graph inspection established real callers. One graph-inferred MySQL
  `Set.has` cross-package edge was false and was rejected against exact source.

## Duplicate and floor preflight

Preflight refused `isValidStrategy` and `powerRank` because package-owned Fungi
assets and focused proofs already exist. It also refused
`isHighRiskPermissionAction` because Core Security declares a
`bounded-bootstrap-floor`. None was assigned a new slice.

## Decision and effect conservation

All three decisions are pure and `PARALLEL_PURE`; this threadability label is
not execution or retirement authority.

- Slice 56 returns `true` only for the exact case-sensitive Strings `off`,
  `auto`, and `on`; every other JavaScript value returns `false`. Invalid input
  is consumed downstream by the fail-secure `on` posture.
- Slice 57 returns `true` only for `windows`, `linux`, and `macos`. It is one
  structural guard before descriptor/host identity checks and never grants
  production admission.
- Slice 58 returns `true` after JavaScript trim and Unicode lowercase only for
  `localhost`, `127.0.0.1`, and `::1`. A false positive can bypass the remote
  TLS-required diagnostic, so ASCII narrowing is not an owner-approved shortcut.

## Required future evidence

1. Slices 56-57 require an exact physical boundary for open untrusted values
   and exact object-field provenance. A host-produced String or Boolean is not
   equivalent evidence.
2. Add direct invalid-platform vectors for Slice 57. The current focused suite
   proves a valid cross-platform mismatch but does not directly exercise an
   unsupported platform value.
3. Add TypeScript-oracle vectors for Slice 58 covering uppercase/mixed case,
   the ECMAScript trim set, non-trimmed lookalikes, Unicode case-fold hazards,
   lone surrogates and near-miss host spellings.
4. Treat the identical MySQL, PostgreSQL and OpenSearch localhost helpers as
   one governed decision family. Revisit them only with one exact, published,
   non-host-authoritative text-normalisation profile and cross-family parity.

No existing compiler or SLIDE ceiling may be widened merely to admit these
slices.

## Consultant custody correction

The three Claude prompts named both public Fungi skills, but the first launch
did not mount the sibling skills directory. Claude therefore reported that it
could not read the skills; its dossiers remain advice only. A live probe proved
the corrected invocation: provide the prompt before `--add-dir`, mount the
public skills root, and require Claude to return both YAML skill names before
the dossier proceeds. Codex independently applied the skills and verified the
source, graph, retirement and package evidence in this adjudication.

## Focused package evidence

- `@galerina/core-config`: **54/54** passed.
- `@galerina/framework-app-kernel`: **231/231** passed.
- `@galerina/db-mysql`: **24/24** passed.

These counts establish package health only; they do not prove conversion.

## Slice-close skill review

`NO_SKILL_UPDATE` for both public skills. The translation skill already blocks
unknown domains and narrower physical profiles, and the writing skill already
refuses behavior the selected execution surface cannot express. The unskilled
consultant still identified the normalisation blocker from repository evidence,
so the required no-guidance control did not fail and the skill TDD gate does not
authorize an edit.
