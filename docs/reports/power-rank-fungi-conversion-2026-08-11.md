# Power rank TypeScript-to-Fungi conversion proof

## Outcome

The sentinel-power package's private `powerRank` decision has an exact
package-owned `.fungi` counterpart and a physical SLIDE/VOK execution proof.
The TypeScript reference and all consumers remain active. This is a bounded,
reference-only conversion slice; it is not TypeScript retirement or production
authority.

## Closed decision

The translated decision is deterministic and total over admitted Strings:

| Input | Int result |
|---|---:|
| `native` | 0 |
| `simd` | 1 |
| `shadow` | 2 |
| every other String | -1 |

The `.fungi` flow is pure and introduces no effect, capability, contract
permission, Hallmark, border grant or host API. It uses none of null, NaN,
`else if`, exception syntax, `for` or `loop`.

## Exact custody

| Item | Evidence |
|---|---|
| TypeScript reference before the slice | SHA-256 `0ABC8869ABCB06B062CA7D6103B36EE0AFF90AFE175579B8A160812C8F3CED47` |
| Fungi candidate after the slice | SHA-256 `4DD4749857C5EDFF3B1948F10FEFC84738CF35BA273AD41E4C24B4EBF6DF7122` |
| Package differential test | SHA-256 `A02AF4217560DCEBC7455B58EEF2AA9684CC592D630C63BA43AF17F3C182F227` |
| Physical SLIDE/VOK test | SHA-256 `3123879CCCA83C29DF5B63B1E13814CECE92477BAD974EEDEE13AD42E96A8F26` |
| Fungi implementation commit | `c8b9d8203d9e1b93329cadb404cf4a461c10a1ff` |
| Physical proof commit | `d0d1bd399d3b2893d5b1110082f977b7684df056` |
| Governed registration commit | `f909dc6a9fae80d4b2e2b18bde07f53a6c090f2b` |
| Independent SLIDE build point | `ac8a0418ec0bfe6443807db1b100b0a02d5b1ea8` |

## Verification evidence

- Strict Fungi checking: 0 errors and 0 governance warnings; six flows and six
  declarations admitted.
- Focused interpreter and signed/admitted Wasm differential: 1/1 pass.
- Owning sentinel-power package: 18/18 pass, zero failures and zero skips.
- Physical SLIDE/VOK path: 1/1 pass, zero skips.
- Governed tooling-contract audit: 100 packages, 188 tools, zero violations.
- Manifest, tooling-contract and test-runner policy focus: 27/27 pass.
- Golden Pack: 11/11 checked examples and 11/11 execution vectors.
- Semantic assurance graph: 3/3 outputs current; graph umbrella: 7/7 current.
- Canonical test-count consumers: 7/7 agree on 9,558 tests.
- Roadmap/subway: 5/5 outputs current; path-leak audit found no modelled
  absolute local path leak.
- At generated-owner commit `9af99c3201ca4ef5a7ec57a619a501c621ade697`,
  codebase-memory committed 49,778/49,778 nodes and 132,656/132,656 edges.
  Myco indexed 4,959 files and 77,439 terms.

The physical proof compiles exact Fungi bytes into a checked package, publishes
one physical `.slide`, and independently re-admits it through VOK before typed
execution. It covers the three canonical members plus empty, case-mismatched,
leading-space, embedded-NUL and unknown Strings. It refuses missing, wrong and
surplus arguments, an unpaired surrogate, mutated source bytes and a one-byte
physical artifact mutation.

## Authority boundary

`power-governor.ts`, its private `powerRank`, the public
`PowerGovernor.requestAdjustment` path and all consumers remain active. The
proof grants no consumer switch, bootstrap fixpoint, production, hardware,
signing, durability, release or retirement authority. Repository-wide closure
is UNKNOWN until a safe replacement for the crash-linked full tooling and
normal phase-close processes is established; no green status is inferred from
their exclusion.
