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

## 7 · Could there be a `PATTERN` block instead of `REQUIRES` + `WIRES`?

Yes — **as sugar that must expand, never as a primitive that must be trusted.** The
distinction is the whole safety property, so it is worth stating exactly.

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

### The form that works

`PATTERN` as a **compile-time expansion**, in the same relationship to `PARTS` that `{3}`
already has to three parts:

```text
CIRCUIT accept_contact(raw: RawText) -> ValidEmail
INTENT "The accepted form, drawn — not the standard, claimed."
PATTERN
  local  = class{alnum,dot,underscore,hyphen,plus}+ ceiling=64
  at     = literal "@"
  domain = class{alnum,hyphen}+ ceiling=63
  dot    = literal "."
  tld    = class{alpha}+ ceiling=24
  MATCH   local at domain dot tld
  ON MATCH   -> OUT.value
  ON NO      -> DENY.no_match
END
```

Four rules keep it honest, and all four are load-bearing:

1. **Expansion happens before verification.** `PATTERN` lowers to `REQUIRES` + `WIRES` in the
   parse tier; every semantic pass — budget composition, construction, domination, terminal
   vocabulary — sees the expanded circuit and nothing else. The block is never a thing the
   checker reasons about.
2. **The expansion is emittable.** `galerina gate expand <file>` prints the drawn circuit.
   The picture is elided at authoring time, never lost — and a diagnostic points at the
   expanded part, not the source line, so what failed is what you can see.
3. **A non-terminating expansion refuses.** `+` without a `ceiling` has no finite lowering,
   so it is a parse-tier refusal. The ReDoS proof survives intact, because it never depended
   on anyone analysing the pattern — only on whether the drawing finishes.
4. **The grammar has no unrepresentable productions.** No backreference, no lookaround — not
   rejected by a later check, simply **absent from the syntax**. Unrepresentable beats
   refused: there is no error message to argue with, and no version of the tool where someone
   turns it back on.

### Why `PATTERN` and not `REGEX`

The name sets the expectation. `REGEX` invites a paste from somewhere else — with `\1`,
`(?=`, lazy quantifiers and an assumption that PCRE semantics apply. `PATTERN` says this is
`.gate`'s own restricted dialect, which is the truth: a deliberate subset, chosen so that
every phrase in it has a finite drawing.

**Status: PROPOSED.** This is a language change, and language changes are the owner's to
ratify. Nothing in §1–§6 waits on it — every example above verifies today with `REQUIRES` and
`WIRES` as written. The block is ergonomics, and the ergonomics are real: it is the answer to
§6's honest cost, which is the only argument against drawing patterns at all.

---

## 8 · Where this sits

GateRegex is the **compile-time artifact**: the shape, the composed budget, the terminals,
readable by eye. A streaming engine is the **run-time** side: no rewind, three-valued, a
verdict per input. They are not competitors and neither replaces the other — GateRegex draws
what an engine would run, and the drawing is where the proof lives.

Related: cookbook **§7** (border data — where sanitisation lives), **§7a** (rejected vs never
checked), **§8** (effects compose from the canonical set); `RULES.md` for `GATE-SEM-005`
construction and `GATE-SEM-006` budget composition.
