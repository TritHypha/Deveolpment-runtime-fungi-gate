# Five Scalar Classifiers Fungi Conversion Batch Design

## Objective

Translate five exact String-to-Bool decisions as Slices 33–37, while sharing
only their expensive governed closure. Each slice remains independently
identifiable, testable, physically compiled, re-admitted and refusable.
TypeScript remains active and no consumer is switched or retired.

## Bound source dossier

- Galerina selection build point:
  `43e5eb264fcf96e1640db0c41afb8bf3e15349c1`.
- Independent SLIDE build point:
  `6de4d91ba20a7e86c53c8898fcdae2ef4b6cee28`.

| Slice | Symbol | Source | SHA-256 | Tranche |
|---:|---|---|---|---|
| 33 | `isEnvironmentMode` | `packages-galerina/galerina-core-config/src/index.ts` | `71d473cf606fa7cabd2765fa270f10ca969a610a8c115b3c34eb07decd13b530` | T2 runtime core |
| 34 | `isTerminalScope` | `packages-galerina/galerina-core-runtime/src/structured-await.ts` | `f25e514f34f409df8b3fe137269f1073444ea23971c76fec8d6e23fe4f15a0e7` | T2 runtime core |
| 35 | `isTaskEffect` | `packages-galerina/galerina-core-tasks/src/load-tasks.ts` | `f40a970d695937c0546aaafaa6a4ce36c03fdc405ca5465fbaec3442c2e0856d` | T2 runtime core |
| 36 | `isResponseSafeClassification` | `packages-galerina/galerina-data-model/src/index.ts` | `cfdd5bee797fbc15bb556cb12a87c715d20f9f5965ab2d734c5f3d13d008832e` | T3 package graph |
| 37 | `isBuiltin` | `packages-galerina/galerina-devtools-context/src/receipt-generator.ts` | `e217c176f42f216ceb00c1d253329650b4585d241cfbc2596ac64418372d8f1c` | T3 package graph |

The retirement ledger declares no bootstrap floor for any of these paths.
The queue must still re-derive that fact and refuse the whole batch if any
path becomes T0 or gains a floor before admission.

## Exact source domains

| Symbol | True values | False values |
|---|---|---|
| `isEnvironmentMode` | `development`, `test`, `staging`, `production` | every other String |
| `isTerminalScope` | `succeeded`, `failed`, `timed_out`, `cancelled` | `running`, `cancelling`, every surplus String |
| `isTaskEffect` | `filesystem`, `network`, `database`, `environment`, `shell`, `compiler`, `reports`, `crypto` | every other String |
| `isResponseSafeClassification` | `public` | `internal`, `pii`, `secret`, every surplus String |
| `isBuiltin` | `AuditLog`, `Secrets`, `Crypto`, `Database`, `Http`, `File`, `Auth`, `Session`, `validate`, `redact`, `emit`, `return`, `Ok`, `Err`, `Some`, `None`, `true`, `false` | every other String |

All five decisions are case-sensitive and whitespace-sensitive. There is no
coercion, normalization, host call, mutation, exception, scheduling, partial
progress or ambient authority in the selected source decision.

## Considered approaches

1. **Five exact String matches with one batched closure (selected).** Each flow
   preserves its authored String boundary and fixed membership set. Each has
   a terminal `_ => false`, separate tests and a distinct physical receipt.
   Shared owners, roadmaps, graphs and indexes run once after all five settle.
2. **One generic classifier with a selector argument.** Rejected because it
   would invent a new cross-package ABI, combine unrelated source authority
   and allow a selector to choose another component's policy.
3. **Project discriminated records onto scalar tags.** Rejected because the
   present external record ABI proves one fixed record shape, not a union of
   differently shaped records. A leaf tag proof would not conserve the source
   boundary.
4. **Admit semantically simple bootstrap-floor symbols.** Rejected. A symbol
   can be expressible and physically supported while remaining unauthorized
   because its file is part of the bootstrap floor.
5. **Run aggregate closure after every slice.** Rejected because it repeats
   expensive owner work without improving the independent candidate proofs.

## Exact Fungi shape

Each package owns one `@version 1` pure flow with its original symbol name,
one `String` parameter and a `Bool` result. Fixed accepted values have exact
`match` arms returning `true`; terminal `_ =>` returns `false`.

The flows contain no null, NaN, `else if`, `throw`, `try`, `catch`, `for`,
`while` or `loop`. They grant no effect, capability, contract permission,
Hallmark, border grant, global vault access or host API.

## Decision, effect and exit ledger

For each slice:

1. every fixed accepted source String maps to an exact arm and exits `true`;
2. every fixed rejected source String maps to the terminal wildcard and exits
   `false`;
3. every surplus admitted String maps to the same terminal wildcard and exits
   `false`;
4. a missing, surplus, non-String or invalid UTF-16 physical argument is not
   an admitted source value and must be refused, not coerced;
5. direct and transitive effects are empty.

## Threadability

Classification: `PARALLEL_PURE` for each leaf flow.

Each flow reads one owned immutable String and returns one Boolean. This does
not authorize its caller, shared active compute, configuration loading, task
execution, runtime state advancement, model disclosure, AST walking,
publication or aggregate tooling for parallel execution.

## Proof and batch closure

1. Commit this design before candidate authority is granted.
2. Bind five exact symbol-scoped queue decisions to its byte digest.
3. RED-test every absent package-owned asset and loaded-asset declaration.
4. Prove each live source surface, typed Fungi interpretation and signed
   Galerina Wasm against all fixed values and hostile surplus Strings.
5. Compile the five exact sources through independent SLIDE. Publish and
   re-admit each physical `.slide` through VOK with a distinct typed Boolean
   receipt and its own mutation/refusal checks.
6. Review the public Fungi skills after each slice. Accumulate compatible
   lessons and publish one skill update at the end of the five-slice batch.
7. Run package checks, then one canonical package suite and one dependency-
   ordered bounded owner, roadmap, graph and index pass.

Full tooling, `graph-all`, normal phase-close and monolithic memory evaluation
remain excluded because those aggregate lanes are crash-linked. Their status
remains `UNKNOWN`; no smaller check may impersonate them.

## Authority boundary

These are reference-only semantic and physical proofs. They do not switch a
consumer, retire TypeScript/MJS, load configuration, advance a structured
await scope, execute a task, disclose a field, suppress a callee, widen a
grant, release authority, or claim bootstrap, production, hardware, signing,
release or durability evidence.
