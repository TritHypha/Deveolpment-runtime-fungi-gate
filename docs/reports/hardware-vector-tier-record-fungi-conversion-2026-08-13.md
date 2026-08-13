# Hardware vector-tier record - Slice 68

## Result

Slice 68 is `BLOCKED_BY_HARDWARE_PROFILE_RECORD_ABI`.

The source is an exported projection from the full `HardwareProfile` object.
The pinned physical surface cannot carry that exact record because its two
JavaScript `number` fields have no equivalent physical type: current `Int` is
signed i32 and the profile exposes no `Float`. Passing only `vectorTier` would
leave the authority-bearing projection in TypeScript.

## Evidence

- Graph scope: one exported three-line function and one repository test-module
  caller; no production caller was found in the current graph.
- Retirement row: `T2-runtime-core`, replacement absent, no declared bootstrap
  floor.
- Source record: two Strings, two JavaScript numbers and one closed String
  selector union.
- Physical type table: `Int`, `Bool`, `Verdict`, `String`, `Bytes`,
  `Array<Int>` and `Option<Int>`; no binary64 `Float` representation.
- Focused package lane: **15/15 passed**, zero failures and zero skips.
- Refused substitutions: scalar pre-projection, i32 number narrowing and a
  partial record ABI.

No Fungi asset, queue candidate, test fixture or TypeScript source change was
created. The source and exported API remain active.

## Threadability

`UNKNOWN` at the present JavaScript boundary. A future exact immutable closed
record projection could be `PARALLEL_PURE`, but the existing function does not
independently exclude accessors, proxies or concurrent mutation.

## Skill review

`NO_SKILL_UPDATE`. The private writing skill already requires exact physical
record boundaries and refuses scalar helper parity; the translation skill
already blocks JavaScript `number` narrowing and unproved object semantics.
Both rules directly cover this refusal.

## R&D trigger

Revisit after a versioned `HardwareProfile` boundary defines exact key set,
ownership/prototype policy, accessor/proxy refusal, numeric finite/range rules,
wire encoding and independent physical admission. If binary64 values are not
required, the TypeScript API must first adopt and test a narrower integer or
fixed-point contract rather than allowing the conversion to invent one.

This result grants no conversion, retirement, signing, production, release or
push authority. Aggregate closure remains deferred to Slice 87.
