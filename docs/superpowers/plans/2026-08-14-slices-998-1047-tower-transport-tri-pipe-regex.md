# Slices 998-1047 Tower Transport, Tri-Pipe and TriRegex Plan

> **Execution custody:** root is the sole writer, tester and committer. Private
> Fungi skills remain private and unpushed. Repository commits are never pushed.

**Goal:** Account for the next 50 unique TypeScript conversion scopes in exact
source order after Slice 997, without duplicating earlier Tower simulator
behavior or manufacturing physical, consumer-switch or retirement authority.

**Architecture:** Close the final two uncredited TPL simulator scopes, exhaust
the Tower transport/type-brand tail and Tri-Pipe package, then enter TriRegex in
file order through the first two parser constants. Every scope receives a
durable classification, blocker-specific exit, hostile vectors and exact
evidence before owner publication and dual-index closure.

**Tech Stack:** TypeScript/Node.js source evidence, Galerina Fungi/GIR/SLIDE/VOK
admission rules, Myco, codebase-memory, node:test and registered owner tools.

## Global Constraints

- Source build point is `6e58f482bc1a3ac15c79e0e5a5694c1b0c5865ef`,
  independently indexed by full codebase-memory at **61,545 nodes / 148,122
  edges** and refreshed by Myco at **6,614 files / 84,288 terms**. This plan
  commit makes later graph freshness `UNKNOWN` until the Slice-1047 refresh.
- Use codebase-memory first, bounded Myco second and exact reads last.
- Preserve Slices 103-134 and 993-997 as prior TPL credit. Slice 999 credits
  only the `TPLSimulator` constructor-function/prototype boundary; it does not
  re-credit its constructor or methods.
- Barrel-only `index.ts` files receive no duplicate behavior credit.
- Credit independently indexed named local functions (`step.stay`,
  `step.closed`, and `compileAst.walk`) as distinct qualified scopes;
  anonymous expressions remain within their containing scope.
- Treat active JavaScript records, arrays, typed arrays, callbacks, classes,
  errors, recursive emitters, binary64 numbers, K3 authority and mutable
  singleton identity as observable.
- Loaded Fungi assets are adjacent evidence unless exact source ingress, GIR,
  physical `.slide`, independent re-admission and VOK are all bound.
- Repository-wide conversion closure remains `UNKNOWN`.

## Pinned sources and focused evidence

- `tpl-simulator.ts` SHA-256
  `110D0166B3066EB145BC4DE5187367477D37614D3D49AAEA975DC9AD0B4E8739`;
  `tpl-simulator.test.mjs`
  `0D58F009D1DDEACFCDC2726BE931A4ECF60D63014D477D84D097B124F5BED3EC`.
- `transport-fsm.ts`
  `C338AD5CC2B5EC95CB17003CBF65A65E4AD7234D2657198268AC024CACC5E535`;
  `transport-fsm.test.mjs`
  `809C86898BB3A6B91DC62FE8DB76B52CED587A1F1ACE303F9B4F1F4D2FDCDDD3`.
- `trit-brand.type-guard.ts`
  `3A74BF105B04892313F64C0492F703DF2A145DD976FB5CF503E36FEA897391C1`;
  compile-time evidence is the package no-emit typecheck.
- `execution-router.ts`
  `22DC67E28EEC0A37AFF5AF91DF468AF266E794E78EF301B3B61534ECE0C233EF`;
  `execution-router.test.mjs`
  `2D26323C124821B1E780BDF61EAF742FFC5B71FA05001569FDC39C2D77F8266C`.
- `tri-pipe.ts`
  `C8AF0E5D7184203A8F3A10A6B692D624AB2D03FB71FAFCFE0F591002D86F930D`;
  `tri-pipe.test.mjs`
  `E5E7F12F928CA68F365F38FF842A99BD40735DF598D04B18D3681FC9A23AC57D`.
- `compile.ts`
  `F2EF466329DEEFCA219FC7190911DEB85DA3061E7BAD6B164BA4158C0CEEC5D7`,
  `engine.ts`
  `CE1D61C0BDA5468E17E752261F28C42FDEFACCE45A3CCC4CF9D0C520F2F64C65`,
  and `parser.ts`
  `E969F6BF9C0023E7E8CC3F5685AC81A6B2FE1B0D517A89A6467C7B01E15CF257`;
  focused TriRegex tests are `semantics.test.mjs`
  `F9EBC88F64CA140C22C9850B0BC6000AB3ED3254B21A1D224C26B12AEB2BEB82`,
  `streaming.test.mjs`
  `ACA74C99A4F3D03B2C27D5C555D50CF5764A0E931593E22C4F674A85AB88736B`,
  `refusals.test.mjs`
  `6A2A3BE0BA7A0C9C013D6150DD66BBCC24C37E7CC84D0D5C44A6D4EE5BC9DF3E`,
  and `redos.test.mjs`
  `B0DF088998F475D529F96558874365FBCBD21DEBF9305D2E112B7F02772E7663`.

## Exact slice map

| Slice | Exact scope and source range | Classification | Threadability |
|---:|---|---|---|
| 998 | `tpl-simulator.ts#CANARY` line 67 | CANDIDATE | PARALLEL_PURE |
| 999 | `tpl-simulator.ts#TPLSimulator` lines 206-428, class identity only | BLOCKED | SERIAL_HARD_PATH |
| 1000 | `transport-fsm.ts#TransportState` line 22 | NO_RUNTIME_BEHAVIOR | N/A |
| 1001 | `transport-fsm.ts#ChannelKeys` line 25 | NO_RUNTIME_BEHAVIOR | N/A |
| 1002 | `transport-fsm.ts#RecoveryConfig` line 28 | NO_RUNTIME_BEHAVIOR | N/A |
| 1003 | `transport-fsm.ts#FsmContext` lines 30-36 | NO_RUNTIME_BEHAVIOR | N/A |
| 1004 | `transport-fsm.ts#FsmEvent` lines 39-43 | NO_RUNTIME_BEHAVIOR | N/A |
| 1005 | `transport-fsm.ts#StepResult` lines 45-51 | NO_RUNTIME_BEHAVIOR | N/A |
| 1006 | `transport-fsm.ts#permitData` lines 54-56 | BLOCKED | SERIAL_HARD_PATH |
| 1007 | `transport-fsm.ts#initialContext` lines 58-60 | BLOCKED | SERIAL_HARD_PATH |
| 1008 | `transport-fsm.ts#toClosed` lines 64-68 | BLOCKED | SERIAL_HARD_PATH |
| 1009 | `transport-fsm.ts#step` lines 74-119 | BLOCKED | SERIAL_HARD_PATH |
| 1010 | `transport-fsm.ts#step.stay` line 81 | BLOCKED | SERIAL_HARD_PATH |
| 1011 | `transport-fsm.ts#step.closed` line 82 | BLOCKED | SERIAL_HARD_PATH |
| 1012 | `trit-brand.type-guard.ts#__tritBrandTypeGate` lines 12-27 | BLOCKED | SERIAL_HARD_PATH |
| 1013 | `execution-router.ts#CapabilityInput` lines 24-31 | NO_RUNTIME_BEHAVIOR | N/A |
| 1014 | `execution-router.ts#ExecutionRouteInput` lines 33-61 | NO_RUNTIME_BEHAVIOR | N/A |
| 1015 | `execution-router.ts#ExecutionDecision` lines 63-83 | NO_RUNTIME_BEHAVIOR | N/A |
| 1016 | `execution-router.ts#ExecutionRouter` lines 86-161, class identity only | BLOCKED | SERIAL_HARD_PATH |
| 1017 | `execution-router.ts#ExecutionRouter.constructor` line 88 | BLOCKED | SERIAL_HARD_PATH |
| 1018 | `execution-router.ts#ExecutionRouter.laneIsGranted` lines 102-107 | BLOCKED | SERIAL_HARD_PATH |
| 1019 | `execution-router.ts#ExecutionRouter.route` lines 109-160 | BLOCKED | SERIAL_HARD_PATH |
| 1020 | `execution-router.ts#createExecutionRouter` lines 164-166 | BLOCKED | SERIAL_HARD_PATH |
| 1021 | `tri-pipe.ts#TriPipeOptions` lines 23-42 | NO_RUNTIME_BEHAVIOR | N/A |
| 1022 | `tri-pipe.ts#TriPipeEngine` lines 44-51 | NO_RUNTIME_BEHAVIOR | N/A |
| 1023 | `tri-pipe.ts#createTriPipeEngine` lines 58-81 | BLOCKED | SERIAL_HARD_PATH |
| 1024 | `compile.ts#VetoError` lines 15-18, class identity only | BLOCKED | SERIAL_HARD_PATH |
| 1025 | `compile.ts#VetoError.constructor` line 17 | BLOCKED | SERIAL_HARD_PATH |
| 1026 | `compile.ts#budgetVeto` lines 19-20 | BLOCKED | SERIAL_HARD_PATH |
| 1027 | `compile.ts#Emitter` lines 23-85, class identity only | BLOCKED | SERIAL_HARD_PATH |
| 1028 | `compile.ts#Emitter.constructor` line 26 | BLOCKED | SERIAL_HARD_PATH |
| 1029 | `compile.ts#Emitter.push` lines 28-33 | BLOCKED | SERIAL_HARD_PATH |
| 1030 | `compile.ts#Emitter.finish` lines 35-37 | BLOCKED | SERIAL_HARD_PATH |
| 1031 | `compile.ts#Emitter.emit` lines 39-50 | BLOCKED | SERIAL_HARD_PATH |
| 1032 | `compile.ts#Emitter.emitAlt` lines 52-63 | BLOCKED | SERIAL_HARD_PATH |
| 1033 | `compile.ts#Emitter.emitRep` lines 65-84 | BLOCKED | SERIAL_HARD_PATH |
| 1034 | `compile.ts#Closure` lines 88-92 | NO_RUNTIME_BEHAVIOR | N/A |
| 1035 | `compile.ts#Compiled` lines 94-115 | NO_RUNTIME_BEHAVIOR | N/A |
| 1036 | `compile.ts#compileAst` lines 117-228 | BLOCKED | SERIAL_HARD_PATH |
| 1037 | `compile.ts#compileAst.walk` lines 141-164 | BLOCKED | SERIAL_HARD_PATH |
| 1038 | `compile.ts#inRangesWithCost` lines 230-246 | BLOCKED | SERIAL_HARD_PATH |
| 1039 | `compile.ts#inRanges` lines 248-250 | BLOCKED | SERIAL_HARD_PATH |
| 1040 | `engine.ts#INF` line 17 | CANDIDATE | PARALLEL_PURE |
| 1041 | `engine.ts#TriStream` lines 19-25 | NO_RUNTIME_BEHAVIOR | N/A |
| 1042 | `engine.ts#TriMatcher` lines 27-160, class identity only | BLOCKED | SERIAL_HARD_PATH |
| 1043 | `engine.ts#TriMatcher.constructor` lines 30-33 | BLOCKED | SERIAL_HARD_PATH |
| 1044 | `engine.ts#TriMatcher.test` lines 36-41 | BLOCKED | SERIAL_HARD_PATH |
| 1045 | `engine.ts#TriMatcher.stream` lines 43-159 | BLOCKED | SERIAL_HARD_PATH |
| 1046 | `parser.ts#MAX_CP` line 16 | CANDIDATE | PARALLEL_PURE |
| 1047 | `parser.ts#D` line 19 | BLOCKED | SERIAL_HARD_PATH |

Exact arithmetic: **14 NO_RUNTIME_BEHAVIOR + 33 BLOCKED + 3 CANDIDATE**;
threadability **14 N/A + 33 SERIAL_HARD_PATH + 3 PARALLEL_PURE**; zero
superseded scopes or retirement credit.

## Task 1: Adjudicate Slices 998-1012

- [x] Bind the exact signed i32 canary constant and TPL class identity without
  duplicating constructor/method behavior.
- [x] Preserve the erased transport declarations and exact active FSM record,
  K3, callback, erasure, alias, time-number and local-closure semantics.
- [x] Treat the emitted type-gate function as callable runtime JS while keeping
  its compile-time negative-evidence purpose distinct.

## Task 2: Adjudicate Slices 1013-1023

- [x] Retain all public Tri-Pipe declarations and bind class/factory identity.
- [x] Capture capability, routing, active arrays, callbacks, bridge registries,
  attestation Booleans and reason/error order exactly once or block conversion.
- [x] Record all validation/use and authority/action split risks with hostile
  vectors and physical consumer exits.

## Task 3: Adjudicate Slices 1024-1047

- [x] Bind Error/class identity, recursive Thompson emission, mutable program
  state, typed arrays, recursion/loop bounds and exact veto ordering.
- [x] Preserve compiled aliases, streaming mutable closure state, UTF-16/code
  point semantics, leftmost-longest behavior and K3 boundary collapse.
- [x] Stop at parser `D`; keep `W` as the exact next queue scope.

## Task 4: Author and verify the 50 receipts

- [x] Author 50 receipt-local classifications, blocker-specific exits, vectors,
  threadability, source hashes, focused evidence pins and a common manifest.
- [x] Run focused no-emit typechecks/tests and
  `node scripts/audit-conversion-slice-close.mjs`; require exact arithmetic.
- [x] Reconcile independent read-only review and correct every Critical or
  Important finding before the evidence commit.

## Task 5: Publish owners and close the checkpoint

- [x] Run registered publishers by provenance layer followed by the governed
  generator-contract audit and historical bounded close matrix.
- [x] Commit owner and dependent graph layers separately; do not push.
- [ ] Refresh Myco and codebase-memory and independently verify exact final
  indexed build points plus one untruncated Slice-1047 query/snippet.

## Self-review

- [x] Confirm 50 case-sensitive unique scopes in exact source order.
- [x] Confirm every prior-credit exclusion and named-local/class-boundary ruling.
- [x] Confirm arithmetic is 14 NRB + 33 BLOCKED + 3 CANDIDATE.
- [x] Confirm every blocked receipt has an executable blocker-specific exit and
  every candidate has explicit consumer and physical-proof gates.
- [x] Confirm no physical authority, switch, supersession or retirement claim.
