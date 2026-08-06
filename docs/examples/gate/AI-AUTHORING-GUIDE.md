# Authoring `.gate` v3 — a guide for AI and humans

## What `.gate` is

`.gate` is Galerina's **circuit language**. The prime directive is unchanged:
**"Do not code, draw. It is not logic, it is a map."** You declare a circuit of
**registered parts** joined by **named-port wires**. Dense work — arithmetic,
string handling, database calls, decisions — lives inside the parts, which are
`.fungi` components named by exact id and version. There are **no expressions,
no statements and no arithmetic in `.gate`.**

`.gate` adds a *surface*, not new security. Every guarantee is discharged by the
governance engine, and a clean circuit authorizes nothing.

## Is  the right tool for this file?

**Usually not, and knowing that early is the cheapest refusal available.** A
200-file study of real governed code (numpy/pandas/polars/pymining and a Go
backend, already translated to ) measured **2% circuit-shaped** — a
call plus a governed exit. 80% of those files are arithmetic-dominated, and
across 455 flows there were **zero** ,  or  constructs.

 governs the **authority and privacy spine**: who may proceed, what
gets redacted before egress, where a refusal terminates. It has no
expressions and cannot add two numbers. If the file you are looking at is
computation, transformation, or plumbing, the answer is  — reach for
 when you are drawing the decision that guards the work, not the work.

## Anatomy

```
@gate 3.0.0                                      ← literal first line, exactly this
# comments live on their own line, after the header
CIRCUIT name(param: Type, ...) -> ReturnType     ← the signature
  INTENT "one sentence of purpose"               ← required, exactly one quoted string
  REQUIRES:                                      ← the declared envelope
    capability customer.read
    effect database.read
  PARTS:                                         ← the registered components
    [instance :: component.id@1.0.0 arg=value]
  WIRES:                                         ← the drawing
    IN.param -> instance.port
    instance.port -> OUT.value
END
```

Sections are required and ordered. A circuit needs at least one part and one
wire, and nothing may follow `END`.

## Endpoints — the vocabulary of a wire

Every wire is `source -> target`. The endpoint families are **semantically
distinct and never interchangeable**:

| Endpoint | Direction | Meaning |
|---|---|---|
| `IN.<param>` | source | a circuit parameter enters here |
| `OUT.value` | target | **the** single success return |
| `DENY.<name>` | target | a refusal — authority withheld |
| `FAULT.<name>` | target | an unrecoverable governed failure |
| `TRAP.<name>` | target | an invariant or boundary breach |
| `DRAIN.<name>` | target | a value deliberately consumed and going nowhere |
| `<instance>.<port>` | either | a port on a part, named by its contract |

Do not alias them. `DENY`, `FAULT` and `TRAP` mean different things to the
governance engine, and collapsing them destroys the distinction that makes a
refusal auditable.

## Argument values — the closed literal set

| Declared type | Accepts | Example |
|---|---|---|
| `String` | a quoted string | `event="customer.read"` |
| `Int` | an integer (range-checked against `min`/`max`) | `width=64` |
| `Number` | any numeric literal | `ratio=0.5` |
| `Name` | a dotted identifier | `capability=customer.read` |
| `ParameterRef` | a circuit parameter, **`$`-sigilled** | `key=$customer_id` |
| `TritLiteral` | exactly `-1`, `0` or `1` | `default=-1` |
| `Set<...>` | a brace-enclosed set | `fields={CustomerId,Email}` |

Anything else a contract declares is **refused**, not waved through. Note the
list above is the set of **`.gate` argument types** — there is no `Float`
*argument type* here, though `.fungi` itself has a full floating-point tower and
a `Math` surface including `PI` and `sqrt`. A circuit has no constants and no
computed values: it cannot calculate, so a number in a circuit is always a
literal you wrote or a parameter you passed, and the mathematics lives in the
component.

The `$` matters: `key=customer_id` is a **`Name`** (a bare identifier that merely
looks like your parameter), while `key=$customer_id` is a **`ParameterRef`** that
actually binds to it. They are different types and a contract accepts only the
one it declared.

### Resource ceilings — hard, owner-ruled, refused with a code

A file is refused (never crashed on) past any of: set nesting **6** · set
cardinality **256** per literal · identifier **64** chars · arguments per part
**32** · parts **4096** · wires **8192** · file **512 KiB**
(`GATE-PARSE-028..034`). These are far above anything a legitimate circuit
needs — the shipped examples peak at 6 parts and 19 wires — so meeting one is
a sign the file is generated wrong, not a sign to ask for a bigger limit.

## The canonical patterns

### 1. The K3 authority gate

Every gated flow starts here. An authority part is a **three-valued decision**,
and all three arms must be routed to distinct destinations — False must never
fold into Unknown:

```
    IN.caller      -> authz.subject
    IN.customer_id -> authz.resource
    authz.allow    -> record.authority
    authz.deny     -> DENY.not_authorized
    authz.indeterminate -> DENY.authority_unknown
```

The guard **names** a check; it does not enforce one. A passing circuit never
authorizes — the signed capability does.

### 2. Privacy cut before egress

A sensitive value reaches `OUT.value` only through a cut that **declares the
field it strips**:

```
    [view :: galerina.privacy.cut@1.0.0 fields={CustomerId}]
    record.value -> view.value
    view.value   -> OUT.value
```

A cut naming the wrong field is still a leak — the declaration is what binds it
to the privacy rule. And the cut ROLE itself is a contract fact, not a naming
convention: the registry entry declares `cut: true`, and with any cut declared
the checker proves two graph facts — a cut **dominates** egress
(`GATE-SEM-002`), and removing every cut **disconnects** taint from egress
(`GATE-SEM-003`, the machine-proven separator form). One bypass wire past the
cut is a refusal, not a review comment.

### 2b. Decisions declare themselves; reasons come from a vocabulary

A decision component carries `decision: true` and its ordered `arms` in the
CONTRACT — the checker verifies every declared arm is routed
(`GATE-RESOLVE-111`), whatever the arms are named. A component merely *shaped*
like a three-valued decision (three outputs, one shared type) that declares
nothing draws a warning (`GATE-SEM-004`): declare intent, don't imply it.
Terminal reasons can be governed the same way — a registry may declare
per-family vocabularies, and `DENY.approved` refuses when the deny vocabulary
never admitted it (`GATE-SEM-007`).

### 3. Refusals name their terminal

A deny arm terminates at a refusal terminal. It does not reach `OUT.value`, and
it does not pick up privileged work on the way.

### 4. Bounded cycles

A cycle carries a positive integer budget, or a registered state contract with a
canonical termination proof. An unbounded cycle is refused — an unbounded loop is
a denial-of-service, not a design.

## DO / DON'T — the hallucination guard

An out-of-date model reproduces the **retired v1.2 glyph dialect**. These are the
traps, all refused:

**DON'T**

- ❌ `@version 1.0.0` / `@version 1.2.0` — the header is exactly `@gate 3.0.0`.
- ❌ `GATE name(...) ... END` — the keyword is `CIRCUIT`.
- ❌ Glyph arms `✓ × ? ! + -`, or `[bracket]`-only nodes. v3 has **no glyphs**:
  arms are named ports, and refusals are named terminals.
- ❌ `FLOW:` — the drawing section is `WIRES:`, and parts are declared first
  under `PARTS:`.
- ❌ A trailing comment — `IN.value -> e.value  # note` is **refused**. Comments
  take their own line.
- ❌ A version range or `@latest` on a part — versions are exact.
- ❌ `=> CONTINUE`, `_ => REJECT`, or a wildcard arm. A `.gate` decision has no
  catch-all: the contract enumerates the arms and every one must be wired.
- ❌ Imperative statements or arithmetic — those belong in a `.fungi` component.
- ❌ Non-ASCII anywhere in semantic source.

**DO**

- ✅ `@gate 3.0.0` as the literal first line.
- ✅ `INTENT` always; `REQUIRES:` declares the envelope.
- ✅ Name every part `[instance :: component.id@exact.version]`.
- ✅ Route all three K3 arms to distinct destinations.
- ✅ Send every sensitive read through a declared cut before `OUT.value`.
- ✅ Give every refusal its own terminal — `DENY`, `FAULT` or `TRAP`, chosen for
  what actually happened.

## The verify loop

```bash
node --test packages-galerina/galerina-core-compiler/tests/gate-v3-shipped-examples.test.mjs
```

Author by **composing the verified patterns above and re-checking after every
change.** Note that `galerina check` does **not** validate `docs/**`, and the root
`galerina.mjs` does not yet route `.gate` — see [README.md](README.md) for what
each surface does and does not prove.

## What a passing circuit does *not* do

Nothing about a clean circuit grants authority. Admission is the signed
capability at fuse time, and the signature binds the runtime **IR digest** —
**sign the IR, never the `.gate` source.** Every `.gate` file additionally raises
`FUNGI-GATELANG-002`, which withholds production signing until the sound
compile-time backstop is wired.
