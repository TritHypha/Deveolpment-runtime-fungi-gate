# TypeScript to Fungi: control-flow and effects worked map

## Status

This is the maintained worked map for humans and AIs translating existing
TypeScript into `.fungi`. It records the active compiler rules; it does not
grant runtime authority or prove parity with the TypeScript source.

The compiler remains authoritative. The primary references are:

- [Executable Golden Pack](golden/README.md) for minimal construct shapes that
  are rechecked and, where the CLI admits their inputs, executed by a serial
  probe;
- [Control flow](../language/fungi/07-control-flow.md);
- [Effects and capabilities](../language/fungi/03-effects-and-capabilities.md);
- [Effect reference](../reference/effects.md); and
- `packages-galerina/galerina-core-compiler/src/type-checker.ts` and
  `effect-checker.ts`.

If prose and an executable example appear to disagree, rerun
`npm run audit:fungi-golden` and inspect the generated manifest. A
`CHECKER_PROVEN` entry establishes syntax, typing and zero diagnostics only;
only an `EXECUTED` vector establishes behavior on its named surface.

## The decision rule

Choose the construct from the proven subject type first. Whether the decision
ends the flow is a separate question and never changes the subject's type.

| Proven subject | Construct | Required exit discipline |
|---|---|---|
| `Bool` | `if`; `while` for a Boolean loop guard | a refusal-only guard returns or traps |
| typed K3 `Verdict` | `check` | all `if:`, `deny:` and `ambig:` arms; an authority decision exits through every arm |
| `Int`, `String`, enum, `Option`, `Result`, or any other non-`Verdict` alternatives | exhaustive `match` | every match has a non-empty, terminal `_ =>` refusal arm |

The following shortcuts are forbidden:

- a terminal `Int` decision does **not** become a `check`;
- an `Int` carrying `1`, `0`, or `0 - 1` is still an `Int`, not a `Verdict`;
- `if` must not collapse `Verdict`, `Option`, `Result`, enum, or selector states
  into a Boolean;
- two or more alternatives belonging to one selector must not become an
  `if` ladder; and
- `_ =>` is not a comment or a guessed default: its body returns, traps, or
  produces a typed error that terminates the current path.

### Boolean guard

TypeScript:

```ts
if (index < 0 || index >= length) return { ok: false, error: "BOUNDS" };
```

Fungi:

```fungi
if index < 0 or index >= length {
  return Err("BOUNDS")
}
```

Both operands produce `Bool`; `if` is therefore correct. A known non-Boolean
condition is rejected by `FUNGI-TYPE-033`.

### Non-K3 selector

TypeScript:

```ts
switch (mode) {
  case 1: return 10;
  case 2: return 20;
  default: throw new Error("MODE");
}
```

Fungi:

```fungi
pure flow selectMode(mode: Int) -> Result<Int,String>
contract { intent { "Select one admitted mode and preserve invalid-mode failure." } }
{
match mode {
  1 => return Ok(10)
  2 => return Ok(20)
  _ => return Err("MODE")
}
}
```

This remains `match` even though every arm is terminal. `mode` is `Int`, not
`Verdict`. `Ok(10)` is present because the declared result is
`Result<Int,String>` and the TypeScript source can throw. It is not mandatory
wrapping syntax: a flow whose proved return type is plain `Int` returns `10`
directly, but that different signature must have a separately proved terminal
failure contract rather than silently deleting the `default` failure.

### K3 authority decision

```fungi
check(admission) {
  if: { return Ok(plan) }
  deny: { return Err("ADMISSION_DENIED") }
  ambig: { return Err("ADMISSION_UNRESOLVED") }
}
```

Only exact ALLOW enters `if:`. DENY and INDETERMINATE both leave the privileged
path. `check` with a non-`Verdict` subject is rejected by `FUNGI-CHECK-002`.

### `Option` and `Result`

```fungi
match selected {
  Some(value) => return Ok(value)
  None => return Err("MISSING")
  _ => return Err("INVALID_OPTION")
}
```

Even when the named constructors appear exhaustive, the project standard
retains the explicit terminal wildcard as the fail-closed impossible-state
path.

## The record rule

Use one declaration spelling and one explicit construction spelling:

```fungi
record Pair {
  left: Int
  right: Int
}

pure flow pairDigest(left: Int, right: Int) -> Int {
  let pair: Pair = Pair { right: right, left: left }
  return pair.left * 1000 + pair.right
}
```

The declaration is `record Pair { ... }`. `type Pair { ... }` is refused with
`FUNGI-PARSE-002` because older handling erased the field schema. `type` remains
valid only for an explicit alias such as `type PairResult = Result<Pair,String>`.

`Pair(left, right)` is a flow call, not a record constructor. It is refused
unless an exact callable named `Pair` is declared or imported, and a record
declaration does not provide that authority. Use `Pair { left: left, right:
right }`.

Record admission is exact and fail closed:

- a named literal must name the required nominal record;
- every field occurs exactly once;
- missing and surplus fields are refused;
- every value is assignment-compatible with its declared field type; and
- the emitter lays fields out in declaration order, regardless of literal
  source order.

An anonymous literal may be contextually adopted only when the complete shape
is exact:

```fungi
let pair: Pair = { right: right, left: left }
```

Checker acceptance alone is not execution parity. Use the Golden Pack record
vector and the record field-order differential before promoting translated
record code.

## The effects rule

Do not translate an import name or a TypeScript package name into an effect.
Derive effects from operations and calls.

For every flow, perform this sequence:

1. list every direct operation and call;
2. resolve each through the structured operation registry first;
3. include effects of every called Fungi flow transitively;
4. reject unknown, dynamic, ambiguous, or unadmitted host operations;
5. choose the flow tier from the derived set;
6. declare exactly the canonical derived effects; and
7. run strict type and governance checking and require zero errors and zero
   warnings.

The complete canonical vocabulary and operation mapping are maintained in
[Effects and capabilities](../language/fungi/03-effects-and-capabilities.md)
and [Effect reference](../reference/effects.md). Do not copy a frozen list into
a conversion prompt. The source of truth is `CANONICAL_EFFECTS`,
`DENY_ONLY_EFFECTS`, the operation registry, and the secure-tier set in
`effect-checker.ts`.

### Flow tier selection

| Derived behavior | Required declaration |
|---|---|
| no effects and no effectful callees | `pure flow`; empty or omitted effects |
| an admitted effect set that does not require the secure tier | `flow` with the exact effects |
| any secure-required effect | `secure flow` with the exact effects |
| unknown effect, deny-only effect, or host behavior without a typed admitted ABI | blocked candidate; do not simulate it |

Secure-required effects include trust-boundary networking, secrets,
cryptographic signing/verification/encryption/decryption, high-consequence
mutation and sinks, protected-data access, process/native/shell execution, and
the other names in the checker's `SECURE_REQUIRED_EFFECTS` set.

`eval.execute` and `memory.spill` are recognised deny-only effects. Declaring
them does not make them available.

### Effect examples

| TypeScript operation | Derived Fungi effect | Translator action |
|---|---|---|
| database query/get/select | `database.read` | declare directly and propagate to callers |
| database insert/update/delete | `database.write` | use `secure flow`; preserve refusal and audit requirements |
| HTTP request | `network.outbound` | use `secure flow`; do not use `http.get` as the declaration |
| audit write | `audit.write` | use `secure flow`; redact before the sink |
| signature verification | `crypto.verify` | use `secure flow`; require a typed admitted provider |
| secret lookup | `secret.read` | use `secure flow`; do not write secret data into evidence |
| cache get/set | `cache.read` / `cache.write` | cache evidence never becomes authority |
| dynamic evaluation | `eval.execute` | refuse; the effect is deny-only |
| untyped native or host call | not safely derivable | block the candidate until an admitted ABI exists |

Aliases and broad names are not acceptable for a translation candidate even
when a development checker can canonicalise them. New candidates use the exact
canonical spelling and must produce no effect warning.

## One ledger row per decision and operation

Before writing `.fungi`, create a ledger with these columns:

| Source location | Source expression/call | Proven subject or operation type | Terminal? | Fungi construct | Direct effect | Transitive effects | Flow tier | Failure exit | Evidence |
|---|---|---|---:|---|---|---|---|---|---|

Rules for completing it:

- `Bool`, `Verdict`, `Int`, `Option<T>`, `Result<T,E>`, and enum names are
  evidence, not guesses;
- one source decision or effectful call gets one row;
- unknown type or effect is recorded as `BLOCKED`, not coerced;
- every negative, unknown, malformed, missing, exception, overflow and
  impossible state names its exit; and
- direct plus transitive effects must equal the contract declaration exactly.

## When one file cannot be translated

A blocked file does not stop a multi-file research batch. Complete its source
dossier and ledger, write no invented replacement, mark its precise blocker,
then continue with the next assigned file. The batch report must account for
every file as `CANDIDATE`, `BLOCKED`, `NO_RUNTIME_BEHAVIOR`, or
`SUPERSEDED_BY_EXISTING_FUNGI` with evidence.

No status in an external staging folder authorizes integration, TypeScript
deletion, package retirement, `.slide` execution, signing, or production use.

## Name the execution surface

`galerina check` success proves frontend acceptance only. Executed parity must
also identify the exact runtime surface and prove that the complete typed input
reached the selected flow. Do not turn a limitation of one command-line
marshaller into a language or SLIDE blocker.

| Surface | Current admitted input relevant to translation | Use and limit |
|---|---|---|
| raw legacy `galerina run --invoke` | positional `Int` and `Bool` | narrow pure-WASM development probe; no structured input syntax |
| governed legacy `galerina run --governed` | positional values declared as `Int`, `Bool` or `String` | governed interpreter probe; no typed Array, Bytes or record input syntax |
| independent SLIDE checked-package API | exact admitted profiles including scalar/K3 values, bounded String, owned Bytes and dense immutable `Array<Int>` | reference-only `.fungi -> GIR -> .slide -> VOK` evidence; every profile keeps its own limits |

The current `Array<Int>` SLIDE profile admits at most 16 exact signed Int32
elements and only the frozen `.count()`, checked `.get() -> Option<Int>` and
exact `.includes(Int) -> Bool` operations. It does not admit general arrays,
Array results, nested arrays, mutation, iteration or callbacks. String and
Bytes profiles are similarly bounded. String additionally admits exact
`.startsWith(String) -> Bool` and `.endsWith(String) -> Bool` over canonical
UTF-8; it does not imply a general String, collection or host-object surface.
Exact bounded `.includes(String) -> Bool` is also admitted, with its separate
comparison-work budget described below.

Use the checked String method directly when TypeScript performs an exact prefix
decision:

```ts
return value.startsWith(prefix);
```

```fungi
pure flow starts(value: String, prefix: String) -> Bool {
  return value.startsWith(prefix)
}
```

Do not rewrite locale, case-folded, normalized, regex, suffix or substring
logic as `startsWith`. Contract 55 preserves exact canonical UTF-8 bytes,
observes lengths and refuses values above 256 bytes. It grants no effect,
callback, mutation, host call or package-retirement authority.

Exact suffix decisions use the corresponding checked method:

```fungi
pure flow ends(value: String, suffix: String) -> Bool {
  return value.endsWith(suffix)
}
```

The same canonical UTF-8 and 256-byte limits apply. Do not substitute suffix
testing for substring search.

Exact substring membership uses the checked String method directly:

```ts
return value.includes(needle);
```

```fungi
pure flow contains(value: String, needle: String) -> Bool {
  return value.includes(needle)
}
```

Contract 57 keeps the 256-byte Text and 96-step ceilings but adds a distinct
comparison-work budget. For byte lengths `n` and `m`, work is exactly
`m(n-m+1)` when `1 <= m <= n`, zero otherwise, at most 16,512 per operation
and 65,536 per execution. Every candidate window is visited after mismatch or
match. Do not translate index-returning search, regex, normalization,
case-folding, callbacks or host-object behavior as this Boolean operation.
This reference profile does not by itself authorize package retirement.

An exact emptiness decision does not need a general text-length contract. When
the static receiver type is exactly `String`, these rewrites preserve behavior
for every well-formed string, including non-ASCII text:

```ts
value.length === 0
value.length > 0
```

```fungi
value == ""
value != ""
```

For admitted `Array<Int>`, use `.count()` and compare the result. Do not infer a
receiver type from its variable name, and do not rewrite general `.length`
arithmetic this way. Text byte count, Unicode scalar count and legacy code-unit
count are different operations and remain deliberately unmerged.

Governed CLI admission is exact by declared type and arity. `Bool` accepts only
`true` or `false`; `Int` accepts only canonical signed decimal safe integers;
and `String` preserves the exact token even when it looks numeric or Boolean.
Missing, surplus, malformed and unsupported declared inputs refuse before the
interpreter runs. The CLI never converts a scalar into an empty/default
structured value.

Use the narrowest accurate blocker:

- `BLOCKED_LEGACY_CLI_HARNESS` when only the legacy CLI cannot marshal a
  required input;
- `BLOCKED_SLIDE_PROFILE` when the independent compiler/VOK path lacks the
  required type or operation;
- `BLOCKED_LANGUAGE` when the Fungi semantics cannot express the behavior;
- `BLOCKED_HOST_ABI` when a typed admitted host boundary is absent; and
- `BLOCKED_EXECUTION` only after every applicable authorized research surface
  has been checked and none can execute the required vectors.

Never award parity from an empty/default path produced by an input-type
mismatch. At least one non-default distinguishing vector must prove that the
intended input reached the flow. A candidate dossier records the source pin,
toolchain pin, execution surface, exact input profile, command or API call,
independent oracle result, observed result and refusal/mutation evidence.
