# RD-0873 local source-origin subject review

Date: 2026-09-08

Status: **PASS for the bounded local subject and cooperative production-profile
unit; Task 6 remains HOLD.**

The reviewed unit is `scripts/lib/logic-aig-source-origin/local-subject.mjs`
with `scripts/tests/logic-aig-source-origin-local-subject.test.mjs`. It binds
repository identity, inventory policy, source snapshot, host observation, Myco
receipt and Hypha receipt digests into one non-authorizing local subject. Its
sealed host and verified-discovery builders reject proxies, accessors, extra
keys including Git authority fields, schema drift, digest drift, and fixture
relabelling. Fixture creation and validation require explicit admission, and
all receipt fixture classifications must match the snapshot.

`local-source.mjs` now exposes a capture-to-subject entry point that obtains
the snapshot only from the private retained capability state. It cannot accept
a caller-supplied snapshot and refuses invalid capabilities, disabled fixture
admission, or receipt digest drift before returning a subject.

The collector accepts only the explicit `FIXTURE_ONLY` and
`LOCAL_PRODUCTION_V1` profiles. The profile is retained in the digested policy
and derives the snapshot's `fixtureOnly` classification. The production-profile
path remains cooperative, non-authorizing, and before untrusted module
evaluation; it still requires an external hard deadline and a reviewed runtime
boundary.

An independent read-only review by `/root/review_local_subject` (gpt-6-astra,
high) returned PASS with no Critical or Important findings. The reviewer
confirmed that both public entry points validate option shapes before reading
their properties and that nested evidence records reject proxies and accessors.

Fresh verification:

- Windows x64, Node v24.18.0: focused subject unit **5/5**; focused source
  unit **20/20**; combined local subject/contract/source suite **31/31**.
- Ubuntu WSL2 x86_64, Node v24.18.0: focused subject unit **5/5**; focused
  source unit **20/20**; combined local subject/contract/source suite **31/31**.
- No tests were skipped, cancelled or failed.

Reviewed bytes at Galerina HEAD
`ce1aeeeacbb5b98167c17f82209ec4044e0f6154` plus the two reviewed working-tree
files:

| Artifact | SHA-256 |
| --- | --- |
| `scripts/lib/logic-aig-source-origin/local-subject.mjs` | `6166c0d8320b0f15a3a616b9d02763c6206b5bcbb14291e198ba8a2807d5ccce` |
| `scripts/tests/logic-aig-source-origin-local-subject.test.mjs` | `074f3485ec7b95251c0034018c59f6589d90410edba03a516924db05a50374de` |
| `scripts/lib/logic-aig-source-origin/local-source.mjs` | `9df263d57b22f96002bdc9378b21b189fae4d9469faf63c273a8607a4fccca09` |
| `scripts/tests/logic-aig-source-origin-local-source.test.mjs` | `3aaf62bb3c7b5a3f27024583317ed0b061a22f76eb4619845c428ad24afc5963` |
| `scripts/lib/logic-aig-source-origin/contract.mjs` | `527bc975438bfe549fd446e443fe2b21c75840e61968f9bc29e260201b9259dc` |

This establishes bounded profile plumbing and synthetic temporary-fixture
coverage, not a real dirty-checkout filesystem capture. It does not establish
gateway computation, PROJECT receipt, selection receipt, native-source
admission or Task 7 authority. `.fungi` authoring remains
closed until the separate Task 6 selection, review, continuity and owner
approval chain is complete. The protected dirty paths were preserved by
pathname and were not inspected or staged.
