# Restore verdict consumer switch design

Date: 2026-08-09

Status: approved by the existing owner-directed full-auto route recorded in
`docs/TODO.md` and the Contract 85 report.

## Goal

Make `ColdBootOrchestrator.restore` consume the admitted `restoreVerdict`
decision port while preserving its existing ownership of snapshot reads,
integrity verification, deserialization, durability and scrub.

## Approaches considered

1. **Mandatory verified-decision port — selected.** The boot composition layer
   prepares a synchronous receipt-verifying SLIDE authority and injects it.
   `restore` derives the two Boolean facts locally, calls the port once, checks
   its exact identity and result, and refuses any disagreement or ambiguity.
2. **Dynamic import from a caller-supplied SLIDE checkout — rejected.** It would
   turn an ambient path into runtime authority and introduce a verify/import
   TOCTOU boundary. Contract 85 is reference-only and does not justify that.
3. **Keep or duplicate the Boolean decision in TypeScript — rejected.** It
   provides a fallback rather than an actual consumer switch and would let
   SLIDE evidence remain disconnected from the real caller.

## Architecture

`ColdBootOrchestrator` gains one mandatory `RestoreVerdictAuthority`. The
authority has exact, literal package/export identities and one synchronous
`restoreVerdict(snapshotPresent, integrityOk)` operation. There is no default
implementation and no inline allow fallback.

The restore path is:

1. read the snapshot through `AtomicWriter`;
2. derive `snapshotPresent` and independently verify integrity through
   `StateSerializer.verify`;
3. call the authority exactly once;
4. require an exact integer verdict of `1` or `-1` and require it to equal the
   locally derived fail-closed expectation;
5. preserve `LSS-NOSNAP-001` for absence and `LSS-INTEGRITY-001` for failed
   integrity;
6. deserialize only after both local facts and the authority allow restoration.

Invalid authority identity, exceptions, non-integer/K3-unknown results or a
disagreement refuse with `LSS-RESTORE-AUTHORITY-001`. The error is a hardened
border failure, not a fallback to the old decision.

## Trust and authority boundary

The interface alone does not authenticate a SLIDE implementation. Production
composition must supply an independently verified receipt-backed authority.
The bounded cross-repository integration test uses Contract 85's pinned,
source-free publication and SLIDE's independent typed receipt verifier. This
consumer switch remains reference-only and does not release signing,
durability or production authority.

## Compatibility

The constructor change is intentionally fail closed and source-breaking:
callers must provide the authority. The repository currently has two callers,
both tests. Serialization, storage layout, checkpoint, scrub and restored value
shape are unchanged.

## Evidence

- RED tests prove the current implementation ignores the authority.
- Unit tests cover allow, absence, tamper, exception, invalid verdict,
  disagreement and missing/wrong authority identity.
- A cross-repository integration case drives the real orchestrator through the
  committed Contract 85 publication and typed receipt verifier.
- Package, script, graph, diagnostic, path and relevant aggregate gates run
  sequentially before closure.
