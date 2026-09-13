# RD-0873 Fungi wave 3: direct package tree

Wave 3 starts the owner-authorized full-package conversion plan using the
canonical target layout `packages/fungi/products/<package-name>`. It promotes
the two already verified pilot decisions into their direct package roots while
retaining every TypeScript source as a differential shadow.

## Completed scope

| Package | Source shadow | Symbol | Direct Fungi target |
| --- | --- | --- | --- |
| `galerina-core-config` | `packages-ts/galerina-core-config/src/index.ts` | `isEnvironmentMode` | `packages/fungi/products/galerina-core-config/environment-mode.fungi` |
| `galerina-core-runtime` | `packages-ts/galerina-core-runtime/src/structured-await.ts` | `isTerminalScope` | `packages/fungi/products/galerina-core-runtime/terminal-scope.fungi` |

The targets are byte-identical to the owner-approved pilot assets. This keeps
the direct product tree stable without silently changing semantics or deleting
the legacy pilot paths used by historical tests and receipts.

## Verification

- Strict scalar classifier checks: **2/2**.
- Focused semantic cases: **13/13**.
- Failures: **0**; skips: **0**.
- Output bytes: **764**, under the 16,384-byte wave limit.
- GitHub Actions, hosted CI, and repository build scripts were not invoked.
- Effort cap recorded by the plan: **Luna - High**; worker restart remains
  allowed under the same cap.

The durable receipt is
`docs/independent-audits/2026-09-13-rd0873-fungi-wave3-direct-package-tree.json`.
It is bound to Galerina `HEAD` `675e1048304b11e109b1de4f68af97ebc64f5949`
and tree `b20138180928ed9d787d157d1faedbe86050be64`.

## What this means for the full run

The conversion has started in the direct package layout. The manifest covers
all 100 packages and assigns each source a Fungi target or an explicit manual
host-boundary treatment. Remaining waves will proceed in bounded chapters,
with no full-corpus review after an individual file. Compiler, build, test,
CI, host, and native boundaries remain represented as retained shadows or
manual boundary work where their effects cannot be expressed as product
Fungi. No consumer switch, TypeScript retirement, production authority, or
profile promotion follows from this wave.

