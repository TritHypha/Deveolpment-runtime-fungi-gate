# Verified native-operation benchmark

The workload traverses 1,000,000 signed 32-bit values and returns 999999.
**Higher is better** for the same-work throughput table in element-reads/s.
The permission-absent and permission-present lanes are reference evidence and
cannot win or count as Galerina production.

| Runtime or path | Throughput | Ranking status |
|---|---:|---|
| Rust AVX2 | 2.350B | Ranked control |
| Rust | 2.350B | Ranked control |
| Node.js | 1.985B | Ranked control |
| Python | 10.7M | Ranked control |
| Checked reference - no permission | 584.2M | Reference only - cannot win |
| SLIDE reference - permission present | 1.606B | Reference only - cannot win |

Measured native-language winner: **Rust AVX2 + Rust**. The green check
in the aggregate report means work-equivalent and unit-aligned; it does not mean Galerina won.

Reference demand speed-up: **2.749x** for the permission-present
SLIDE demand over the permission-absent checked reference. This is a laboratory
observation, not production authority.

## SLIDE phase accounting

**Lower is better** for every phase time below. Preparation and compilation are
not hidden in demand throughput.

| Phase | Median |
|---|---:|
| Checked reference demand - no permission | 1.712 ms |
| Source preparation | 9.000 ms |
| Source demand | 0.617 ms |
| Source total | 9.660 ms |
| .slide compilation | 0.248 ms |
| .slide preparation | 8.903 ms |
| .slide demand - permission present | 0.623 ms |
| Prepared .slide total | 9.619 ms |
| End-to-end .slide total | 9.928 ms |

Both reference lanes are JavaScript reference evidence. They do not establish a
native backend, physical erasure, a general-loop result or a production
Galerina/SLIDE performance claim.
