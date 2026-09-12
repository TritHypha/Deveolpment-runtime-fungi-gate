# RD-0873 vector diagnostics and agent paths

Seven existing product Fungi candidates were repaired against the retained
TypeScript oracles. The subject is the changed source and test files based on
`6c1b092d9208b7690f65fc5e516b91659f988cbd`, not that unchanged baseline alone.
No TypeScript oracle, compiler, consumer or production policy was modified.

## Behavior and focused evidence

| Repair | Result |
| --- | --- |
| Matrix, vector and tensor types; vector/tensor operations; vector report | Classify `Float64.isFinite` before guarded ordering, so both infinities produce the source diagnostics instead of a WASM trap. Six parity files pass 78/78. |
| Adjacent unchanged vector definition | Its existing finite classifier remains unchanged; focused regression passes 11/11. |
| Agent resource-limit paths | Add `validateAgentLimitsAtPath` and retain the default wrapper. Explicit default, nested and empty prefixes preserve all five diagnostic records in order. Definition/default/custom-path checks pass 27/27. |

All seven changed candidates passed strict checking with zero errors and zero
governance warnings. Golden Pack passed 11/11 checks and 11/11 execution
vectors. No full compiler or PROJECT corpus assurance was rerun.

GPT-6 Astra independently accepted both scoped repairs. It reran the 78 vector
checks and 27 agent checks, compared the six actual dimension predicates with
144 independent numeric inputs, and checked frozen file hashes. In-memory
baseline substitution reproduced the vector infinity failure; a fixed-prefix
mutation made the agent nested/empty-path checks fail. These are defect-detection
controls rather than evidence of general host parity.

Astra's sole finding was a pre-existing generated test annotation using
`Array<Float64>` for `TensorDimension` records. The annotation was corrected,
its 11-check lane passed again, and Astra independently closed the finding.
The complete advisory prompts, replies and subject hashes are retained in the
session output folder as `vector-review-*` and `agent-limits-*`; the scoped
findings were upheld against the changed owner files.

## Remaining work

This proves the tested typed-record behavior with scalar Float64 ingress.
General JavaScript object/list marshalling, getters, proxies, sparse arrays and
aliasing are not covered. SLIDE/VOK admission and production cutover remain
separate; neither a candidate's existence nor this repair counts as TS retirement.

Agent-limit numeric parity remains incomplete: TypeScript accepts positive
infinity, but current WASM ordering traps. The custom-path repair intentionally
adds no finite-only rejection. The next bounded design is an explicitly typed
positive-value classifier with a full finite/non-finite truth table, preserving
the generic compiler guards. This known mismatch is an implementation obligation,
not a request for repeated owner approval.

## Local prerequisites

The installed NASM 3.02 executable matches the exact static-host recipe hash.
The Visual Studio/Clang/NASM prerequisite probe returns `CANDIDATE`; no new
native host build was performed. See the static-host toolchain handoff.

The historical RD audit's pinned Git was restored as an isolated, upstream-hash
and signature-verified portable tool outside the repository. Its controller
tests pass 30/30 against their historical fixtures. A test-name exclusion did
not exclude the final temporary-clone fixture; it ran and cleaned up successfully.
Existing branches/worktrees were not changed. These results do not refresh
current product corpus assurance. No global tool installation or PATH was changed
by the agent.
