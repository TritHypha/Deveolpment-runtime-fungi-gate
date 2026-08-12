# Governance floor normalisation Fungi conversion proof

## Outcome

The compiler's exported `normaliseFloor` governance helper now has an exact
package-owned `.fungi` counterpart and a physical SLIDE/VOK proof. The work also
closed a prototype-inheritance bug in the retained TypeScript reference.
TypeScript and every consumer remain active.

## Closed decision

Five exact floor aliases normalize to their canonical Tower floor names. Every
other String, including prototype names, embedded NUL, differently normalized
Unicode and whitespace variants, is returned byte-for-byte unchanged. The
Fungi flow uses exhaustive `match` and contains no `null`, `NaN`, `else if`,
`throw`, `try`/`catch`, `for`, `while`, or `loop`.

The former TypeScript helper indexed a prototype-bearing object directly.
Inputs such as `constructor`, `toString` and `__proto__` therefore returned
inherited non-String values despite the declared String return type. The public
governance-verifier caller first checked `KNOWN_FLOORS`, but the exported helper
itself remained unsafe. Commit `5d8b6d71` replaced the lookup with exact
own-entry admission and added hostile regression coverage before translation.

## Exact custody

| Item | Evidence |
|---|---|
| TypeScript reference | 10,747 bytes; SHA-256 `EF1B3E7D50279BD9FEF6D9863F5982D872472924B5B217A6CF5E7DA221074991` |
| Fungi candidate | 532 bytes; SHA-256 `C868880147F2E5D83504D934E9ED60533CF911C92705926FF95CBADFA78178D6` |
| Hostile TypeScript regression | 1,349 bytes; SHA-256 `2D55A6FE81AC4AD03876A897A21FE7E761DD8DE0AF56C835B9AB61A22DB5BA50` |
| Differential/public-caller test | 4,431 bytes; SHA-256 `D9A0F3F8054E9702521A61541BFF3B64828BEA2B458494BC38C559B547B6EB99` |
| Physical SLIDE/VOK test | 6,571 bytes; SHA-256 `3C6BB7C8B94DE8330495A4CD93FD276F039C822E9FEEDD745FF3DE9C6B6F961C` |
| Independent SLIDE build point | `dc1add78215cfce2b5d23fcf194076b56501fa53` |
| Executable registry | `slide.registry.executable-gir.v2c-bounded-wide-control-flow.v1` |
| Registry digest | `d805dae4b822392e5092126ce4f0fb27e8bfa6aa2de8862ee88e09e23eed43cc` |
| TypeScript repair commit | `5d8b6d71` |
| Galerina source/proof commit | `006ed716` |
| Retirement owner commit | `b65e7781` |

## Verification

- The repaired TypeScript helper and typed Fungi interpreter agree over 18
  canonical and hostile Strings. The real governance verifier also emits the
  exact canonical `dag_check` obligation for all five accepted aliases; the
  combined focused neighborhood passes **4/4**.
- Independent SLIDE compiles the exact Fungi bytes, publishes one physical
  `.slide`, independently re-admits it through VOK and verifies typed String
  receipts for every vector (**1/1**, zero skips).
- Wrong type or arity, surplus input, invalid UTF-16, step exhaustion, source
  mutation and one-byte artifact mutation all refuse. The physical proof pins
  the exact executable registry identity and digest.
- Complete compiler package lane: **6,361/6,361** pass with zero failures and
  zero skips.
- The first complete aggregate passed every package but failed closed at final
  `version.json` publication with a transient Windows `UNKNOWN` open error; it
  remains a failed attempt. An unchanged-tree exact retry passed **100/100
  packages and 9,581 tests** in **280.1 seconds** with captured exit code 0.
- Retirement evidence records **1,433 executable-family paths**, **902**
  `.mjs` paths, **489** source `.ts` paths and **122** `.fungi` source assets.

## Authority boundary

`capability-types.ts`, `normaliseFloor`, `verifyGovernedFlows` and every caller
remain active. This proof grants no consumer-switch, production, release,
signing, platform or terminal-retirement authority. Repository-wide closure
remains UNKNOWN because the crash-linked closure lanes remain excluded.
