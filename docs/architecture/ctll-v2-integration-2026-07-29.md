# CTLL v2 and Galerina Integration Architecture

**Date:** 2026-07-29
**Status:** Proposed architecture; implementation has not started
**Project boundary:** CTLL is an independent execution platform. Galerina is its
first planned language frontend, not a required CTLL runtime dependency.
**Live status and work order:**
`ctll-v2-status-and-implementation-plan-2026-07-29.md`

## Decision

Galerina may target Compiled Tri Low Level (CTLL) through a versioned frontend
adapter once both projects meet their independent conformance gates. The current
Node-hosted and WebAssembly paths remain the factual implemented paths until
CTLL passes those gates.

This record does not rename Galerina, turn Galerina into a systems language, or
make CTLL part of Galerina Core.

## Dependency direction

```text
.fungi source
    |
    v
Galerina checks and governance proofs
    |
    v
detached executable GIR + memory/failure/effect facts
    |
    v
Galerina CTLL frontend adapter
    |
    v
CTLL semantic archive -> verified action DAG -> native artifact
```

Other languages must be able to implement the public CTLL frontend contract
without importing Galerina or translating through Galerina GIR.

## Non-negotiable integration gates

1. **Kleene K3 is semantic, not hardware-dependent.** CTLL carries
   `REJECT (-1)`, `UNKNOWN (0)`, and `ALLOW (+1)` on ordinary binary silicon.
   Every authority-bearing collapse is explicit and `UNKNOWN` cannot become
   `ALLOW` by omission, cache state, prediction, timeout, or fallback.
2. **Memory safety is a verified execution profile.** A `.ctll` container, a
   memory-safe source-language label, or a successful compile is not proof of
   native memory safety. Admission verifies the selected CTLL memory profile,
   its proof/guard receipts, and the final-artifact binding.
3. **Fail-close has an explicit exit.** Every denied or unresolved admission,
   driver, capability, memory, cache, signature, or policy decision reaches a
   typed terminal outcome. No implicit continuation is allowed.
4. **The cache is never authority.** The deterministic action graph and
   content-addressed cache may reuse outputs only when all semantic, toolchain,
   target, policy, trust-root, memory-profile, and dependency inputs match.
5. **Learned components propose only.** A learned hardware recogniser or graph
   scheduler may rank candidate plans. A deterministic verifier admits or
   rejects them; lack of a valid plan is a closed failure.
6. **Driver presence is not usability.** Hardware is usable only after an
   admitted driver is installed, loaded, rebound where required, re-observed,
   probed, and granted a bounded lease.
7. **No ambient native authority.** Native payloads remain capability-bounded,
   isolated, measured, revocable, and auditable even when their memory profile
   is verified.

## Galerina work that must be rebuilt or completed

### Detached executable GIR

The CTLL adapter cannot consume a summary-only GIR. GIR must carry complete
executable bodies and explicit:

- value and control-flow semantics;
- Kleene K3 operations and collapse sites;
- ownership, lifetime, allocation, bounds, and cleanup facts;
- effects, capabilities, trust transitions, and failure exits;
- source maps and stable identities;
- deterministic canonical serialization.

No backend may recover missing semantics from the AST after the detached-GIR
boundary.

### Memory contract

Galerina's current value-semantics, tree-walker, WebAssembly linear-memory, and
static-pool safety claims are scoped to those paths. They do not automatically
transfer to CTLL native output.

The first Galerina CTLL adapter must target the strict
`ctll.memory.safe-value.v1` profile. It must reject shared mutable aliases, raw
pointers, unchecked indexing, unbounded pointer arithmetic, unmatched
allocation/free, use after invalidation, and cleanup paths that are not
deterministically represented. Any unsupported construct is a compile-time
rejection, not an implicit unsafe lowering.

### Public frontend receipt

The adapter must emit a frontend receipt containing at least:

- frontend identity and version;
- source-language edition;
- semantic archive digest;
- memory, effect, failure, and capability plan digests;
- diagnostic and source-map digests;
- determinism declaration;
- conformance-suite result.

Galerina diagnostic codes remain `FUNGI-*`/`GALERINA-*`. CTLL owns `TLL-*` and
`CTLL-*`; the namespaces must not be reused across the project boundary.

## Existing components

| Component | CTLL v2 role |
|---|---|
| Tower Citizen | Bounded identity, workload, and authority lease at admission/runtime boundaries |
| Tri-Pipe | Produces a typed candidate execution route and transports artifacts, evidence, events, and terminal outcomes; it does not admit its own proposal |
| Tri-Fuse | Backend-neutral K3 obligation discharge: prove ALLOW/DENY or retain a residual runtime gate; it grants no deployment/runtime authority |
| WAT emitters | Retained for the current WebAssembly target and differential oracle; not the CTLL-native core |
| Machine Profile Bridge | Source of candidate observations only; CTLL admission independently verifies target facts |

Any later action-node fusion remains a separate proof-preserving build-graph
optimization. It must not cross trust boundaries, side effects, failure exits,
memory-profile boundaries, K3 collapse points, audit obligations, or
nondeterministic operations.

## Linux-first driver path

The planned `ctll-driver` command is unprivileged for observe, resolve, explain,
fetch, verify, and plan operations. Installation is performed only by a small
separate privileged helper consuming a signed, typed, bounded plan.

The first implementation should support Linux distro-native signed package
flows. It must not download arbitrary kernel modules or grant a compiler
general root access. Unsupported distributions, missing repository trust,
Secure Boot conflicts, version drift, and probe failures are typed
present-but-unusable outcomes.

## Implementation language and bootstrap

New Galerina-side implementation for this work is written in `.fungi`.
`.gate` work is excluded from this architecture phase. If the current bootstrap
toolchain cannot execute a required `.fungi` stage, the host shim must be
minimal, separately identified, capability-bounded, reproducibly built, and
scheduled for replacement. The owner must approve the bootstrap boundary before
implementation.

## Replacement rule

CTLL becomes an eligible production target only after:

- the independent CTLL frontend conformance suite passes for a non-Galerina
  fixture frontend;
- the Galerina frontend passes the same suite;
- memory-profile negative tests fail closed before native execution;
- post-optimisation and final-artifact verification bind to admission evidence;
- deterministic clean and cached builds produce equivalent artifacts;
- the current WebAssembly path remains available as a differential and
  separately admitted alternative until an explicit retirement decision; it
  is never a silent fallback inside a failed native admission.

## Planning sources

- `../../../triLowLevel-v2/00-CHARTER.md`
- `../../../triLowLevel-v2/10-MEMORY-SAFETY-PROFILES.md`
- `../../../triLowLevel-v2/11-DETERMINISTIC-AOT-GRAPH.md`
- `../../../triLowLevel-v2/12-LINUX-DRIVER-CLI.md`
- `../../../triLowLevel-v2/13-INDEPENDENT-PLATFORM.md`
- `../../../triLowLevel-v2/14-IMPLEMENTATION-BLUEPRINT.md`
- `../../../triLowLevel-v2/15-EXECUTABLE-GIR-V1.md`
- `../../../triLowLevel-v2/16-GALERINA-FRONTEND-RECEIPT.md`
- `../../../triLowLevel-v2/17-FIRST-VERTICAL-SLICE.md`
- `../../../triLowLevel-v2/QUESTIONS-FOR-OWNER.md`
