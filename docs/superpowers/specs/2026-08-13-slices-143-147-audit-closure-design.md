# Slices 143-147 audit closure design

## Decision

Adjudicate the three remaining `AuditLogger` methods and two exported audit
boundary types, then run the registered 25-slice maintenance owners. Do not
create placeholder Fungi. Preserve ledger read/parse behavior, filtering and
limit semantics, transition-record construction, lifecycle folds, exact event
shape and active egress capability identity.

The pinned SLIDE build point remains
`ed326eaa14f1a899841cbac8da353d400970367e`. Its bounded immutable arrays and
records can transport copied values; they do not admit filesystem ledger
reads, silent malformed-row handling, live append effects, open unknown-value
records or retained egress capabilities.

## Exact decisions

| Slice | Symbol | Classification | Exact exit |
|---:|---|---|---|
| 143 | `AuditLogger#query` | `BLOCKED_BY_HOST_LEDGER_QUERY_ABI` | Selects live memory or host JSONL, silently drops malformed rows, applies ordered optional filters and JavaScript slice semantics over mutable event records. |
| 144 | `AuditLogger#logTransition` | `BLOCKED_BY_BINARY64_OPTION_RECORD_AUDIT_APPEND_ABI` | Accepts unrestricted number fields and optional properties/defaults, constructs an exact transition record and delegates to active append. |
| 145 | `AuditLogger#getLifecycle` | `BLOCKED_BY_AUDIT_ARRAY_FOLD_ABI` | Calls active query, allocates phase/violation arrays, applies string coercion and derives completeness from event order/content. |
| 146 | `TowerAuditEvent` | `BLOCKED_BY_AUDIT_EVENT_RECORD_ABI` | Defines the exact event wire/value boundary, including open unknown details and optional logical tick; no admitted descriptor covers the complete shape. |
| 147 | `EgressSink` | `BLOCKED_BY_ACTIVE_EGRESS_CAPABILITY_ABI` | A retained effect capability with ordered `push` and `flush`, not an immutable record or ordinary data value. |

## Security finding retained for separate work

`query()` catches each JSON parse failure and removes that ledger row. For an
audit trail, silent loss can conceal corruption or tampering. This batch must
preserve source parity and therefore cannot rewrite it opportunistically. Add a
priority TODO for a fail-closed/quarantine design with hostile-ledger tests,
explicit diagnostics and recovery semantics before conversion is reopened.

## Verification and 25-slice maintenance boundary

Run typecheck plus `tower-citizen`, `sentinel-egress-time`, `flight-boot`,
`tpl-simulator` and `hybrid-engine`, then complete Tower-Citizen. Review both
private skills and publish five receipts.

After the Slice 147 report commit, run only registered bounded owners in
dependency order: conversion receipts, retirement/queue, semantic graph,
project/package/KB graphs, code index, component-health/status, roadmap/subway,
canonical counts and path/private-document checks. Refresh Myco. Attempt one
moderate codebase-memory refresh and verify status/head/symbol if available;
retain `UNKNOWN` on transport failure. Do not substitute crash-linked full
tooling, normal phase-close, graph-all or monolithic memory evaluation.
