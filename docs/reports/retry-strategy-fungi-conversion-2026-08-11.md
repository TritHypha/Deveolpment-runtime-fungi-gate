# Retry Strategy TypeScript-to-Fungi Conversion Report

## Result

The private deterministic retry-strategy predicate in
`galerina-core-compiler/src/runtime/retryPolicy.ts` now has one exact
package-owned Fungi translation at
`galerina-core-compiler/src/self-hosted/retry-strategy.fungi`.

`isValidRetryStrategy` returns true only for the exact Strings `none`,
`linear` and `exponential_backoff`. Every other admitted String returns false.
The flow is total and contains no null, NaN, `else if`, exception syntax,
`for` or `loop`.

## Exact custody

| Input | SHA-256 |
|---|---|
| Active TypeScript source | `2D780121A92CFE02F84778447A14951820232FE5C569C1CA9B8EBAE6B806A3B7` |
| Fungi source | `A28CCD2E0ADB27A6EB36B51E309B652F10024BB905537BDD5AC74A27BDBE6681` |
| Compiler parity test | `EFCCC41D4D0CEE270F979E348ECB714BDE095F827E42F97ADA63CDB102A00482` |
| Physical SLIDE/VOK test | `817A8AB402CE885730CEA712200D630EB933E1B981B0F2119DD139C50017DC99` |

The independent SLIDE build point is
`ac8a0418ec0bfe6443807db1b100b0a02d5b1ea8`.

## Evidence

- RED: the focused test produced one passing public-path test and two failures,
  both caused only by the deliberately absent Fungi asset.
- Focused compiler proof: **3/3**, zero failures and zero skips.
- Compiler package: **6,354/6,354**, zero failures and zero skips.
- Complete package owner: **100/100 packages and 9,566 tests** in **306.0s**.
- Physical SLIDE/VOK: **1/1**, zero skips. One physical `.slide` was published,
  independently re-admitted and executed for ten canonical and hostile String
  vectors.
- The physical lane refused wrong argument count, non-String input, an unpaired
  surrogate, source mutation and one-byte artifact mutation.
- The public `parseRetryPolicy` caller retained all three exact strategies and
  retained its existing fallback for an unrecognized strategy.
- Bounded closure owners are current: graph **7/7**, semantic outputs **3/3**
  with **894** test nodes, canonical test-count consumers **7/7**, roadmap
  outputs **5/5**, Golden **11/11 checked + 11/11 execution vectors**, and
  retirement **1,426 executable-family files / 117 Fungi sources**.
- Codebase-memory indexed the exact pre-close commit with **49,915 nodes /
  133,019 edges** and resolved the new retry-strategy test symbols. Myco was
  refreshed after the source and generated-owner waves.

## Authority boundary

The TypeScript predicate, retry-policy parser and every consumer remain active.
This is a reference-only physical proof. It grants no consumer switch,
bootstrap, production, release, signing or TypeScript-retirement authority.
The crash-linked full tooling lane, normal phase-close and whole-memory
evaluation remain excluded; repository-wide closure therefore remains
`UNKNOWN` until a safe independent closure route is available.
