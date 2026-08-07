# GateRegex — patterns drawn as circuits

**What it is:** a pattern expressed as a `.gate` circuit — classifier parts wired in the
shape of the pattern, with success and each kind of refusal as separate terminals.

**What it is not:** an engine. GateRegex is the compile-time artifact — the shape, the
budget, the terminals. Something else does the streaming.

---

## The rule that makes it worth doing

> **If it draws, it is linear. If it cannot be drawn finitely, it is refused.**

A catastrophic-backtracking pattern is dangerous because its search space is unbounded while
its text is short: `(a+)+$` is eleven characters and exponential work. **Try to draw one and
you never finish** — each outer repetition demands another inner chain. An incomplete drawing
is not a circuit, so the pattern is refused at compile.

No complexity analyser, no timeout, no blacklist. The safety property is not checked against
the artifact; it **is** the artifact's existence. And the worst case is not estimated — the
max-plus budget fold over the longest path (`GATE-SEM-006`) gives the exact number.

The circuit never evaluates a character. A character class is a **registered component**,
exactly like `validate.email` is in the border-data recipe — the circuit says *which
classifier a value must survive, in what order, before which parts become reachable*.

---

## 1 · A numeric test — the shape at its simplest

A bounded integer, one to four digits. Two classifiers, one repeated:

```text
CIRCUIT port_number(raw: RawText) -> BoundedInt
INTENT "A number must be proven short before it is parsed."
REQUIRES
  [d1 :: re.class@1.0.0] set={digit} required=true    budget steps=1
  [d2 :: re.class@1.0.0] set={digit} required=false   budget steps=1
  [d3 :: re.class@1.0.0] set={digit} required=false   budget steps=1
  [d4 :: re.class@1.0.0] set={digit} required=false   budget steps=1
  [end :: re.boundary@1.0.0]                          budget steps=1
WIRES
  IN       -> d1.subject          # ^ is a topological fact, not a token
  d1.match -> d2.subject
  d2.match -> d3.subject
  d3.match -> d4.subject
  d4.match -> end.subject
  d2.done  -> end.subject         # {1,4}: an optional part may hand straight to the boundary
  d3.done  -> end.subject
  d4.done  -> end.subject
  end.ok   -> OUT.value           # $ is likewise topological
  d1.no    -> DENY.no_match
  end.more -> DENY.no_match       # trailing input after the fourth digit
END
```

**Composed budget: 5.** Read it off the longest path, not off a benchmark.

`{1,4}` became four parts. `\d+` with no ceiling would become *no* finite number of parts and
is therefore **refused** — which is the point, not a limitation. Declare the ceiling you
actually accept; an unbounded numeric field is an unbounded numeric field whether or not a
circuit made you say so.

⚠ **What this does not do:** it proves the text is one-to-four digits. It does not prove the
value is in range, and `9999` passes. Range is arithmetic, and arithmetic is `.fungi`'s tier —
wire the validated text into a parser part that owns the bound.

---

## 2 · Email — the practical form, and the honest boundary

**Full RFC 5322 is not drawable, and should not be.** It admits quoted local parts, nested
comments and domain literals; the grammar is not regular in any form anyone actually wants,
and a circuit that claimed to cover it would be lying in a very legible way.

What is drawable is the form a system **accepts** — which is the only pattern that was ever
load-bearing:

```text
CIRCUIT accept_contact(raw: RawText) -> ValidEmail
INTENT "The accepted form, drawn — not the standard, claimed."
REQUIRES
  [local  :: re.class_plus@1.0.0] set={alnum,dot,underscore,hyphen,plus} ceiling=64  budget steps=64
  [at     :: re.literal@1.0.0]    value="@"                                          budget steps=1
  [domain :: re.class_plus@1.0.0] set={alnum,hyphen} ceiling=63                      budget steps=63
  [dot    :: re.literal@1.0.0]    value="."                                          budget steps=1
  [tld    :: re.class_plus@1.0.0] set={alpha} ceiling=24                             budget steps=24
  [end    :: re.boundary@1.0.0]                                                      budget steps=1
WIRES
  IN           -> local.subject
  local.match  -> at.subject
  at.match     -> domain.subject
  domain.match -> dot.subject
  dot.match    -> tld.subject
  tld.match    -> end.subject
  end.ok       -> OUT.value
  local.no     -> DENY.no_match
  at.no        -> DENY.no_match
  domain.no    -> DENY.no_match
  dot.no       -> DENY.no_match
  tld.no       -> DENY.no_match
  end.more     -> DENY.no_match
END
```

**Composed budget: 154.** Every ceiling is visible on the face of the circuit. A reviewer who
thinks 64 characters of local part is too generous can see it and say so — which is not true
of the same limits buried in a pattern string.

The output type carries `construction: "canonical-only"` (`GATE-SEM-005`), so the only way to
hold a `ValidEmail` is to have been given one by this circuit. That is the border-data
guarantee from the cookbook §7, now with the pattern drawn rather than delegated: **nothing
routes around the validator, and you can see what the validator accepts.**

---

## 3 · Quoted strings — the true/false case, and why one form is refused

The task: accept a string wrapped in matching quotes — `'value'` **or** `"value"` — and
reject `'value"` and `"value'`.

### The drawable form: alternation

Two complete paths, one per quote character. They never touch:

```text
CIRCUIT quoted_literal(raw: RawText) -> QuotedText
INTENT "Two quote styles, two auditable paths."
REQUIRES
  [sq_open  :: re.literal@1.0.0] value="'"                          budget steps=1
  [sq_body  :: re.class_star@1.0.0] set={any_but_squote} ceiling=256 budget steps=256
  [sq_close :: re.literal@1.0.0] value="'"                          budget steps=1
  [dq_open  :: re.literal@1.0.0] value="\""                          budget steps=1
  [dq_body  :: re.class_star@1.0.0] set={any_but_dquote} ceiling=256 budget steps=256
  [dq_close :: re.literal@1.0.0] value="\""                          budget steps=1
  [end      :: re.boundary@1.0.0]                                    budget steps=1
WIRES
  IN             -> sq_open.subject      # alternation is a fan-out
  IN             -> dq_open.subject
  sq_open.match  -> sq_body.subject
  sq_body.match  -> sq_close.subject
  sq_close.match -> end.subject
  dq_open.match  -> dq_body.subject
  dq_body.match  -> dq_close.subject
  dq_close.match -> end.subject          # the two paths converge only at the boundary
  end.ok         -> OUT.value
  sq_open.no     -> DENY.no_match
  dq_open.no     -> DENY.no_match
  sq_close.no    -> DENY.unterminated    # ★ a distinct reason, because it is one
  dq_close.no    -> DENY.unterminated
  end.more       -> DENY.no_match
END
```

| input | verdict | why |
|---|---|---|
| `'value'` | **true** — `OUT.value` | the single-quote path completes |
| `"value"` | **true** — `OUT.value` | the double-quote path completes |
| `'value"` | **false** — `DENY.unterminated` | `sq_body` consumes `value"`, then `sq_close` finds no `'` |
| `"value'` | **false** — `DENY.unterminated` | mirror of the above |
| `value` | **false** — `DENY.no_match` | neither opener matched |
| `'a'b'` | **false** — `DENY.no_match` | closes at the second quote, then `end` finds trailing input |

Note the last two rows land on **different** terminals. "Never started" and "started but
never finished" are different facts about the input, and a fan-out of paths makes that
distinction free — you get it by drawing honestly, not by adding a check.

### The refused form: a backreference

The tempting one-liner is `^(['"]).*\1$` — *"whatever quote opened it must close it."* That
`\1` is a **backreference**, and a backreference is not regular: no finite automaton
recognises it, so **no finite drawing exists**. GateRegex refuses it, and so does any
non-backtracking engine.

**The refusal is the better outcome.** The backreference version has one path and one refusal
value; the drawn version has two paths that can be reviewed, budgeted and reasoned about
separately. Where a language forces you to name both cases, both cases get thought about.

---

## 3a · Slashes — one escaping layer instead of two

Slashes are where patterns go wrong, because the character you want is also the character the
notation uses. Four cases that must be told apart: `/` (a path separator), `//` (a comment
marker, or a scheme's authority prefix), `\` (a Windows separator), `\\` (a UNC prefix, or an
escaped backslash).

### First, the measured fact — because the obvious claim is wrong

It is tempting to say a circuit has *no* escaping problem since it holds no pattern string.
**That is not true, and the source says so:** `.gate` argument values are parsed with
`JSON.parse` and re-emitted with `JSON.stringify` (`gate-v3-parser.ts`). A `.gate` string is a
**JSON string**, so a backslash is still written doubled.

The honest claim is narrower and still worth having — **one layer, not two**:

| you want to match | `.gate` argument | JS `RegExp` from a string | JS regex literal |
|---|---|---|---|
| one `/` | `value="/"` | `"\\/"` | `/\//` — the classic annoyance |
| two `//` | `value="//"` | `"\\/\\/"` | `/\/\//` |
| one `\` | `value="\\"` | `"\\\\\\\\"` — eight characters | `/\\/` |
| two `\\` | `value="\\\\"` | sixteen characters | `/\\\\/` |

A regex has the language's string escaping **and** the pattern's metacharacter escaping
stacked on each other; that is where the eight-backslash line comes from, and where the bugs
live. A circuit has JSON escaping and nothing else — forward slash needs no escape at all,
because nothing in a circuit treats `/` as notation.

### The circuit

Four alternation paths, one per accepted form:

```text
CIRCUIT separator_form(raw: RawText) -> SeparatorKind
INTENT "Tell four separator spellings apart, and refuse the rest."
REQUIRES
  [f1  :: re.literal@1.0.0] value="/"     budget steps=1
  [f2  :: re.literal@1.0.0] value="/"     budget steps=1
  [b1  :: re.literal@1.0.0] value="\\"    budget steps=1      # one backslash, JSON-escaped
  [b2  :: re.literal@1.0.0] value="\\"    budget steps=1
  [end :: re.boundary@1.0.0]              budget steps=1
WIRES
  IN       -> f1.subject          # alternation: both openers see the input
  IN       -> b1.subject
  f1.match -> f2.subject          # maximal munch: try the double form first
  f1.match -> end.subject         # …and the single form is the same path, ended sooner
  f2.match -> end.subject
  b1.match -> b2.subject
  b1.match -> end.subject
  b2.match -> end.subject
  end.ok   -> OUT.value
  f1.no    -> DENY.no_match
  b1.no    -> DENY.no_match
  end.more -> DENY.no_match       # ★ this is what separates "/" from "//"
END
```

**Composed budget: 3.**

★ **The disambiguation is the boundary part, not a longest-match rule.** `/` and `//` are not
distinguished by trying one first — both routes exist, and `end` decides. Given `/`, the
two-part route has no second character and dies at `f2`; the one-part route reaches `end` with
nothing left, so `end.ok` fires. Given `//`, the one-part route reaches `end` with input
remaining and lands on `end.more`; the two-part route completes. Exactly one path reaches
`OUT` in each case, and it is visible in the drawing which one.

| input | verdict | path |
|---|---|---|
| `/` | **true** | `f1` → `end.ok` |
| `//` | **true** | `f1` → `f2` → `end.ok` |
| `\` | **true** | `b1` → `end.ok` |
| `\\` | **true** | `b1` → `b2` → `end.ok` |
| `///` | **false** — `DENY.no_match` | `f1` → `f2` → `end.more` (trailing input) |
| `/\` | **false** — `DENY.no_match` | `f1` → `end.more`; the mixed form was never drawn |
| `` (empty) | **false** — `DENY.no_match` | neither opener matched |
| `\/` | **false** — `DENY.no_match` | `b1` → `end.more` |

The last two rows are the useful ones. **Mixed separators are refused because no path was
drawn for them** — not because a check rejected them. To accept `/\` somebody has to add the
wiring, in a diff, where a reviewer sees it. That is the difference between a language that
refuses by omission and one that refuses by rule: the first cannot be widened by accident.

⚠ Distinguishing `\` from `\\` at all requires that the *whole input* be the separator. If
you are matching separators **inside** a longer string — a path like `C:\\a\\b` — that is a
scan, and a scan is the engine's job. Draw the shape of what an input **is**; stream the
search for where something **occurs**.

## 4 · The two refusals that must never merge

Everything above wires `no_match` and friends. There is a second, unrelated refusal:

| terminal | means | frequency |
|---|---|---|
| `DENY.no_match` | the check ran and rejected this input | routine, per request |
| `DENY.pattern_refused` | **the check never ran** — the pattern had no finite drawing | a deployment-wide condition |

A caller folding both into "reject" is correct per request and silently catastrophic in
aggregate: **no input on that path has been validated since deploy**, and the only symptom is
a rejection rate that reads as user error. The fail-open sits *under* the gate, not instead
of it.

In a circuit the distinction is topology rather than convention — a terminal is a node, and
the checker reads nodes. Merging them stays legal, but it becomes one visible line in a
drawing instead of a branch buried in a caller. See cookbook §7a.

---

## 5 · The construct map

| regex | circuit | note |
|---|---|---|
| literal `a` | `re.literal@1.0.0` arg `value` | a registered classifier |
| class `[a-z]` `\d` `.` | `re.class@1.0.0` arg `set` | membership is the component's obligation |
| concatenation `ab` | a wire | sequencing *is* the wiring |
| alternation `a\|b` | fan-out, converging at a join | §3 |
| group `( )` | nesting, bounded by `GATE-PARSE-028` | |
| `{n}` / `{n,m}` | *n* parts in series; optional tail fans to the join | §1 |
| `*` `+` | **refused unless a ceiling is declared**, then `{0,c}` / `{1,c}` | §1 |
| `^` `$` | the chain's source is `IN`; the accept part's only successor is `OUT.value` | topological, not tokens |
| backreference `\1` | **refused** — not regular, no finite drawing | §3 |
| lookaround | **refused** — same reason | |

---

## 6 · Boundaries — stated, not worked around

| not drawn | why |
|---|---|
| the input loop — feed, advance, latch, span | the circuit says what must hold; iterating a string is execution |
| character-class membership | inside the classifier, proven by its own tests |
| unbounded `*` / `+` | §1 — refusal is the safety property, not a gap |
| backreferences, lookaround, balanced syntax | not regular; pair with a depth-tracking parser |
| **whether the pattern is correct** | a circuit proves routing, never semantics. **It cannot tell you the pattern is right — only that its answer was not ignored** |

⚠ **The honest cost:** a drawing is larger than a string. `\d{100}` is a hundred parts. The
trade is deliberate — auditability at a glance, in exchange for compactness. Long or heavily
quantified patterns belong in a streaming engine; draw the ones whose acceptance is a
decision someone should be able to review.

---

## 7 · Should there be a `PATTERN` block instead of `REQUIRES` + `WIRES`?

**No. Generate the circuit instead — do not add the syntax.**

An earlier draft of this section answered "yes, as sugar that must expand". That answer was
too accommodating, and the reasoning below is why it was withdrawn.

### Why the obvious version is wrong

```text
REGEX local = ^[a-z0-9._+-]+@[a-z0-9-]+\.[a-z]+$      # ← do not do this
```

That has put a **string** back inside the circuit. Everything §1–§3 buys came from the
expansion being finite and visible: the budget was read off a path, the ceilings were on the
face of the drawing, and the refusal of `(a+)+` happened because the drawing could not be
completed. An opaque pattern string restores exactly the situation `.gate` exists to refuse —
a blob whose behaviour you must take on trust — and it is the same shape as the "raw SQL
escape" part that is hard-vetoed on the query side.

A pattern that is *stored* rather than *expanded* is not a circuit element. It is a
dependency wearing one.

### Why "sugar that expands" does not survive contact

The proposal was: `PATTERN` lowers to `REQUIRES` + `WIRES` before verification, the expansion
is printable with a command, a non-terminating expansion refuses, and the grammar has no
backreference production. Every one of those rules is sound. The proposal still fails, for
four reasons that compound:

1. **Sugar that is always used and never inspected is not sugar — it is the primitive.** The
   value of GateRegex is that a reviewer reads a drawing. If the authoring surface is a
   compact pattern, the expansion is what nobody looks at. An inspection command that exists
   and is never run has moved the trust, not removed it.
2. **The composed budget disappears.** §2's email circuit costs **154**. That number is
   readable off the drawn circuit and invisible in a pattern block — you would have to expand
   to find it. The budget is the whole safety argument, so hiding it hides the argument.
3. **Diagnostics stop pointing at what you wrote.** An error in the expansion names a part
   the author never typed. "Point at the expanded form" is the honest choice and it is still
   a regression — every author now debugs a file they do not have open.
4. **Two spellings for one construct is a permanent tax.** Every future tier — lowering,
   emission, the graph — must handle both, and every future author must learn which one the
   examples used.

### The alternative, which is strictly better

**A generator, not a syntax:**

```bash
galerina gate from-pattern "^[a-z0-9._+-]{1,64}@[a-z0-9-]{1,63}\.[a-z]{1,24}$" --name accept_contact
```

It emits `REQUIRES` + `WIRES` as text, you commit that text, and the drawing is what lives in
the repository. Compare honestly:

| | `PATTERN` block | generator |
|---|---|---|
| authoring effort | low | **low — identical** |
| what review sees | a pattern string | **the circuit** |
| composed budget visible | no | **yes** |
| diagnostics point at your file | no | **yes** |
| diffs show what changed | one opaque line | **which parts moved** |
| language surface added | a whole block | **none** |
| refuses `(a+)+` | yes, at parse tier | **yes — it cannot finish emitting** |

The generator wins or ties on every row. The only thing the block buys is a shorter file on
disk, and a shorter file is precisely what is not wanted here — the length **is** the
audit trail.

**The general principle, worth stating because it will come up again:** when the complaint is
*"this is verbose to write"*, that is a **tooling** problem. It becomes a **language** problem
only when the verbose form cannot express something. `REQUIRES` + `WIRES` expresses every
pattern in this document. Adding a compact textual dialect would move `.gate` toward being a
general-purpose language, and lose the property the whole thing exists for — that a circuit
is auditable at a glance.

**Status: REJECTED, with the generator proposed in its place.** If it is ever revisited, the
name should be `PATTERN` rather than `REGEX` — `REGEX` invites a paste from elsewhere,
complete with `\1`, `(?=` and an assumption that PCRE semantics apply.

---

## 8 · What this gives `.fungi` — four security answers

`.fungi` has no regex construct, so today a pattern is an **opaque call**: a
component that returns a Boolean and tells the language nothing. Four things
follow from that, and drawing the pattern answers each.

### 8.1 · A Boolean forces a three-valued situation into two values

This is the sharpest one, because `.fungi` already has the receiver.

A validator has **three** outcomes: it matched, it ran and refused, or it never
ran (refused pattern, unavailable, misconfigured). A Boolean has room for two,
so the third collapses into `false` — and *"we could not check"* becomes
*"we checked and it is bad"*. That reads safe and is not: the two need opposite
responses, and one of them is a deployment-wide condition.

`.fungi`'s `check` is a **K3 router** with `if:` / `deny:` / `ambig:` all
mandatory (`FUNGI-CHECK-001`). A drawn validator's verdict maps onto it exactly:

| GateRegex terminal | `.fungi` arm |
|---|---|
| `OUT.value` (matched) | `if:` |
| `DENY.no_match` (ran, refused) | `deny:` |
| `DENY.pattern_refused` / `DENY.undecided` | `ambig:` |

The language has had the third arm all along. What was missing was a validator
honest enough to use it — and `ambig:` is **mandatory**, so once the verdict is
a Verdict rather than a Boolean, the case cannot be forgotten.

### 8.2 · Declassification stops being a convention

In `.fungi` today, calling `validate(x)` and then treating `x` as clean is a
**convention the call site follows**. Nothing structural says the validator ran,
and nothing stops a second path reaching the sink without it.

Draw the validator and its output type is `construction: "canonical-only"`
(`GATE-SEM-005`) — **holding the type IS the proof it passed**. The
value-state checker gains something structural to key on instead of a call-site
pattern, and the declassifier cannot be bypassed because there is no other way
to obtain the value. This is §7's border-data guarantee applied to `.fungi`'s
own taint machinery rather than to a circuit's egress.

### 8.3 · Heuristic at the source, proof at the sink

`.fungi` auto-taints by **parameter name** — `cookies`, `session`, `formData`,
`searchParams` and the rest — with a deliberate anti-over-block list for
ambiguous ones (`data`, `payload`, `url`, `event`). That is a good, pragmatic
rule, and like every name heuristic it has both directions of error: a tainted
value called `input` is missed.

GateRegex does not improve the guess. It anchors **the other end**: whatever the
source heuristic decides, the sink demands a canonical-only type that only the
drawn validator produces. A missed taint at the source no longer reaches the
sink unchallenged, because the sink is not asking about taint — it is asking for
a type that cannot be forged. **Two independent mechanisms, failing in
different directions**, which is what defence in depth actually means.

### 8.4 · ReDoS becomes a declared cost, not a runtime surprise

A `.fungi` flow declares effects and budgets. A regex inside it declares
nothing: its cost is invisible to the effect checker, to the budget, and to
resilience inference. An eleven-character pattern can be the most expensive
thing in a governed flow and no governance artifact will mention it.

Drawn, the pattern's worst case is **a number** — the max-plus fold over the
longest path (`GATE-SEM-006`) — and a number can enter the flow's budget like
any other cost. And the pattern that has no finite drawing never reaches the
budget at all, because it was refused at compile (§3). ReDoS stops being a
runtime property to monitor and becomes a **compile-time refusal**.

### What it does not give

Stated so the section is not read as more than it is: the drawing cannot tell
you the pattern is **correct**, does not cover **scanning** (finding a match
inside a longer string — that is the engine's job, §5), and is **larger** than
a pattern string. It removes classes of failure; it does not remove review.

## 9 · Would writing the ENGINE in `.gate` make it more secure?

**Mostly no** — and the question is worth answering carefully, because the
instinct behind it is right and the conclusion it points at is not.

### Why "rewrite the engine as a circuit" does not work

A matching engine is a tight loop over characters with mutable state: an active
thread set, bitset unions, a position, a latched span. `.gate` has **no
expressions, no loops, no arithmetic, no mutable state** — by design, because
those are exactly what would stop a circuit being auditable at a glance.

So "the engine written in `.gate`" cannot mean what it sounds like. Every piece
of real work would still be a component in another language, and the circuit
would be a wrapper around them. That is **a diagram on top of the same code**,
and it is worth being blunt about what a diagram does and does not buy:

| improves | unchanged |
|---|---|
| which callers may reach the engine | the NFA simulation |
| what its verdict routes to | class-membership tests |
| whether a taint reaches a sink | bitset unions, position advance, span latching |
| that a certificate was checked | **every place an engine's real bugs live** |

★ **The general rule, stated once because it decides a lot of questions:**
`.gate` secures the **perimeter** of a component, never its **interior**. A
circuit proves *what may reach what*. It cannot prove *what a part does once
reached* — that is the part's own tests' job, and no amount of wiring
substitutes for them.

⚠ And there is an active risk, not merely an absence of benefit. TriRegex's
safety properties — no backtracking, bounded expansion, a cost certificate,
`end()` collapsing fail-closed — belong to **its implementation and its tests**.
Wrapping it in a circuit does not carry them anywhere; it adds a layer that
*looks* like governance over a core that did not change. A component that
appears governed and is not is worse than one that appears ungoverned, because
the appearance is what people rely on.

### What WOULD genuinely help — draw the admission, not the engine

There is a real property here, and it needs no rewrite at all.

The engine already has two separable steps: **compile** (which certifies a
pattern or vetoes it) and **run**. Draw the boundary between them and one thing
becomes provable that today is a convention:

> **No pattern runs unless it was certified.**

```text
  [compile :: re.compile@1.0.0]        # produces a Certificate, or vetoes
  [run     :: re.match@1.0.0]          # DEMANDS a Certificate
WIRES
  IN.pattern       -> compile.subject
  compile.certified -> run.certificate  # the only producer of Certificate
  compile.veto      -> DENY.pattern_refused
  run.match         -> OUT.value
  run.no            -> DENY.no_match
```

With `Certificate` as `construction: "canonical-only"` and zoned semantic, a
part that runs an uncertified pattern is not *discouraged* — it is
**unrepresentable**, and `GATE-SEM-014` says so if a second producer ever
appears. That is §7b's *convert, don't bless* applied to the engine's own
lifecycle, and it costs one drawing rather than a rewrite.

### The answer in one line

Drawing the **pattern** (§1–§3) and the **admission boundary** (above) are real
security gains. Re-expressing the **matcher** as a circuit is not — it relocates
code `.gate` still cannot see inside, and buys a layer to maintain.

## 10 · Where this sits

GateRegex is the **compile-time artifact**: the shape, the composed budget, the terminals,
readable by eye. A streaming engine is the **run-time** side: no rewind, three-valued, a
verdict per input. They are not competitors and neither replaces the other — GateRegex draws
what an engine would run, and the drawing is where the proof lives.

Related: cookbook **§7** (border data — where sanitisation lives), **§7a** (rejected vs never
checked), **§8** (effects compose from the canonical set); `RULES.md` for `GATE-SEM-005`
construction and `GATE-SEM-006` budget composition.
