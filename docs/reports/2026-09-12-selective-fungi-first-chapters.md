# Selective Fungi conversion: first chapters

This scoped inventory applies the [selective conversion policy](../plans/2026-09-11-selective-fungi-conversion-scope.md).
It records role decisions and repairs, not production admission or a replacement
for the governed conversion queue.

| Owner and symbol scope | Role and disposition | Work remaining |
| --- | --- | --- |
| AI-agent: `validateAgentLimits`, `validateAgentToolPermissions`, `validateAgentDefinition`, `validateAgentTaskGroupPlan` | Runtime validation; convert and retain TS differential shadows. | Existing candidates. Limits and definition now have focused WASM checks; complete other behavior/border obligations before chapter closure. |
| AI-agent: `applyAgentMergePolicy`, `createAgentReport` | Runtime policy/report construction; convert decision logic. | Manual core implementation, exact order, defaults, malformed inputs and returned aliases. Account for any retained compatibility adapter separately. |
| Core-vector: `validateVectorType`, `validateMatrixType`, `validateTensorType`, `validateVectorOperation`, `validateTensorOperation` | Runtime shape/operation validation; convert. | Manual implementation with numeric and sparse-input compatibility. Do not add checks that TS does not perform. |
| Core-vector: `defineVectorType`, `createVectorReport` | Runtime construction/reporting; convert decision logic. | Exception messages, returned aliases and diagnostic order. |
| Both packages: interfaces and generated `.d.ts` | Declaration surface; retain or generate from its owner. | Not executable translations. |
| Both packages: `tests/*.test.mjs` and build/test orchestration | Development verification/build tooling; retain JS/TS. | Keep checks and output integrity; no claim that release packaging excludes these files. |

The six AI-agent and seven core-vector exports remain in the runtime target.
This covers two chapter entrypoints, not all 1,605 inventory rows. No new global
conversion percentage or denominator is claimed; the governed queue is unchanged.
Wave 02's other package roles remain to be reconciled. Wave 04 supplies profile
findings rather than a separate translated package.

## Owner evidence

Both private Node ESM manifests expose `dist/index.js`; their package tests
exercise that built surface. Their TypeScript configurations compile `src` and
emit declarations. This establishes workspace library surfaces, not publication.
`docs/ARCHITECTURE.md` and `docs/REQUIREMENTS.md` assign supervised-agent contracts,
policies and reports to AI-agent, and vector/matrix/tensor contracts for neural
and compute workloads to core-vector. Reporting alone does not make either
package developer-only.

Live AI-agent source composes validators in `validateAgentDefinition` and calls
its merge policy from `createAgentReport`. Live vector source composes validators
in operation/report helpers. A Sol worker independently assessed vector roles;
the parent checked the cited entrypoint, manifests and architecture/requirements.
The runtime classification is upheld. The graph was stale and associated with
another checkout: it supplied navigation only. A bounded vector caller search
found the entrypoint and its package test; absence of deployed/external consumers
is not proved. Those delivery profiles remain unresolved.

## Nested-field and optional-limit repair

The WAT emitter inferred nested record types but only lowered fields on identifier
receivers. `definition.limits.timeoutMs` therefore produced an unresolved-member
trap. Lowering now follows the declared type/layout at every step and evaluates
the receiver once. Unknown fields/missing bases still trap. Nested Float64 and
Int64 fields retain their load types; ordinary nested access needs no workaround
locals. Bare `None` now calls the existing Option absence producer.

The current WAT Option ABI uses negative handles for absence; a raw optional
negative integer can therefore be confused with absence. The two limit-related
twins now use `Option<AgentLimitValue>`, whose record contains a Float64 `value`.
The handle carries presence while the typed field carries the numeric value.
This explicit candidate representation change removes the former integer-only
restriction and preserves negative/fractional values. It does not repair generic
scalar Option payloads across the compiler or establish a production host ABI.

`wat-agent-definition-parity.test.mjs` executes both actual twins and compares
every diagnostic's code, severity, message and path in source order with the
retained TS oracle. Ten vectors per twin cover absent, present, negative, zero,
positive and fractional optional limits, structural failures and tool/limit
diagnostic ordering. Asymmetric presence/value cases distinguish the two
optional fields and address the independent review's test-coverage finding.
Record tests also exercise nested wide fields, a
record-returning call and an unknown-field refusal. Strict checks pass for both
twins. No full corpus run was used.

An independent Sol review found no implementation defect and requested the
asymmetric cases above. Its focused recheck passed all 22 validator checks and
confirmed that a private field-copy mutant fails, proving those cases can detect
cross-wired optional fields. The other four reviewed source/test identities were
unchanged. This is a scoped repair review, not conversion or release authority.
The small Golden Pack was refreshed for the actual runtime closure and passed
11 examples and 11 execution vectors; the AI-agent TS package passed 21 tests.

The evidence is bounded to finite values and inert typed records. Non-finite
input mapping, active JS objects, full alias behavior, the limits helper's custom
path override, physical SLIDE/VOK evidence and production cutover remain separate
unfinished work. Candidate source creation is not full conversion completion.
The initial probe also exposed invalid WAT for a negative Float64 literal in a
record initializer. That separate compiler defect now has a type-directed
`f64.neg` repair using the existing finite-value guard. The focused regression
executes negative record literals, fractional expressions and parameters,
preserves signed zero, and refuses NaN/infinity. Decimal remains an explicit
trapping refusal; integer overflow paths are unchanged. Before the repair the
new cases produced three failures; afterward the focused float/record set passed
39 tests and the signed-integer regressions passed 29. These literal-expression
checks complement the parameter-based validator comparisons above.

## Identity and change triggers

Role decisions were checked against these SHA-256 values:

| Path | SHA-256 |
| --- | --- |
| `packages-ts/galerina-ai-agent/src/index.ts` | `4333b9e58e67ec28f54aa49ce9fdaa11d311396ca0271e81d27980c8ed65d145` |
| `packages-ts/galerina-ai-agent/package.json` | `92c442f928e1496ff9b68ba8aa3c76bd809342ab5e610020696727fde38124f8` |
| `packages-ts/galerina-core-vector/src/index.ts` | `2ef743547cce9a3ab2a39dbc7a4a18ac26b4abcdb0c69bc70369e4e455f62037` |
| `packages-ts/galerina-core-vector/package.json` | `600b00c855003114cca1ec4e9fc20c9f454faa4f731899634391f945bdc92ecd` |

Source, import/dependency, entrypoint, packaging, dynamic-asset or supported-profile
changes reopen the affected role. They do not automatically reopen unrelated
corpus chapters.
