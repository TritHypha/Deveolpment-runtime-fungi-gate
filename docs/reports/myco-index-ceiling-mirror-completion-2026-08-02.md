# Myco index-ceiling mirror completion - 2026-08-02

## Outcome

Galerina's vendored Myco now refuses an index before the writer can create an
artifact the reader will reject. It distinguishes a genuinely absent index
from a present-but-rejected artifact, stops indexing at the fixed term-edge
ceiling, and treats only `ENOENT` as absence. Invalid paths, permission failures
and other I/O faults fail closed as `rejected`.

The change was made upstream first and then reconciled into the Galerina
mirror. The mirror records upstream commit
`a48d2c3b5c508ce35346a4dd7aac0278606d10f6`.

## Defect chain closed

```text
writer produced > reader ceiling
  -> reader returned null
  -> CLI called refusal "first run"
  -> identical rebuild repeated
  -> heap abort
```

The fixed chain is:

```text
incremental term-edge count
  -> early MYCO-INDEX-TOO-LARGE refusal
  -> no poisoned cache write
  -> typed ok | absent | rejected load result
  -> exact remedy and exit 2
```

Only `ENOENT` enters `absent`. Every other filesystem exception enters
`rejected`.

## Root cache evidence

The repository-parent `.myco/index.json` is a derived cache and remains on
disk. It was not deleted.

| Fact | Value |
|---|---|
| bytes | 42,585,553 |
| IEC size | 40.61 MiB |
| SHA-256 | `a3e065208a9454b82557539b0122a1ac32916cdbc405460c8e283a7858260e49` |
| current status result | `REFUSED` |
| current exit status | `2` |

It is no longer useful for searches rooted at the repository parent. Searches
rooted at individual repositories continue to use their own bounded `.myco`
indexes. Deleting the parent cache would be safe because it is regenerable, but
deletion was not necessary to close the defect and was not performed.

## Fresh verification

All commands ran sequentially. The host had one pre-existing Node process
before and one after verification.

| Surface | Evidence | Result |
|---|---|---|
| upstream Myco | direct no-emit TypeScript check | pass |
| upstream Myco | build | pass |
| upstream Myco | complete suite | **78/78 pass** |
| Galerina mirror | `npm run typecheck` | pass |
| Galerina mirror | `npm run build` | pass |
| Galerina mirror | complete suite | **80/80 pass** |

The new TDD control uses an embedded-NUL path to cause a deterministic
cross-platform non-`ENOENT` filesystem failure. It failed as `absent` before
the production change and passes as `rejected` after it.

## Remaining limit

Myco deliberately does not support one monolithic index above the fixed
2,000,000 term-edge ceiling. A future bounded sharded design may support a
repository parent, but it must not raise the reader limit, hide incomplete
coverage or collapse refusal into absence.

## Related evidence

- Package: `packages-galerina/galerina-tools-myco`
- KB incident analysis: `../ZTF-Knowledge-Bases/research/rd/RD-0678-myco-index-ceiling-regression-and-fix.md`
- Upstream incident: `../subprojects/myco/docs/INCIDENT-2026-08-02-index-ceiling-crash.md`
