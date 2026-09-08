# RD-0873 local source-origin subject review

Date: 2026-09-08

Status: **PASS for the bounded local subject unit; Task 6 remains HOLD.**

The reviewed unit is `scripts/lib/logic-aig-source-origin/local-subject.mjs`
with `scripts/tests/logic-aig-source-origin-local-subject.test.mjs`. It binds
repository identity, inventory policy, source snapshot, host observation, Myco
receipt and Hypha receipt digests into one non-authorizing local subject. Its
sealed host and verified-discovery builders reject proxies, accessors, extra
keys including Git authority fields, schema drift, digest drift, and fixture
relabelling. Fixture creation and validation require explicit admission, and
all receipt fixture classifications must match the snapshot.

An independent read-only review by `/root/review_local_subject` (gpt-6-astra,
high) returned PASS with no Critical or Important findings. The reviewer
confirmed that both public entry points validate option shapes before reading
their properties and that nested evidence records reject proxies and accessors.

Fresh verification:

- Windows x64, Node v24.18.0: focused subject unit **5/5**; combined local
  subject/contract/source suite **29/29**.
- Ubuntu WSL2 x86_64, Node v24.18.0: focused subject unit **5/5**; combined
  local subject/contract/source suite **29/29**.
- No tests were skipped, cancelled or failed.

Reviewed bytes at Galerina HEAD
`205f9a0e6fb68622aeee6c0f0a32d7c4d32297be`:

| Artifact | SHA-256 |
| --- | --- |
| `scripts/lib/logic-aig-source-origin/local-subject.mjs` | `691dc4fb3b23953b2421900abcd50457b7e7aaadd62bd3dc12dff8e2efd9b658` |
| `scripts/tests/logic-aig-source-origin-local-subject.test.mjs` | `784955c3ad57db00c7ca9ae4e0d12c1883528dd36841d5fba967703421571da5` |
| `scripts/lib/logic-aig-source-origin/contract.mjs` | `a199733a5c0ad2339fc2139159e61a2eddac60f3bc41eb252e8726bb7ad4e59c` |

This is fixture and contract evidence only. It does not establish a real
filesystem capture, gateway computation, PROJECT receipt, selection receipt,
native-source admission or Task 7 authority. `.fungi` authoring remains
closed until the separate Task 6 selection, review, continuity and owner
approval chain is complete. The protected dirty paths were preserved by
pathname and were not inspected or staged.
