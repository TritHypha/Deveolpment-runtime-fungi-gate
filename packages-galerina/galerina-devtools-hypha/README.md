# @galerina/devtools-hypha

**Passive capability-map scanner.** Extracts the compiler's dispatch surfaces, sentinel sets and
checker wiring into memory, answers five drift questions, prints the answer, exits. Every claim
carries a `file:line` so a human can check it in seconds.

```bash
node bin/galerina-hypha.mjs                      # full scan
node bin/galerina-hypha.mjs --scan surface       # one query
node bin/galerina-hypha.mjs --scan surface:push  # one name, layer by layer
node bin/galerina-hypha.mjs --self-test          # prove it is not vacuous
```

No config. No install. No build. Run it from anywhere in the repo. (`--root` overrides root
detection for a relocated checkout; you should never need it.)

---

## What "passive" means here

Four properties, each **enforced or proven**, not asserted:

| property | how |
|---|---|
| **Nothing to load** | Facts are extracted at each invocation and held in memory. No database, no index, no cache, no priming step. A stale index that answers confidently is worse than no index. |
| **Nothing to find** | The repo root is located by walking up from the script until a directory containing `packages-galerina` is found. No env var, no cwd assumption, nothing to configure. `--root` overrides the search when the package has been relocated — an escape hatch, not a setup step. |
| **Nothing written** | No output file unless `--out` names one. No temp files, no dotfiles, no `.db`. The self-test **snapshots the working tree around a scan and compares** — the property is tested, not claimed. |
| **Nothing installed** | Zero dependencies. Runs on the Node this repo already needs. |

### Why there is no database

The upstream tool (`subprojects/hypha`) keeps its facts in SQLite because they must **persist** —
so one run can be diffed against another, and so the companion `sporeprint` tool can write its
execution-verified matrix into the same file and be joined against static visibility.

Neither reason applies to a throwaway command-line scan: there is nothing to diff and nothing to
join. Carrying the database anyway would buy a Node ≥22.5 floor, a file to load, and a `.db` left
behind — the three things that make a tool something you *set up* rather than something you *run*.

**Use the upstream tool when you want a persistent fact base to diff or to join against runtime
evidence. Use this one when you want an answer.**

---

## The five queries

Each exists because a real defect of its class was found by hand first. The incident is named in
the source above each function, so nobody has to guess what the query protects.

| query | question | the incident behind it |
|---|---|---|
| `surface` | Where is a method name visible, **layer by layer**? | `.push()` was judged absent because only the interpreter's inline fallback table was read. It was in the gate list the whole time. |
| `duplicate-sets` | Which sentinel sets were hand-copied and then drifted? | `FLOW_KINDS` existed at four sites; the parser gained `governedFlowDecl` and one copy was updated. Governed flows were skipped by checkers. |
| `kind-coverage` | Which parser-producible kinds does a gating set omit? | The same incident from the other side — pure negative space, so no test could notice the absence. |
| `dead-exports` | Which exported checkers are never called? | `checkEvents` was implemented, exported, imported — and called by nothing, so `FUNGI-EVENT-001` was unreachable in every mode. |
| `name-set-drift` | Which guard lists enumerate **fewer names than the code tests for**? | `DECLASSIFIER_NAMES` named three privacy declassifiers; the checker also short-circuits on a fourth, `constantTimeEquals`. The shadow floor therefore never covered it, and a comment asking a human to keep the two in sync was the only thing holding them together. |

### Why these five, when upstream has a different five

Four are shared with `subprojects/hypha`. `name-set-drift` is **local to this package** — it needs
a fact family (string-literal sets and the literals actually compared against them) that the
upstream extractor does not collect. See `src/namesets.mjs`.

Upstream's fifth, `diagnostics` — every `FUNGI-*` code with a site count and first location — is
deliberately **not** here, and the reason is the distinction this tool already draws in
`bin/galerina-hypha.mjs`:

> a single-name lookup is a question, not a check

`diagnostics` is a census of the code *universe*. Every row is context; none is a finding.
Upstream says so itself — presence is not reachability, and whether a code fires is an execution
question static extraction cannot answer. A query with no finding semantics cannot participate in
the `0`/`1` exit contract above: it would always exit `0`, which reads as *checked and clean*
rather than *nothing was checked*.

So it stays where the answer is useful — upstream, where you are reading rather than gating. **Use
`hypha query diagnostics` when you want the code universe; use this tool when you want a
pass or a fail.**

### Honest scope — read this before adopting

Two of these overlap tools this repo already has, and the report says so in its own output:

- **`dead-exports` duplicates `scripts/audit-checker-wiring.mjs`**, which does the job more
  thoroughly because it knows the pipeline's call graph rather than counting call sites. Treat
  this query as a cross-check, never the authority.
- **`duplicate-sets` and `kind-coverage`** partially overlap the existing drift audits.

**The case for this package rests on `surface`.** `STD_METHOD_NAMES` and the per-receiver inline
fallback tables are read by **0 of the 163 scripts** in `scripts/`. Answering "is X supported?"
from any single layer is exactly how the `.push()` incident happened, and showing all three layers
at once is the only defence.

---

## Exit codes

| code | meaning |
|---|---|
| `0` | scan completed, no findings |
| `1` | findings present — for CI |
| `2` | usage error, or the scan could not run (unknown target, no root found) |

Findings are reported as findings. The tool does **not** decide which of them matter — that
judgement is a human's.

---

## Provenance — the extractor is vendored, and cannot drift silently

`src/extract.mjs` is **not written here**. It is a mechanical CJS→ESM transform of
`subprojects/hypha/src/extract.js`, and `src/provenance.json` records that source's SHA-256.

A hand-copied mirror that drifts from its source is precisely the defect class this tool exists to
detect, and shipping one inside it would be absurd. So:

- the copy is produced by transform, never by hand;
- `--self-test` re-hashes the upstream source **when it is reachable** and fails on a mismatch;
- when it is not reachable — the normal case, since hypha lives outside this repo — that case
  reports **SKIPPED, never passed**. A check that cannot run must not print green.

To update: re-run the transform, never edit `src/extract.mjs`.

---

## Why this package breaks two house conventions

Its siblings (`galerina-devtools-naming`, `-provenance`, …) are TypeScript compiled to `dist/`
with `"bin": "./dist/cli.js"` and a `build` script. This package ships runnable `.mjs` and has no
build step, and no `dependencies` on `@galerina/core-compiler`.

That is deliberate, and it is the whole point:

1. **A tool that needs `npm run build` before it can answer a question is not passive.** The
   convention is right for packages that ship an API; it is wrong for one whose entire value is
   being runnable on a checkout you have just cloned.
2. **It reads `dist/` JavaScript rather than importing the compiler.** It maps what ships, which
   is also what runs, and it must be able to scan a tree whose TypeScript does not currently
   compile — which is exactly when you most want to ask it a question.

If the convention should win anyway, the conversion is mechanical: the queries are pure functions
over a plain fact object.

---

## Known limits

- **Extraction is heuristic** — line-based, anchored on meaning-bearing tokens. Exotic formatting
  can be missed. Every claim carries `file:line` precisely so this is cheap to check.
- **A query is only as good as its reference set.** Until 2026-08-06 `extractParserKinds` returned
  one kind, because it anchored on `kind: "…FlowDecl"` and the parser assigns three of its four
  kinds to a local variable first. `kind-coverage` was therefore **vacuous** — it could not report
  anything and returned zero gaps, which reads exactly like a clean result. It now returns 4 kinds
  and reports 17 gating sets missing `governedFlowDecl`. Note the self-test only asserted `> 0`,
  which a reference set of one passes; a threshold is not a correctness check.
- **Read a `kind-coverage` gap as a candidate.** The execution lanes exclude governed flows
  correctly — governed flows cannot execute. A gap in a *checker* set is the one worth reading.
- **`name-set-drift` is filtered three ways, and each filter can hide a real gap.** A set is
  compared only against literals tested through the **same receiver** in the **same file**; only
  **identifier-shaped** literals are considered, since a set of verbs cannot be missing `==`; and
  the set must be the **majority** of that receiver's vocabulary, or it is not that receiver's
  guard list. Without the first, a 27-member `CONTRACT_SECTIONS` pairs with every token literal
  in the parser. With them, the real finding survives with one readable false positive beside it
  (`string`, a type word). Every claim carries `file:line` so dismissing it costs seconds.
- **Coverage is pinned by a formatting fixture, not by argument.** `tests/` writes the same
  four-kind vocabulary eleven legal ways — one-line, multi-line, trailing comma, single and mixed
  quotes, array, `Object.freeze`, comment inside, `export const`, bare assignment, object
  property — and asserts each is read. Three further forms (spread, built-by-call, concatenated)
  carry no literals and are unreadable by any textual pass; they are named rather than implied.
- **Extraction spans lines.** The vendored extractor is line-based, so a `new Set([` whose members
  sit on following lines was invisible to it — four real gating sets were missed for no reason but
  formatting. `src/namesets.mjs` re-reads both shapes across lines and the caller de-duplicates by
  site. **Formatting is not a property of meaning.**
- **Collections are read in two shapes, and that is measurably enough.** `new Set([…])` and
  array literals (including `Object.freeze([…])`) are extracted; `new Map` and object literals are
  not, and were checked rather than assumed: **0 of 23 Maps and 0 of 10 objects** hold a flow-kind
  vocabulary, and **0 of 20** have every key tested through a single receiver. They enumerate what
  a record *has*, not what a check *accepts*. TypeScript union types are not read either. Union types are erased by the build, so a tool that reads `dist/` **cannot**
  see them at any effort — the four-value `qualifier` union in the parser is invisible here by
  construction, not by omission.
- **Static visibility is not runtime truth.**
 A name present in every layer may still be
  unreachable; a name absent from a layer may be handled elsewhere. For execution-verified answers
  use `sporeprint`'s matrix upstream.

---

## Contact

hello@trithypha.dev
