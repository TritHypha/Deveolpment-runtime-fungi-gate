# FUNGI-SCAN — syntax-migration corpus report

Scanned **2289** files (2284 `.fungi` · 5 `.gate`) — 364 runtime-corpus, 1923 test-corpus.
Of those, **1875** are inline `.fungi` fixtures extracted from 200 `.mjs`/`.cjs` harness files (test-corpus, strict-exempt) — the disk-scan blind spot this closes.
Detection = REAL compiler lexer token stream (see package note; regex misses `@`-headers and no-space operator forms).

## Migration gap summary

| Check | Status |
|---|---|
| `@version` header present | 446/2289 (valid: 441) |
| files with legacy `&&`/`\|\|` | 21 (30 occurrences) |
| files with legacy `vAnd`/`vOr`/`vNot` | 0 |
| `match` blocks total / without `_` arm | 266 / **20** (in 18 files) |
| `secure flow` adoption | 593 |
| unreadable files | 0 |
| files with lexer errors | 9 |

## Planned-keyword usage — constructs
Pre-reservation this is the **collision-risk** table (identifiers that would break when the word becomes a keyword); post-reservation it is the adoption metric.

| word | files | occurrences |
|---|---:|---:|
| `check` | 11 | 11 |
| `all` | 6 | 9 |
| `authorize` | 4 | 4 |
| `prefilter` | 3 | 3 |
| `fault` | 2 | 2 |
| `through` | 2 | 2 |
| `flip` | 1 | 1 |
| `any` | 1 | 1 |

## Planned-keyword usage — rename aliases

| word | files | occurrences |
|---|---:|---:|
| `project` | 4 | 4 |
| `each` | 2 | 3 |
| `fuse` | 1 | 1 |

## match blocks without a `_` arm (top 18)

- `packages-ts/galerina-core-compiler/tests/wat-enum-match.test.mjs#L20` — 2 (lines 5, 20) _[test-corpus]_
- `packages-ts/galerina-core-compiler/tests/wat-result-match.test.mjs#L15` — 2 (lines 4, 12) _[test-corpus]_
- `packages-ts/galerina-core-compiler/tests/anti-hallucination-corpus.test.mjs#L178` — 1 (lines 5) _[test-corpus]_
- `packages-ts/galerina-core-compiler/tests/compiler-safety-contracts.test.mjs#L98` — 1 (lines 3) _[test-corpus]_
- `packages-ts/galerina-core-compiler/tests/compiler-safety-contracts.test.mjs#L213` — 1 (lines 3) _[test-corpus]_
- `packages-ts/galerina-core-compiler/tests/domain-real-world-flows.test.mjs#L860` — 1 (lines 3) _[test-corpus]_
- `packages-ts/galerina-core-compiler/tests/governance/match-exhaustiveness.test.mjs#L31` — 1 (lines 4) _[test-corpus]_
- `packages-ts/galerina-core-compiler/tests/governance/match-exhaustiveness.test.mjs#L46` — 1 (lines 3) _[test-corpus]_
- `packages-ts/galerina-core-compiler/tests/governance/match-exhaustiveness.test.mjs#L60` — 1 (lines 3) _[test-corpus]_
- `packages-ts/galerina-core-compiler/tests/governance/match-exhaustiveness.test.mjs#L103` — 1 (lines 5) _[test-corpus]_
- `packages-ts/galerina-core-compiler/tests/interpreter.test.mjs#L151` — 1 (lines 3) _[test-corpus]_
- `packages-ts/galerina-core-compiler/tests/interpreter.test.mjs#L193` — 1 (lines 3) _[test-corpus]_
- `packages-ts/galerina-core-compiler/tests/type-checker-phase11-wave2.test.mjs#L203` — 1 (lines 3) _[test-corpus]_
- `packages-ts/galerina-core-compiler/tests/type-checker-phase11-wave2.test.mjs#L219` — 1 (lines 3) _[test-corpus]_
- `packages-ts/galerina-core-compiler/tests/type-checker.test.mjs#L429` — 1 (lines 3) _[test-corpus]_
- `packages-ts/galerina-core-compiler/tests/type-checker.test.mjs#L440` — 1 (lines 3) _[test-corpus]_
- `packages-ts/galerina-core-compiler/tests/type-checker.test.mjs#L451` — 1 (lines 9) _[test-corpus]_
- `scripts/galerina-new.mjs#L175` — 1 (lines 21) _[test-corpus]_

## files with legacy `&&`/`||`

- `docs/examples/Level-2-Types/092-boolean-logic/example.fungi` — 1 `&&`, 3 `||`
- `docs/examples/Proposed-Readable-Logic-Forms/020-readable-boolean/example.fungi` — 1 `&&`, 1 `||`
- `examples/auth-service/governanceService.fungi` — 0 `&&`, 2 `||`
- `packages-ts/galerina-core-security/src/interim.fungi` — 0 `&&`, 2 `||`
- `packages-ts/galerina-core-compiler/tests/domain-boolean-logic.test.mjs#L188` — 1 `&&`, 1 `||` _[test-corpus]_
- `packages-ts/galerina-core-compiler/tests/domain-boolean-logic.test.mjs#L216` — 1 `&&`, 1 `||` _[test-corpus]_
- `packages-ts/galerina-core-compiler/tests/domain-boolean-logic.test.mjs#L842` — 2 `&&`, 0 `||` _[test-corpus]_
- `docs/examples/Proposed-Readable-Logic-Forms/040-governance-readable/example.fungi` — 1 `&&`, 0 `||`
- `packages-ts/galerina-core-compiler/tests/anti-hallucination-corpus.test.mjs#L110` — 1 `&&`, 0 `||` _[test-corpus]_
- `packages-ts/galerina-core-compiler/tests/anti-hallucination-corpus.test.mjs#L184` — 1 `&&`, 0 `||` _[test-corpus]_
- `packages-ts/galerina-core-compiler/tests/domain-boolean-logic.test.mjs#L155` — 1 `&&`, 0 `||` _[test-corpus]_
- `packages-ts/galerina-core-compiler/tests/domain-boolean-logic.test.mjs#L166` — 0 `&&`, 1 `||` _[test-corpus]_
- `packages-ts/galerina-core-compiler/tests/domain-boolean-logic.test.mjs#L390` — 1 `&&`, 0 `||` _[test-corpus]_
- `packages-ts/galerina-core-compiler/tests/domain-boolean-logic.test.mjs#L545` — 1 `&&`, 0 `||` _[test-corpus]_
- `packages-ts/galerina-core-compiler/tests/domain-boolean-logic.test.mjs#L557` — 0 `&&`, 1 `||` _[test-corpus]_
- `packages-ts/galerina-core-compiler/tests/domain-boolean-logic.test.mjs#L816` — 1 `&&`, 0 `||` _[test-corpus]_
- `packages-ts/galerina-core-compiler/tests/domain-boolean-logic.test.mjs#L873` — 1 `&&`, 0 `||` _[test-corpus]_
- `packages-ts/galerina-core-compiler/tests/type-checker-phase11.test.mjs#L381` — 1 `&&`, 0 `||` _[test-corpus]_
- `packages-ts/galerina-core-compiler/tests/type-checker-phase11.test.mjs#L393` — 0 `&&`, 1 `||` _[test-corpus]_
- `packages-ts/galerina-core-compiler/tests/type-checker.test.mjs#L731` — 1 `&&`, 0 `||` _[test-corpus]_
- `packages-ts/galerina-core-compiler/tests/wat-branch-fold.test.mjs#L54` — 1 `&&`, 0 `||` _[test-corpus]_

## Strict-mode findings (runtime corpus only): 7

- `docs/examples/Level-2-Types/092-boolean-logic/example.fungi` — legacy &&/|| (4) — migrate to and/or
- `docs/examples/Level-3-Effects/112-local-fn-cannot-declare-effects/example.fungi` — 4 lexer error(s)
- `docs/examples/Proposed-Readable-Logic-Forms/020-readable-boolean/example.fungi` — legacy &&/|| (2) — migrate to and/or
- `docs/examples/Proposed-Readable-Logic-Forms/040-governance-readable/example.fungi` — legacy &&/|| (1) — migrate to and/or
- `examples/auth-service/governanceService.fungi` — legacy &&/|| (2) — migrate to and/or
- `packages-ts/galerina-core-security/src/interim.fungi` — legacy &&/|| (2) — migrate to and/or
- `packages-ts/galerina-core/examples/parallel-api-calls.fungi` — 4 lexer error(s)

Full per-file detail: `fungi-scan.json` next to this report.
