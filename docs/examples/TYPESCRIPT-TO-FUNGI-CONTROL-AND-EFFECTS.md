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

### Two cautions

- **The compiler stays the source of truth.** Effects derive from the registry
  (`CANONICAL_EFFECTS` / `DENY_ONLY_EFFECTS` / the secure-tier set in
  `effect-checker.ts`); constructs from the parser, type and governance checkers —
  never from a copied frozen list. Docs reconcile **to** the code, not the other
  way round.
- **Many duplicate copies of this map exist** in snapshot / worktree folders
  (`Galerina-codex-*-close-2026-08-08/…`, `Galerina-AI-Handover-…`,
  `…-Staging-Round-7-…`). Those are frozen snapshots — edit the two authorities
  (this worked map and
  `extra-tests/claude-notes/11-OWNER-RULING-THROW-IF-CHECK-MATCH.md`), never a
  snapshot.

## The authority ladder

A translation moves through separate authorities. Passing one layer never
grants the authority of the next:

```text
.fungi source
    |
    v
parse -> type/effect/governance checks -> canonical GIR
    |                                         |
    | error, unknown or ambiguity             | exact admitted profile only
    +---------------------> REFUSE _=>         v
                                           .slide object
                                                |
                                  independent SLIDE re-admission
                                                |
                                     VOK one-use execution lease
                                                |
                               signed source and host-boundary evidence
                                                |
                                  production authority / retirement gate
```

Keep these claims separate in every translation dossier:

- parser success means only that the source has an AST;
- strict checker success means frontend acceptance, not executed parity;
- one successful vector proves only that exact vector and execution surface;
- a digest-checked candidate is non-authorizing research evidence;
- a production source receipt does not also prove host-boundary ownership;
- VOK consumes narrowly admitted authority; it cannot repair an unproved
  source, effect, lowering or host decision; and
- TypeScript retirement requires exact current evidence and rollback, not a
  percentage, exemption, fallback or stale receipt.

Any unknown at a boundary is a typed refusal. `present-but-unusable` is a
different state from admitted and must not be relabelled available.

## Components that control this syntax and logic

No single text search or document defines `.fungi` behavior. For `if`, `match`,
`check`, `Result` propagation, `trap`, and `fault`, the complete relevant
implementation/evidence chain is:

| Layer | Component | Responsibility |
|---|---|---|
| keyword/token authority | `packages-galerina/galerina-core-compiler/src/lexer.ts` | recognises active keywords, operators, literals and `_`; `try`, `catch` and `throw` are not `.fungi` exception constructs |
| shared AST contract | `packages-galerina/galerina-core/src/index.ts` | defines `AstNode`, `AstNodeKind`, tokens, locations and diagnostics shared by compiler stages |
| grammar and AST construction | `packages-galerina/galerina-core-compiler/src/parser.ts` | parses `ifStmt`, `matchExpr`, `checkExpr`, `trapDecl`, `faultStmt`, `return` and postfix `?`; requires all three `check` arms at parse time |
| type semantics | `packages-galerina/galerina-core-compiler/src/type-checker.ts` | enforces Bool-only `if`/`while`, Verdict-only `check`, mandatory match wildcard, arm reachability, pattern/payload types and return compatibility |
| type vocabulary | `packages-galerina/galerina-core-compiler/src/type-registry.ts` and `package-type-registry.ts` | resolve built-in and admitted package types; a name or integer that resembles `Verdict` does not acquire K3 authority |
| name and call resolution | `packages-galerina/galerina-core-compiler/src/symbol-resolver.ts`, `stdlib-registry.ts`, and `stdlib.ts` | distinguish language constructs from callable flows/methods and type `Ok`, `Err`, `Some`, `None`, and registered operations |
| governance semantics | `packages-galerina/galerina-core-compiler/src/governance-verifier.ts` | rejects non-exhaustive matches and unsafe K3/fault/governance paths |
| effects | `packages-galerina/galerina-core-compiler/src/effect-checker.ts` | walks branch and arm bodies, derives operations/effects and prevents a branch from hiding an undeclared effect |
| fault policy | `packages-galerina/galerina-core-compiler/src/resilience-inference.ts` | checks declared fault handling, including deny monotonicity; it does not introduce local `try`/`catch` syntax |
| reference execution | `packages-galerina/galerina-core-compiler/src/interpreter.ts` | executes the AST, dispatches K3 exactly, propagates typed returns, audits faults and refuses malformed runtime states |
| current target lowering | `packages-galerina/galerina-core-compiler/src/wat-emitter.ts` | lowers admitted control flow and retains explicit traps for missing arms, malformed Verdicts and faults |
| GIR stage | `packages-galerina/galerina-core-compiler/src/gir-emitter.ts` | emits the governed intermediate representation; acceptance still requires proof that the chosen construct survives the applicable GIR/target profile |
| auxiliary prototype | `packages-galerina/galerina-core-compiler/src/bytecode-vm.ts` | executes its own admitted subset; it is not authority for constructs it does not implement |
| pipeline wiring | `packages-galerina/galerina-core-compiler/src/cli.ts` and `galerina.mjs` | select and run parser, type, effect, governance, execution and build stages; parser success alone is not admission |
| release/diagnostic gate | `packages-galerina/galerina-core-compiler/src/production-check.ts` and `security-gate.ts` | stop production output when an applicable error/refusal remains; never reinterpret a missing pass as success |
| structural lint | `packages-galerina/galerina-core-compiler/src/lint-checker.ts` and `scripts/lint-fungi.mjs` | enforce additional coding-shape rules; lint is supplemental and cannot override parser/type/governance semantics |
| self-hosted lexer | `packages-galerina/galerina-core-compiler/src/self-hosted/lexer.fungi` | canonical `.fungi` lexer specification and parity surface |
| self-hosted parser | `packages-galerina/galerina-core-compiler/src/self-hosted/parser.fungi` | canonical parser specification; currently refuses any construct it has not yet modelled rather than guessing |
| self-hosted type checker | `packages-galerina/galerina-core-compiler/src/self-hosted/type-checker.fungi` | mirrors Bool-condition and match-wildcard diagnostics in `.fungi` |
| self-hosted effect checker | `packages-galerina/galerina-core-compiler/src/self-hosted/effect-checker.fungi` | mirrors effect derivation/admission in `.fungi` |
| self-hosted governance | `packages-galerina/galerina-core-compiler/src/self-hosted/governance-verifier.fungi` | mirrors governance decisions in `.fungi` |
| self-hosted GIR/runtime | `packages-galerina/galerina-core-compiler/src/self-hosted/gir-emitter.fungi` and `runtime.fungi` | canonical `.fungi` specifications for lowering and execution; parity tests, not filenames, establish implemented coverage |
| independent SLIDE frontend | `SLIDE/src/checked-fungi-pure-scalar-compiler.mjs`, `checked-fungi-slide-compiler.mjs`, and `checked-fungi-package-compiler.mjs` | independently re-parse/re-admit their bounded `.fungi` profiles and emit checked `.slide`; unsupported syntax refuses |
| Galerina-to-SLIDE decision contract | `packages-galerina/galerina-core-compiler/src/self-hosted/slide-checked-decision-frontend.fungi` | defines the checked K3 decision subset supplied to independent SLIDE |
| minimal examples | `docs/examples/golden/001-bool-if.fungi` through `004-k3-check.fungi` | checker-proven copy shapes for Bool `if`, non-K3 `match`, `Result` refusal and K3 `check` |
| focused regression tests | `condition-type-gate.test.mjs`, `check-construct.test.mjs`, `type-checker.test.mjs`, `governance/match-exhaustiveness.test.mjs`, `governance/tri-lint-verdict-match.test.mjs`, `fault-construct.test.mjs`, `wat-match-wildcard-fallback.test.mjs`, `wat-k3-constructs.test.mjs`, and `wat-try-propagation.test.mjs` | prove rejection and execution/lowering behavior at the named layer |
| independent SLIDE tests | `SLIDE/tests/checked-fungi-pure-scalar-compiler.test.mjs`, `checked-fungi-slide-compiler.test.mjs`, and `checked-fungi-package-compiler.test.mjs` | prove only the bounded independent profiles named by those suites |
| serial corpus tools | `scripts/fungi-golden-probe.mjs` and `scripts/audit-fungi-corpus-check.mjs` | replay golden vectors and audit tracked `.fungi` without treating a text count as semantic proof |
| generated diagnostic evidence | `build/code-registry/REGISTRY.md` and `build/code-index/CODE_INDEX.md` | map live diagnostic codes to declarations, emitters, tests and docs; regenerate rather than hand-edit |
| passive capability map | `packages-galerina/galerina-devtools-hypha` and the sibling `subprojects/hypha` research tool | find static dispatch, sentinel, checker-wiring and diagnostic candidates; never converts a text match or an empty result into a semantic verdict |

The compiled `dist/` files are generated execution artefacts. A source edit is
not behaviorally proved until the package is rebuilt and the tests execute the
new output.

The following are explicitly **not** authorities for these decisions:

- a method whose name happens to be `.check()`;
- `gate-parser.ts` or `docs/language/gate/`, which define the separate `.gate`
  language;
- prose that conflicts with the live checker and executable evidence;
- any helper named `flow-kinds.ts`: flow-declaration lookup does not define
  statement syntax, and the transient file described by the external worker's
  resume marker was not present in the checkout at final verification; and
- SLIDE/VOK internals outside an admitted frontend profile: SLIDE preserves and
  independently verifies admitted semantics, but Galerina owns `.fungi`
  source-language syntax.

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

## What replaces `throw` and `try`/`catch`

`.fungi` has no exception-driven control flow. Do not translate a TypeScript
`throw` mechanically and do not invent `try`/`catch` syntax. First classify the
failure, then preserve it through one of the admitted forms:

| Source meaning | Fungi form | Caller behavior |
|---|---|---|
| expected, recoverable failure | `Result<T,E>` and `return Err(error)` | handle with exhaustive `match`, or propagate with `?` |
| expected absence | `Option<T>` and `return None` | handle with exhaustive `match`, or propagate with `?` where admitted |
| Boolean invariant or boundary failure | `trap condition : ERROR_CODE` | terminal when the Boolean condition is true |
| unrecoverable governed failure | `fault reason` | terminal, audited and deny; no local handler |

Use `match` when the TypeScript `throw` is the default or failure alternative
of a selector, tagged union, state machine, `switch`, `Result`, or `Option`.
`match` makes all admitted outcomes and the fail-closed default visible in one
place. The arm still terminates with `Err`, `trap`, or `fault`; `match` does not
replace the failure value itself.

Do not introduce `match` merely because the source contains `throw`. A single
Boolean rejection remains an `if`/`trap`, and an unrecoverable invariant with
no alternatives remains `fault`.

For example, this TypeScript function has a normal input error, not a process
fault:

```ts
function selectMode(mode: number): number {
  if (mode === 1) return 10;
  throw new Error("MODE");
}
```

The failure remains in the return type:

```fungi
pure flow selectMode(mode: Int) -> Result<Int,String> {
  match mode {
    1 => return Ok(10)
    _ => return Err("MODE")
  }
}
```

A caller either handles the result explicitly:

```fungi
match selectMode(mode) {
  Ok(value) => return value
  Err(reason) => return 0
  _ => return 0
}
```

or propagates the typed failure when its own return type permits it:

```fungi
let value: Int = selectMode(mode)?
return Ok(value + 1)
```

Use `trap` for a Boolean failure predicate whose occurrence must terminate the
flow:

```fungi
trap index < 0 or index >= length : "FUNGI-MEMORY-006"
```

Use `fault` only when the flow cannot safely return a normal typed failure:

```fungi
fault "CORRUPT_ADMITTED_STATE"
```

`fault` is not a recoverable exception. It is an audited terminal denial. Do
not use it for ordinary validation failures that belong in `Result` or
`Option`.

The TypeScript compiler/bootstrap implementation is a separate layer. A host
API or internal invariant may still raise a JavaScript exception, but public
compiler and runtime boundaries must turn it into a stable diagnostic or
refusal and stop. A catch must never discard the error and continue a trust
path. Host exceptions are not copied into generated `.fungi`.

## `check` is a construct; `.check()` is a method call

These spellings are unrelated:

```fungi
check(admission) {
  if: { return Ok(plan) }
  deny: { return Err("DENIED") }
  ambig: { return Err("UNRESOLVED") }
}
```

```fungi
let report: Report = StockApi.check(items)
```

The first is the language's Verdict-only K3 dispatcher. The second is an
ordinary call to a method named `check`; its return type, effects and failure
contract come from that method's declaration. Counting `.check(` calls says
nothing about whether the language construct exists.

For authority code, every arm of `check` exits the current flow. If a K3
decision must produce a value for later work, isolate the `check` in a helper
flow and return one typed value from every arm; the caller may then continue
with that result. Do not let a Deny or Unknown arm fall through to privileged
work.

## Do not infer wildcard defects from line windows

The active checker requires a wildcard arm on every `match`:

- `FUNGI-TYPE-023` reports a missing `_ =>` or `else =>` arm;
- `FUNGI-MATCH-001` reports the governance hole;
- arms after a wildcard are rejected as unreachable by `FUNGI-TYPE-022`; and
- the backend traps an unmatched value as a final defence.

Therefore a text search such as "no `_ =>` within the next 24 lines" is not a
finding and must not drive a bulk rewrite. Multiline arms, nested blocks and
long matches make that instrument unsound. Audit the parsed `matchExpr` nodes,
run strict type and governance checks, and fix only files that produce a real
diagnostic. A wildcard is the final arm and its body must fail closed; it must
not silently admit or continue a privileged path.

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
`FUNGI-PARSE-007` because older handling erased the field schema. `type` remains
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

Declarations and literals have a hard **64-field** parser ceiling. Field 65
emits `FUNGI-PARSE-008`; surplus fields are parsed only for recovery and never
enter the authorizing AST. A translation that needs more fields must split the
schema explicitly. This does not widen the independent SLIDE record profile,
which currently admits one schema of one to eight fields.

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

## Integration and retirement checklist

The production package layout is flat: every Galerina package is one peer named
`packages-galerina/galerina-[category]-[name]`. Do not reproduce an npm-style
tree by placing packages or repeated dependency identities inside other
packages.

For each translated source, retain the TypeScript differential shadow until
all of the following are current and green:

1. exact source and toolchain identities are pinned;
2. the decision/effect ledger is complete, with no coerced unknowns;
3. positive, boundary, negative, ambiguity and mutation vectors exist;
4. strict frontend checks produce zero errors and zero warnings;
5. the complete typed input reaches the named execution surface;
6. observable result, effects, refusals, diagnostics and authority match the
   independent oracle;
7. the exact GIR and `.slide` object are independently re-admitted;
8. retained host boundaries have typed least-authority ABIs and ownership
   evidence;
9. rollback evidence exists and is bound to the same identities; and
10. the current production authority and retirement verifiers accept the row.

Do not delete a TypeScript file or dependency tree to improve a count. Remove
it only when its own exact debt has been eliminated. A package-level green
claim is the conjunction of every required row, not an average.

### Use Hypha as navigation, not adjudication

For a disposable question, use the passive in-memory mode so the query writes
nothing:

```powershell
node ..\subprojects\hypha\src\cli.js query kind-coverage `
  --root . `
  --in-memory
```

Hypha reads built `dist/` text. Before trusting a candidate, prove `dist/` is
current, inspect the named compiler enforcement point and run a discriminating
compiler/runtime probe. A zero-result query cannot prove absence. Where Hypha
overlaps a Galerina audit, the documented Galerina audit remains authoritative.
The persistent Hypha database must bind both extractor identity and target
identity before it is used for comparison; its JSON mirror contains only the
static lane and cannot represent execution/sporeprint evidence.

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

Arrays are persistent values. `push` and `append` return a replacement array;
they do not mutate the receiver. Consume the result explicitly:

```fungi
mut items: Array<Int> = []
items = items.append(7)
return items
```

Do not translate a mutating call as a bare statement:

```fungi
items.push(7) // refused: FUNGI-TYPE-028, result would be discarded
```

This refusal is checked by both the TypeScript compiler stage and its `.fungi`
twin. It prevents checker-clean code that appears to append but actually leaves
the collection unchanged.

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
