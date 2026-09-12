# Selective conversion role reconciliation

Date: 2026-09-12
Repository: Galerina
Source-tree evidence: `main` commit `82447afa3d3472a778951fc8ac34c5faca13d35d`

This is a routing record for the next translation waves. It separates the
language of a file from the role it performs. It does not authorize source
creation, a consumer switch, TypeScript retirement, or release authority.

## Evidence used

- The earlier full code graph receipt remains historical evidence for its
  recorded source tree. A later navigation refresh was run at the source-tree
  commit above and reports 77,635 nodes and 202,823 edges. The graph remains
  navigation-only: its generated/dependency exclusions and truncated exclusion
  list do not prove Fungi coverage or corpus assurance.
- Package manifests were enumerated from `packages-ts/*/package.json`, then
  grouped by their declared entrypoint, scripts and known host boundary. A
  package script is a routing signal, not proof that every file in that package
  has the same role.
- Existing source dossiers remain non-authorizing and may be bound to older
  commits. They are locators for package boundaries and existing twins, not
  current-head admission evidence.

## Current symbol graph snapshot

The exact-head navigation index at `878e4c69a` resolves all seven scoped
symbols. The local in/out counts below are routing evidence only; they do not
prove deployment, external consumers or Fungi admission.

| Symbol | Package role | Local in/out | Observed local links |
| --- | --- | ---: | --- |
| `isEnvironmentMode` | core configuration runtime | 2/3 | `resolveEnvironmentMode`, package contract test |
| `isOmniUncertain` | core logic runtime; mutable profile hold | 2/3 | `omniToDecision`, package contract test |
| `isTerminalScope` | core runtime | 1/2 | `advanceStructuredAwait` |
| `isTaskEffect` | core task runtime | 0/2 | no in-repo caller resolved |
| `isResponseSafeClassification` | data-model runtime | 2/2 | `listResponseSafeFields`, package contract test |
| `isBuiltin` | development-context tooling; physical-profile hold | 1/2 | `walk`, `has` |
| `validateTransition` | project-graph tooling; two-input physical hold | 3/4 | `advanceState`, two package tests, `get`, `has` |

The index reports 77,679 nodes and 202,866 edges with a truncated exclusion
list. It remains a navigation aid and is not a corpus or admission proof.

## Working role map

### Product/runtime logic — primary Fungi candidates

These are the first places to look for behavior that belongs in the native
product tree when a bounded symbol/file admission exists:

- AI-agent contract and report behavior (`galerina-ai-agent`), including the
  existing candidates under `packages/fungi/products/galerina/rd0873-ai-agent/`
  and `rd0873-ai-agent-report/`.
- Core configuration, runtime, tasks, data-model and vector decisions, with
  existing candidates under `packages/fungi/products/galerina/rd0873-core-vector/`
  and the package-owned self-hosted assets retained inside their package.
- Pure validation, policy, classification, ordering and typed report projection
  where the behavior can be expressed with inert typed values and a bounded
  host ABI.

The retained TypeScript implementation remains the differential/bootstrap
oracle until host marshalling, physical SLIDE/VOK evidence and admission are
separately complete. Existing Fungi candidates are not production consumers.

### Compiler and bootstrap — retain the TypeScript shadow

`galerina-core-compiler`, the public `galerina-core` examples/compiler helpers,
the target packages, and the WASM/runtime bridge contain compiler, emitter,
parser, bootstrap and host-adapter responsibilities. Their TypeScript is needed
to build and differentially check Fungi. A decision core inside one of these
packages may be considered for a separate Fungi twin; the compiler pipeline,
bootstrap wrappers and host ABI stay retained until their own evidence closes.

### Development and assurance tooling — retain JavaScript/TypeScript by role

The `galerina-devtools-*` packages, `galerina-tools-*`, benchmark runners,
graph/index generators, audit scripts, test harnesses and documentation tools
are development surfaces. Keeping them in JavaScript/TypeScript is the default
because they orchestrate builds, inspect artifacts or provide measurement rather
than execute as the product runtime. They still require their own zero-trust
checks, bounded execution and provenance controls.

### Native and host boundaries — retain the host implementation

Bridge, hardware, database, filesystem, process, network, browser and external
service packages (`ext-*`, `hardware-tier`, database/data adapters, web/API
packages and similar surfaces) own effects or foreign representations. Translate
small pure policy/decision kernels only when the host marshalling contract and
physical SLIDE/VOK profile are explicit. Do not replace the adapter merely
because a decision inside it has a Fungi twin.

### Tests, examples and compatibility shadows — retain and use as evidence

Tests, examples, TypeScript declarations, compatibility adapters and benchmark
drivers remain supporting evidence. They may exercise a candidate and expose a
semantic gap; they do not become runtime conversion targets solely because they
are adjacent to a target source file.

## Wave routing rules

1. Start from a current package manifest and exact source symbol, not a filename
   count or a stale queue row.
2. Split mixed files by role. A runtime function can be a candidate while its
   parser, adapter, test and build wrapper remain retained.
3. Require a fixed non-empty manifest, one symbol/file scope, bounded input and
   output limits, and a resumable receipt before authoring.
4. Run focused interpreter/WASM differential checks for each admitted item, then
   close the package with a broader check. Do not run a full 2,722-file corpus
   check after each translation.
5. Keep mutable objects, aliases, callbacks, accessors/proxies, sparse arrays,
   Map/Set behavior, numeric coercion and malformed-object handling on HOLD until
   their host profile is explicit.

## Current decision

The role split narrows the future work but does not change the current gate:
`CANDIDATE: 0`, Waves 03–04 HOLD, and the current bulk gate remains
`HOLD_NON_AUTHORIZING`. The next source wave still needs a fresh exact-head
owner admission naming its symbols/files and limits. Until then, continue with
read-only proof, package-role reconciliation and focused repairs that do not
author or switch consumers.
