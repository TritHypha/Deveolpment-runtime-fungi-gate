# `.fungi` → `.gate` — the like-for-like map

## How to read this

Two languages, one governance engine. `.fungi` is for **humans and AI**; `.gate`
is **for AI**, and is being taken out as a language other platforms can adopt.
They are not two spellings of one thing:

- **`.fungi` computes.** It has types, expressions, decisions, arithmetic and
  exits.
- **`.gate` connects.** It has parts, ports and wires — and no expressions at
  all. It cannot add two numbers.

So a construct maps in one of three ways, and this document always says which:

| | Meaning |
|---|---|
| **direct** | the same idea exists in both, with different spelling |
| **inside a part** | it exists, but only *within* a `.fungi` component the circuit names — the circuit sees a port, not the mechanism |
| **no equivalent, by design** | `.gate` deliberately cannot express it |

The companion map for TypeScript → `.fungi` is
[TYPESCRIPT-TO-FUNGI-CONTROL-AND-EFFECTS.md](../TYPESCRIPT-TO-FUNGI-CONTROL-AND-EFFECTS.md).

---

## 1. Decisions — `if`, `check`, `match`

In `.fungi` the construct is chosen by the **proven subject type**. In `.gate`
all three become the same physical thing — **a decision part whose arms are
ports** — and the contract, not the drawing, says how many arms there are and
what they are called.

### `if` — one Boolean question

```fungi
if index < 0 or index >= length {
  return Err("BOUNDS")
}
```

**Inside a part.** A circuit has no Boolean expressions and no comparison
operators. The test becomes a component with two declared arms:

```
    IN.index  -> bounds.index
    IN.length -> bounds.length
    bounds.ok      -> reader.authority
    bounds.refused -> DENY.out_of_bounds
```

The comparison lives in the component. The circuit shows only that a decision
happened and where each outcome went.

### `check` — the K3 authority decision

```fungi
check(admission) {
  if:    { return Ok(plan) }
  deny:  { return Err("ADMISSION_DENIED") }
  ambig: { return Err("ADMISSION_UNRESOLVED") }
}
```

**Direct** — this is the construct `.gate` models most exactly:

```
    IN.caller -> authz.subject
    authz.allow         -> record.authority
    authz.deny          -> DENY.not_authorized
    authz.indeterminate -> DENY.authority_unknown
```

| `.fungi` arm | K3 | `.gate` port | Enforced by |
|---|---|---|---|
| `if:` | Allow `+1` | `allow` | — the admitted path |
| `deny:` | Deny `−1` | `deny` | `GATE-AUTH-001` |
| `ambig:` | Unknown `0` | `indeterminate` | `GATE-AUTH-002` |

Both languages refuse to let False collapse into Unknown. `.fungi` requires all
three arms structurally (`FUNGI-CHECK-001`); `.gate` requires all three routed,
to **distinct** destinations.

### `match` — alternatives of one selector

```fungi
match mode {
  1 => return Ok(10)
  2 => return Ok(20)
  _ => return Err("MODE")
}
```

**Inside a part, with one deep difference.** The selector becomes a decision
component; each arm becomes a port; every declared arm must be wired
(`GATE-RESOLVE-111`).

**There is no wildcard in `.gate`, and that is deliberate.** `.fungi` *must* have
`_ =>` because its subject has an open value space — an `Int` has more
inhabitants than you can enumerate, so a catch-all is the only way to be
exhaustive (`FUNGI-TYPE-023`, `FUNGI-MATCH-001`). A `.gate` decision has a
**closed** arm set: the contract enumerates the arms, so completeness means
*every declared arm is routed* and there is no residue for a catch-all to catch.

Closed-world completeness is the stronger property — but it is only as good as
the contract. That is why `decision`/`arms` are contract fields and not a
guess from port names: a component whose arms are spelled `permit`/`refuse`/
`unsure` is checked exactly like one spelled `allow`/`deny`/`indeterminate`.

---

## 2. Exits — what replaces `throw`

Neither language has exceptions. `.fungi` classifies the failure; `.gate` gives
each class its **own terminal**, which is why the terminals must never be
aliased.

| `.fungi` | `.gate` | Meaning |
|---|---|---|
| `return Ok(value)` | `OUT.value` | the single success return |
| `return Err(reason)` | `DENY.<name>` | authority withheld, a normal refusal |
| `return None` | `DENY.<name>` | expected absence, named as such |
| `trap cond : ERR_CODE` | `TRAP.<name>` | invariant or boundary breach |
| `fault "REASON"` | `FAULT.<name>` | unrecoverable governed failure, audited |
| a value deliberately dropped | `DRAIN.<name>` | consumed, going nowhere |
| postfix `?` propagation | **no equivalent, by design** | a circuit has no call stack to propagate up |

`DRAIN` has no `.fungi` counterpart: in a circuit every produced value must go
somewhere, so "this output is intentionally unused" needs to be *drawn*, not
implied by silence.

---

## 3. Contracts

**Direct in spirit, opposite in location.** This is the most important
difference in the whole document.

```fungi
pure flow selectMode(mode: Int) -> Result<Int,String>
contract { intent { "Select one admitted mode." } effects { database.read } }
```

```
CIRCUIT get_customer(caller: CallerId, customer_id: CustomerRef) -> CustomerView
  INTENT "Return one customer record to an authorised caller."
  REQUIRES:
    capability customer.read
    effect database.read
```

| | `.fungi` | `.gate` |
|---|---|---|
| whose contract | the flow you are writing | the **circuit** you are drawing |
| where a *part's* contract lives | in the callee's own source | in the **registry**, outside the file |
| what the file can claim | its own intent and effects | its own intent and envelope only |

In `.fungi` a contract is written beside the code it governs. In `.gate` a part's
contract is **external and authoritative**: ports, argument types and ranges,
`copyable`, `decision`/`arms`, status and implementation digest all come from the
registry. A circuit cannot describe a part — it can only *use* one, and be
refused if it uses it wrongly. You cannot lie about a component in a circuit,
because the circuit is not where the truth is kept.

---

## 4. Types

**`.gate` never declares a type. It only references one.** The registry carries
the catalogue, every type on every port and wire must resolve in it
(`GATE-RESOLVE-108`), and the strict profile refuses an empty catalogue outright
(`GATE-RESOLVE-109`) — an empty catalogue must never mean "allow everything".

Wire types match **exactly**, with no implicit conversion (`GATE-WIRE-101`).

The catalogue describes each type along two axes:

| Axis | Values |
|---|---|
| `kind` | `opaque` · `finite` · `record` · `evidence` · `measurement` |
| `construction` | `source` · `canonical-only` · `verified-measurement-only` |

A `finite` type must declare a non-empty domain, so "an enum with no members"
cannot exist.

---

## 5. Numbers — `Int`, `Decimal`, and the absence of `Float` and π

### `.fungi`

The numeric tower is wider than money arithmetic alone:

| Type | Note |
|---|---|
| `Int` | the integer type |
| `Decimal` | **exact** decimal, written `Decimal("0.20")` — chosen for money and governance so binary rounding cannot creep in |
| `Float`, `Float16`, `Float32`, `Float64`, `Double` | admitted floating-point types; a literal containing `.` infers as `Float` |

`Math` is a real surface, not a stub: `PI`, `abs`, `ceil`, `clamp`, `cos`,
`floor`, `log`, `log2`, `max`, `min`, `pow`, `round`, `sign`, `sin`, `sqrt`,
`tan`. So π, roots and trigonometry are all available to a `.fungi` author.

Two fail-closed edges are worth knowing:

- **Non-finite results refuse rather than propagate.** `Math.sqrt` of a negative,
  or a standard deviation over an empty list, would produce `NaN` — the stdlib
  treats that as a refusal instead of returning a silent `NaN` downstream.
- **`Float16`/`Float32` record *fields* are refused at WASM layout** by
  `FUNGI-LAYOUT-001` until a scalar `f32` lane exists, and `Decimal` fields at
  that same layer until an exact representation replaces the current `f64`
  mapping. This is an emitter-only guard on struct layout — it does **not** mean
  the types are absent from the language. Such a program type-checks clean and is
  refused when it tries to become a module, and the boundary is tested in both
  directions so it can be neither weakened nor left permanently shut.

### `.gate`

**No equivalent, by design.** A circuit has no arithmetic. Numbers appear only as
**argument literals**, typed `Int` (integer, range-checked against declared
`min`/`max`), `Number` (any numeric literal), or `TritLiteral` (exactly `−1`,
`0`, `1`). There is no `Float` type name in `.gate` at all.

### π

`.fungi` has π: `Math.PI`, returning a float. `.gate` does not, and cannot — not
because π is unavailable to the system, but because a circuit has no expressions
to put it in.

So the asymmetry is about *where the mathematics lives*, not about what the
system can compute. If a circuit needs π, it names a component whose contract
declares what it does; the constant and the arithmetic sit inside that component.
A circuit can pass a `Number` argument, but it can never compute one, and it must
never carry a hand-written approximation of a constant the stdlib already
provides exactly.

---

## 6. Arrays and records

### Arrays

```fungi
mut items: Array<Int> = []
items = items.append(7)      // persistent: append RETURNS a replacement
items.push(7)                // refused — FUNGI-TYPE-028, result discarded
```

Arrays are **persistent values**, not mutable containers. The refusal above is
the important one: it stops checker-clean code that appears to append but leaves
the collection unchanged. The independent SLIDE profile is deliberately narrow —
at most 16 exact signed `Int32` elements, with only `.count()`, checked
`.get() -> Option<Int>` and exact `.includes(Int) -> Bool`.

In `.gate`: **inside a part.** A collection is a value on a wire whose type must
resolve in the catalogue. There is no indexing, no iteration and no element
access — a circuit cannot look inside a value. The only collection *syntax* in
`.gate` is the **set literal** for arguments, `fields={CustomerId,Email}`, which
is a closed declaration and not a data structure (duplicate members refuse,
`GATE-RESOLVE-008`).

### Records

`.fungi` declares `record Pair { left: Int  right: Int }` and constructs it by
named literal, `Pair { left: left, right: right }` — never `Pair(left, right)`,
which is a flow call. `type Pair { … }` is refused (`FUNGI-PARSE-007`) because
older handling erased the field schema, and there is a hard 64-field ceiling
(`FUNGI-PARSE-008`).

In `.gate`: **inside a part.** A record is just a catalogue type with
`kind: "record"` flowing along a wire. A circuit cannot construct one, read a
field from one, or name its fields.

---

## 7. Hallmarks — does `.gate` need them?

A **hallmark** is a developer-minted nominal type: a name, a carrier, an optional
closed algebra, and a mandatory *assay* that must be able to fail.

```fungi
hallmark LoyaltyPoints of Decimal {
  decimals: 0
  sign:     non-negative
  ops:      { add, subtract, scale, compare }   // the CLOSED algebra
  gate:     flow assayPoints                    // the assay
}
```

Three properties make it worth having: construction happens **only** through the
assay (a raw assignment is refused, `FUNGI-TYPE-003`); undeclared operations do
not exist (`points / points` will not compile); and minting is
**taint-transparent** — an assay mints, it does not sanitize, so a tainted value
cannot be laundered into a "clean" type (`FUNGI-VALUESTATE-004`).

> Note the collision: the `gate:` field names the **assay flow**, and has nothing
> to do with the `.gate` language.

### The ruling

**`.gate` must not declare hallmarks — and it already honours them. One axis is
declared but not yet enforced.**

**1. It must not declare them.** A `hallmark` declaration is a type *mint*: a
carrier, an ops algebra, and a reference to a flow that must be able to fail.
Every one of those is code. Putting `hallmark` into `.gate` would drag a
type-definition sublanguage into a language whose entire doctrine is *draw,
don't code* — and would split the mint across two files, so the assay and the
type it protects could drift. `.fungi` mints; `.gate` references. Keep it that
way.

**2. It already honours them, structurally.** A hallmarked type arrives in
`.gate` as a type id in the catalogue. Exact wire typing with no implicit
conversion (`GATE-WIRE-101`) means a `String` cannot be wired into a
`CustomerRef` port. That is the circuit-level analogue of `FUNGI-TYPE-003`: the
brand cannot be forged by connection.

**3. And the mint axis is now ENFORCED.** The catalogue's `construction`
field — `source`, `canonical-only`, `verified-measurement-only` — is *exactly*
the hallmark question: may a value of this type simply appear, or must it come
through a sanctioned route? The semantic tier reads it: a non-`source` type
entering as a **circuit parameter** refuses with `GATE-SEM-005`, because a
parameter arrives from outside the governed drawing and the type's constructor
or verifier never ran anywhere the circuit can see. Outputs and returns stay
sound by construction — a component output of such a type is the registered
constructor speaking through its own contract. (For a while this field was
declared and read by nothing — the same shape as the disabled type wall and
the truthy-string `copyable`, both closed earlier. A field that looks like a
guard but is never read is not a guard; now it is read.)

**4. One property preserved in the build.** Minting is taint-transparent in
`.fungi`, and the circuit rule matches: `GATE-SEM-005` shares no state with
the cut passes, so a part whose output is a hallmarked type is never thereby
credited with having cleaned its input. A mint is not a sanitizer in either
language.

---

## 8. Effects

`.fungi` derives effects from operations and calls, and the flow declares exactly
the derived set — `pure flow`, `flow`, or `secure flow` when any secure-required
effect is present.

`.gate` declares its envelope in `REQUIRES:` as `capability` and `effect` lines,
and each part's effects and capabilities come from its registry contract.
**Comparing the two — declared envelope against what the resolved components
actually do — is not yet implemented**, and is carried as a known, classified
difference against the reference implementation rather than left silent.

---

## 9. Summary

| Concept | `.fungi` | `.gate` | Mapping |
|---|---|---|---|
| Boolean decision | `if` (Bool only) | a two-arm decision part | inside a part |
| K3 authority | `check` with `if:`/`deny:`/`ambig:` | `allow`/`deny`/`indeterminate` routed | **direct** |
| selector | `match` + mandatory `_ =>` | closed arm set, all routed | inside a part; **no wildcard** |
| success | `return Ok(v)` | `OUT.value` | direct |
| refusal | `return Err(e)` / `None` | `DENY.<name>` | direct |
| invariant breach | `trap … : CODE` | `TRAP.<name>` | direct |
| governed failure | `fault "REASON"` | `FAULT.<name>` | direct |
| discard | — | `DRAIN.<name>` | `.gate` only |
| propagation | postfix `?` | — | no equivalent, by design |
| contract | beside the flow | circuit's own; parts' in the registry | direct, relocated |
| type declaration | `record`, `hallmark`, alias | — references the catalogue only | no equivalent, by design |
| integers | `Int` | `Int` argument literals, range-checked | argument only |
| exact decimals | `Decimal("0.20")` | `Number` argument literal | argument only |
| floating point | `Float`/`Float16/32/64`/`Double`; only record *fields* are layout-refused | no `Float` argument type | inside a part |
| π, `sqrt`, trig | `Math.PI`, `Math.sqrt`, `Math.sin/cos/tan`, … | no arithmetic at all | inside a part |
| arrays | persistent `Array<T>`, `append` returns | a value on a wire; set literals for arguments | inside a part |
| records | `record` + named literal | catalogue type, `kind: "record"` | inside a part |
| hallmarks | `hallmark X of C { gate: … }` | honoured via exact typing; `construction` ENFORCED at entry (`GATE-SEM-005`) | **do not add to `.gate`** |
| effects | derived, declared per flow | `REQUIRES:` envelope; parts' from contracts | direct; envelope CHECKED (`GATE-SEM-009/010`), names canonical (`GATE-SEM-012`) |

---

## 10. Boundaries confirmed by 91 real sources

Everything above was written from the language definitions. The list below was
**confirmed by mapping 91 real files** — the Galerina example levels plus 20
each of Go, Python, Rust and C from working codebases. Each is a deliberate
limit rather than a gap awaiting a fix: adding any of them would give a drawing
invisible control flow, which is the one thing it cannot have.

| construct | why it stays out |
|---|---|
| `try`/`catch`, `defer`, `goto cleanup`, `finally` | recovery is a re-decision — a second decision part — not a handler scope |
| `async`/`await`, goroutines, channels, futures | a wire is not a promise; sequencing is depth, and concurrency has no representation |
| propagation (`?`, bubbling `err != nil`) | no call stack to propagate up — every refusal terminates somewhere **named** |
| ambient state: `ctx.Set`, thread-local `PyErr_*`, `os.environ` | a value arrives on a wire or does not exist |
| `#ifdef` gates, `SKIP_THE_CHECK=1` | a circuit is one artifact with one shape; it cannot be disabled by deployment |
| `unsafe` blocks, raw pointers, `malloc`/`free` | the runtime owns memory; a drawing never does |
| generics, traits, duck typing | `.gate` is monomorphic — the *absence* of unification is what makes the type wall sound |
| decorators and macros | they wrap or expand behaviour invisibly; a drawing must be what it says |
| field-level `exposes`/`denies` | below a drawing's resolution — a wire carries a whole value |
| arithmetic and string building | a circuit cannot compute, which is why SQL-injection taint cannot even be *built* here |

**The law the corpus settled.** The further a source language is from
classifying its failures, the more of the translation happens in `.fungi` and
the less `.gate` can take directly. C classifies nothing — a failure is a
string in a struct field plus a caller who remembers to look — so essentially
all of it is `.fungi` work. That is why the route is
TypeScript/Go/Rust/C → `.fungi` → `.gate`, and why a direct source-to-circuit
translator would be guessing at terminals.

