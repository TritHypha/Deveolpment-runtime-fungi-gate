# Slice 80 String Array Canonicality Adjudication

## Decision

`packages-galerina/galerina-framework-app-kernel/src/registry-durability-admission.ts#stringArrayIsCanonical`
is `BLOCKED_BY_UNKNOWN_STRING_ARRAY_CANONICALITY_ABI`.

No `.fungi` candidate, bridge, consumer switch or retirement is authorized.
The TypeScript decision remains active.

## Pinned scope

- Galerina build point: `6b4cc53c46251088eeeea55d8fe7dc8a41166b19`.
- TypeScript SHA-256: `8af5dc485a086d8be6f90e6c64208606b9e93a1ba3cb09c5d456e09f299cb4e7`.
- Exact live caller: `isRegistryDurabilityAdapterDescriptor`.
- Downstream paths: durability assessment and artifact inspection.
- Reconciled SLIDE head: `ed326eaa`; capability reference `99a75a6`.

## Exact source contract

The helper accepts JavaScript `unknown` plus a runtime `readonly string[]`
allow-list. It returns false unless the first value is a non-empty Array. For
each observed item, in order, it requires:

- JavaScript String type;
- the ASCII pattern `^[a-z0-9][a-z0-9.-]{1,31}$`;
- membership in the supplied allow-list; and
- strict JavaScript String ordering after the prior accepted item.

The one live caller supplies a platform-specific frozen allow-list: Windows
`ntfs, refs`; Linux `btrfs, ext4, xfs`; macOS `apfs`. The untrusted descriptor's
nested array remains the value being classified.

## Fail-closed boundary ruling

The reconciled physical profile has no immutable `Array<String>` parameter or
String-array traversal profile. It therefore cannot preserve the value's
non-array false path, empty-array refusal, element type checks, ordered
iteration, membership, strict ordering or hostile nested-array behavior.

Hard-coding a platform list still leaves the untrusted runtime array absent.
Passing scalar elements, an integer tag or a precomputed Boolean moves array
admission and ordering authority into TypeScript. Those substitutions are
refused.

## Decision and effect ledger

| Source operation | Input domain | Result | Effect/boundary | Required physical shape | Exit |
|---|---|---|---|---|---|
| identify array | JavaScript `unknown` | Bool | `Array.isArray` and length observation | heterogeneous value plus Array identity | false for non-array or empty |
| observe item | dynamic JavaScript Array | `unknown` | ordered iteration/property observation | immutable `Array<String>` ingress | false for non-String |
| validate label | String | Bool | ASCII regex and allow-list membership | exact bounded label validation | false when malformed/unlisted |
| enforce canonical order | prior/current String | Bool | JavaScript relational comparison | exact ordered traversal | false on duplicate/descending |
| finish | every element admitted | Bool | none | exhausted bounded traversal | true |

The live boundary is `SERIAL_HARD_PATH`. JavaScript `readonly` is a compile-time
constraint and does not exclude proxies, active iteration/property traps or
mutation of the untrusted nested array. A future physically immutable leaf may
be parallel only after admission proves that stronger boundary.

## R&D trigger

Revisit after GIR, SLIDE and VOK expose a versioned immutable `Array<String>`
ABI with exact element admission, bounded traversal, membership, ordering and
hostile-input refusal. A closed typed durability descriptor redesign requires a
separate owner-approved API migration and differential proof.

This result grants no conversion, retirement, production, signing, release or
push authority. Aggregate closure remains deferred to Slice 87.
