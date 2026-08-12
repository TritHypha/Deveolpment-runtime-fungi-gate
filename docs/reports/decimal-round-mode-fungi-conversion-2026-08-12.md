# Decimal round-mode Fungi conversion proof

## Outcome

The compiler's exported `isRoundMode` predicate now has an exact package-owned
Fungi counterpart and a physical SLIDE/VOK proof. The Fungi module admits only
the seven canonical rounding-policy spellings. TypeScript, decimal division and
every caller remain active.

## Exact custody

| Item | Evidence |
|---|---|
| TypeScript reference | 8,711 bytes; SHA-256 `29BDF55D07346CB008B1612996FFB25199F67CCA7632508BCBBE4C4413DDC5C0` |
| Fungi candidate | 1,129 bytes; SHA-256 `31ED7E9FB46C79DA9A49B1A9CDAAD943F16DD1EFEA579730860F2EFDF2027B13` |
| Differential test | 3,164 bytes; SHA-256 `35495BEE9EDCD7DCEB3D18E3EAFECF1D84994195C0FFFDF921C5193899951749` |
| Physical test | 6,472 bytes; SHA-256 `FF3BA757B22538729BE7A742A225A6F2DE527D9611D2994DCEBC36EFEE7E5CC6` |
| SLIDE build point | `053cc7573c7b035ab532a9bb69532276981aac96` |
| Registry | `slide.registry.executable-gir.v2c-bounded-wide-control-flow.v1` |
| Registry digest | `d805dae4b822392e5092126ce4f0fb27e8bfa6aa2de8862ee88e09e23eed43cc` |
| Galerina source commit | `efb19fcc` |
| Galerina physical-proof commit | `52133539` |

## Semantic boundary

SLIDE's bounded-wide-control-flow registry admits no more than five
non-wildcard String branches per flow. The candidate therefore partitions the
seven exact modes into closed groups of four and three, then composes them in a
public flow. Both group wildcards return `false`; the public flow returns true
only after an exact group admission. There is no trimming, case folding,
normalization, alias or default rounding policy.

## Verification

- Differential membership: **2/2**, covering all seven modes and hostile empty,
  whitespace, case, NUL, Unicode and prototype-like Strings.
- Physical SLIDE publication and independent VOK re-admission: **1/1**, zero
  skips. Wrong arity/type, invalid Unicode, inadequate work, source mutation
  and publication mutation refuse.
- Focused Decimal neighborhood: **28/28**.
- Strict candidate: zero type errors and zero governance warnings.
- Compiler package: **6,371/6,371**.
- Canonical owner: **100/100 packages, 9,591 tests**, exit 0 in **275.4s**.
- Golden Pack: **11/11** checked examples and **11/11** execution vectors.
- Retirement: **1,437** executable-family paths and **126** source Fungi assets.

## Authority boundary

The Fungi source contains no null, NaN, `else if`, `else`, exceptions or loop
forms. No TypeScript/MJS file or consumer is retired or switched. No production,
signing, release, platform or terminal-retirement authority follows. Full
tooling, normal phase-close and whole-memory evaluation remain excluded, so
repository-wide closure is **UNKNOWN**.
