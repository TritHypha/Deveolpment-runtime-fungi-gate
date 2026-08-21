# Roadmap legacy-runtime reconciliation

Date: 2026-08-04

## Outcome

The generated subway roadmap was faithfully rendering a stale source row. It
listed `DSS.wasm supervisor (#102–106)` as future production work even though
the accepted architecture retired the former `dss-host` production sidecar in
favour of independent SLIDE/VOK authority.

The correction preserves completed DSS and Wasm evidence. It does not delete,
repeat or relabel that evidence as production SLIDE. This is a **reuse-first**
decision, not a prohibition on using old code: reuse or adapt every compatible
component, and rebuild only what cannot meet the current zero-trust boundary.
The binding component-by-component calls are in the
[`SLIDE/VOK reuse inventory`](slide-vok-reuse-inventory-2026-08-04.md).

## Reconciliation map

| Earlier work or label | Verified state | Current treatment | Must not be repeated as |
|---|---|---|---|
| DSS `.fungi` decision core | Shipped evidence | Preserve the V_DPM, trap, audit, allocation and deny-by-default semantic corpus | A new supervisor implementation |
| DSS deterministic build and Stage-A differential | Shipped evidence | Preserve 10/10 deterministic-build evidence and the 386-point decision differential/laws | Proof of native isolation or production SLIDE |
| Former `subprojects/dss-host` | Superseded as a production architecture | Reuse compatible parsing, fuel, reset, attestation and adapter mechanics after independent admission; its evidence also lives in the flat development-only oracle | An automatically trusted wholesale sidecar |
| Wasmtime fuel, reset, attestation and V_DPM checks | Retained oracle evidence | Keep the optional compatibility/differential oracle until its replacement gate passes | Runtime or memory authority |
| Historical `#102` embedder | Host choice retired, implementation assets reusable | Screen embedder and oracle routines against the target-neutral capability, memory and receipt contracts; adapt passing parts | An undifferentiated living roadmap task |
| Historical `#103` capability seam | Requirement retained, host choice retired | Reuse its deny-by-default capability semantics in the target-neutral SLIDE/VOK host contract | A second ambient Wasm host API |
| Historical `#104` V_DPM register | Decision semantics shipped | Reuse the existing `.fungi` K3/V_DPM corpus; independently re-admit it at the VOK boundary | A duplicate policy engine |
| Historical `#105` admission/audit work | Existing bounded admission evidence retained | Reuse the signed admission and typed receipt invariants; SLIDE must issue its own independently verified receipts | Another trust-by-Boolean admission layer |
| Historical `#106` kernel-bypass byte pipe | Retired host-specific design | Carry forward only the no-plaintext-sidecar, bounded-memory and typed-host-boundary requirements | Raw in-sandbox decryption through the old sidecar |
| Seven authoritative compiler stages | Shipped specification authority | Preserve their ledgers and differential shadows until terminal retirement | Proof that the compiler can already self-compile to `.slide` |
| Self-hosting stages 3–6 label | Ambiguous and stale | Rename the actual remainder to the SLIDE bootstrap fixpoint: reuse the proven compiler/emitter/admission assets for executable source-to-SLIDE self-compile, exact fixpoint, crypto FFI and bounded host path | Repeating completed stage flips |
| Current WAT/Wasm execution | Current compatibility/bootstrap path | Retain until the SLIDE replacement gates pass; afterwards keep only the admitted optional lane and oracle value | Silent fallback after failed SLIDE admission |

## Work that remains once duplicates are removed

1. General checked-Fungi bodies, loops and effects must lower to independently
   admitted executable SLIDE semantics.
2. VOK must validate the final object and retain final execution authority.
3. Production `.slide` packing, signing, loading, isolated execution and typed
   trap/receipt classification must be proven on supported platforms.
4. Authenticated durability, repository and host-boundary receipts must close.
5. Per-file package parity, flat dependency admission, consumer switch and
   deletion must close before TypeScript or compatibility paths retire.
6. The optional Wasm compatibility engine can be rebuilt narrowly in `.fungi`
   later, but it is not the production SLIDE runtime and does not recreate the
   former sidecar.

## Honesty boundaries

- The current DSS decision core proves deterministic decisions, not process
  isolation, single-cycle hardware enforcement or production authority.
- `tests/goals/goal-b-bitmask-gating.test.mjs` still contains explicitly named
  placeholder coverage. It grants no completion credit; its production
  requirement belongs to the SLIDE/VOK execution boundary.
- The Wasmtime oracle grants no memory, package, signing or release authority.
- Failed SLIDE admission never falls through to Wasm.
- Completed evidence is reused as a differential oracle; it is not recreated
  merely to make a renamed milestone look new. Compatible implementations may
  be reused directly or adapted after independent re-admission.

## Roadmap regression rule

`component-health.mjs --self-test` now refuses a tracking registry that brings
back the retired `DSS.wasm supervisor (#102–106)` production label, and requires
the completed DSS decision-core plus optional-oracle row to remain visible as a
shipped asset.

The source of the generated subway map is `scripts/component-health.mjs`.
Regenerate the map only through `scripts/gen-roadmap.mjs --write`.
