# `.gate` v3 — the fail-closed invariants

Every rule below is enforced by the v3 frontend in
`packages-ts/galerina-core-compiler/`, and each names the **diagnostic code
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
| **Resource ceilings are owner-ruled constants**, refused before the work they bound is attempted: set nesting ≤ 6 · set cardinality ≤ 256 per literal · identifier ≤ 64 chars · arguments per part ≤ 32 · parts ≤ 4096 · wires ≤ 8192 · file ≤ 512 KiB. A refusal is a diagnostic, never a host exception — before these landed, a deeply nested set escaped as a raw `RangeError`. The numbers live in one exported `GATE_V3_LIMITS`, so tests assert the same constants the parser enforces. | `GATE-PARSE-028..034` |

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
| **`cut` is Boolean or absent** — the same discipline. A component declaring `cut: true` is a privacy CUT, the redaction node the semantic tier reasons about. Declared, never inferred from the component's name. | `GATE-REGISTRY-006` |
| **`vocabularies` is closed when present** — per-terminal-family reason lists (`deny`/`fault`/`trap`/`drain`), well-formed identifiers, no duplicates, no unknown families. | `GATE-REGISTRY-015` |
| **Identity and shape are exact** — component and type entries, finite domains, and no duplicates. | `GATE-REGISTRY-004/006/008/009/010/011/012` |

## Tier 5 — semantic passes (the GateGraph)

The graph every pass reads is CANONICAL: derived from the drawing alone, edge
identity assigned only after a code-unit sort, byte-identical however the
source happened to order its parts and wires. Acyclicity and budget
composition run on every admitted circuit; the contract-driven passes run only
against a loaded registry.

| Rule | Enforced by |
|---|---|
| **Acyclicity is asserted, not assumed.** Cycles refuse upstream (`GATE-TERM-003/004`); the semantic tier machine-checks the invariant at its entrance anyway, so a future path that admits a cycle becomes a stable diagnostic here, not a wrong dominator tree three passes later. | `GATE-SEM-001` |
| **A declared cut must govern egress.** With any `cut: true` part declared, egress must be dominated by a cut… | `GATE-SEM-002` |
| **…and the cut SET must separate taint from egress** — the machine-proven form: remove every declared cut and egress must become unreachable from the input frontier. Plain reachability with cuts in place is the refuted check: it flags the sanitized path too. | `GATE-SEM-003` |
| **A component that LOOKS like a three-valued decision** (exactly three outputs, one shared type) **but is not marked `decision: true`** draws a WARNING — shape-driven, port names never consulted. A nudge to declare, not a refusal. | `GATE-SEM-004` (warning) |
| **`construction` is enforced.** A non-`source` type (`canonical-only`, `verified-measurement-only`) must not enter as a circuit PARAMETER — its constructor or verifier never ran inside the governed drawing. Outputs and returns are sound by construction. A mint is still not a sanitizer: this rule shares nothing with the cut passes. | `GATE-SEM-005` |
| **Budget ceilings hold against the WORST case.** Wire `budget=N` annotations compose max-plus along paths; a composed worst case above a declared `REQUIRES budget` refuses. Deny-side only: the result can refuse and can do nothing else — "within budget" admits nothing, ever. | `GATE-SEM-006` |
| **Terminal reasons obey their declared vocabulary.** With a family vocabulary declared, a reason outside it refuses — `DENY.approved` is refused because the deny vocabulary never admitted it, not because it sounds positive. | `GATE-SEM-007` |
| **Effect names must be CANONICAL.** An effect the shared vocabulary does not admit refuses — in a component contract or the envelope. A misspelling is invisible to the admission policy watching the real name, so a single keystroke would otherwise exempt a component from the rule meant to govern it. | `GATE-SEM-012` |
| **Taint must not reach a GOVERNED SINK.** A value leaves the trust boundary through any egress-class part — a network send, an outbound email, an audit write — not only through `OUT`. Sinks are derived from **declared effects**, never an opt-in flag, so a forgotten declaration cannot mean no protection. `database.write` is deliberately not egress: an internal write has not left the boundary. | `GATE-SEM-013` |
| **An unchecked family says so.** Reasons with NO declared vocabulary yield an INFO label per family — the mode that skips a check must announce itself. | `GATE-SEM-008` (info) |

## The doctrine

- **Deny-only.** Topology proves *reach*, never *authority*. A structurally
  perfect circuit authorizes nothing; admission is the signed capability.
- **Sign the IR, never the source.** The signature binds the runtime IR digest.
  `FUNGI-GATELANG-002` withholds `.gate` production signing until the sound
  compile-time backstop is wired — a deliberate, loud, fail-closed refusal.
- **Comments carry no authority.** A `#` comment narrating the opposite of the
  drawn wires is ignored. The wires are the truth.
- **A circuit cannot be switched off.** There is no ambient environment, no
  conditional part-skipping and no `#ifdef`: a value arrives on a wire or does
  not exist, and a part is wired or it is not. The `SKIP_THE_CHECK=1`
  environment flag and the compile-time feature gate — both found in real code
  during the corpus mapping — are the shape that lets a deployment disable a
  safety check. Neither is representable here, so a governance check drawn into
  a circuit is in the shipped artifact or was never drawn.

## Known limits — stated, not hidden

- **Effect and capability envelopes are not yet checked.** `REQUIRES:` declares
  an envelope; comparing it against what the resolved components actually do is
  scheduled work, and is carried as a classified difference against the reference
  implementation rather than left silent.
- **The verdict algebra is a proven library, not yet a circuit-level pass.**
  `vAnd = min` over DENY < INDETERMINATE < ALLOW ships with its whole table
  machine-checked (including: the empty fold is INDETERMINATE, never ALLOW),
  but no rule yet composes a full circuit's verdict along its authority wires.
- **Which sources are tainted is not yet contract-expressible.** The cut rules
  treat everything reachable from the input frontier as tainted; a declared
  sensitivity axis is future work.
- **All five examples are contract-checked**, via per-circuit contracts in
  the compiler package's test fixtures (kept there because a
  `gate.registry.json` beside the examples would be discovered for all five
  and cross-refuse them). 04/05 use per-use registered VARIANTS —
  `variantOf` families sharing one checked `implementationDigest`
  (`GATE-REGISTRY-016`) — the owner-ratified answer to polymorphic component
  use under exact nominal typing.
