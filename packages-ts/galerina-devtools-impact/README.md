# Galerina affected-scope planner

`galerina-impact` plans frequent, non-authorizing verification for the current
Git byte changes. It maps flat packages through `galerina.workspace.json`,
expands reverse workspace dependencies and emits deterministic commands.

```powershell
node packages-ts/galerina-devtools-impact/bin/galerina-impact.mjs --base HEAD --json
node scripts/run-impact-check.mjs --base HEAD --execute
```

An unknown path, compiler/shared-root change, package-manifest change or
malformed dependency surface returns `FULL_REQUIRED` with exit code 2. Nothing
silently guesses a smaller scope. A green affected-scope run is iteration
evidence only; normal/exhaustive phase-close remains the release authority.

The package is a single flat peer under `packages-ts`. It has no external
dependencies, no nested package store and no build prerequisite.
