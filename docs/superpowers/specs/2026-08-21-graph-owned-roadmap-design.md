# Graph-Owned Roadmap Design

## Problem

Galerina has one useful roadmap generator, several dated living roadmap files,
and multiple manual references to the dated active file. The generator is not
part of `graph-all`, writes a "subway"-named SVG and provenance file, and
duplicates its generated block across three documents. A graph refresh can
therefore finish without refreshing the roadmap, while later agents spend
tokens rediscovering and redrawing project state.

## Adopted outcome

- `docs/ROADMAP.md` is the single canonical living roadmap.
- The existing active roadmap is renamed to that path without dropping its
  unique plan history.
- `scripts/gen-roadmap.mjs` owns the graph-derived live-status region in the
  canonical roadmap and the generated visual/provenance artifacts.
- `scripts/graph-all.mjs` invokes the roadmap generator only after every
  upstream repository graph/index child succeeds.
- `graph-all --check` runs the roadmap in non-mutating `--check` mode.
- README links to `docs/ROADMAP.md`; it does not carry a second generated
  roadmap block.
- The word `subway` is retired from current tool, marker, artifact, descriptor,
  and test names. Historical prose is not rewritten merely to erase a word.

## Canonical artifacts

| Responsibility | Path |
|---|---|
| Living roadmap | `docs/ROADMAP.md` |
| Generator | `scripts/gen-roadmap.mjs` |
| Visual | `build/roadmap/roadmap.svg` |
| Provenance | `build/roadmap/provenance.json` |
| Assurance descriptor | `governance/assurance-evidence-dependencies.json` |

The generator continues to derive state from the closed assurance dependency
DAG, component-health evidence, the compiler authority ledger, the kernel
authority ledger, and `version.json`. It does not infer completion from prose.

## Orchestration

`graph-all` keeps its seven existing upstream children in their current order.
It records all seven outcomes. If any upstream child refuses, it reports those
refusals and does not invoke the roadmap generator. If all seven succeed, it
runs:

- generate mode: `scripts/gen-roadmap.mjs --root <root> --write`
- check mode: `scripts/gen-roadmap.mjs --root <root> --check`

The roadmap becomes the eighth reported child. A roadmap refusal makes
`graph-all` fail.

The roadmap provenance gate may ignore only declared generated graph outputs
created by the seven upstream children, including package
`.graph/package-graph.json` and `.graph/BOUNDARY.md` files. Dirty source,
policy, ledger, documentation, or undeclared output paths still refuse.

## Document migration

Rename intact:

- `docs/ROADMAP.md` to
  `docs/ROADMAP.md`

Delete after inbound references are migrated:

- `docs/roadmap-2026-07-15.md`
- `docs/roadmap-2026-07-23.md`
- `docs/roadmap-2026-07-24.md`
- `docs/roadmap-2026-07-25.md`
- `docs/roadmap-2026-07-25-cycle2.md`

Preserve:

- `docs/CORE_FOUNDATION_ROADMAP.md`
- `docs/NODE_HOSTED_RUNTIME_ROADMAP.md`
- `docs/architecture/*roadmap*.md`
- `docs/reports/*roadmap*.md`
- package-local roadmap files

Those files are specialized designs, historical records, or package-local
plans rather than competing root living roadmaps. Their references to the
dated active roadmap are migrated to `docs/ROADMAP.md`.

## Related generators and audits

`gen-status-blocks.mjs` retains `build/status/STATUS.md` and its provenance but
stops injecting status into deleted dated roadmaps. The canonical-count audit
and its fixtures use `docs/ROADMAP.md` as the sole roadmap consumer. Tooling
policy, assurance evidence, documentation indexes, and package scripts are
updated to the canonical names.

## Failure model

- Missing, duplicated, or misordered generated markers refuse.
- Missing or malformed upstream evidence refuses.
- A denied assurance predecessor refuses; stale evidence remains visibly
  `UNKNOWN` and non-authorizing.
- `--check` never writes.
- A failed upstream graph child prevents roadmap execution.
- Partial roadmap writes are forbidden: all outputs derive and preflight
  before mutation.
- Generated visual/provenance drift makes `--check` fail.
- No runtime authority, VOK lease, `.fungi` conversion, push, PR, or merge is
  authorized by this feature.

## Test contract

RED controls must demonstrate these absent behaviours before implementation:

1. `graph-all` invokes the canonical roadmap eighth and passes the correct
   generate/check mode.
2. `graph-all` does not invoke the roadmap after an upstream refusal.
3. The canonical generator writes and checks only `docs/ROADMAP.md`,
   `build/roadmap/roadmap.svg`, and `build/roadmap/provenance.json`.
4. README is not mutated by roadmap generation.
5. Exact declared package graph outputs may be dirty, while dirty source still
   refuses.
6. Assurance evidence accepts only the canonical roadmap id, tool name, tool
   path, and evidence path.
7. Status and canonical-count tooling work without the deleted dated roadmap
   files.

Focused GREEN is followed by related script suites, generator self-tests,
`graph-all --check`, documentation/index fixed point, diff/custody checks, a
local commit, and an exact-HEAD external graph refresh. No push is performed.
