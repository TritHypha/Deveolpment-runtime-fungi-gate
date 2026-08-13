# Slices 273-297 accelerator and CPU conversion plan

## Goal

Account the remaining `galerina-target-ai-accelerator` surface and the first
eight `galerina-target-cpu` declarations without inventing `.fungi` authority.
Every decision is bound to an exact source digest, focused tests, current
package boundary and the available physical SLIDE/VOK evidence.

## Scope

| Slice | Exact scope |
|---:|---|
| 273 | `AiAcceleratorDiagnosticSeverity` |
| 274 | `AiAcceleratorDiagnostic` |
| 275 | `AiAcceleratorTopology` |
| 276 | `AiAcceleratorMemoryProfile` |
| 277 | `AiAcceleratorBackendProfile` |
| 278 | `AiAcceleratorCapability` |
| 279 | `AiAcceleratorModelProfile` |
| 280 | `AiAcceleratorTargetPreference` |
| 281 | `AiAcceleratorTargetSelection` |
| 282 | `AiAcceleratorPlan` |
| 283 | `AiAcceleratorReport` |
| 284 | `INTEL_GAUDI3_HL338_PROFILE` |
| 285 | `GENERIC_ONNX_NPU_PROFILE` |
| 286 | `selectAiAcceleratorTarget` |
| 287 | `createAiAcceleratorTargetReport` |
| 288 | `validateAiAcceleratorModel` |
| 289 | `isCapabilityCompatible` |
| 290 | `CpuArchitecture` |
| 291 | `CpuSimdFeature` |
| 292 | `CpuWorkloadClass` |
| 293 | `CpuThreadingPolicy` |
| 294 | `CpuTargetCapability` |
| 295 | `CpuTargetPlan` |
| 296 | `CpuTargetReport` |
| 297 | `CpuFeatureProbe` |

## Evidence protocol

1. Try the codebase-memory graph first. If its transport or build point cannot
   be proved, mark graph freshness `UNKNOWN` and use current Myco plus exact
   source/test reads as the bounded fallback.
2. Pin Git HEAD and SHA-256 for both source files. Record focused package test
   counts and search for exact package-owned Fungi, GIR, physical `.slide`,
   re-admission and VOK evidence.
3. Classify erased declarations as `NO_RUNTIME_BEHAVIOR`; never create an enum
   or record merely to replace TypeScript documentation.
4. For executable scopes, preserve JavaScript host semantics or explicitly
   narrow the public border first. Runtime acceptance of forged string unions,
   open records, getters, proxies, coercion, non-finite numbers or surplus keys
   cannot be credited to an erased TypeScript type.
5. Require closed inputs, typed failures, bounded work, exact physical records,
   differential vectors, SLIDE publication, independent re-admission and VOK
   before any executing TypeScript scope can be retired.
6. Review both private skills at every slice. Update them only for a reusable
   rule not already present; keep them private and unpushed.
7. At Slice 297, update the live register, TODO, roadmap and subway; run only
   individually registered owners and checks. Do not substitute the excluded
   aggregate lanes. Repository-wide closure remains `UNKNOWN`.

## Verification

- `galerina-target-ai-accelerator`: package typecheck/build/tests.
- `galerina-target-cpu`: package typecheck/build/tests.
- Every receipt: exact source identity, classification, blocker or absence of
  runtime behavior, threadability, hostile vectors, skill disposition and
  bounded-close statement.
- Slice-close audit, canonical counts, Golden evidence, roadmap drift, graph
  integrity and leak audits through their individual owners.
