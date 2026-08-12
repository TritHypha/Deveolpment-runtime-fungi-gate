# Residency strictness Fungi conversion proof

## Outcome

The compiler's exported `atLeastAsStrict` residency-lattice predicate now has
an exact package-owned Fungi counterpart and a physical SLIDE/VOK proof. The
candidate maps the five canonical tiers to ranks `0..4`, maps every other
String to sentinel `5`, rejects either sentinel, and compares only admitted
ranks. TypeScript, `reconcileExplicit` and every caller remain active.

## Exact custody

| Item | Evidence |
|---|---|
| TypeScript reference | 29,904 bytes; SHA-256 `94F7201206CA406D3D7768DFAAB781E78E160A2AD9B550A9CCAFABBA4FD17AD8` |
| Fungi candidate | 1,310 bytes; SHA-256 `3D11F068CF34E8D17624174421EE6F8CA042C3E61281AE144A2EA35FE1CEB3E4` |
| Differential test | 4,813 bytes; SHA-256 `51AB58BC1B98652C561C3197F1E47A0B1BA4E7440E5B3590CC54B805F429B037` |
| Physical test | 8,609 bytes; SHA-256 `DC711E20A14C675E9E3C57CF5DBE1FCAFFAB00DD6FC21B23C055ED937F262BF7` |
| SLIDE build point | `053cc7573c7b035ab532a9bb69532276981aac96` |
| Registry | `slide.registry.executable-gir.v2c-bounded-wide-control-flow.v1` |
| Registry digest | `d805dae4b822392e5092126ce4f0fb27e8bfa6aa2de8862ee88e09e23eed43cc` |
| Galerina initial source commit | `f6f53149` |
| Galerina physical-proof/final-source commit | `06675443` |

## Semantic and profile boundary

For valid inputs the exact rule is `rank(tier) <= rank(floor)`, where lower
means stricter. The emitted JavaScript also returns false for hostile runtime
Strings because missing rank lookups do not satisfy `<=`; the Fungi sentinel
makes that behavior explicit and fail closed. No trimming, case folding,
normalization, alias or default tier is admitted.

The first physical RED showed that the independent pure-scalar parser accepts
`<=` in a Boolean `if` condition but not as a directly returned expression.
The candidate therefore isolates comparison in `rankAtMost`. A second RED
showed that calling a separate five-arm membership helper for both inputs
exceeded the bounded transitive/control profile. The final source performs one
rank lookup per input and rejects either sentinel in one combined guard. This
is semantically equivalent and is admitted by the frozen registry above.

The registry reports zero separately-metered text-comparison work for these
executions. The physical proof therefore claims step-fuel refusal, not an
unobserved text-work refusal.

## Verification

- Differential residency strictness: **1/1**, covering the complete 25-pair
  canonical matrix plus hostile empty, whitespace, case, NUL, Unicode and
  prototype-like Strings in either position.
- Physical SLIDE publication and independent VOK re-admission: **1/1**, zero
  skips. Wrong arity/type, invalid Unicode, inadequate step fuel, source
  mutation and publication mutation refuse.
- Focused hardening neighborhood: **31/31**.
- Strict candidate: zero type errors and zero governance warnings.
- Compiler package: **6,372/6,372**.
- Canonical owner: **100/100 packages, 9,592 tests**, exit 0 in **278.3s**.
- Golden Pack: **11/11** checked examples and **11/11** execution vectors.
- Retirement: **1,438** executable-family paths and **127** source Fungi
  assets.

## Authority boundary

The Fungi source contains no null, NaN, `else if`, `else`, exceptions or loop
forms. No TypeScript/MJS file or consumer is retired or switched. No
production, signing, release, platform, runtime-residency enforcement or
terminal-retirement authority follows. Full tooling, normal phase-close and
whole-memory evaluation remain excluded, so repository-wide closure is
**UNKNOWN**.
