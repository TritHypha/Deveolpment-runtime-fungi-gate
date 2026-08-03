# Verified native-operation comparison benchmark design

## Outcome

Add the one-million checked-read example to the Galerina benchmark tooling as
an explicitly non-authorizing comparison among:

- Node.js;
- Python;
- portable Rust;
- optionally generated Rust AVX2 code; and
- the permission-absent checked semantic reference from the exact SLIDE
  evidence; and
- the permission-present SLIDE/VOK reference from that same admitted evidence.

The benchmark answers a narrow question: how long does each implementation
take to traverse exactly 1,000,000 signed 32-bit values in index order and
return the final value, after its input storage has been prepared? It does not
claim that the SLIDE reference is native code, production authority, physical
erasure, a general-loop backend or the final Galerina/SLIDE lane.

## Selected architecture

The standard benchmark catalog gains `verified-native-operation`. Its ordinary
runtime files execute the same fixed traversal and publish the same result,
iteration count and throughput unit. A separate adapter consumes one exact
SLIDE publication copied into the package evidence directory. A small contract
pins the publication digest, SLIDE commit and semantic evidence digest.

The adapter independently checks the closed publication shape, self-digests,
derived phase totals, sample medians, one-million iteration count, expected
result, zero failures, `evidenceK3 = 0`, `authorityReleased = false`, and host
identity. A missing, stale, redirected, oversized, malformed, digest-divergent
or cross-host file produces no comparable SLIDE rate.

`checkedReference` and `slideReference` are the two required admitted subject
lanes for this benchmark only. Reports display them as `Checked reference - no
permission` and `SLIDE reference - permission present`, both with
`ranked: false` and no production Galerina flag. Node.js, Python and Rust may be
ranked against one another once the work/unit audit passes, but neither
laboratory lane can win or activate the frozen Galerina/Wasm transition
contract. The key `slide` remains reserved for the later production executable
backend.

## Work equivalence

Every lane uses an array whose element at index `i` is the signed 32-bit value
`i`. Preparation is outside the demand measurement. One demand operation:

1. verifies or relies on its separately stated prepared-input contract;
2. visits indexes `0..999999` exactly once in increasing order;
3. observes the value at every index;
4. returns `999999`; and
5. reports exactly `1,000,000` element reads.

Native compiled controls must prevent the optimiser from deleting intermediate
reads. That anti-elision mechanism is recorded in their output and is not
mistaken for a Galerina security check. All comparable throughput is normalized
to `element-reads/s`.

The SLIDE publication keeps these lower-is-better phase medians separate:

- compilation;
- preparation/admission;
- demand;
- prepared total; and
- end-to-end total.

The checked-peer demand and SLIDE demand are independently converted to
`element-reads/s` for the same-work table. Their ratio is shown explicitly as
the permission-present reference path versus the permission-absent checked
path. Preparation and compilation never disappear into either rate and remain
visible in the result record and Markdown explanation.

## Evidence and failure model

The committed evidence is a reproducible snapshot, not a trust anchor. Its
closed admission contract makes any evidence update an explicit reviewed
change. The adapter rejects:

- unknown or surplus fields;
- unsafe integers, non-positive timings or non-odd sample counts;
- sample/median disagreement;
- phase-total arithmetic disagreement;
- comparison-ratio disagreement;
- expected-value, exact-result or failure-count disagreement;
- self-digest or publication-digest disagreement;
- commit, semantic-digest or platform mismatch; and
- any claim that authority was released.

No retry-until-allow behavior is permitted. Missing admitted evidence makes the
SLIDE reference lane unavailable. It does not silently fall back to a planted
number or become the production `slide` lane.

## Reporting

The interpreted report adds a `SLIDE reference lab` column and explains that:

- higher `element-reads/s` is better in the same-work table;
- lower phase time is better in the SLIDE phase evidence;
- the check mark means work-equivalent and unit-aligned, not “Galerina won”;
- both permission variants are visible but neither is eligible to win; and
- Galerina production placement remains `not measured` until a real `slide`
  lane is admitted.

The developer example links to the new benchmark evidence and retains its
pointer-free, flow-owned, checked-fallback semantics.

## Verification

Implementation uses test-first slices for:

1. strict SLIDE evidence admission and hostile mutations;
2. report ranking exclusion and labelling;
3. benchmark catalog/unit alignment;
4. Node.js, Python and Rust result parity; and
5. one complete focused benchmark publication.

The developer documentation presents the two source forms side by side. Their
loop bodies remain identical; only the flow-local permission request differs.

Broader verification includes the benchmark package tests and integrity audit,
with serial/owned child-process execution and before/after Node process counts.
