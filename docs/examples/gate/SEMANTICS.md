# `.gate` v3 — normative semantics

**Status:** normative. This document, together with [`CODES.md`](CODES.md) and the
shipped `*.gate` examples with their fixture registries, is the specification a
**clean-room conformance verifier** is derived from. It is deliberately written
as *rules about circuits*, not as a description of Galerina's implementation: an
independent implementation that satisfies every rule here should agree with
Galerina on every example, and where it does not, one of the two is wrong and
the disagreement is data.

**Version:** the source language is `@gate 3.0.0`, a **literal** header. A
conformance verifier versions itself separately (`gate-v3-conformance-1`); it
does not mint a language version.

**How to read a rule.** Each carries the diagnostic code that enforces it.
`CODES.md` is the complete catalogue of codes; this document says what the codes
*mean* and why they exist. Where a rule refuses, the refusal is **fail-closed**:
absence of evidence never becomes permission.

---

## 1 · What a circuit is

A circuit is a **directed graph of PARTS joined by WIRES**, with a fixed input
frontier and a closed set of terminals. It contains **no expressions**: no
arithmetic, no comparison, no control flow, no mutable state. Every computation
is a **reference to a registered component** whose implementation lives
elsewhere and whose behaviour is that component's own obligation.

This is the load-bearing consequence, and every boundary in §7 follows from it:

> **A circuit proves what may reach what. It cannot prove what a part does once
> reached.** `.gate` secures the **perimeter** of a component, never its
> interior.

### 1.1 Lexical frame

| element | rule |
|---|---|
| header | the exact literal `@gate 3.0.0` as the first line (`GATE-PARSE-002`) |
| character set | ASCII only in semantic source (`GATE-PARSE-003`) |
| identifier | `[A-Za-z_][A-Za-z0-9_]*` |
| qualified name | identifier, then zero or more `.identifier` |
| version | `<int>.<int>.<int>` |
| endpoint | exactly `identifier.identifier` — a node and a port |
| block order | `CIRCUIT` · `INTENT` · `REQUIRES:` · `PARTS:` · `WIRES:` · `END`, all mandatory |

Each absent block has its own refusal rather than one generic "malformed" code —
a missing `REQUIRES:` is `GATE-PARSE-008`. An empty block is still a *present*
block: a circuit that declares no requirements writes `REQUIRES:` with nothing
under it, and omitting the line entirely is a different fact about the document.

### 1.2 Bounded input (`GATE-PARSE-028…034`)

Every input dimension has a declared ceiling, enforced **before** the structure
it bounds is allocated. A depth check performed *during* recursion is too late —
the allocation it was meant to prevent has already happened.

| dimension | ceiling |
|---|---|
| set nesting | 6 |
| set cardinality | 256 |
| identifier length | 64 |
| arguments per part | 32 |
| parts | 4096 |
| wires | 8192 |
| file bytes | 524,288 |

A verifier that reports a host exception instead of a diagnostic for
out-of-bounds input **does not conform**. The user must receive a code.

---

## 2 · ★ Single assignment — the rule that decides what is expressible

> **Every consumer endpoint has exactly one producer** (`GATE-WIRE-002`).
> Fan-**out** is admitted: one source may feed many consumers.
> Fan-**in** is refused: two producers may not feed one consumer.

This rule is stated first among the wiring rules because it is the one with the
widest consequences, and because **no earlier `.gate` document wrote it down**.
It was recovered by measurement, and several published illustrative circuits
violated it.

**What it makes unexpressible — as language, not as a tooling gap:**

| construct | why it cannot be drawn |
|---|---|
| convergent alternation | two branches would feed one consumer |
| optional / ranged repetition | a "skip" edge is a second producer for whatever follows |
| a shared refusal terminal | two parts routing to one `DENY.x` |

**What follows as house style, and is strictly better:** each refusal gets its
**own** terminal reason. `DENY.no_match_at_3` names *which* position refused,
not merely that something did.

A verifier that admits fan-in does not conform, and will accept drawings whose
meaning is ambiguous — which of two producers supplied the value is not
determined by the graph.

---

## 3 · Endpoints and terminals

The node namespace has exactly one input frontier and a **closed** terminal set:

| node | role |
|---|---|
| `IN` | the input frontier; its ports are the circuit's declared parameters |
| `OUT` | success. **`OUT.value` is the single return terminal** (`GATE-WIRE-001`) |
| `DENY.*` | a governed refusal |
| `FAULT.*` | a governed fault |
| `TRAP.*` | a trapped condition |
| `DRAIN.*` | a value deliberately discarded |

Rules:

1. A terminal **cannot produce** a value (`GATE-WIRE-006`); `IN` **cannot
   consume** one (`GATE-WIRE-007`).
2. Every declared circuit parameter must be used (`GATE-WIRE-003`); every part
   must be connected (`GATE-WIRE-004`); a circuit must have at least one path to
   `OUT.value` (`GATE-WIRE-005`).
3. Every part must be reachable from the input frontier (`GATE-LIVE-001`).
4. Terminal **reasons** are checked against the registry's declared vocabulary
   per family (`GATE-SEM-007`). A family with **no** declared vocabulary is
   reported as unchecked (`GATE-SEM-008`) — silence is not a pass.

### 3.1 Refusals are distinguishable, and that is a security property

Two refusals that need **opposite responses** must not share a terminal. The
canonical case: *this input was rejected* versus *the check never ran*. The
second means no input on that path has been validated since deployment, and
folding it into the first hides a deployment-wide condition behind a routine
one.

---

## 4 · Termination and authority

**Cycles.** A part-to-part cycle is always refused; the bound decides **which**
refusal, and the two are mutually exclusive claims about the same loop:

| verdict | claim |
|---|---|
| `GATE-TERM-003` | the cycle's lap count is **unbounded** |
| `GATE-TERM-004` | the laps are capped, but no registered state contract and canonical termination proof admits the loop |

A cycle is **bounded** when at some step of the cycle **every parallel wire
between that step's pair of nodes carries a bound** (`budget=` or `decreases=`).
A lap must cross each step exactly once, so a fully-bounded step caps the lap
count. Two shapes prove nothing and must classify `GATE-TERM-003`: a bounded
**chord** — a wire whose endpoints lie on the cycle but which is not an edge of
it, so no lap crosses it — and a bounded wire beside an unbounded **parallel**,
which every lap may take instead.

> **Correction (2026-08-07).** This rule previously read "unless every edge in
> the cycle carries a bound", and the reference implementation tested something
> different again — any bounded wire whose two endpoints were cycle *nodes*.
> Both were wrong: "every edge" is stronger than the mathematics requires (one
> fully-bounded step suffices), and node-membership is unsound (the chord and
> parallel shapes above misclassified as `TERM-004`). Both refusals still
> refuse, so admission never depended on the distinction — but §3.1 makes
> distinguishable refusals a security property, and the wrong code sends an
> author off to prove termination of a loop that has none. Conformance vectors
> CV-087…089 pin the corrected rule from both directions.

A conforming verifier must find cycles **without unbounded recursion** — a
circuit may hold 4,096 parts, so an implementation that recurses per node is a
stack overflow waiting for an input.

**K3 authority.** A three-valued decision routes **allow**, **deny** and
**indeterminate**. A part with an allow arm and no deny route refuses
(`GATE-AUTH-001`); with no indeterminate route, `GATE-AUTH-002`.

The decision role is **contract-declared, never inferred from a name**
(`decision: true` plus an ordered `arms` list). A component whose outputs merely
*look* like a decision — three outputs sharing one type — is reported
(`GATE-SEM-004`) rather than silently treated as one. **Recognising authority by
naming is the mistake this rule exists to prevent**: a component called
`permit`/`refuse` would otherwise acquire K3 authority it never declared.

**Arm roles are positional.** `arms[0]` is the allow arm; everything after it is
a refusal arm. A refusal arm must not reach `OUT` without an intervening
decision (`GATE-SEM-011`) — a refusal flowing into success is the fail-open the
whole lattice exists to forbid.

### 4.1 The K3 lattice

`deny < indeterminate < allow`, and conjunction is `min`.

> **The empty fold is `indeterminate`, never `allow`.**

An empty evidence set means nothing was established. `min`'s algebraic identity
is the top element (`allow`) — and using it as the empty answer is precisely the
trap: **the algebraically convenient value is the security-wrong one.**

---

## 5 · The registry: contracts are the authority

A circuit alone establishes **shape**. Only with a registry does the contract
become the authority on what a part *is*.

Every registry entry is validated against a **closed schema before any
normalisation**, so a malformed contract can never reach a downstream check.
Unknown fields are refused rather than ignored (`GATE-REGISTRY-014`).

| object | admitted fields |
|---|---|
| registry | `version` `digest` `types` `components` `vocabularies` `effects` `capabilities` |
| type | `id` `kind` `construction` `values` `scalarEncoding` `packedEncoding` `zone` |
| component | `id` `version` `status` `implementationDigest` `inputs` `outputs` `arguments` `effects` `capabilities` `decision` `arms` `cut` `variantOf` `tainted` `zoneGate` |
| port | `name` `type` `copyable` `required` |

**Defaults are fail-closed.** An output with no `copyable` is non-copyable, so a
second consumer of it is refused (`GATE-WIRE-102`). A non-Boolean where a Boolean
is required is a malformed contract, not a truthiness question.

Note the division of labour with §2, because the two rules read alike and are
not: one source feeding two consumers is **fan-out**, which §2 admits — each
consumer still has exactly one producer, so `GATE-WIRE-002` does not fire. What
restricts it is this copyability default. A drawing can therefore be refused by
`GATE-WIRE-102` alone, and that is not an omission.

A registry input marked `required` must have a producer after endpoint
resolution; leaving one unwired is refused (`GATE-RESOLVE-110`). Being incident
to some edge is not the same as being correctly supplied.

### 5.1 Exact nominal typing

Wire typing is **exact nominal equality with no generics and no implicit
conversion** (`GATE-WIRE-101`). `Money<GBP>` and `Money<USD>` are two unrelated
catalogue identifiers; there is no unification step that could be wrong.
Conversion requires an explicit converter part — an exchange-rate application is
an auditable event, not a coercion.

An **empty type catalogue does not disable the wall** (`GATE-RESOLVE-108/109`):
absence of types is a refusal, not permission.

---

## 6 · Semantic rules over the graph

These run over a canonical graph: nodes and edges in **ASCII code-unit order**,
identifiers assigned **after** the canonical sort, and acyclicity asserted
before any dominator reasoning — a dominator tree over a cyclic graph is a proof
over a false premise (`GATE-SEM-001`).

| rule | code | statement |
|---|---|---|
| cut dominates egress | `SEM-002` | if any cut is declared, every path from the frontier to `OUT` passes one |
| taint–cut separator | `SEM-003` | with every declared cut **removed**, egress must be unreachable from the frontier |
| decision shape | `SEM-004` | a decision-shaped component must declare itself one |
| construction | `SEM-005` | a non-`source` type must not enter as a circuit **parameter** — its constructor never ran inside the governed drawing |
| budget composition | `SEM-006` | worst case composes **max-plus** along the longest path and must not exceed the declared ceiling |
| vocabularies | `SEM-007/008` | reasons are declared, and an undeclared family is *unchecked*, not *clean* |
| effect envelope | `SEM-009/010` | a component's effects and capabilities must be covered by `REQUIRES` |
| deny-arm containment | `SEM-011` | a refusal arm must not reach `OUT` |
| canonical effect names | `SEM-012` | an effect name outside the canonical set is refused — a name is what an admission policy filters on, so an unrecognised one is a component exempt from the rule meant to govern it |
| taint to sink | `SEM-013` | egress is any **egress-class effect**, not only `OUT` |
| zone domination | `SEM-014` | a `semantic`-zoned part must be dominated by a declared `zoneGate` and unreachable from its refusal arms |

### 6.1 The separator, and why the naive form is wrong

`SEM-003` asks: *with every cut removed, is egress still reachable?* It does
**not** ask "is egress reachable from the tainted source with cuts in place" —
that question flags the **sanitised** path too, because reaching egress *through*
a cut is the sanctioned route. A verifier implementing the naive form will
report false positives on correct circuits.

### 6.2 Convert, don't bless

`SEM-014`'s practical form. Wiring a decision's allow arm **into** a privileged
part as an extra input reads as governed and is weaker than it looks: the part
remains reachable by a path that never passed the decision, so the authority is
an *input it received* rather than a *route it had to take*.

The stronger drawing gives the decision an **output type only it can produce**
and makes the privileged part demand that type. Then nominal typing stops the
obvious bypass, and `SEM-014` catches what typing cannot: a second producer, or
a part naming the type on another port.

---

## 7 · Boundaries — stated, because a specification that lists only what is
possible teaches implementers to attempt the impossible

| not expressible | why |
|---|---|
| arithmetic, comparison, string handling | there are no expressions; these are the component tier's |
| convergent alternation, optional repetition | §2, single assignment |
| a proof about a part's **interior** | §1 — the perimeter is what a circuit governs |
| whether a component is **correct** | a circuit proves routing, never semantics |

### 7.1 The capability boundary is target-scoped, and refusal timing is part of the contract

An artifact may be well-formed, fully governed, and still **unrepresentable on a
particular target**. A conforming toolchain must:

1. refuse **before emitting anything** — no partial or invalid artifact may
   exist, because an artifact that exists looks admitted;
2. report the refusal as a **diagnostic with a code**, never as a host
   exception;
3. **exit non-zero** when a build produces no artifact. Writing an error message
   is not reporting a failure: the message informs a human, the exit status
   informs the machine deciding whether to proceed.

A target-scoped refusal is **not** a fail-open when another target genuinely
supports the construct — but the asymmetry must be *stated*, because an author
who only ever runs the permissive target will not discover it until the strict
one refuses.

---

## 8 · Conformance

An implementation conforms when, for every shipped example and fixture registry
in this directory, it produces **the same set of diagnostic codes** as the
specification requires — no more and no fewer.

### 8.1 ⚠ OPEN — the reporting model is NOT yet specified

"The same set of codes" is not decidable without saying **how codes
accumulate**, and this specification **does not yet say**. Until it does, §8
determines conformance only for single-code cases.

**🔴 A retraction, recorded rather than quietly rewritten.** An earlier revision
of this clause asserted a *staged* model — "a tier that refuses stops the tiers
after it, and within a tier every applicable code is reported." That rule was
**inferred from two observations** and is **false**. Extending the conformance
vector set falsified it within one cycle:

| observation | verdict on the staged model |
|---|---|
| a decision missing its deny arm reports **`GATE-AUTH-001` + `GATE-RESOLVE-111`** | two different tiers, both reported — **staging refuted** |
| an unbounded cycle reports **`GATE-TERM-003` + `GATE-SEM-001`** | `SEM-001` exists precisely to catch a cycle *reaching* the semantic tier — a deliberate **defence-in-depth backstop** that runs regardless |
| an unused parameter reports the wire code alone | consistent with staging, but equally consistent with the liveness rule simply not applying |

**What is actually established**, and all that may be relied on today:

1. Codes from **different tiers can co-occur**. An implementation must not
   assume an earlier refusal suppresses a later one.
2. Some rules are **deliberate backstops** (`GATE-SEM-001` names itself one)
   and fire *because* an upstream refusal was bypassed. A model that suppressed
   them would remove a safety net.
3. **Severity is part of the answer.** `GATE-SEM-004` is a **warning**, not an
   error — a conformance comparison that filters to errors will not see it, and
   a comparison that ignores severity will disagree with one that does not.

**What a conforming implementation should do meanwhile:** report every code it
establishes, with its severity, and do not treat the absence of a later-tier
code as meaningful. Deciding the model is a **design decision**, not something
to be read off a sample — which is the whole lesson of this retraction.

⚠ Conformance vectors whose expectation depends on the unsettled model are
marked `pendingModel` in the vector set and are **excluded from the pass/fail
count**. Encoding observed behaviour as if it were a rule would turn the vectors
into a change-detector for one implementation — the exact failure they exist to
avoid.

Two properties a conforming verifier must have, both learned from defects:

- **Refusals are diagnostics.** Any input, however hostile, yields a code. A
  host exception escaping to the user is a non-conformance even when the
  underlying refusal was correct.
- **Silence is reported.** Where a rule has **no obligation** to check — no cut
  declared, no vocabulary declared, no zone declared — that is a distinct state
  from *checked and satisfied*. A verifier that reports the two identically is
  claiming a safety property nobody established.

A verifier may not sign, admit or execute. It emits verdicts and evidence.
