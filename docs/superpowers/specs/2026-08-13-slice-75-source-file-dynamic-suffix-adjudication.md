# Slice 75 Source File Dynamic Suffix Adjudication

## Decision

`packages-galerina/galerina-devtools-package-graph/src/scanner.ts#isSourceFile`
is `BLOCKED_BY_DYNAMIC_STRING_ARRAY_SUFFIX_ABI`.

No `.fungi` candidate, bridge, fixture or consumer switch is created. The
TypeScript helper and package scanner remain active.

## Pinned scope

- Galerina build point: `f136592262cd27dccc1d7a8035fd8c5f2f12b10f`.
- Source SHA-256: `5f3b58aebab0ba97268d7bbd1686ae158986205cd474037b52f492171eef49c5`.
- Exact symbol: `isSourceFile` at `src/scanner.ts`.
- Retirement row: `T3-package-graph`, replacement absent, no declared floor.
- Package-owned Fungi assets: none.
- Reconciled SLIDE head: `ed326eaa`; its capability reference remains
  `99a75a6` because the later change is CI-only path handling.

## Source contract

The source first returns `false` when `name.endsWith(".d.ts")`. Otherwise it
returns whether any element in the runtime `extensions` array is a suffix of
`name`. `Array.some` short-circuits on the first match; an empty array returns
`false`. Both the name and suffix elements use JavaScript UTF-16 `endsWith`
semantics and have no source length ceiling.

The direct caller `listSourceFiles` supplies configuration-derived extensions
while recursively walking a directory. Its inbound graph reaches
`scanPackage`, the package-graph CLI and generator, the package-border audit
and focused tests.

## Decision and effect ledger

| Source operation | Proven source type | Result | Effect/boundary | Required physical operation | Exit |
|---|---|---|---|---|---|
| declaration-file check | JavaScript String | Bool | none after String observation | exact unbounded UTF-16 suffix | `false` when `.d.ts` matches |
| observe extensions | runtime `readonly string[]` | ordered suffixes | JavaScript array/property observation | immutable `Array<String>` parameter with exact element admission | `false` when empty |
| suffix search | ordered dynamic String array | Bool | short-circuit traversal | bounded terminating String-array traversal plus exact suffix | `true` on first match; otherwise `false` |

The live JavaScript array boundary is `SERIAL_HARD_PATH`: TypeScript
`readonly` does not independently exclude proxies, accessors or concurrent
mutation. Directory traversal and scanner publication are also ordered I/O and
do not inherit a future pure-leaf classification.

## Capability comparison

The reconciled SLIDE profile does contain a physical `text_ends_with` opcode
and a two-String Fungi proof. That successor is bounded canonical UTF-8 text:
inputs above its ceiling and malformed surrogate-containing Strings refuse.
The source instead accepts the full JavaScript String domain and returns a
Boolean.

More importantly, the physical type table admits `array_i32`, not
`Array<String>`. It has no public runtime String-array parameter or traversal
profile for configuration-derived suffixes. A finite hard-coded suffix set
would not conserve `packageGraph.extensions`, which replaces the defaults.

## Rejected substitutions

- Hard-coding the default extensions discards package configuration authority.
- Calling the physical suffix opcode once cannot implement dynamic ordered
  `Array.some`.
- Re-encoding suffixes as integer IDs moves configuration parsing and mapping
  into the host and changes the public input.
- Passing a precomputed Boolean leaves the complete decision in TypeScript.
- Treating bounded canonical UTF-8 refusal as JavaScript UTF-16 `false` changes
  hostile and oversized input behavior.

## R&D trigger

Revisit after a versioned immutable `Array<String>` parameter and bounded
short-circuit traversal profile preserves configured element order, empty
arrays, exact text admission and suffix behavior through GIR, physical
`.slide`, independent re-admission and VOK. A separately approved scanner API
redesign may instead adopt bounded canonical paths and a closed extension
registry, but that is not this translation.

This adjudication grants no conversion, retirement, production, signing,
release or push authority. Aggregate closure remains deferred to Slice 87.
