# `.gate` v3 — the fail-closed invariants

Every rule below is enforced by the v3 frontend in
`packages-galerina/galerina-core-compiler/`, and each names the **diagnostic code
that fires** — so a rule can be tested, not merely believed. The master rule is
unchanged from v1: **unknown ⇒ REJECT, never ignore.** There is no best-effort
parse and no silent-skip path; that is how dialects are born.

Codes are grouped by the tier that raises them. Parse and structural tiers need
nothing but the file. The resolution tier additionally needs a component
registry — without one, those checks do not run at all.

## Tier 1 — parse (the file alone)

| Rule | Enforced by |
|---|---|
| **Exact version header.** The first line is literally `@gate 3.0.0`. Not a range, not a minimum — a literal. | `GATE-PARSE-002` |
| **ASCII only** in semantic source. Homoglyphs and look-alikes cannot smuggle a second identifier past a reader. | `GATE-PARSE-003` |
| **One circuit, all sections, in order** — `CIRCUIT … / INTENT / REQUIRES: / PARTS: / WIRES: / END`, with at least one part and one wire, and nothing after `END`. | `GATE-PARSE-004/005/008/010/011/012/013/014/015` |
| **INTENT is mandatory** and is exactly one quoted string. | `GATE-PARSE-006` |
| **Exact component versions.** A part names `component.id@1.2.3` — no ranges, no "latest". | `GATE-PARSE-019` |
| **Comments sit on their own line**, after the header. A trailing `#` on any line is refused — including on `@gate 3.0.0` itself. | `GATE-PARSE-002/006/018/021` |

## Tier 2 — structure (topology, still no registry)

| Rule | Enforced by |
|---|---|
| **One return terminal.** A circuit returns through `OUT.value` and nothing else. | `GATE-WIRE-001` |
| **One producer per consumer.** No input is fed twice; last-write-wins is not a wiring strategy. | `GATE-WIRE-002` |
| **Nothing dangles.** Every declared input is connected; no part floats unwired; a circuit must have a path to `OUT.value`. | `GATE-WIRE-003/004/005` |
| **Terminals keep their direction.** A terminal cannot produce a value and an input cannot consume one. | `GATE-WIRE-006/007` |
| **K3 completeness — no collapsing.** A part with an `allow` route must also route `deny` **and** `indeterminate`, to distinct destinations. False must never fold into Unknown. | `GATE-AUTH-001/002` |
| **Cycles must terminate.** A component cycle carries a positive integer budget, or a registered state contract with a canonical termination proof. | `GATE-TERM-001/002/003/004` |
| **No orphans, no dead ends.** Every part is reachable from an input and reaches some terminal. | `GATE-LIVE-001/002` |
| **No duplicates anywhere** — parameters, part instances, arguments, capabilities, effects, or values inside a set literal. | `GATE-RESOLVE-001/002/003/008`, `GATE-EFFECT-001/002` |
| **Every reference resolves** — parameters, inputs, and both endpoints of every wire. | `GATE-RESOLVE-004/005/006/007` |

## Tier 3 — resolution (contract-driven; needs a registry)

This is where **shape becomes meaning**: the contract, not the drawing, says what
a part is.

| Rule | Enforced by |
|---|---|
| **The component must exist and be admissible.** An absent component, or one whose status is `BLOCKED`/`REJECTED`, refuses. | `GATE-RESOLVE-101/102` |
| **Arguments are exact.** Unknown arguments, wrong types, missing required ones, and out-of-range values all refuse. An `Int` must be an integer; a declared `min`/`max` is enforced. | `GATE-RESOLVE-103/104/105/112` |
| **Ports are exact.** Unknown output and input ports refuse on both sides of a wire. | `GATE-RESOLVE-106/107` |
| **The type wall cannot be disabled.** Every type must resolve in the catalogue, and the strict profile refuses a registry with no catalogue at all — an empty catalogue must never mean "allow everything". | `GATE-RESOLVE-108/109` |
| **Required inputs have a producer.** Being *incidentally connected* is not the same as being fed. | `GATE-RESOLVE-110` |
| **Decision completeness is contract-driven.** A component declaring `decision: true` must have **every** declared arm routed — whatever the arms are named. Port names cannot evade the rule. | `GATE-RESOLVE-111` |
| **Wire types match exactly.** No implicit conversion, ever. | `GATE-WIRE-101` |
| **Fan-out is contract-gated.** An output that is not declared `copyable` may have exactly one consumer. Absent means non-copyable — the permissive reading is never the default. | `GATE-WIRE-102` |

## Tier 4 — the registry itself (a closed schema)

A registry is validated **before** it is normalised, so a malformed entry cannot
be silently coerced into a permissive one.

| Rule | Enforced by |
|---|---|
| **The schema is closed.** An unknown field on any contract entry refuses — a typo becomes a refusal, not a silently ignored constraint. | `GATE-REGISTRY-014` |
| **Version pinned, digest bound.** The registry version is exactly `1.0.0`, and a declared digest must match the canonical content. | `GATE-REGISTRY-002/005` |
| **`copyable` is Boolean or absent.** The string `"false"` is not a Boolean; before this rule it was truthy, and illegal fan-out passed. | `GATE-REGISTRY-013` |
| **Identity and shape are exact** — component and type entries, finite domains, and no duplicates. | `GATE-REGISTRY-004/006/008/009/010/011/012` |

## The doctrine

- **Deny-only.** Topology proves *reach*, never *authority*. A structurally
  perfect circuit authorizes nothing; admission is the signed capability.
- **Sign the IR, never the source.** The signature binds the runtime IR digest.
  `FUNGI-GATELANG-002` withholds `.gate` production signing until the sound
  compile-time backstop is wired — a deliberate, loud, fail-closed refusal.
- **Comments carry no authority.** A `#` comment narrating the opposite of the
  drawn wires is ignored. The wires are the truth.

## Known limits — stated, not hidden

- **Effect and capability envelopes are not yet checked.** `REQUIRES:` declares
  an envelope; comparing it against what the resolved components actually do is
  scheduled work, and is carried as a classified difference against the reference
  implementation rather than left silent.
- **`construction` is declared but not enforced.** The type catalogue records how
  a value may come into existence (`source`, `canonical-only`,
  `verified-measurement-only`) and the loader refuses any other value — but no
  resolution rule consults it yet, so a circuit is not currently checked against
  it. See [FUNGI-TO-GATE-LIKE-FOR-LIKE.md](FUNGI-TO-GATE-LIKE-FOR-LIKE.md).
- **These example circuits ship without a registry**, so only tiers 1 and 2 run
  against them.
