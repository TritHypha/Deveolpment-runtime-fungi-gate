# Slices 133-142 introspection and audit design

## Decision

Finish the two remaining `TPLSimulator` methods, then adjudicate the first
eight `AuditLogger` runtime surfaces. Do not create placeholder Fungi. Preserve
mutable packed-memory identity, JavaScript numeric behavior, active object
state, exact audit-event records, wall-clock and sequence identity, optional
tick callbacks, JSON serialization, governed egress, filesystem durability,
buffer ordering and dynamic record-spread behavior.

The pinned SLIDE build point remains
`ed326eaa14f1a899841cbac8da353d400970367e`. It admits bounded immutable
`Array<Int>` and closed record envelopes, but that does not admit a mutable
`TPLSimulator` instance, a live `AuditLogger`, host clocks, callbacks,
filesystem operations or egress capabilities. A read-only envelope must not be
relabelled as active state or effect authority.

## Exact decisions

| Slice | Symbol | Classification | Exact exit |
|---:|---|---|---|
| 133 | `TPLSimulator#snapshot` | `BLOCKED_BY_TYPED_MEMORY_ARRAY_SNAPSHOT_ABI` | Reads every element from live packed memory through integrity-checked instance methods, allocates a JavaScript number array and can fail on corrupted state. |
| 134 | `TPLSimulator#packedByteLength` | `BLOCKED_BY_MUTABLE_INSTANCE_SIZE_ABI` | Observes retained instance layout; a detached scalar would move object-state authority into the host. |
| 135 | `AuditLogger#constructor` | `BLOCKED_BY_HOST_AUDIT_OBJECT_ABI` | Selects memory/disk/egress modes, normalises binary64 batch size, retains callback/capability identities, creates a directory and initialises mutable buffers/sequence. |
| 136 | `AuditLogger#append` | `BLOCKED_BY_CLOCK_RECORD_EGRESS_TRANSACTION_ABI` | Creates exact event IDs/timestamps, increments sequence, optionally calls the tick source, serializes JSON and performs one of memory, buffer, filesystem or governed-egress effects. |
| 137 | `AuditLogger#flush` | `BLOCKED_BY_ACTIVE_EGRESS_DURABILITY_ABI` | Flushes a retained capability and/or ordered buffer to durable storage, then mutates the buffer only after the write returns. |
| 138 | `AuditLogger#pendingCount` | `BLOCKED_BY_MUTABLE_INSTANCE_OBSERVATION_ABI` | Returns the live buffer length; host-supplied length would not prove the instance observation. |
| 139 | `AuditLogger#load` | `BLOCKED_BY_AUDIT_RECORD_APPEND_ABI` | Builds the exact LOAD event and delegates to the active append transaction. |
| 140 | `AuditLogger#exec` | `BLOCKED_BY_AUDIT_RECORD_APPEND_ABI` | Builds the exact EXEC event, including input hash, and delegates to the active append transaction. |
| 141 | `AuditLogger#trap` | `BLOCKED_BY_DYNAMIC_RECORD_AUDIT_APPEND_ABI` | Preserves dynamic `Record<string, unknown>` spread order/collision precedence and the active denied audit append. |
| 142 | `AuditLogger#erase` | `BLOCKED_BY_OPTION_RECORD_AUDIT_APPEND_ABI` | Preserves optional output-hash state, success-dependent severity/authority and the active append transaction. |

## Verification and cadence

Run typecheck plus `tpl-simulator`, `tpl-bitnet-fidelity`, `tower-citizen`,
`sentinel-egress-time` and `flight-boot`, then the complete Tower-Citizen
package. Review both private skills and update only a reusable missing rule.
Publish ten governed receipts and update the live working tab.

This is the second group in the owner-approved Slices 123-147 window. Defer
roadmap, subway, project graph, code index and navigation re-index until Slice
147. Repository-wide closure remains `UNKNOWN`; do not run crash-linked
aggregate lanes or push.
