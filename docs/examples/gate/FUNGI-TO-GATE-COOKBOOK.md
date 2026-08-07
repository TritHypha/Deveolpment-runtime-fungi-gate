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

## 7. Border data — API input, database rows, and where sanitisation lives

**The regex is not in the circuit, and that is the design.** Take email
validation: checking `rawEmail` against a pattern is expression work — `.gate`
has no expressions, so the regex lives inside a `.fungi` component
(`validate.email`), and that component's own tests prove the pattern is right.
What the circuit proves is the thing a regex never can: **that nothing routes
around the validator.**

The mechanism is the type ladder from recipe 2's contract side, applied at the
boundary:

- the raw type is `construction: "source"` — it may arrive from outside;
- the validated type is `construction: "canonical-only"` — the only way to
  hold one is to have been given it by its validator;
- the privileged part **demands the validated type**.

```
@gate 3.0.0
CIRCUIT create_patient(raw: RawEmail) -> Receipt
  INTENT "Validate boundary input before any privileged use."
  REQUIRES:
    effect database.write
  PARTS:
    [validate :: app.validate.email@1.0.0]
    [insert :: app.patient.insert@1.0.0]
  WIRES:
    IN.raw -> validate.raw
    validate.value -> insert.email
    insert.value -> OUT.value
END
```

Measured through the production dispatcher, all three directions:

| construction | verdict |
|---|---|
| raw → validator → privileged part | **CLEAN** |
| raw wired straight into the privileged part | `GATE-WIRE-101` |
| the validated type smuggled in as a circuit parameter | `GATE-WIRE-101` + `GATE-SEM-005` |

**Database data is the same shape plus two declarations.** The reading
component's contract carries its effect (`database.read`) — which the circuit's
`REQUIRES:` envelope must cover (`GATE-SEM-009`), so a part cannot quietly
touch the database — and `tainted: true` when the payload is sensitive, which
hands governance to the egress fence: a declared cut must dominate egress
(`GATE-SEM-002`) and removing every cut must disconnect taint from `OUT`
(`GATE-SEM-003`).

**Validation and redaction are different fences — keep them apart.** A mint is
not a sanitizer: validating an email makes it well-*formed*, not
non-*sensitive*. A validated `Email` flowing from a tainted read still has to
pass the cut before egress. The construction fence and the cut fence share no
state, by design.

**The honest split, in one line:** the `.fungi` component proves the sanitiser
is *correct*; the `.gate` circuit proves it is *unbypassable*. Neither proof
substitutes for the other.

**Two consequences of that split, both worth knowing before you draw:**

- **A cut's `fields` are declared, not verified.** `fields={PatientId,SSN}` is
  a declaration the checker does not audit against the type — a circuit has no
  field concept, and giving it one would mean a structural type system. The
  cut's *position* is proven (`GATE-SEM-002/003`); which fields it strips is
  the component's obligation, proven by that component's own tests. A cut
  naming the wrong field is still a leak, and nothing in `.gate` will tell you.
- **Redaction is not laundering.** Taint follows the graph, so passing a value
  through an ordinary transform does not clean it. Drawing a JWT signer between
  a tainted read and `OUT` refuses (measured: `SEM-002` + `SEM-003`) — the
  signer re-shapes the value, it does not redact it. Put the cut *before* the
  transform and let the transform take the narrowed type; that way the
  correction lives in the contract rather than in a reviewer's memory.

## What to reach for

| you are looking at | draw a circuit? |
|---|---|
| an authority check guarding privileged work | **yes** — this is the case `.gate` exists for |
| a read that must be redacted before it leaves | **yes** — the cut and its domination proof |
| a request path with several refusal reasons | **yes** — the terminals make them auditable |
| a pure computation, a transform, a helper | no — `.fungi` |
| a data pipeline with no decision in it | no — `.fungi` |
