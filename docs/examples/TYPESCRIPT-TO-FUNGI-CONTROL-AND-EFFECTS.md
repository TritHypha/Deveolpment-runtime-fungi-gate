# TypeScript to Fungi: control-flow and effects worked map

## Status

This is the maintained worked map for humans and AIs translating existing
TypeScript into `.fungi`. It records the active compiler rules; it does not
grant runtime authority or prove parity with the TypeScript source.

The compiler remains authoritative. The primary references are:

- [Control flow](../language/fungi/07-control-flow.md);
- [Effects and capabilities](../language/fungi/03-effects-and-capabilities.md);
- [Effect reference](../reference/effects.md); and
- `packages-galerina/galerina-core-compiler/src/type-checker.ts` and
  `effect-checker.ts`.

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
