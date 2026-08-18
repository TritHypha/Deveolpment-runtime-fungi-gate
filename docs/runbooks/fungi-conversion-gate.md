# Fungi conversion gate

The conversion gate grades one to ten real-package TypeScript scopes. It does
not commit, push, switch a consumer, retire TypeScript or release production
authority. Candidates stay under `build/ts-to-fungi-sandbox/`.

## Before a real run

Run the planted green/red controls:

```powershell
npm run gate:fungi-conversion:self-test
```

The command must return `passed: true`, with `green: ALLOW` and
`red: REFUSED`. Do not run a real batch when the self-test is red.

The Galerina, SLIDE/VOK and Lyth graph projects must be freshly indexed at
their exact Git heads. Put the registered Galerina project in the manifest and
supply the other registered project names through:

- `SLIDE_CONSTELLATION_PROJECT`;
- `VOK_CONSTELLATION_PROJECT` when VOK has a distinct registered project;
- `LYTH_CONSTELLATION_PROJECT`.

## Manifest

The input is canonical JSON with no absolute paths or source bodies:

```json
{
  "schema": "galerina.fungi-conversion-gate.manifest.v1",
  "runId": "pilot-2026-08-18-a",
  "graphProject": "registered-galerina-project",
  "sandboxOutput": "build/ts-to-fungi-sandbox/pilot-2026-08-18-a",
  "requests": [
    {
      "file": "packages-galerina/example/src/constants.ts",
      "symbol": "VALUE",
      "sourceSha256": "sha256:replace-with-64-lower-hex-digits"
    }
  ]
}
```

Requests must name tracked, clean `.ts` files under a real package `src/`
tree. The `galerina-test` package, test directories, conversion overlays,
symlinks, junctions and redirected output ancestors are refused.

## Run

```powershell
npm run gate:fungi-conversion -- --manifest build/fungi-conversion-gate/pilot-manifest.json --out build/fungi-conversion-gate/pilot-run-card.json
```

Exit codes are:

- `0`: every request and mandatory gate is `ALLOW`;
- `1`: a policy `HOLD` or `REFUSED` was published;
- `2`: malformed input, unavailable detector or failed atomic publication.

The destination is no-overwrite. Choose a new run ID and output file instead
of replacing an earlier card.

## Evidence chain

A `CONVERTED` request must carry a `SUPPORTED` body-free logic-analysis
envelope plus verified digests for the retained TypeScript source, Fungi
candidate, checked snapshot, canonical GIR, physical SLIDE package, selected
profile and VOK receipt. Missing, `BLOCKED` or `MANUAL_REVIEW` logic evidence
short-circuits before compiler or physical proof. `BLOCKED` and
`MANUAL_REVIEW` are terminal evidence outcomes; they do not receive synthetic
candidates.

Lyth supplies non-authorizing proof work only. Its result must be
`EVIDENCE_READY` with `authorityReleased: false`.

## Commit policy

The run card records the worktree policy but never commits it. Any commit that
changes a conversion report must contain at least 40 new real-package `.fungi`
files (50 expected), at most one report, and zero exact duplicates or
identifier-normalized shadows. A second consecutive report-only commit is
refused. `--final-tail` is reserved for the explicit final bookkeeping tail
after a qualifying batch; it is not a general bypass.
