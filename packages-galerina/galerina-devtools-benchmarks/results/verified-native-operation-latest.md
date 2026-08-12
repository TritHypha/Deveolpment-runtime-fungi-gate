# Verified native-operation benchmark

The workload traverses 1,000,000 signed 32-bit values and returns 999999.
**Higher is better** for the same-work throughput table in element-reads/s.
The permission-absent and permission-present lanes are reference evidence and
cannot win or count as Galerina production.

## Bound Galerina sources

- `docs/examples/CHECKED-MILLION-ITERATION-LOOP.fungi` - checked, permission absent, K3 `-1`.
- `docs/examples/VERIFIED-MILLION-ITERATION-LOOP.fungi` - verified candidate, permission present, K3 `0`.

The source-pair receipt is compiler-derived, reference-only and non-authorizing.

| Runtime or path | Throughput | Ranking status |
|---|---:|---|
| Rust AVX2 | 2.966B | Ranked control |
| Rust | 2.313B | Ranked control |
| Node.js | 1.976B | Ranked control |
| Python | 9.0M | Ranked control |
| Checked reference - no permission | 583.7M | Reference only - cannot win |
| SLIDE reference - permission present | 1.529B | Reference only - cannot win |

Measured native-language winner: **Rust AVX2**. The green check
in the aggregate report means work-equivalent and unit-aligned; it does not mean Galerina won.

Reference demand speed-up: **2.620x** for the permission-present
SLIDE demand over the permission-absent checked reference. This is a laboratory
observation, not production authority.

## SLIDE phase accounting

**Lower is better** for every phase time below. Preparation and compilation are
not hidden in demand throughput.

| Phase | Median |
|---|---:|
| Checked reference demand - no permission | 1.713 ms |
| Source preparation | 9.273 ms |
| Source demand | 0.664 ms |
| Source total | 10.008 ms |
| .slide compilation | 0.253 ms |
| .slide preparation | 9.079 ms |
| .slide demand - permission present | 0.654 ms |
| Prepared .slide total | 9.804 ms |
| End-to-end .slide total | 10.206 ms |

Both reference lanes are JavaScript reference evidence. They do not establish a
native backend, physical erasure, a general-loop result or a production
Galerina/SLIDE performance claim.
