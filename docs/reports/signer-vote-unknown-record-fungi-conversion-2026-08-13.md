# Signer Vote Unknown Record - Slice 77

## Result

Slice 77 is `BLOCKED_BY_UNKNOWN_STRUCTURAL_RECORD_ABI`.

The live Tower-Citizen helper accepts JavaScript `unknown` and performs an open
structural check. Current physical records refuse hostile or non-exact shapes
before execution, so they cannot preserve the helper's Boolean result and
property-read behavior.

## Evidence

- Graph caller: `tally`; invalid votes become malformed evidence with a zeroed
  approval count before the quorum boundary denies.
- Exact record: `SignerVote { signer: string; verdict: Verdict }`.
- Accepted source shapes may carry surplus or inherited properties.
- Ordinary JavaScript reads can execute getters or proxy traps and propagate a
  throw; that active behavior is absent from physical exact records.
- SLIDE external records and Safe Value records reject proxies, accessors,
  inherited fields, surplus fields and wrong values before Fungi execution.
- The existing governance Fungi asset consumes a host-computed malformed Bool;
  it does not replace this predicate.
- Focused Tower-Citizen lane: **507/507 tests passed**, zero failures and zero
  skips.

No Fungi asset, bridge, candidate test or TypeScript source change was made.
The predicate, tally and quorum boundary remain authoritative.

## Threadability

`SERIAL_HARD_PATH`. Reading `signer` and `verdict` from an untrusted open object
can execute accessors or proxy traps and throw. Only already-admitted data-only
records could be parallel; that is not the source boundary.

## Skill review

`NO_SKILL_UPDATE`. The private translation skill already requires open-object,
prototype, accessor, proxy, surplus-field and exception parity. The writing
skill already distinguishes exact physical admission from a source-level
Boolean classifier and forbids host-precomputed malformed facts. No reusable
rule is missing.

## R&D trigger

Revisit after a source-equivalent heterogeneous/open-record ABI exists through
GIR, physical `.slide`, independent re-admission and VOK, or after a separately
approved exact-record API migration proves all callers and audit results moved
together.

This result grants no conversion, retirement, production, signing, release or
push authority. Aggregate closure remains deferred to Slice 87.

## Slice-close receipt

Skill disposition: NO_SKILL_UPDATE: existing skills already require open-record and property-effect parity
Threadability: SERIAL_HARD_PATH
Source classification: BLOCKED
Bounded closure: COMPLETE
