# RD-0873 selective conversion role inventory

Date: 2026-09-12
Reviewed build identity: `main` HEAD `19195609b3fcf72c835eca7c5ebb48e401870144`
Reviewed tree: `a2f29d30a38d7e9ab98d46a58c39358e956b8a4b`
Status: **ROLE_INVENTORY_NON_AUTHORING**

This is the current routing map for the TypeScript package tree. It separates
product/runtime material that may be considered for Fungi from compiler and
bootstrap code, development and assurance tooling, retained TypeScript
shadows, and host/native boundaries. It does not create a conversion queue,
admit a symbol, switch a consumer, retire TypeScript, or grant SLIDE/VOK
authority.

## Method and limits

The inventory used the 100 package manifests under `packages-ts/`, their
descriptions, entry points and declared scripts, the existing selective-
conversion policy, and a bounded check of native/VOK paths. Root scripts,
`.github/workflows/`, tests, examples and generated/build surfaces were
classified by role; their bodies were not treated as product candidates. No
conversion queue was read and no PROJECT corpus assurance was rerun.

Package labels are routing defaults. A package marked **MIXED** must be split
at file or symbol scope before any authoring decision. Every TypeScript source
remains a retained differential shadow, including packages in the Fungi
candidate group.

## Package routing map

| Role | Count | Default disposition |
|---|---:|---|
| Product/runtime Fungi candidates | 20 | Consider pure contracts, validation, policy and deterministic runtime logic at symbol scope; keep the TypeScript shadow. |
| Compiler/bootstrap retained TypeScript | 11 | Keep compiler, CLI, target lowering and WASM bootstrap in TypeScript/its existing host implementation. |
| Development/build/test/CI retained TypeScript | 20 | Keep orchestration, graph/index/audit/report, benchmark and documentation tooling in JS/TS. |
| Mixed product/runtime and host boundary | 14 | Split by symbol/path; pure policy may be a candidate, while transport, effects, adapters and authority stay with their host owner. |
| Host, extension, research and compatibility retained | 35 | Retain TypeScript or the owning adapter/runtime; do not translate merely because a package exposes contracts. |
| **Total** | **100** | Exact package-manifest coverage; no package is unclassified. |

### Product/runtime Fungi candidates (20)

`@galerina/ai`, `@galerina/ai-agent`, `@galerina/ai-neural`,
`@galerina/core-compute`, `@galerina/core-config`, `@galerina/core-economics`,
`@galerina/core-logic`, `@galerina/core-reports`, `@galerina/core-security`,
`@galerina/core-tasks`, `@galerina/core-vector`, `@galerina/data`,
`@galerina/data-json`, `@galerina/data-model`, `@galerina/data-response`,
`@galerina/data-reports`, `@galerina/inference-bridge-contract`,
`@galerina/substrate-math`, `@galerina/tower-citizen`, and
`@galerina/tri-regex`.

These are candidates because their documented centre is deterministic data,
validation, policy, report shape, bounded pattern matching, or governed
runtime logic. A candidate still needs a named file/symbol admission and
focused parity evidence; the package label is not whole-package approval.

### Compiler/bootstrap retained TypeScript (11)

`@galerina/core`, `@galerina/core-cli`, `@galerina/core-compiler`,
`@galerina/core-runtime-wasm`, `@galerina/target-ai-accelerator`,
`@galerina/target-cpu`, `@galerina/target-gpu`, `@galerina/target-js`,
`@galerina/target-native`, `@galerina/target-photonic`, and
`@galerina/target-wasm`.

These packages define or select the compiler, checker, lowering, target and
bootstrap machinery. They are retained as the source of translation and
verification rather than being translated as product runtime by default.

### Development, build, test and CI retained TypeScript (20)

`@galerina/devtools-context`, `@galerina/devtools-flowgraph`,
`@galerina/devtools-fungi-scan`, `@galerina/devtools-graph-algorithms`,
`@galerina/devtools-graph-project`, `@galerina/devtools-hypha`,
`@galerina/devtools-impact`, `@galerina/devtools-intelligence`,
`@galerina/devtools-kb-graph`, `@galerina/devtools-naming`,
`@galerina/devtools-package-graph`, `@galerina/devtools-pci`,
`@galerina/devtools-project-graph`, `@galerina/devtools-provenance`,
`@galerina/devtools-security`, `@galerina/docs`, `@galerina/registry`,
`@galerina/test`, `@galerina/tools-benchmark`, and `@galerina/tools-myco`.

The same retained role applies to root `scripts/*.mjs`/`*.cjs`,
`.github/workflows/*.yml`, `tests/`, `examples/`, report/index generators and
build recipes. These files can enforce Fungi safety and produce evidence, but
they are not product runtime conversion targets.

### Mixed product/runtime and host boundary (14)

`@galerina/ai-lowbit`, `@galerina/auth`, `@galerina/core-network`,
`@galerina/core-photonic`, `@galerina/core-runtime`,
`@galerina/core-sentinel-egress`, `@galerina/core-sentinel-io`,
`@galerina/core-sentinel-memory`, `@galerina/core-sentinel-power`,
`@galerina/core-sentinel-state`, `@galerina/core-sentinel-time`,
`@galerina/framework-app-kernel`, `@galerina/governance-telemetry`, and
`@galerina/observability`.

Pure records and closed policy/classification helpers may be considered at
symbol scope. Network, time, memory, process, telemetry, route, capability,
crypto and authority effects remain at their host boundary. In
`core-runtime` and `framework-app-kernel`, the TypeScript-facing logic and
the native authority seams are deliberately separate.

### Host, extension, research and compatibility retained (35)

`@galerina/api-protocol-rest`, `@galerina/ai-neuromorphic`,
`@galerina/cpu-kernels`, `@galerina/data-archive`, `@galerina/data-database`,
`@galerina/data-db`, `@galerina/data-html`, `@galerina/data-pipeline`,
`@galerina/data-query`, `@galerina/data-search`, `@galerina/db-firestore`,
`@galerina/db-mysql`, `@galerina/db-opensearch`, `@galerina/db-postgres`,
`@galerina/db-sqlite`, `@galerina/devtools-benchmarks`,
`@galerina/devtools-wasmtime-oracle`, `@galerina/ext-bridge-bitnet`,
`@galerina/ext-bridge-cpp`, `@galerina/ext-photonic-emulator`,
`@galerina/ext-proof-snarkjs`, `@galerina/ext-secrets-spore`,
`@galerina/ext-secrets-vault`, `@galerina/ext-spore`,
`@galerina/ext-tritsocket`, `@galerina/framework-api-server`,
`@galerina/framework-example-app`, `@galerina/hardware-tier`,
`@galerina/tri-pipe`, `@galerina/web`, `@galerina/web-components`,
`@galerina/web-events`, `@galerina/web-render`, `@galerina/web-router`, and
`@galerina/web-state`.

These packages are adapters, stores, transports, browser surfaces, external
providers, native-facing contracts, examples or research/compatibility
material. A pure helper can be reclassified only with a named symbol scope;
the package default remains retained.

## Native, Rust and VOK boundaries

The following paths remain with their native/host owners and are never
converted by a package-level Fungi wave:

| Boundary | Observed material | Disposition |
|---|---|---|
| `packages-ts/galerina-core-runtime/native/vok-authority/` | 7 Rust files | Retain VOK authority; Fungi may call only through the documented boundary. |
| `packages-ts/galerina-framework-app-kernel/native/registry-durability/` | 19 Rust files | Retain native registry durability and its authority boundary. |
| `packages-ts/galerina-devtools-benchmarks/` | 21 Rust and 7 C++ files | Retain benchmark harness/native fixtures as assurance tooling. |
| `packages-ts/galerina-devtools-wasmtime-oracle/` | 55 Rust, 2 C, 4 headers and 32 WASM fixtures | Retain oracle and fixtures; do not treat them as product Fungi. |
| `scripts/native/requirement-launcher/` | 4 Rust files | Retain host process launcher. |
| `scripts/native/process-warden/` | 1 Rust file | Retain host process warden. |
| `scripts/native/process-tree-observer/` | 4 Rust files | Retain host process observation. |

The presence of a Rust, C/C++, WASM, browser, database, process or external
service boundary is a reclassification trigger for the surrounding path. It
does not make the adjacent pure TypeScript helper unsafe, but it prevents a
package-wide translation claim.

## Admission and reclassification rules

1. Use this map only to choose the next bounded investigation. A subsequent
   admission must name the exact source file, symbols, existing Fungi twin (if
   any), profile and per-wave limits.
2. Keep TypeScript shadows and differential tests. A Fungi twin is an artifact
   for comparison until a separately authorized consumer switch is recorded.
3. Keep compiler, dev/build/test/CI and documentation code in JS/TS unless a
   later decision identifies a concrete product-runtime reason to move one
   symbol. Tooling must continue to enforce the zero-trust build.
4. Keep native/Rust/VOK, browser, database, process, network, secret and
   external-service code with its owner. Fungi can use a typed, receipt-bound
   boundary; it cannot absorb the authority implementation.
5. Reclassify a package when a new source-of-truth or consumer appears, a
   symbol crosses an effect boundary, a retained shadow is retired, or an
   independent review supplies fresh exact-head evidence.

This inventory closes the role-mapping step only. It leaves authoring,
admission, queue promotion, consumer switching, corpus assurance and
production closure to their existing gates.
