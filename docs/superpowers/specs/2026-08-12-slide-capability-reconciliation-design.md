# SLIDE capability reconciliation design

Date: 2026-08-12
Status: owner pre-approved under the standing full-auto, zero-trust direction

## Problem

The Slice 33-62 register conserves exact refusals, but several refusal summaries
describe a selected scalar profile rather than the complete current pinned
SLIDE surface. Current SLIDE contains separately verified support for one
external flat record, multiple mixed arguments, external `Array<Int>`, internal
`Option<Int>` flows, immutable text operations and wider control profiles.
Those features do not automatically compose: a fresh exact probe still refuses
Slice 45 and a minimal two-String flow, while duplicate external record
parameters and external `Option<Int>` are explicitly closed.

Continuing blind symbol enumeration would repeat stale capability assumptions.
Blindly widening the blocker labels would be worse because it would turn
separate proofs into unproved composition authority.

## Decision

Add a generated, pin-bound capability reconciliation lane before Slice 63.
The lane probes the exact pinned SLIDE implementation and classifies required
boundary shapes without changing Galerina sources, packing values in the host,
or treating frontend expressibility as physical admission.

The classifications are:

- `PHYSICAL_SUPPORTED`: exact source-domain shape compiles, publishes,
  independently re-admits and executes with hostile-boundary evidence.
- `COMPOSITION_BLOCKED`: constituent features exist but their exact combination
  refuses.
- `DOMAIN_NARROWER`: the physical value domain is smaller than the TypeScript
  source domain.
- `AUTHORITY_BLOCKED`: a host projection, normalization or custody decision
  would remain outside the admitted object.
- `BOOTSTRAP_FLOOR`: the source participates in building or validating its own
  replacement.
- `UNKNOWN`: evidence is missing, stale, ambiguous or failed to execute.

Only `PHYSICAL_SUPPORTED` can make a scope eligible for a new conversion slice.
It does not itself authorize a consumer switch or retirement.

## Approaches considered

### 1. Pin-bound reconciliation matrix — selected

Derive a small set of exact boundary probes from the blocked-slice register and
execute them against the pinned SLIDE build. Bind the resulting matrix to the
SLIDE commit, source digest, compiler profile, registry-set identity and limits.
This reuses existing engineering and fails closed when features do not compose.

### 2. Treat all observed features as composable — rejected

This would relabel blockers from names such as “record,” “array,” or “multiple
arguments.” It is unsafe: current evidence already proves that single-record
support does not imply two-record support and mixed-argument support does not
imply two-String support.

### 3. Build a general typed ABI immediately — deferred

A recursive typed ABI could eventually cover records, unions, arrays, options
and bytes, but its authority surface is much larger. Building it before the
matrix would duplicate capabilities that may already exist and hide the actual
minimum missing compositions.

## Matrix scope

The first matrix covers the shared blocker families observed in Slices 31-62:

1. repeated scalar arguments, including two Strings;
2. one flat record with scalar fields;
3. optional scalar fields in a record;
4. two record arguments;
5. record fields containing `Array<Int>`;
6. external and internal `Array<Int>` plus `Option<Int>`;
7. `Bytes`, `Option<Bytes>`, byte length, index and bounded traversal;
8. signed i64 and exact JavaScript safe-integer semantics;
9. Unicode trim, case folding, character access and bounded text traversal;
10. governed regex operations;
11. wide match plus helper-call composition;
12. open `unknown` and heterogeneous record-union admission.

Each row names the blocked slices it can affect. A zero-row or missing probe is
`UNKNOWN`, never “unsupported” or “absent.”

## Evidence and custody

Every probe must bind:

- the exact Galerina source or source-derived minimal boundary fixture;
- the pinned SLIDE Git object and relevant file digests;
- selected compiler profile, registry set and declared limits;
- parameter and result type identities;
- publication, independent re-admission and typed VOK receipt;
- hostile arity, type, object-shape, proxy/accessor, exhaustion and mutation
  vectors appropriate to the boundary;
- whether any host adapter transformed the source-domain value.

Any host transformation that computes a tag, Boolean, normalized String,
length, discriminant or packed record is authority movement and forces
`AUTHORITY_BLOCKED` unless that transformation is itself admitted and proved.

## Policy changes

The conversion policy gains four rules:

1. A physical blocker is valid only at its named SLIDE pin and capability-matrix
   digest.
2. A feature proof grants no composition authority beyond its exact row.
3. Blocked slices are rechecked when the SLIDE pin or capability digest changes;
   they are not silently reopened.
4. The conversion register distinguishes language absence, profile absence,
   composition refusal, domain narrowing and authority movement.

The public translation skill is reviewed after the matrix is proved. It changes
only if a fresh no-skill baseline misses one of these reusable rules.

## Execution order

1. Create the deterministic matrix owner and hostile self-test.
2. Establish RED fixtures for stale pins, missing rows, optimistic composition
   and host-precomputed authority.
3. Populate the matrix using current pinned SLIDE without changing SLIDE.
4. Re-adjudicate Slices 35-62 from exact matrix rows.
5. Select up to ten newly eligible scopes for the next batch. If none become
   eligible, design only the smallest missing shared composition.
6. Run focused proofs, update the linked register and review both public Fungi
   skills at the batch exit.

## Exit conditions

The reconciliation chapter is complete when the matrix is deterministic,
pin-bound, non-vacuous, hostile-tested and every Slice 35-62 blocker maps to one
exact row and classification. It grants no TypeScript deletion, consumer
switch, production admission, signing, release or push authority.

