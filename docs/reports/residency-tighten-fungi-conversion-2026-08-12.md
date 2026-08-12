# Residency tighten Fungi conversion proof

## Outcome

The compiler's exported `stricterResidency` tighten combinator now has a
package-owned Fungi counterpart in the governed residency lattice module and a
physical SLIDE/VOK proof. TypeScript and every consumer remain active.

## Exact custody

| Item | Evidence |
|---|---|
| TypeScript reference | 29,904 bytes; SHA-256 `94F7201206CA406D3D7768DFAAB781E78E160A2AD9B550A9CCAFABBA4FD17AD8` |
| Fungi lattice module | 1,860 bytes; SHA-256 `1528D5BBF169D5B38580C7EE45724289A9CDEC96C19775B5353CF37D611E7D6C` |
| Differential test | 3,622 bytes; SHA-256 `D0A96EAFFED019B75A776BFC6769042E0ABAC2A7BF701099EBB5BA8044156B64` |
| Physical test | 7,360 bytes; SHA-256 `6E34653B62B84B0E46BA3C5D6C28865058602484FD037B1BDB0BC8F9119F8C15` |
| SLIDE build point | `053cc7573c7b035ab532a9bb69532276981aac96` |
| Registry | `slide.registry.executable-gir.v2c-bounded-wide-control-flow.v1` |
| Registry digest | `d805dae4b822392e5092126ce4f0fb27e8bfa6aa2de8862ee88e09e23eed43cc` |
| Galerina source commit | `b56da5e1` |
| Galerina physical-proof commit | `c091fb4d` |

## Semantic boundary

For the closed `ResidencyTier` domain, the Fungi flow preserves the exact
TypeScript rule: return the left tier when its rank is less than or equal to
the right rank; otherwise return the right tier. This retains the left-biased
equal case.

TypeScript's static union excludes hostile runtime Strings. At the physical
boundary, the Fungi flow maps either unknown input to the existing sentinel
rank `5` and returns `register_only`, the strictest canonical ceiling. Unknown
text is never reflected into a typed residency output and never defaults to a
looser ceiling. This is a deliberate fail-closed extension outside the typed
TypeScript domain.

## Verification

- Differential residency lattice: **1/1**, covering all 25 canonical pairs
  plus hostile empty, whitespace, case, NUL, Unicode and prototype-like
  Strings in either position.
- Physical SLIDE publication and independent VOK re-admission: **1/1**, zero
  skips, with verified typed String receipts and `authorityReleased=false`.
  Wrong arity/type, invalid Unicode, inadequate step fuel, source mutation and
  publication mutation refuse.
- Compiler package: **6,373/6,373**.
- Canonical owner: **100/100 packages, 9,593 tests**, exit 0 in **272.8s**.
- Golden Pack: **11/11** checked examples and **11/11** execution vectors.
- Retirement: **1,439** executable-family paths and **127** source Fungi
  assets. The added physical proof accounts for the new MJS path.

## Authority boundary

The Fungi source contains no null, NaN, `else if`, `else`, exceptions or loop
forms. No TypeScript/MJS file or consumer is retired or switched. No
production, signing, release, platform, runtime-residency enforcement or
terminal-retirement authority follows. Full tooling, normal phase-close and
whole-memory evaluation remain excluded, so repository-wide closure is
**UNKNOWN**.
