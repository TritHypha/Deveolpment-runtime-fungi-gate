# Slice 93 vAnd supersession design

## Decision

`packages-galerina/galerina-tower-citizen/src/three-valued-governance.ts#vAnd`
is not translated into a second Fungi implementation. Its complete public
contract is the same typed `Verdict x Verdict -> Verdict` Kleene-minimum table
already represented by
`packages-galerina/galerina-tower-citizen/src/self-hosted/effective-verdict.fungi`
and physically proved in Slice 91.

Slice 93 is therefore classified `SUPERSEDED_BY_EXISTING_FUNGI`.

## Exact proof shape

One package-owned focused test shall:

1. bind the exact exported `vAnd` source shape to `minTrit` plus `asVerdict`;
2. compile the existing governed Fungi asset without errors or governance
   warnings;
3. compare exported `vAnd`, the Fungi flow and nine literal K3-minimum rows;
4. retain the existing physical Slice 91 proof as the artifact/VOK boundary;
5. assert that no duplicate `verdict-and.fungi` asset is admitted.

The literal table is an independent oracle. It must not derive expected values
through `Math.min`, `minTrit`, `vAnd`, `effectiveVerdict` or the Fungi flow.

## Authority and failure boundary

This proof grants no TypeScript removal, consumer switch, whole-file
classification, production admission, release, signing or push authority.
The TypeScript source remains active. Repository-wide closure remains
`UNKNOWN`, and final codebase-memory freshness remains `UNKNOWN` while its
service returns `Transport closed`.

Threadability is `PARALLEL_PURE`. No Fungi skill change is expected because
the private skills already require duplicate search, typed Verdicts, exhaustive
Cartesian proof and physical-profile evidence.
