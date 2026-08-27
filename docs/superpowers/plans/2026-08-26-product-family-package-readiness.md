# Product-family Package Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare Galerina for an extensible Galerina/Trametes/future-product family, migrate the TypeScript root safely, and stop at a verified boundary immediately before the first new native `.fungi` file.

**Architecture:** Introduce a closed product registry and product-neutral policy seam while `packages-galerina/` remains stable, then bind explicit product selection and product-bound artifact identities in one atomic gate. After negative controls and rollback gates pass, move the TypeScript root to `packages-ts/`, record locator-only native family contracts for `packages/fungi/` and `packages/gate/`, amend the governing pre-Fungi locators, and pause before creating those directories or any native source.

**Tech Stack:** Node.js 18+, TypeScript 5.5+, ESM, Node test runner, existing Galerina graph/index/audit tools, Myco, Hypha and Git Custody Audit.

**Spec:** `docs/superpowers/specs/2026-08-26-product-family-package-readiness-design.md`

## Global Constraints

- A Trit remains one width-independent value in `{−1, 0, +1}`.
- Executable physical profiles remain `{1}`; `64`, `32` and `256` refuse.
- Product identity, safety profile, build mode and physical profile are four independent closed axes.
- There is no product default, governance-off flag, runtime rescue or silent profile substitution.
- Galerina remains the only admitted product during this plan; Trametes stays `planned`.
- Gate synthesis remains laboratory, non-authorizing and outside the GIR/SLIDE/VOK route.
- Directory presence is never admission; this plan creates no `packages/`,
  `packages/fungi/` or `packages/gate/` directory.
- No new `.fungi` or `.gate` source is created by this plan.
- No new dependency is added.
- All implementation work uses a fresh isolated worktree from the live integrated design target.
- Each task commits only its listed paths after fresh focused checks.
- Publication names remain unchanged during the physical root migration.
- KB integration uses `main` only; no KB topic branch is permitted.

---

## File structure

### New focused source files

- `product-registry/product-profiles.source.v1.json` — human-reviewed closed product declarations.
- `product-registry/product-profiles.v1.schema.json` — closed JSON shape and enums.
- `product-registry/product-profiles.v1.json` — generated policy-digest-bound registry.
- `packages-galerina/galerina-core-compiler/src/product-profile.ts` — registry validation and selection.
- `packages-galerina/galerina-core-compiler/src/product-policy.ts` — product-neutral policy dispatch.
- `packages-galerina/galerina-core-compiler/src/product-artifact-identity.ts` — product/cache/artifact binding.
- `scripts/generate-product-profiles.mjs` — deterministic generated registry builder/checker.
- `scripts/audit-product-package-boundaries.mjs` — graph-owned product/lab authority check.

### Focused tests

- `packages-galerina/galerina-core-compiler/tests/product-profile.test.mjs`
- `packages-galerina/galerina-core-compiler/tests/product-policy.test.mjs`
- `packages-galerina/galerina-core-compiler/tests/product-artifact-identity.test.mjs`
- `scripts/tests/generate-product-profiles.test.mjs`
- `scripts/tests/audit-product-package-boundaries.test.mjs`

### Existing files changed by design

- `packages-galerina/galerina-core-compiler/src/index.ts` — exports the three new modules.
- `packages-galerina/galerina-core-compiler/src/cli.ts` — binds the Galerina product and routes policy through the seam.
- `packages-galerina/galerina-core-compiler/src/runtime.ts` — routes runtime admission through the seam.
- `packages-galerina/galerina-core-compiler/src/execution-graph.ts` — product-bound cache key.
- `packages-galerina/galerina-core-compiler/src/pure-flow-cache.ts` — product-bound cache key.
- `package.json` — registry scripts and later physical path updates.
- generated registry, package, docs, contract, code and graph indexes owned by their existing generators.

The physical `packages-galerina/` to `packages-ts/` move happens only in Task 6.

---

### Task 1: Closed product registry

**Files:**
- Create: `product-registry/product-profiles.source.v1.json`
- Create: `product-registry/product-profiles.source.v1.schema.json`
- Create: `product-registry/product-profiles.v1.json`
- Create: `product-registry/product-profiles.v1.schema.json`
- Create: `scripts/generate-product-profiles.mjs`
- Create: `scripts/tests/generate-product-profiles.test.mjs`
- Create: `packages-galerina/galerina-core-compiler/src/product-profile.ts`
- Create: `packages-galerina/galerina-core-compiler/tests/product-profile.test.mjs`
- Modify: `packages-galerina/galerina-core-compiler/src/index.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: the closed source registry and exact admitted-policy source bytes at
  `packages-galerina/galerina-core-compiler/src/governance-verifier.ts`.
- Produces: `ProductId`, `ProductSelection`, `AdmittedProductProfile`, `loadProductRegistry(bytes)`, `resolveProductProfile(registry, selection)` and deterministic `product-profiles.v1.json`.

- [x] **Step 1: Add RED registry fixtures**

Add a focused test with these exact neighbours:

```js
assert.equal(L.resolveProductProfile(registry, selection()).ok, true);
assert.equal(L.resolveProductProfile(registry, selection({ productId: "trametes" })).code, "PRODUCT_NOT_ADMITTED");
assert.equal(L.resolveProductProfile(registry, selection({ productId: "quantum-research" })).code, "PRODUCT_UNKNOWN");
assert.equal(L.resolveProductProfile(registry, selection({ physicalProfile: "64" })).code, "PHYSICAL_PROFILE_NOT_ADMITTED");
assert.equal(L.resolveProductProfile(registry, selection({ physicalProfile: "32" })).code, "PHYSICAL_PROFILE_NOT_ADMITTED");
assert.equal(L.resolveProductProfile(registry, selection({ physicalProfile: "256" })).code, "PHYSICAL_PROFILE_NOT_ADMITTED");
assert.throws(() => L.loadProductRegistry('{"schema":"product-profiles.v1","schemaVersion":1,"products":[],"extra":true}'), /REGISTRY_FIELDS/);

const generated = generateProductProfiles(sourceRegistryBytes, readExactPolicy);
const roundTrip = L.loadProductRegistry(generated);
const plannedBinding = JSON.stringify({
  domain: "product-policy-unavailable.v1",
  productId: "trametes",
  compatibilityState: "planned",
  policyId: "trametes-policy-unavailable",
});
assert.equal(
  roundTrip.products.find((row) => row.productId === "trametes").policyDigest,
  `sha256:${sha256Utf8(plannedBinding)}`,
);
assert.equal(L.resolveProductProfile(roundTrip, selection({ productId: "trametes" })).code, "PRODUCT_NOT_ADMITTED");
assert.throws(() => generateProductProfiles(plannedWithPolicyPath, readExactPolicy), /PLANNED_POLICY_PATH/);
assert.throws(() => generateProductProfiles(plannedWithAdmittedWidth, readExactPolicy), /PLANNED_ADMISSION/);

const sourceWithEscapedDuplicateKey = Buffer.from(
  sourceRegistryBytes.toString("utf8").replace(
    '"schema": "product-profiles.source.v1",',
    '"schema": "product-profiles.source.v1", "\\u0073chema": "product-profiles.source.v1",',
  ),
  "utf8",
);
const sourceSchemaRefusals = [
  sourceWithPolicyDigest,
  sourceWithWrongSchema,
  sourceWithUnknownField,
];
for (const sourceBytes of sourceSchemaRefusals) {
  let policyReads = 0;
  assert.throws(() => generateProductProfiles(sourceBytes, () => {
    policyReads += 1;
    return Buffer.from("forbidden policy read", "utf8");
  }), /SOURCE_SCHEMA_REFUSED/);
  assert.equal(policyReads, 0);
}

let duplicatePolicyReads = 0;
assert.throws(() => generateProductProfiles(sourceWithEscapedDuplicateKey, () => {
  duplicatePolicyReads += 1;
  return Buffer.from("forbidden policy read", "utf8");
}), /STRICT_JSON_DUPLICATE/);
assert.equal(duplicatePolicyReads, 0);
```

These controls use exact source bytes and prove that a generated-only field, a
substituted source-schema identity, any unknown source field and an
escape-equivalent duplicate key refuse before policy access. The duplicate
fixture must reach the existing decoded-key detector in
`scripts/lib/assurance-fabric/strict-json.mjs`; ordinary `JSON.parse` is not an
admitted substitute.

The duplicate fixture gives both decoded `schema` members the independently
valid value `product-profiles.source.v1` and requires only
`STRICT_JSON_DUPLICATE`. A controlled substitution of `JSON.parse` for
`parseStrictJsonBytes` therefore produces a source-schema-valid last-value
object and must fail the focused test rather than satisfying another refusal.

The CLI fixture builds an isolated minimal repository-shaped directory by
copying the exact generator and strict-JSON module bytes under test, then invokes
`node scripts/generate-product-profiles.mjs --write` twice for every invalid
source: once when the generated output is absent and once when it contains exact
sentinel bytes. Refusal must leave the first output absent, preserve the second
byte-for-byte. Every admitted row in the invalid CLI fixtures points to a
deliberately missing policy-read sentinel; the observed error must remain the
source-admission refusal rather than a policy-file error. The pure generator
fixtures above provide the exact zero policy-read count. The CLI test also
compares the copied script and strict-JSON module SHA-256 values to the owner
files before invocation, so it cannot exercise substitute code. A controlled
mutation that moves source admission below the first policy read and tentative
output effect must make the focused test fail.

- [x] **Step 2: Run the focused test and preserve RED**

Run:

```powershell
npm --prefix packages-galerina/galerina-core-compiler run build
node --test scripts/tests/generate-product-profiles.test.mjs packages-galerina/galerina-core-compiler/tests/product-profile.test.mjs
```

Expected: FAIL because the generator, `loadProductRegistry` and
`resolveProductProfile` do not yet exist.

- [x] **Step 3: Create the source registry**

Use this closed initial state:

```json
{
  "schema": "product-profiles.source.v1",
  "schemaVersion": 1,
  "products": [
    {
      "productId": "galerina",
      "productClass": "production",
      "governanceClass": "zero-trust",
      "compatibilityState": "admitted",
      "policyId": "galerina-governance-v1",
      "policyPath": "packages-galerina/galerina-core-compiler/src/governance-verifier.ts",
      "packageNamespaces": ["@galerina/"],
      "artifactNamespace": "galerina/v1",
      "admittedSafetyProfiles": ["strict", "high_integrity", "deterministic"],
      "admittedBuildModes": ["build-production", "build-deterministic", "build-wasm-standalone", "build-wasm-hybrid"],
      "admittedPhysicalProfiles": ["1"],
      "entrypointId": "galerina",
      "externalAuthorizerId": "vok"
    },
    {
      "productId": "trametes",
      "productClass": "production",
      "governanceClass": "admitted-closed-network",
      "compatibilityState": "planned",
      "policyId": "trametes-policy-unavailable",
      "policyPath": "",
      "packageNamespaces": [],
      "artifactNamespace": "trametes/planned/v1",
      "admittedSafetyProfiles": [],
      "admittedBuildModes": [],
      "admittedPhysicalProfiles": [],
      "entrypointId": "trametes-unavailable",
      "externalAuthorizerId": "vok"
    }
  ]
}
```

The source and generated schemas set `additionalProperties: false` at every
object and enumerate all closed values. The source schema requires
`schema: "product-profiles.source.v1"`, `policyPath`, and no
`policyDigest`. The generated schema requires
`schema: "product-profiles.v1"`, `policyDigest`, and no `policyPath`.
Empty policy path is valid only when state is `planned` and all admitted
arrays are empty.

- [x] **Step 4: Generate policy digests deterministically**

Implement `generate-product-profiles.mjs` so `--write` reads the exact source
bytes, parses them with duplicate-key rejection, and validates them against
`product-profiles.source.v1.schema.json` before copying, sorting, hashing,
deleting or adding any field. A source-schema failure returns
`SOURCE_SCHEMA_REFUSED`, produces no output and performs no policy read. Only
after that gate may the generator hash every admitted policy path with SHA-256,
replace `policyPath` with `policyDigest`, sort products by `productId`, write
one terminal LF, and refuse a missing or escaping path. For `planned`, `lab` or
`retired`, it requires an empty policy path and empty admitted arrays, then
hashes the exact domain-separated unavailable-policy record. `--check`
recomputes bytes and exits non-zero on drift without writing.

The key implementation shape is:

```js
import { parseStrictJsonBytes } from "./lib/assurance-fabric/strict-json.mjs";

const source = parseStrictJsonBytes(sourceBytes, {
  label: "product-registry/product-profiles.source.v1.json",
  maxBytes: MAX_SOURCE_BYTES,
});
validateAgainstClosedSchema(source, sourceSchema, "SOURCE_SCHEMA_REFUSED");
const rows = structuredClone(source.products);
const bindingBytes = row.compatibilityState === "admitted"
  ? readFileSync(resolve(repoRoot, row.policyPath))
  : Buffer.from(JSON.stringify({
      domain: "product-policy-unavailable.v1",
      productId: row.productId,
      compatibilityState: row.compatibilityState,
      policyId: row.policyId,
    }), "utf8");
row.policyDigest = `sha256:${createHash("sha256").update(bindingBytes).digest("hex")}`;
delete row.policyPath;
const output = `${JSON.stringify({ schema: "product-profiles.v1", schemaVersion: 1, products: rows }, null, 2)}\n`;
```

Validate the generated bytes against the generated schema after transformation,
load those exact bytes with `loadProductRegistry`, and require the Trametes
round trip to return `PRODUCT_NOT_ADMITTED` before any policy lookup. Preserve
the source-schema refusal tests as red-capability controls. The controlled
mutation moves both strict parsing and closed-schema validation after one policy
read and one tentative output write; the zero-read and absent/sentinel-output
assertions must fail even if the later validation still throws the expected
error.

- [x] **Step 5: Implement closed registry admission**

Define:

```ts
export type PhysicalProfile = "1" | "32" | "64" | "256";
export interface ProductSelection {
  readonly productId: string;
  readonly safetyProfile: string;
  readonly buildMode: string;
  readonly physicalProfile: PhysicalProfile;
}
export type ProductProfileResult =
  | { readonly ok: true; readonly profile: AdmittedProductProfile }
  | { readonly ok: false; readonly code: "PRODUCT_UNKNOWN" | "PRODUCT_NOT_ADMITTED" | "SAFETY_PROFILE_NOT_ADMITTED" | "BUILD_MODE_NOT_ADMITTED" | "PHYSICAL_PROFILE_NOT_ADMITTED" };
```

`resolveProductProfile` performs exact membership checks in that order and
returns frozen values. It never substitutes a product or profile.

- [x] **Step 6: Run GREEN and generator fixed-point checks**

Run:

```powershell
node scripts/generate-product-profiles.mjs --write
node scripts/generate-product-profiles.mjs --check
npm --prefix packages-galerina/galerina-core-compiler run build
node --test scripts/tests/generate-product-profiles.test.mjs packages-galerina/galerina-core-compiler/tests/product-profile.test.mjs
```

Expected: both generator modes and all focused tests PASS.

- [x] **Step 7: Commit Task 1**

Stage only the listed Task 1 paths and generated registry. Commit:

```text
feat: add closed product profile registry
```

---

### Task 2: Product-neutral policy seam

**Files:**
- Create: `packages-galerina/galerina-core-compiler/src/product-policy.ts`
- Create: `packages-galerina/galerina-core-compiler/tests/product-policy.test.mjs`
- Modify: `packages-galerina/galerina-core-compiler/src/cli.ts`
- Modify: `packages-galerina/galerina-core-compiler/src/runtime.ts`
- Modify: `packages-galerina/galerina-core-compiler/src/index.ts`

**Interfaces:**
- Consumes: `AdmittedProductProfile` from Task 1 and existing `verifyGovernance` inputs.
- Produces: `evaluateProductPolicy(profile, input): ProductPolicyResult` and `GALERINA_SELECTION`.

- [x] **Step 1: Add RED behavioural-equivalence and refusal tests**

Use one valid and one governance-denied `.fungi` fixture. Assert:

```js
assert.deepEqual(
  L.evaluateProductPolicy(galerinaProfile, policyInput).diagnostics,
  L.verifyGovernance(policyInput.ast, policyInput.flows, policyInput.effectResults, policyInput.deploymentProfile, policyInput.sourceFile).diagnostics,
);
assert.equal(L.evaluateProductPolicy(plannedTrametes, policyInput).code, "PRODUCT_POLICY_NOT_ADMITTED");
```

Add a source-wiring control that fails if `cli.ts` or `runtime.ts` contains a
direct `verifyGovernance(` call outside `product-policy.ts`.

- [x] **Step 2: Run RED**

Run the new focused test. Expected: missing export and direct-call control FAIL.

- [x] **Step 3: Implement the seam**

Define:

```ts
export interface ProductPolicyInput {
  readonly ast: AstNode;
  readonly flows: readonly FlowMeta[];
  readonly effectResults: readonly EffectCheckResult[];
  readonly deploymentProfile: DeploymentProfile;
  readonly sourceFile?: string;
}

export function evaluateProductPolicy(
  profile: AdmittedProductProfile,
  input: ProductPolicyInput,
): ProductPolicyResult {
  if (profile.productId !== "galerina" || profile.policyId !== "galerina-governance-v1") {
    return Object.freeze({ ok: false, code: "PRODUCT_POLICY_NOT_ADMITTED", diagnostics: [] });
  }
  const result = verifyGovernance(input.ast, input.flows, input.effectResults, input.deploymentProfile, input.sourceFile);
  return Object.freeze({ ok: true, diagnostics: result.diagnostics, evidence: result });
}
```

The optional `sourceFile` property must be conditionally spread to satisfy
`exactOptionalPropertyTypes`.

- [x] **Step 4: Route compiler and runtime through the seam**

Resolve the exact fixed Galerina selection once per admission:

```ts
const product = requireAdmittedProductProfile(GALERINA_SELECTION);
const policy = evaluateProductPolicy(product, {
  ast: parseResult.ast,
  flows: parseResult.flows,
  effectResults,
  deploymentProfile: profile,
  ...(filePath === undefined ? {} : { sourceFile: filePath }),
});
```

Preserve all existing diagnostic severities, signing boundaries and return
shapes. A refused policy adds a hard diagnostic and cannot reach manifest
generation.

- [x] **Step 5: Run focused and existing governance suites**

Run:

```powershell
npm --prefix packages-galerina/galerina-core-compiler run build
node --test packages-galerina/galerina-core-compiler/tests/product-policy.test.mjs packages-galerina/galerina-core-compiler/tests/governance/*.test.mjs
```

Expected: new tests PASS and existing governance behaviour remains unchanged.

- [x] **Step 6: Commit Task 2**

Commit only Task 2 paths:

```text
refactor: route governance through product policy
```

---

### Task 3: Product-bound artifact and cache identities — held for the atomic selection gate

**Files:**
- Create: `packages-galerina/galerina-core-compiler/src/product-artifact-identity.ts`
- Create: `packages-galerina/galerina-core-compiler/tests/product-artifact-identity.test.mjs`
- Modify: `packages-galerina/galerina-core-compiler/src/execution-graph.ts`
- Modify: `packages-galerina/galerina-core-compiler/src/pure-flow-cache.ts`
- Modify: `packages-galerina/galerina-core-compiler/src/interpreter.ts`
- Modify: `packages-galerina/galerina-core-compiler/src/index.ts`

**Interfaces:**
- Consumes: `AdmittedProductProfile`, four-axis selection and existing semantic digests.
- Produces: draft `ProductArtifactContext`,
  `canonicalProductArtifactIdentity`, `productArtifactKey`, product-bound
  execution and pure-flow cache keys.
- Admission rule: no public caller may construct or use this context until
  Task 4 supplies an explicit closed product selection. Tasks 3 and 4 are one
  atomic integration unit.

- [x] **Step 1: Add RED one-field-neighbour tests**

Build one baseline context and change each field independently:

```js
for (const [field, value] of [
  ["productId", "trametes"],
  ["governanceClass", "admitted-closed-network"],
  ["policyDigest", `sha256:${"1".repeat(64)}`],
  ["safetyProfile", "deterministic"],
  ["buildMode", "build-deterministic"],
  ["physicalProfile", "64"],
]) {
  assert.notEqual(L.productArtifactKey(base, digest), L.productArtifactKey({ ...base, [field]: value }, digest));
}
```

Also assert `computeGIRHash` remains identical for identical width-independent
GIR bytes; product identity wraps the semantic digest rather than changing it.

- [x] **Step 2: Run RED**

Expected: `productArtifactKey` is absent and current cache keys do not accept a
bound context.

- [x] **Step 3: Implement canonical identity**

Use exact ordered fields and hash the canonical UTF-8 record:

```ts
export interface ProductArtifactContext {
  readonly schemaVersion: 1;
  readonly artifactNamespace: string;
  readonly productId: string;
  readonly governanceClass: string;
  readonly policyDigest: string;
  readonly safetyProfile: string;
  readonly buildMode: string;
  readonly physicalProfile: PhysicalProfile;
}

export function productArtifactKey(context: ProductArtifactContext, contentDigest: string): string {
  const canonical = canonicalProductArtifactIdentity(context, contentDigest);
  return `product-artifact-v1:${createHash("sha256").update(canonical, "utf8").digest("hex")}`;
}
```

Reject unknown keys, invalid digests, missing fields and unsupported physical
profiles before hashing.

- [x] **Step 4: Bind both process-local caches**

Change signatures to:

```ts
executionGraphCacheKey(context: ProductArtifactContext, flowName: string, sourceHash: string): string
pureFlowCacheKey(context: ProductArtifactContext, flowName: string, args: ReadonlyMap<string, GalerinaValue>, sourceTag?: string): string
```

Update every graph-discovered caller. No legacy overload is retained because an
unbound cache call would reintroduce the ambiguity.

- [x] **Step 5: Run focused cache and determinism suites**

Run:

```powershell
npm --prefix packages-galerina/galerina-core-compiler run build
node --test packages-galerina/galerina-core-compiler/tests/product-artifact-identity.test.mjs packages-galerina/galerina-core-compiler/tests/bootstrap-determinism/canonical-hash.test.mjs packages-galerina/galerina-core-compiler/tests/bytecode-vm-followups.test.mjs
```

Expected: context neighbours produce different keys, semantic GIR hashes remain
stable, and historical cache-collision controls PASS.

- [x] **Step 6: Hold Task 3 for the atomic Task 3–4 commit**

Do not commit, publish or treat the Task 3 bytes as admissible alone. Proceed
directly to Task 4 with the same bounded custody. If interrupted, record HOLD;
do not leave a product-bound artifact API reachable without explicit product
selection.

---

### Task 4: Complete the atomic closed-selection and artifact-identity gate

**Files:**
- Create: `packages-galerina/galerina-core-compiler/src/product-cli.ts`
- Create: `packages-galerina/galerina-core-compiler/tests/product-cli.test.mjs`
- Modify: `packages-galerina/galerina-core-compiler/src/cli.ts`
- Modify: `packages-galerina/galerina-core-compiler/src/index.ts`
- Modify: `galerina.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: Task 1 registry, four-axis selection and the uncommitted Task 3
  identity work.
- Produces: `parseProductCliSelection(entrypointId, args)`, product-bound CLI
  receipts and the only admitted constructor path for product artifact/cache
  contexts.

- [x] **Step 1: Add RED CLI controls**

Assert:

```js
assert.deepEqual(L.parseProductCliSelection("galerina", []), { ok: true, productId: "galerina" });
assert.deepEqual(L.parseProductCliSelection("fungi", ["--product=galerina"]), { ok: true, productId: "galerina" });
assert.equal(L.parseProductCliSelection("fungi", []).code, "PRODUCT_REQUIRED");
assert.equal(L.parseProductCliSelection("fungi", ["--product=trametes"]).code, "PRODUCT_NOT_ADMITTED");
assert.equal(L.parseProductCliSelection("galerina", ["--product=trametes"]).code, "ENTRYPOINT_PRODUCT_MISMATCH");
assert.equal(L.parseProductCliSelection("galerina", ["--governance=off"]).code, "GOVERNANCE_OFF_FORBIDDEN");
```

- [x] **Step 2: Run RED**

Expected: the parser export is absent.

- [x] **Step 3: Implement the pure CLI parser**

Scan each argument once, reject duplicate `--product`, reject every
`--governance` spelling, and return a closed result. `galerina` binds the fixed
product. `fungi` requires an explicit admitted product. No environment or file
path participates.

- [x] **Step 4: Wire the fixed current entrypoint**

At CLI startup, resolve the product before file discovery or policy execution.
Remove `--product=` from downstream argument parsing only after it has been
validated. Add product identity to generated manifest/receipt envelopes without
changing semantic GIR bytes.

Keep Trametes refused; do not add a `trametes` binary in this task.

- [x] **Step 5: Run the combined selection, artifact and signing matrix**

Run:

```powershell
npm --prefix packages-galerina/galerina-core-compiler run build
node --test packages-galerina/galerina-core-compiler/tests/product-cli.test.mjs packages-galerina/galerina-core-compiler/tests/product-artifact-identity.test.mjs packages-galerina/galerina-core-compiler/tests/security-gate-coverage.test.mjs packages-galerina/galerina-core-compiler/tests/manifest*.test.mjs
```

Expected: all product controls and existing signing boundaries PASS. Add one
matrix proving that omitted product, Trametes, Gate family, wrong native root
and widths `64`, `32`, `256` cannot mint an artifact, enter a cache, issue a
receipt or reach VOK. The only product/width cell available to later admission
is explicit Galerina scalar `1`; it remains closed to native authoring in this
chapter.

- [x] **Step 6: Commit Tasks 3 and 4 atomically**

```text
feat: bind selection and artifacts to product identity
```

---

### Task 5: Product package-boundary assurance

**Files:**
- Create: `scripts/audit-product-package-boundaries.mjs`
- Create: `scripts/tests/audit-product-package-boundaries.test.mjs`
- Modify: `package.json`
- Modify: `docs/audit-map.json`

**Interfaces:**
- Consumes: generated package/code graph, product registry and product artifact namespaces.
- Produces: bounded JSON receipt with `PASS | HOLD | REFUSED`, exact build point, checked package count, checked edge count and closed finding codes.

- [x] **Step 1: Add RED hostile graph fixtures**

Use four minimal graphs:

```text
trametes -> galerina governance verifier              HOLD PRODUCT_BOUNDARY_001
gate-lab -> VOK lease issuer                          HOLD PRODUCT_BOUNDARY_002
research product -> admitted production artifact     HOLD PRODUCT_BOUNDARY_003
galerina -> shared trit semantics                     PASS
```

Also refuse zero packages, stale build point, unknown product, missing registry
digest, skipped files and truncated edge input.

- [x] **Step 2: Run RED**

Run the new test. Expected: missing tool failure.

- [x] **Step 3: Implement graph-owned evaluation**

The tool reads only the generated graph receipt and locator-only package nodes.
It does not rescan source bodies. It validates the exact Git HEAD, registry
digest and counts before evaluating directed edges. Inferred edges may create a
review finding but cannot create authority or a PASS absence claim.

- [x] **Step 4: Register the audit**

Add:

```json
"audit:product-boundaries": "node scripts/audit-product-package-boundaries.mjs --check",
"audit:product-boundaries:selftest": "node --test scripts/tests/audit-product-package-boundaries.test.mjs"
```

Record the new pre-Fungi gate in `docs/audit-map.json` with `0%` until its
immutable implementation review passes.

- [x] **Step 5: Run GREEN and red-capability mutation**

Run the self-test, the live audit and one controlled fixture mutation that
removes the Galerina/Trametes boundary check. The mutation must turn a hostile
fixture green and therefore make the test fail.

- [x] **Step 6: Commit Task 5**

```text
feat: add product package boundary audit
```

---

### Task 6: Controlled TypeScript root migration

**Files:**
- Move: `packages-galerina/` to `packages-ts/`
- Modify: every tracked configuration, script, document and generated locator that contains the old physical root.
- Modify: `package.json`
- Modify: package-root lock and package-topology generated outputs.

**Interfaces:**
- Consumes: Tasks 1-5 exact PASS receipts and Git Custody Audit plan.
- Produces: one mechanical rename commit with unchanged package publication names and zero authoritative `packages-galerina/` locators.

- [x] **Step 1: Generate the pre-move inventory without mutation**

Use the exact code graph, Myco, Hypha and Git Custody Audit to produce:

- all tracked paths below `packages-galerina/`;
- every code/config/document locator containing `packages-galerina/`;
- package dependency edges and publication names;
- generated outputs that must be regenerated rather than hand-edited;
- worktree/branch custody and the exact rollback command set.

Refuse if the four inventories disagree or any result lacks an exact build
point.

- [x] **Step 2: Run existing topology gates before movement**

```powershell
npm run audit:package-topology
npm run audit:package-root-lock
npm run audit:package-topology:selftest
npm run audit:package-root-lock:selftest
```

Expected: current baseline PASS. Preserve the receipts.

- [x] **Step 3: Perform one Git-aware move**

```powershell
git mv -- packages-galerina packages-ts
```

Do not rename package `name` fields. Update path dependencies, scripts, package
graph roots and documentation locators from the generated inventory only.

- [x] **Step 4: Regenerate owned outputs in dependency order**

Run the repository's canonical registry, package topology, diagnostic, docs,
contract, KB and code-index generators sequentially. Repeat deterministic
generators until the second check writes zero bytes. Do not run all estates in
parallel.

- [x] **Step 5: Prove zero authoritative old-root references**

The code graph, Myco and Hypha must each return zero live authoritative
references to `packages-galerina/`. Historical receipts may retain the old
locator when clearly marked with their immutable build point.

- [x] **Step 6: Run package builds and proportional suites sequentially**

Run Task 1-5 focused suites, core compiler build/tests, package topology/root
lock, import governance, code/document/contract registries and the phase-close
runner in its existing phased order.

- [x] **Step 7: Run rollback drill**

In a disposable detached copy of the candidate commit, reverse the Git move,
restore the pre-move generated identities and prove the baseline topology gates
return. Delete only the disposable clean copy after exact path verification.

- [x] **Step 8: Commit the mechanical move**

Commit only after zero old-root references and fixed-point indexes:

```text
refactor: move typescript packages to packages-ts
```

Task 6 closed at `1f06fc476d5646cca65e8dc30ea9bdeb406ac125`.
The external full graph is exact at 65,560 nodes and 167,278 edges with zero
skipped files. Myco indexed 9,280 files with zero over-size skips and found no
old-root reference in active scripts or root configuration. Its only
`packages-ts/` matches are 208 TypeScript-oracle provenance comments across
205 pre-existing `.fungi` files; the active stop forbids rewriting those
comments in this task. Hypha passes 58/58 self-tests and reports 420 advisory
candidate findings on the full compiler scan. The disposable reverse-move
drill restored `packages-galerina/`, removed `packages-ts/`, and passed both
topology suites after regenerating the old-root lock; a plain one-command
revert is not sufficient because later generated-evidence commits conflict.

---

### Task 7: Locator-only native-root contract and governing documents

**Files:**
- Modify: `docs/TODO.md`
- Modify: `docs/ROADMAP.md`
- Modify: `docs/audit-map.json`
- Modify: the single pre-Fungi plan after KB-main adjudication.
- Create on KB `main`: one allocated product-family RD that amends/supersedes the affected RD-0861 locators.

**Interfaces:**
- Consumes: migrated `packages-ts/`, design, plan, product registry and owner-required KB-main topology.
- Produces: one governing pre-Fungi locator set and explicit native family
  custody without materializing a native root.

- [x] **Step 1: Record the family custody contract without creating directories**

The TODO, roadmap, audit map and new RD state:

```text
packages/fungi: native .fungi source only; first admitted product is Galerina scalar-1.
packages/gate: native .gate laboratory source only; non-authorizing; not the GIR backend.
unknown family/product/profile: REFUSED.
```

Do not create `packages/`, `packages/fungi/`, `packages/gate/`, a native
README, a compatibility alias, a `.fungi` file or a `.gate` file. Directory
presence is not readiness and cannot be used for product discovery.

- [!] **Step 2: Verify KB main-only custody**

Require local and remote KB branches to be `main` only or produce a precise
HOLD. Do not allocate an RD on a topic branch. Preserve all unknown unique
commits until their integration status is proven.

Every known topic tip is now an ancestor of local KB `main` and has zero
remaining unique commits outside it. Remote publication and topic retirement
remain `HOLD`: the mandatory close card passes repository/index gates but
memory preflight reports stale volatile facts and case drift. Remote refs are
preserved until that red gate is resolved.

- [x] **Step 3: Allocate and write one new RD on KB main**

Use the canonical KB allocator to obtain the next available RD identity. The RD
records the product registry, `packages-ts/`, typed native root, width state,
Gate non-authority, migration receipts and the exact relationship to RD-0861.
It stores locators and decisions, not source bodies.

Private RD-0863 is committed on local KB `main`; its deterministic indexes are
at fixed point and the canonical query returns `PRIVATE / CURRENT / FRESH`.

- [x] **Step 4: Amend the pre-Fungi locator set**

Change the first scalar native locator to:

```text
packages/fungi/products/galerina/<scalar-oracle-package>/
```

The concrete package leaf is selected from the existing conversion queue by
the canonical Myco/Hypha audit map; no file is created by this task.

Selected unopened locator:

```text
packages/fungi/products/galerina/rd0858-unit4-scalar-oracle/
```

- [x] **Step 5: Update roadmap, task ledger and audit percentage**

Mark Tasks 1-7 with evidence locators. Leave first native authoring at `[ ]`
and product-boundary assurance below 100% until independent immutable review.
Record the command matrix from Task 4 as the single red-capable pre-Fungi
control and add a workspace-glob neighbour proving unadmitted roots are not
enumerated into Galerina.

The audit map now has four ordered nodes. Its workspace-root neighbour invokes
the canonical topology audit, whose graph-verified default root is exactly
`packages-ts`; unopened `packages/fungi` and `packages/gate` roots cannot be
enumerated into the admitted Galerina package set. Task 7 is locally complete,
so the chapter is 77% prepared, while the KB publish HOLD keeps closure at 66%.

- [x] **Step 6: Commit documentation in each repository**

Use separate path-scoped commits. KB commit occurs on `main`; Galerina commit
occurs on the feature branch.

KB RD and generated-index commits are separate on local `main`. This Galerina
documentation set is committed independently on the feature branch.

---

### Task 8: Pre-Fungi closure verification

**Files:**
- Modify only deterministic generated indexes/reports proven owned by their generators.
- Create: `docs/reports/product-family-package-readiness-closure-2026-08-26.md`

**Interfaces:**
- Consumes: Tasks 1-7 immutable commits.
- Produces: exact-head closure receipt with `PASS | HOLD`, no native source change and a reopenable first-Fungi queue locator.

- [x] **Step 1: Prove the `.fungi` and `.gate` boundary**

Compare the candidate against its base and assert zero new or modified `.fungi`
and `.gate` files. Existing self-hosted files are not reclassified as changes.

At base `c3360c143db4659ae18560322dc6b7a3cf3e122a`, normalizing only the
mechanical `packages-galerina/` -> `packages-ts/` path prefix yields 3,001
native `.fungi`/`.gate` blobs before and after, with zero additions, removals
or content-identity changes.

- [x] **Step 2: Run focused LF and physical-CRLF controls**

Run product registry, policy, artifact, CLI and package-boundary suites on true
LF and materialized physical CRLF copies. Refuse a converted copy that is only
an escaped newline string.

Exact implementation HEAD `0aa4bcc08a3a45d25e2393627161ce31a2805c01`
passes 30/30 on true LF and 30/30 on a detached copy where 19 relevant files
were materialized with physical CRLF and verified to contain zero lone LF.

- [x] **Step 3: Run the full estate sequentially**

Use the repository's phased runner. Do not launch all packages simultaneously.
Record exact package counts, pass/refusal counts, elapsed seconds and every
timeout. A timeout is not a PASS; rerun only its owning phase with the admitted
130-second ceiling when the suite contract permits it.

One bounded 100-package run executed sequentially with package and test-file
concurrency fixed at `1`, reached 95/100 and counted 3,152 tests in passing
packages in 476.755 seconds. Separate sequential replays restored benchmark
113/113 and KB-graph 31/31 after their explicit sibling roots were admitted.
The exact composite is 97/100 packages and 3,296 tests; it is not one
final-target full-estate run. The remaining three packages are the declared
native process-root, legacy signing and existing native-locator HOLDs.

- [x] **Step 4: Reach deterministic index fixed points**

Run documentation, registry, contract, code and diagnostic checks after their
generators. The docs index must pass after a second no-write check; the current
planning baseline's 287/296 drift cannot be normalized into closure.

Fixed points are reached: docs 299 indexes/2,009 documents, code index and
registry 987 entries, contracts 3,938 across 2,974 `.fungi` files, unit registry
157, KB index 1,956 and graph orchestration 9/9.

- [x] **Step 5: Refresh the exact full graph**

Build one full zero-skipped code graph at the candidate HEAD. Verify node/edge
actual equals expected, exact indexed HEAD matches Git, and new product symbols
plus package-boundary edges are discoverable.

`Galerina-product-family-readiness-closure-4f6a760c-full` is exact at tracked
fixed point `4f6a760c3`: 65,745/65,745 nodes, 167,866/167,866 edges and zero
skipped files. `parseJUnitCounts`, `admitFallbackPlatform`,
`cleanFallbackEnvironment` and `runFallbackTestPlan` are discoverable.

- [!] **Step 6: Obtain multi-vector external and independent reviews**

Send one source-minimal Grok/Claude challenge with at least three independent
vectors: authority/cache contamination, migration/rollback, and hostile future
product/width controls. Preserve prompt and reply bytes/digests. Then obtain a
separate immutable LF/CRLF code review. External advice cannot mint PASS.

Grok Expert completed four independent vectors and its exact prompt/reply bytes
and digests are preserved. Local adjudication rejected H1-H3 and partially
upheld H4 as an evidence gap already represented by the full-estate HOLD. The
fresh read-only Codex review stalled after a graph-service warning and emitted
no verdict. Independent-review status is therefore `EVIDENCE_INSUFFICIENT`.

The later pre-native closure replay supplied a new four-vector Grok Expert
challenge and exact byte/digest receipt. Local adjudication upheld its
toolchain-authentication concern. A separate immutable review of `32055d8`
returned `HOLD` C0/I2/M0; both implementation roots are closed. A scoped
immutable review of implementation `b3d4a41e3` returned PASS C0/I0/M0. The
first clean-target readback at graph/index fixed point `4f6a760c3` returned
`HOLD` C0/I1/M0 only because the closure documents retained older graph and
document counts. This documentation-only finding is repaired here; one fresh
immutable readback remains mandatory before this step can close.

- [x] **Step 7: Write the closure receipt**

The receipt states exact branch, HEAD, tree, changed paths, test/gate counts,
graph identity, docs fixed point, reviews, Git Custody result, KB main identity,
zero native-source delta and the first unopened scalar queue locator.

Receipt: `docs/reports/product-family-package-readiness-closure-2026-08-26.md`.
Verdict: `HOLD`.

- [x] **Step 8: Commit closure**

```text
docs: close product family package readiness
```

Closure receipt and review evidence committed at
`f837ebc0e4ba819db7445a3bde1f707be5d9f813`.

A clean-commit replay found stale project-graph content after closure-document
updates. The governed project graph was regenerated and its existing strict
full-output check retained. A proposed content-only checker was rejected because
it would weaken the existing time-of-check provenance guard. The product audit
then passed over 100 packages and 11,087 edges.

---

### Task 9: Integrate and pause before native source

**Files:**
- No new source files.

**Interfaces:**
- Consumes: clean immutable Task 8 PASS and live Git Custody Audit.
- Produces: fast-forward integration into the active product branch and a clean planning-branch retirement receipt.

- [ ] **Step 1: Recheck live target custody**

Verify the target remains `codex/rd-0858-unit4-process-root` at the expected
ancestor, clean and staged-empty. If it advanced, recompute intersections and
rerun affected evidence rather than rebasing silently.

- [ ] **Step 2: Require the Git Custody plan**

The only acceptable recommendation is:

```text
source: codex/product-family-package-readiness
target: codex/rd-0858-unit4-process-root
relation: TARGET_ANCESTOR_OF_SOURCE
action: FAST_FORWARD
```

Also require a successful exact fetch receipt or equivalent fresh remote
evidence before integration. `FETCH_FRESHNESS_UNKNOWN` is acceptable for
local planning but refuses Step 3.

- [ ] **Step 3: Fast-forward the active product branch**

Perform the exact fast-forward, verify target HEAD/tree, rerun quick closure
checks and refresh any branch-bound registry view. Do not merge directly to
`main`; later product-branch consolidation owns that transition.

- [ ] **Step 4: Retire the planning worktree safely**

Prove the source commit is an ancestor of the integrated target, the worktree
is clean, and all receipts are reachable. Remove the worktree and delete the
local planning branch. Delete no remote branch without separate publication
evidence.

- [ ] **Step 5: Emit the hard pause**

Report:

```text
PRE-FUNGI READY
Next unopened work: first Galerina scalar-1 native package locator
Native source changed: 0 files
Owner decision required before .fungi authoring: YES
```

Do not open, create or edit the first `.fungi` file in this plan.

---

## Self-review record

- Spec coverage: package taxonomy, registry, four axes, policy seam, artifact
  identity, widths, Gate custody, migration, benchmark evidence, Git integration
  and hard pre-Fungi pause each map to a task.
- Placeholder scan: no unspecified implementation step remains; the future
  scalar package leaf is deterministically selected from the existing queue and
  deliberately remains unopened.
- Type consistency: `ProductSelection`, `AdmittedProductProfile`,
  `ProductArtifactContext`, `ProductPolicyInput` and `PhysicalProfile` are
  introduced once and consumed by later tasks under the same names.
- Scope check: although the design spans multiple seams, the tasks form one
  dependent product-readiness chain and satisfy the owner's single-plan
  requirement. Trametes implementation, wider widths and Gate synthesis remain
  separate later chapters.
