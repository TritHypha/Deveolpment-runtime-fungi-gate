# `.fungi` → `.gate` — the cookbook

The like-for-like map ([FUNGI-TO-GATE-LIKE-FOR-LIKE.md](FUNGI-TO-GATE-LIKE-FOR-LIKE.md))
answers *"what does this construct become?"*. This answers the harder question
an author actually faces: **"here is a flow — what do I draw?"**

It builds up from the simplest possible case. Read it in order; each recipe adds
exactly one idea to the one before.

**Coming from TypeScript? Go through `.fungi` first — never straight to a
circuit.** [TYPESCRIPT-TO-FUNGI-CONTROL-AND-EFFECTS.md](../TYPESCRIPT-TO-FUNGI-CONTROL-AND-EFFECTS.md)
is the authority on that leg: it maps `throw` / `try` / `catch` onto `Result` /
`trap` / `fault`, and names the component chain that enforces each rule.

The two-leg route is not bureaucracy. `throw` has **no `.gate` equivalent at
all**, but it has an exact `.fungi` one — and once a failure has been
*classified* as `Err`, `trap` or `fault`, its terminal here is immediate (§1,
§4). Translating TypeScript straight to a drawing skips the step where the
failure acquires its class, and **the class is what picks the terminal**. A
`DENY` that should have been a `TRAP` is a real mis-drawing, and the
classification is the only thing that prevents it.

**The one rule that makes all of it work:** a circuit does not *contain* logic,
it *routes between parts that contain logic*. Every recipe below is therefore
the same move — lift the test into a component with declared output ports, and
draw where each port goes.

---

## 1. `if` on a Boolean — the atom

```fungi
pure flow guard(index: Int, length: Int) -> Result<Int,String> {
  if index < 0 or index >= length {
    return Err("BOUNDS")
  }
  return Ok(index)
}
```

The comparison cannot appear in a circuit. It becomes a **two-arm decision
part**, and the arms become wires:

```
@gate 3.0.0
CIRCUIT guard(index: Index, length: Length) -> Index
  INTENT "Admit an index that is inside the bounds."
  REQUIRES:
  PARTS:
    [bounds :: app.index.in_bounds@1.0.0]
  WIRES:
    IN.index  -> bounds.index
    IN.length -> bounds.length
    bounds.ok      -> OUT.value
    bounds.refused -> DENY.out_of_bounds
END
```

**What moved where:**

| in `.fungi` | in `.gate` |
|---|---|
| the expression `index < 0 or index >= length` | inside `app.index.in_bounds`, invisible to the circuit |
| the `if` itself | the *existence* of two output ports |
| `return Err("BOUNDS")` | `DENY.out_of_bounds` — a named terminal |
| `return Ok(index)` | `OUT.value` |

The contract is what makes it checkable:

```json
{ "id": "app.index.in_bounds", "version": "1.0.0", "status": "SHIPPED",
  "implementationDigest": "sha256:…",
  "inputs":  [ { "name": "index",  "type": "Index",  "required": true },
               { "name": "length", "type": "Length", "required": true } ],
  "outputs": [ { "name": "ok", "type": "Index" }, { "name": "refused", "type": "Index" } ],
  "arguments": [], "effects": [], "capabilities": [] }
```

> **Boolean, not K3.** Two arms is a Boolean test, and it is *not* an authority
> decision. Do not mark it `decision: true` — that field means three-valued
> governance, and a two-arm part claiming it will refuse (`GATE-REGISTRY-006`:
> a declared arm must be an output port, and there is no third).

---

## 2. `if` on a number — same shape, one new obligation

Numeric tests translate identically: the comparison lifts into the part. What
changes is that **the number itself may need to enter the circuit**, and a
circuit cannot compute one — so it is either a parameter or a literal argument.

```fungi
if amount > limit { return Err("LIMIT") }
```

```
  PARTS:
    [cap :: app.amount.within@1.0.0 limit=1000]
  WIRES:
    IN.amount  -> cap.amount
    cap.ok      -> OUT.value
    cap.refused -> DENY.over_limit
```

The threshold is an **argument** (`limit=1000`, an `Int`), and the contract
bounds it:

```json
"arguments": [ { "name": "limit", "type": "Int", "required": true, "min": 1, "max": 1000000 } ]
```

That `min`/`max` is load-bearing — it is what makes `limit=0` or `limit=-5` a
refusal (`GATE-RESOLVE-112`) rather than a silently degenerate cap.

**If the threshold is dynamic**, it is a parameter, and the `$` sigil binds it:

```
    [cap :: app.amount.within@1.0.0 limit=$ceiling]
```

`limit=ceiling` (no sigil) is a **`Name`** — a bare identifier that merely looks
like your parameter. Different type; the contract accepts only what it declared.

> **The circuit still cannot do arithmetic.** `amount * rate > limit` is ONE
> part, not three: the multiplication has no representation in a drawing. If you
> catch yourself wanting a wire to "carry the product", the product belongs
> inside the component.

---

## 3. Two tests in sequence — chain the ports

```fungi
if not authorized { return Err("DENIED") }
if amount > limit { return Err("LIMIT") }
return Ok(process(amount))
```

Sequence becomes **depth**: the second part is fed by the first's success arm,
which is what makes the ordering visible and checkable.

```
  WIRES:
    IN.caller -> authz.subject
    IN.amount -> authz.resource
    authz.allow         -> cap.authority     ← only the admitted path continues
    authz.deny          -> DENY.not_authorized
    authz.indeterminate -> DENY.authority_unknown
    IN.amount    -> cap.amount
    cap.ok       -> work.amount
    cap.refused  -> DENY.over_limit
    work.value   -> OUT.value
```

Note `authz` has **three** arms — an authority check is K3 (§4), while `cap` is
Boolean. They sit in one circuit without conflict.

---

## 4. `check` — the K3 authority decision (the one `.gate` is FOR)

```fungi
check(admission) {
  if:    { return Ok(plan) }
  deny:  { return Err("ADMISSION_DENIED") }
  ambig: { return Err("ADMISSION_UNRESOLVED") }
}
```

This is the **direct** mapping, and the reason the language exists:

```
    authz.allow         -> record.authority
    authz.deny          -> DENY.not_authorized
    authz.indeterminate -> DENY.authority_unknown
```

Declared in the contract, so the checker verifies every arm is routed whatever
they are named (`GATE-RESOLVE-111`):

```json
"decision": true, "arms": ["allow", "deny", "indeterminate"]
```

**False must never fold into Unknown** — the three arms go to three distinct
destinations. And a non-allow arm may not reach `OUT` without a *later*
decision re-authorizing it (`GATE-SEM-011`).

---

## 5. `match` — a closed arm set

Each arm becomes an output port; every declared arm must be wired. **There is no
wildcard**: `.fungi` needs `_ =>` because an `Int` has more inhabitants than you
can enumerate, but a `.gate` decision's arms are *enumerated by the contract*,
so completeness means "every declared arm is routed" and there is no residue for
a catch-all to catch.

---

## 6. A whole flow — the partition method

For anything larger than one function, do not translate file-by-file. **A
circuit is coarser than a file**: one circuit governs an entry point, and
everything it calls becomes a component.

1. **Find the entry point** — an HTTP handler, a job, a command. That is one
   circuit, and its signature is the circuit signature.
2. **Walk to the first authority decision.** Everything before it is input
   marshalling: usually zero parts.
3. **Draw the spine** — authority → the privileged work → the cut → egress. Each
   node is one part.
4. **Everything else is a component.** Validation, arithmetic, formatting,
   retries, serialization: registered contracts, invisible to the drawing.
5. **Name each refusal.** Every failure path in the original becomes a named
   terminal — `DENY` for withheld authority, `TRAP` for an invariant breach,
   `FAULT` for a governed failure, `DRAIN` for a value deliberately discarded.

If step 2 finds no authority decision and step 3 finds nothing to redact, **the
flow has no governance spine and should stay `.fungi`.** That is the common
case, and recognising it early is the cheapest possible answer.

---

## What to reach for

| you are looking at | draw a circuit? |
|---|---|
| an authority check guarding privileged work | **yes** — this is the case `.gate` exists for |
| a read that must be redacted before it leaves | **yes** — the cut and its domination proof |
| a request path with several refusal reasons | **yes** — the terminals make them auditable |
| a pure computation, a transform, a helper | no — `.fungi` |
| a data pipeline with no decision in it | no — `.fungi` |
