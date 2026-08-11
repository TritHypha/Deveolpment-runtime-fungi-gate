# Hardening trust-boundary Fungi conversion design

Date: 2026-08-11
Status: approved by the owner's standing full-auto, zero-trust instruction

## Outcome

Add one bounded, non-retiring `.fungi` slice for the compiler-side epistemic
trust calculus in `hardening-residency.ts`:

- `combineTrust(Verdict, Verdict) -> Verdict` preserves the exact K3 minimum;
- `boundaryTrusted(Verdict) -> Bool` releases only `Verdict.Allow`.

The existing TypeScript remains the executing bootstrap/reference layer. This
slice grants no compiler fixpoint, consumer-switch, retirement, release, or
production authority.

## Approaches considered

1. Convert `triToBool` next. It needs an exact policy type and a typed
   replacement for the source exception. The current independent profile does
   not prove that complete external contract, so this is deferred.
2. Convert `composeAuthVerdict` next. Its exact contract accepts a variable
   `Array<Verdict>`, while the current independent collection boundary admits
   only bounded `Array<Int>`. Re-encoding the inputs would change the API, so
   this is deferred.
3. Convert the hardening scalar trust boundary. Both `Verdict` and `Bool` are
   already independently admitted scalar types, the full domain is finite,
   and the result is directly relevant to deny-by-default release. Adopted.

## Source and semantic boundary

The source build point, source digest, runtime versions, public exports, test
callers and Tower-Citizen conformance caller are pinned in the conversion
dossier before implementation. The source trit is exactly `-1 | 0 | 1`, mapped
without coercion to Fungi `Verdict.Deny`, `Verdict.Unknown` and
`Verdict.Allow`.

`combineTrust` is pure K3 conjunction. `boundaryTrusted` is a pure Boolean
projection that returns true only for `Verdict.Allow`; unknown and deny both
return false. Malformed trits are refused by typed admission before execution.
There are no effects, loops, exceptions, mutation, host APIs or ambient
authority in this slice.

## Evidence path

1. A package-owned source is listed in the compiler package graph.
2. Candidate-specific tests fail before that source exists.
3. The exact source passes strict type and governance checking.
4. Canonical Galerina GIR/WAT matches TypeScript for three release vectors and
   all nine conjunction vectors.
5. Independent SLIDE builds physical `.slide` artifacts, re-admits them and
   executes typed VOK receipts for every vector.
6. Malformed Verdict inputs, altered source/artifact bytes and non-ALLOW
   boundary values refuse or remain false without authority widening.
7. Focused, package, Golden, graph, audit, roadmap and phase-close owners pass
   after publication.

## Refusal and retirement rules

Any unsupported type, diagnostic, physical profile, digest, caller or result
is a blocker, never an approximation. The TypeScript file and every consumer
remain active until the separate bootstrap fixpoint and retirement gates are
proved. The repository inventory receives no TypeScript-retirement credit from
this slice.
