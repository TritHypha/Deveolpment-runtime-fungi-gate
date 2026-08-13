# Registry-generation path equality - Slice 67

## Result

Slice 67 is `BLOCKED_BY_LOCALE_PATH_SEMANTICS`.

The source is live trust-root behavior. It chooses between exact String
equality and explicit `en-US` locale case-folded equality after recognizing an
ASCII Windows drive prefix on the left path. The current Fungi/SLIDE text
surface cannot preserve that complete decision.

## Evidence

- Graph callers: `canonicalDirectory` and
  `publishRegistryGenerationWithLinkedHost`; downstream production paths cover
  registry load, persistence and bootstrap.
- Retirement row: `T1-trust-root`, replacement absent, no declared bootstrap
  floor.
- Missing exact surface: JavaScript drive-prefix regex, explicit-locale Unicode
  case mapping, pinned Unicode-version behavior and the complete source String
  domain.
- Refused substitute: pre-normalizing or projecting a host Boolean would move
  path identity authority into TypeScript.

No Fungi asset, queue candidate, test fixture or source change was created.
TypeScript and every consumer remain active.

## Skill review

`NO_SKILL_UPDATE`. The private translation skill already requires exact input
domains, encodings and host-boundary conservation; this candidate is a direct
application of that rule. Both private skill worktrees were clean.

## R&D trigger

Revisit only after a versioned physical path profile defines platform syntax,
Unicode/case-fold tables, separator handling, bounded resource costs and an
independently derived content-bound border. A platform-native identity handle
could be considered only if it is derived and verified outside the replaceable
host and has explicit cross-platform refusal behavior.

This result grants no conversion, retirement, signing, production, release or
push authority. Aggregate closure remains deferred to Slice 87.
