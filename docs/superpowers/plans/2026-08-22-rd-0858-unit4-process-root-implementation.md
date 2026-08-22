# RD-0858 Unit 4 Process-Root Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Owner direction requires inline execution; do not delegate this plan.

**Goal:** Build and prove a Windows-first, single-use native launcher and clean Galerina worker that return bounded non-authorizing scalar-profile evidence without trusting the calling Node process.

**Architecture:** A dependency-free Rust launcher owns runtime/package admission, canonical framing, the Windows Job Object and the clean worker lifecycle. A fixed TypeScript worker captures bootstrap roots before reading caller bytes, executes one admitted governed flow, emits one canonical response and exits; the parent adapter can submit and display evidence but cannot authorize, rescue or execute guarded effects.

**Tech Stack:** Rust standard library and Win32 FFI, Node.js 24 ESM, strict TypeScript, canonical UTF-8 JSON with 8-byte big-endian framing, SHA-256, Node test runner, existing Galerina parser/type-checker/interpreter and owned-process verification tools.

**Spec:** `docs/superpowers/specs/2026-08-21-rd-0858-unit4-process-root-boundary-design.md`

## Global Constraints

- Treat the calling Node process, its globals, environment, current directory, PATH, module cache and claimed digests as untrusted.
- Implement only semantic scalar profile `1`; do not admit `32`, `64`, `256` or any adaptive profile.
- Keep `scripts/native/process-warden` a process-lifetime owner; do not relabel its receipt or widen it into Unit 4 admission authority.
- Use a dependency-free native launcher. A new dependency requires separate provenance, admission and owner review before this plan may continue.
- Resolve the Node runtime and worker package from a protected registry using exact bytes, file identity and digests; a filename, version or PATH hit is never identity evidence.
- Use one whole-operation deadline and bounded frame, byte, depth, value, audit and event counts.
- Use one nonce-bound ready frame, one request, one result and then terminate the worker. A second frame or request refuses.
- Closed execution states are exactly `COMPLETE | REFUSED | ERROR | CANCELLED`; timeout and truncation can never become `COMPLETE`.
- Every receipt is bounded, locator-and-digest only, contains no source or memory body, and has `authorizing: false`.
- The parent adapter cannot execute guarded effects, mint `ALLOW`, silently use the in-process interpreter or rescue a failed worker.
- There is no in-process rescue.
- Unsupported platforms refuse.
- Commit locally only. Do not push, open a pull request, merge, reset, clean, restore or discard unrelated work.
- Before and after every task, require an empty `.fungi` path set in the task diff. Under the current owner boundary, stop before Task 6: do not create, edit, convert, stage, build or admit any `.fungi` file.
- Refresh the full code graph after every source-bearing checkpoint and require `indexed_head_sha` to equal Git HEAD before claiming fresh structural evidence.

---

## File Structure

| Path | Responsibility |
|---|---|
| `packages-galerina/galerina-core-compiler/src/requirement-process-protocol.ts` | Closed protocol types, bounded canonical JSON, framing, digest and receipt validation shared by the parent and worker. |
| `packages-galerina/galerina-core-compiler/tests/requirement-process-protocol.test.mjs` | Known-answer vectors and hostile protocol controls. |
| `packages-galerina/galerina-core-compiler/tests/requirement-process-root-red.test.mjs` | The four causal pre-bootstrap attacks against the old route and discriminators for the new process route. |
| `scripts/native/requirement-launcher/Cargo.toml` | Dependency-free native launcher crate definition. |
| `scripts/native/requirement-launcher/src/protocol.rs` | Independent strict JSON scanner, canonical encoder and 8-byte frame reader/writer. |
| `scripts/native/requirement-launcher/src/identity.rs` | Protected registry, stable-file, file-identity and SHA-256 admission. |
| `scripts/native/requirement-launcher/src/windows.rs` | Suspended worker creation, image verification, Job Object ownership, deadlines and tree closure. |
| `scripts/native/requirement-launcher/src/main.rs` | Closed launcher state machine and receipt emission. |
| `scripts/build-requirement-launcher.mjs` | Bounded Rust build plus exact source/tool/binary receipt. |
| `scripts/tests/requirement-launcher.test.mjs` | Native launcher protocol, package, environment, process-tree and receipt tests. |
| `packages-galerina/galerina-core-compiler/src/requirement-process-worker.ts` | Single-use clean worker bootstrap, self-controls, request execution and closed result. |
| `packages-galerina/galerina-core-compiler/tests/requirement-process-worker.test.mjs` | Worker ready/request/result order, bootstrap, bounds and one-request tests. |
| `packages-galerina/galerina-core-compiler/src/requirement-process-adapter.ts` | Non-authorizing parent submission/display API with no fallback. |
| `packages-galerina/galerina-core-compiler/tests/requirement-process-adapter.test.mjs` | Parent spoof, fallback, authority and profile-separation controls. |
| `packages-galerina/galerina-core-compiler/src/index.ts` | Public exports for protocol types and the non-authorizing adapter only. |
| `packages-galerina/galerina-core-compiler/package.json` | Focused test commands for the new Unit 4 surfaces. |
| `docs/TODO.md` | Exact Unit 4 evidence state after implementation review. |

## Task 1: Bounded Canonical Protocol and Known-Answer Vectors

**Files:**
- Create: `packages-galerina/galerina-core-compiler/src/requirement-process-protocol.ts`
- Create: `packages-galerina/galerina-core-compiler/tests/requirement-process-protocol.test.mjs`
- Modify: `packages-galerina/galerina-core-compiler/src/index.ts`
- Modify: `packages-galerina/galerina-core-compiler/package.json`

**Interfaces:**
- Consumes: Node `TextDecoder("utf-8", { fatal: true })` and `node:crypto.createHash("sha256")` only.
- Produces: `PROTOCOL_SCHEMA_VERSION`, `SCALAR_PROFILE`, `MAX_FRAME_BYTES`, `MAX_JSON_DEPTH`, `MAX_JSON_VALUES`, `ExecutionState`, `LauncherRequest`, `WorkerReady`, `WorkerResult`, `NonAuthorizingReceipt`, `encodeCanonicalFrame(kind, value)`, `decodeCanonicalFrame(kind, bytes)`, `hashProtocolBytes(bytes)` and `validateNonAuthorizingReceipt(value)`.

- [ ] **Step 1: Plant strict framing and schema RED tests**

```js
it("round-trips one canonical launcher request", () => {
  const request = {
    schemaVersion: 1,
    nonce: "00112233445566778899aabbccddeeff",
    runtimeProfile: "scalar-1",
    subjectDigest: "00".repeat(32),
    flowLocator: "rd0858/unit4/scalar-oracle",
    flowDigest: "11".repeat(32),
    argumentDigest: "22".repeat(32),
    argumentBytes: "eyJzdWJqZWN0Ijp0cnVlfQ==",
  };
  const frame = L.encodeCanonicalFrame("launcher-request", request);
  assert.deepEqual(L.decodeCanonicalFrame("launcher-request", frame), request);
});

for (const mutation of ["duplicate-key", "unknown-field", "invalid-utf8", "trailing-byte", "oversize", "depth", "value-count"]) {
  it(`refuses ${mutation}`, () => assert.throws(() => hostileFrame(mutation), /refused|canonical|bound/i));
}
```

- [ ] **Step 2: Run the protocol test and capture causal RED**

Run: `npm --prefix packages-galerina/galerina-core-compiler run build && node --test packages-galerina/galerina-core-compiler/tests/requirement-process-protocol.test.mjs`

Expected: FAIL because `requirement-process-protocol` and its exports do not exist; no syntax/path failure is accepted as the final RED evidence.

- [ ] **Step 3: Implement the strict bounded parser and canonical encoder**

```ts
export const PROTOCOL_SCHEMA_VERSION = 1 as const;
export const SCALAR_PROFILE = "scalar-1" as const;
export const MAX_FRAME_BYTES = 262_144;
export const MAX_JSON_DEPTH = 32;
export const MAX_JSON_VALUES = 4_096;

export type ExecutionState = "COMPLETE" | "REFUSED" | "ERROR" | "CANCELLED";

export function encodeCanonicalFrame(kind: FrameKind, value: unknown): Uint8Array {
  const body = encodeClosedCanonicalJson(kind, value);
  if (body.byteLength === 0 || body.byteLength > MAX_FRAME_BYTES) throw new ProtocolRefusal("FRAME_BOUND");
  const frame = new Uint8Array(8 + body.byteLength);
  new DataView(frame.buffer).setBigUint64(0, BigInt(body.byteLength), false);
  frame.set(body, 8);
  return frame;
}

export function decodeCanonicalFrame(kind: FrameKind, frame: Uint8Array): unknown {
  if (frame.byteLength < 9) throw new ProtocolRefusal("FRAME_TRUNCATED");
  const declared = Number(new DataView(frame.buffer, frame.byteOffset, 8).getBigUint64(0, false));
  if (declared < 1 || declared > MAX_FRAME_BYTES || frame.byteLength !== declared + 8) {
    throw new ProtocolRefusal("FRAME_LENGTH");
  }
  return parseAndValidateClosedCanonicalJson(kind, frame.subarray(8));
}
```

The parser must scan each input byte once, reject duplicate keys before object construction, normalize no input, require already-NFC strings, reject C0/C1/Cf controls, count depth/values/property bytes before allocation, require lexicographically sorted keys and compare the re-encoded canonical bytes byte-for-byte.

- [ ] **Step 4: Add closed receipt validation**

Require `authorizing === false`, scalar profile `1`, exactly one closed execution state, 64-lowercase-hex digests, a 32-lowercase-hex nonce, finite integer duration/exit fields and explicit timeout/truncation/partial/missing-evidence fields. Reject getters, Proxies, symbols, unknown fields and any body-like key (`source`, `memory`, `content`, `bytes`).

- [ ] **Step 5: Run focused and proportional tests**

Run: `npm --prefix packages-galerina/galerina-core-compiler run typecheck`

Run: `npm --prefix packages-galerina/galerina-core-compiler run build`

Run: `node --test packages-galerina/galerina-core-compiler/tests/requirement-process-protocol.test.mjs packages-galerina/galerina-core-compiler/tests/requirement-interpreter.test.mjs`

Expected: every test PASS, zero skipped/todo, and the existing requirement-interpreter count is unchanged.

- [ ] **Step 6: Verify custody and commit**

Run: `git diff --check`

Run: `git diff --name-only | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{if(s.split(/\r?\n/).some(p=>p.endsWith('.fungi')))process.exit(1)})"`

Commit: `git add packages-galerina/galerina-core-compiler/src/requirement-process-protocol.ts packages-galerina/galerina-core-compiler/tests/requirement-process-protocol.test.mjs packages-galerina/galerina-core-compiler/src/index.ts packages-galerina/galerina-core-compiler/package.json && git commit -m "feat: define RD-0858 process protocol"`

## Task 2: Permanent Causal Process-Root RED Controls

**Current owner gate:** Do not execute this task while the no-`.fungi` boundary is active. The controls parse inline Galerina source to prove the old route; wait for an explicit boundary release.

**Files:**
- Create: `packages-galerina/galerina-core-compiler/tests/requirement-process-root-red.test.mjs`

**Interfaces:**
- Consumes: current public `parseProgram`, `checkTypes` and `executeFlow`; later consumes `executeRequirementProcess` from Task 7.
- Produces: four permanent same-process attack fixtures named `detector-direct`, `detector-retained`, `descriptor-direct` and `descriptor-retained`.

- [ ] **Step 1: Write four secure-expectation tests in fresh child processes**

Each child must poison the CommonJS backing object before the first cache-busted interpreter import, visibly restore the shared property, arm retained state where applicable and invoke a complete `require` flow. Assert that the old route does **not** return guarded `allow`.

```js
for (const mode of ["detector-direct", "detector-retained", "descriptor-direct", "descriptor-retained"]) {
  it(`isolates ${mode} before first interpreter evaluation`, () => {
    const result = runPreBootstrapAttack(mode, { route: "in-process" });
    assert.notEqual(result.value, "allow");
    assert.notEqual(result.audit, "ok");
  });
}
```

- [ ] **Step 2: Reproduce the causal RED against the old route**

Run: `node --test packages-galerina/galerina-core-compiler/tests/requirement-process-root-red.test.mjs`

Expected: exactly four security assertions FAIL because the poisoned old route reaches `audit: "ok"` and guarded `allow`; stable unpoisoned and malformed-value discriminators PASS.

- [ ] **Step 3: Commit the test-only RED checkpoint**

Commit: `git add packages-galerina/galerina-core-compiler/tests/requirement-process-root-red.test.mjs && git commit -m "test: expose RD-0858 process-root attacks"`

## Task 3: Dependency-Free Native Launcher Protocol Skeleton

**Files:**
- Create: `scripts/native/requirement-launcher/Cargo.toml`
- Create: `scripts/native/requirement-launcher/src/protocol.rs`
- Create: `scripts/native/requirement-launcher/src/main.rs`
- Create: `scripts/build-requirement-launcher.mjs`
- Create: `scripts/tests/requirement-launcher.test.mjs`

**Interfaces:**
- Consumes: Task 1 known-answer vector bytes only; it must not call the TypeScript parser at runtime.
- Produces: native exit algebra `0=closed receipt emitted`, `1=REFUSED`, `2=ERROR`, `3=CANCELLED`; Rust `FrameReader`, `CanonicalValue`, `LauncherRequest` and `Receipt` structs.

- [ ] **Step 1: Plant native framing and refusal RED tests**

```js
it("matches the TypeScript launcher-request vector byte-for-byte", () => {
  const child = runLauncher(["--decode-only"], KNOWN_REQUEST_FRAME);
  assert.equal(child.status, 1);
  assert.equal(child.stderr, "UNIT4_REFUSED:WORKER_NOT_ADMITTED\n");
  assert.deepEqual(JSON.parse(child.stdout).requestDigest, KNOWN_REQUEST_DIGEST);
});
```

Add zero/oversize/truncated/duplicate/unknown/noncanonical/invalid-UTF8/trailing-byte/depth/value-count cases and assert no case launches a child.

- [ ] **Step 2: Run the build/test and capture missing-crate RED**

Run: `node scripts/build-requirement-launcher.mjs && node --test scripts/tests/requirement-launcher.test.mjs`

Expected: FAIL because the crate/build script does not exist.

- [ ] **Step 3: Implement an independent standard-library protocol parser**

`protocol.rs` must read exactly 8 prefix bytes, reject lengths outside `1..=262144`, read exactly the announced body under a single deadline, reject EOF/trailing input, validate UTF-8, scan JSON with depth `32` and value count `4096`, reject duplicates and require the canonical byte spelling. It must not shell out to Node or reuse caller-parsed JSON.

- [ ] **Step 4: Implement the closed no-worker launcher state**

`main.rs` accepts only `--registry <absolute-path>` and optional test-only `--decode-only` compiled under `cfg(test_contract)`. Without an admitted registry it emits one bounded receipt with `executionState:"REFUSED"`, `refusalCode:"WORKER_NOT_ADMITTED"`, `authorizing:false` and exits `1`.

- [ ] **Step 5: Implement bounded build evidence**

`scripts/build-requirement-launcher.mjs` resolves the fixed crate, `Cargo.toml`, `Cargo.lock`, all four source files and the built executable as direct regular files; hashes each before and after the bounded build; uses `runOwnedProcess`; writes ignored output only under `build/rd0858-requirement-launcher/`; and records the exact Rust version, command, input hashes, binary hash and Git HEAD.

- [ ] **Step 6: Run tests, syntax, diff and commit**

Run: `node --check scripts/build-requirement-launcher.mjs`

Run: `node --test scripts/tests/requirement-launcher.test.mjs`

Expected: PASS for all known answers and closed refusal cases.

Commit: `git add scripts/native/requirement-launcher/Cargo.toml scripts/native/requirement-launcher/Cargo.lock scripts/native/requirement-launcher/src/protocol.rs scripts/native/requirement-launcher/src/main.rs scripts/build-requirement-launcher.mjs scripts/tests/requirement-launcher.test.mjs && git commit -m "feat: add bounded RD-0858 launcher skeleton"`

## Task 4: Protected Registry, Runtime Identity and Windows Process Ownership

**Files:**
- Create: `scripts/native/requirement-launcher/src/identity.rs`
- Create: `scripts/native/requirement-launcher/src/windows.rs`
- Modify: `scripts/native/requirement-launcher/src/main.rs`
- Modify: `scripts/build-requirement-launcher.mjs`
- Modify: `scripts/tests/requirement-launcher.test.mjs`

**Interfaces:**
- Consumes: Task 3 `LauncherRequest`; the build tool creates a test-only protected registry beside the launcher using exact absolute locators and SHA-256 digests.
- Produces: `AdmittedPackage`, `OwnedWorker`, `verify_registry`, `create_suspended_worker`, `verify_process_image`, `resume_worker`, `kill_owned_tree` and `wait_owned_worker`.

- [ ] **Step 1: Plant identity/environment/process RED tests**

Add runtime/worker digest mismatch; ordinary link; junction/reparse; case-shadow; replacement between pre/post snapshots; stale registry; ambient PATH/current-directory spoof; `NODE_OPTIONS`, `NODE_PATH`, preload and inspector injection; unexpected process image; timeout; cancellation; extra child; and unsupported-platform cases. Every hostile case must refuse before worker authority, while one fixed sentinel worker returns a non-authorizing `REFUSED` receipt.

- [ ] **Step 2: Run the focused test and capture admission REDs**

Run: `node --test --test-name-pattern="identity|registry|environment|process|timeout|unsupported" scripts/tests/requirement-launcher.test.mjs`

Expected: hostile cases FAIL because Task 3 has no identity or process admission.

- [ ] **Step 3: Implement stable direct-file and protected-registry admission**

The registry schema is closed and contains exact launcher, runtime, worker, package-root and scalar-profile digests plus Windows file IDs. Open handles first, refuse reparse/link/non-disk files, obtain volume serial plus file index, hash from the held handle, compare registered identity/digest, recheck metadata after hashing and retain handles until the worker is resumed. Do not accept PATH, relative paths or current-directory resolution.

- [ ] **Step 4: Implement Windows suspended creation and Job ownership**

Follow the reviewed `process-warden` sequence without changing its crate: create a kill-on-close Job Object; create the exact runtime suspended with a new process group and inherited anonymous pipes only; assign it to the job; query the created process image; compare its held-file identity to the admitted runtime; reject unexpected child count; then resume. Unsupported platforms emit `REFUSED/UNSUPPORTED_PLATFORM` without spawning.

- [ ] **Step 5: Implement the explicit environment allow-list**

Build a new environment block containing only registry-bound `SystemRoot`, `WINDIR`, `TEMP`, `TMP`, `COMSPEC`, locale keys required by the admitted runtime, and Unit 4 nonce/pipe identifiers. Exclude PATH, current-directory inheritance, `NODE_OPTIONS`, `NODE_PATH`, inspector, package-manager, shell and preload variables. Hash the sorted UTF-16 environment block into the receipt.

- [ ] **Step 6: Run the complete native matrix and commit**

Run: `node scripts/build-requirement-launcher.mjs`

Run: `node --test scripts/tests/requirement-launcher.test.mjs`

Expected: every admission attack refuses, the sentinel discriminator is owned and terminated, and timeout/child escape prove Job Object tree closure.

Commit: `git add scripts/native/requirement-launcher/src/identity.rs scripts/native/requirement-launcher/src/windows.rs scripts/native/requirement-launcher/src/main.rs scripts/build-requirement-launcher.mjs scripts/tests/requirement-launcher.test.mjs && git commit -m "feat: admit RD-0858 worker process identity"`

## Task 5: Single-Use Clean Worker Bootstrap Without Galerina Source Admission

**Files:**
- Create: `packages-galerina/galerina-core-compiler/src/requirement-process-worker.ts`
- Create: `packages-galerina/galerina-core-compiler/tests/requirement-process-worker.test.mjs`
- Modify: `packages-galerina/galerina-core-compiler/src/index.ts`
- Modify: `scripts/tests/requirement-launcher.test.mjs`
- Modify: `scripts/build-requirement-launcher.mjs`
- Modify: `scripts/native/requirement-launcher/src/main.rs`
- Modify: `scripts/native/requirement-launcher/src/protocol.rs`
- Modify: `scripts/native/requirement-launcher/src/windows.rs`

**Interfaces:**
- Consumes: Task 1 protocol and Task 4 admitted worker process.
- Produces: `runRequirementProcessWorker(input, output, bootstrap)` for tests and a CLI entry that emits one `WorkerReady`, accepts one `LauncherRequest`, emits one closed non-authorizing `WorkerResult`, then exits.

- [x] **Step 1: Plant bootstrap/order/single-use RED tests**

Assert roots are captured before the input reader is invoked; canonical own-data Bool/Verdict self-controls pass; Proxy/accessor controls refuse without trap access; result-before-ready, request-before-ready, nonce mismatch, second request, dynamic import, child/network attempt, unknown effect, oversized audit/result, timeout and crash cannot become `COMPLETE`.

- [x] **Step 2: Run focused worker tests and capture RED**

Run: `npm --prefix packages-galerina/galerina-core-compiler run build && node --test packages-galerina/galerina-core-compiler/tests/requirement-process-worker.test.mjs`

Expected: FAIL because the worker entry does not exist.

- [x] **Step 3: Implement capture-before-input bootstrap**

At module evaluation, capture only the exact owned-data descriptor reader, Proxy detector, UTF-8 decoder, SHA-256 constructor, monotonic clock and immutable protocol functions required by the worker. Run fixed self-controls before calling `input.read()`. If any root or self-control is unavailable, accessor-backed, proxy-selected or inconsistent, emit `REFUSED/BOOTSTRAP_CONTROL` and exit.

- [x] **Step 4: Implement one-frame state machine**

States are `BOOTSTRAP -> READY_SENT -> REQUEST_READ -> RESULT_SENT -> CLOSED`. Every out-of-order frame, second read/write, nonce mismatch or caught exception transitions once to closed `REFUSED` or `ERROR`. In this pre-conversion task the only admitted operation is `bootstrap-probe`, which returns bounded self-control digests and `executionState:"REFUSED"`; it never parses or admits Galerina source.

The Task 4 launcher must add only an explicit three-handle anonymous-pipe whitelist. It verifies `WorkerReady` before writing the request, closes worker stdin after the one frame, verifies the one `WorkerResult`, and rejects `COMPLETE`. No other inherited handle or worker operation is admitted.

- [x] **Step 5: Run worker plus launcher tests and commit**

Run: `npm --prefix packages-galerina/galerina-core-compiler run typecheck`

Run: `npm --prefix packages-galerina/galerina-core-compiler run build`

Run: `node --test packages-galerina/galerina-core-compiler/tests/requirement-process-protocol.test.mjs packages-galerina/galerina-core-compiler/tests/requirement-process-worker.test.mjs scripts/tests/requirement-launcher.test.mjs`

Commit the exact Task 5 source, test, builder, protocol and native launcher paths only with message `feat: bootstrap single-use RD-0858 worker`.

## Pre-Conversion Stop Gate

Tasks 1, 3, 4 and 5 form the current owner-authorized milestone. Before proceeding, prove:

```text
git diff --name-only <milestone-start>..HEAD
  -> no path ending in .fungi
worker admitted operation set
  -> exactly bootstrap-probe
launcher receipt
  -> authorizing:false and executionState:REFUSED
```

Stop here while the no-`.fungi` boundary remains active. Tasks 6–8 are specified for the later owner-released execution chapter; their presence in this plan is not conversion or admission authority.

## Task 6: One Complete Governed Scalar Flow in the Clean Worker

**Files:**
- Modify: `packages-galerina/galerina-core-compiler/src/requirement-process-worker.ts`
- Modify: `packages-galerina/galerina-core-compiler/tests/requirement-process-worker.test.mjs`
- Modify: `packages-galerina/galerina-core-compiler/tests/requirement-process-root-red.test.mjs`
- Modify: `scripts/build-requirement-launcher.mjs`
- Modify: `scripts/tests/requirement-launcher.test.mjs`

**Interfaces:**
- Consumes: a later owner-admitted, fixed, checked scalar flow package resolved by `flowLocator`; Task 5 worker; current `executeFlow` inside the clean worker only.
- Produces: one `COMPLETE` worker result containing bounded value/audit plus recomputed subject/flow/argument/value/audit digests; no authorizing Boolean leaves the worker.

- [ ] **Step 1: Bind the selected checked scalar flow as a registry artifact**

The build tool must consume an already owner-admitted checked artifact, hold and hash it as a direct regular file, bind its `flowLocator`, flow digest and exact core-compiler package graph into the protected registry and refuse any `.fungi` source path. If no admitted artifact exists, return HOLD rather than generating one.

- [ ] **Step 2: Turn the four causal controls green through the launcher**

Extend each Task 2 attack so the hostile parent submits the same nonce/request to `executeRequirementProcess`. The expected result is a launcher-verified non-authorizing receipt whose value/audit match the stable discriminator and whose bytes are identical across all four poisoned parent states. The old in-process assertions remain causal RED evidence.

- [ ] **Step 3: Execute the complete guarded continuation inside the worker**

The worker resolves only the registered flow, verifies the checked artifact digest, decodes bounded canonical arguments, calls `executeFlow` with all fast paths disabled, requires `executionTier:"tree"`, completes deny/ambig/allow continuation internally, canonicalizes the final bounded value/audit, erases all source/AST bodies and emits their digests only.

- [ ] **Step 4: Run focused causal and differential tests**

Run: `node --test packages-galerina/galerina-core-compiler/tests/requirement-process-root-red.test.mjs packages-galerina/galerina-core-compiler/tests/requirement-process-worker.test.mjs scripts/tests/requirement-launcher.test.mjs`

Expected: old-route secure expectations retain the documented four causal failures; every clean-worker expectation PASS; stable and poisoned-parent responses are byte-identical except monotonic timing and explicitly excluded OS evidence.

- [ ] **Step 5: Commit the vertical execution slice**

Commit: `git add packages-galerina/galerina-core-compiler/src/requirement-process-worker.ts packages-galerina/galerina-core-compiler/tests/requirement-process-worker.test.mjs packages-galerina/galerina-core-compiler/tests/requirement-process-root-red.test.mjs scripts/build-requirement-launcher.mjs scripts/tests/requirement-launcher.test.mjs && git commit -m "feat: execute RD-0858 scalar flow out of process"`

## Task 7: Non-Authorizing Parent Adapter and Authority Separation

**Files:**
- Create: `packages-galerina/galerina-core-compiler/src/requirement-process-adapter.ts`
- Create: `packages-galerina/galerina-core-compiler/tests/requirement-process-adapter.test.mjs`
- Modify: `packages-galerina/galerina-core-compiler/src/index.ts`
- Modify: `packages-galerina/galerina-core-compiler/package.json`

**Interfaces:**
- Consumes: admitted launcher executable/registry locators and Task 1 protocol.
- Produces: `executeRequirementProcess(request, options): Promise<RequirementProcessEvidence>` where `RequirementProcessEvidence` contains the validated result and `NonAuthorizingReceipt`; it exposes no `allowed`, `authorize`, `executeEffect` or fallback field.

- [ ] **Step 1: Plant parent spoof/fallback/authority RED tests**

Cover forged parent `ALLOW`; worker output without launcher recomputation; author-produced PASS; `authorizing:true`; absent VOK admission; profile `32/64/256`; launcher missing; registry mismatch; timeout; truncated stdout; extra stdout; malformed receipt; and any attempt to call the in-process interpreter after a launcher failure.

- [ ] **Step 2: Run focused tests and capture missing-adapter RED**

Run: `npm --prefix packages-galerina/galerina-core-compiler run build && node --test packages-galerina/galerina-core-compiler/tests/requirement-process-adapter.test.mjs`

Expected: FAIL because the adapter does not exist.

- [ ] **Step 3: Implement submission/display only**

Resolve only explicitly supplied absolute launcher/registry locators, encode one canonical request, invoke the launcher with explicit stdin/stdout bounds and one deadline, require one exact receipt/result frame, recompute response/value/audit digests, require `authorizing:false`, and return frozen evidence. Any error returns a closed `REFUSED`, `ERROR` or `CANCELLED` evidence object; never call `executeFlow`, `executeFlowSync` or `tryPureFlowSync`.

- [ ] **Step 4: Add a static no-fallback control**

Use the maintained TypeScript parser seam to prove `requirement-process-adapter.ts` has no import/call edge to `interpreter.ts`, guarded effects, network, child process other than the fixed launcher seam, or VOK lease creation.

- [ ] **Step 5: Run tests and commit**

Run: `npm --prefix packages-galerina/galerina-core-compiler run typecheck`

Run: `npm --prefix packages-galerina/galerina-core-compiler run build`

Run: `node --test packages-galerina/galerina-core-compiler/tests/requirement-process-adapter.test.mjs packages-galerina/galerina-core-compiler/tests/requirement-process-protocol.test.mjs`

Commit: `git add packages-galerina/galerina-core-compiler/src/requirement-process-adapter.ts packages-galerina/galerina-core-compiler/tests/requirement-process-adapter.test.mjs packages-galerina/galerina-core-compiler/src/index.ts packages-galerina/galerina-core-compiler/package.json && git commit -m "feat: expose non-authorizing RD-0858 process evidence"`

## Task 8: Full Assurance Matrix, Exact Graph and Documentation

**Files:**
- Modify: `packages-galerina/galerina-core-compiler/tests/requirement-process-protocol.test.mjs`
- Modify: `packages-galerina/galerina-core-compiler/tests/requirement-process-worker.test.mjs`
- Modify: `packages-galerina/galerina-core-compiler/tests/requirement-process-adapter.test.mjs`
- Modify: `scripts/tests/requirement-launcher.test.mjs`
- Modify: `docs/TODO.md`
- Create ignored evidence under: `.superpowers/sdd/2026-08-22-rd-0858-unit4-process-root/`

**Interfaces:**
- Consumes: all prior task contracts and the exact implementation HEAD.
- Produces: one exact-head audit receipt, full graph receipt, independent review locator and model-diverse review locator. It does not produce production, GIR, SLIDE, VOK or `.fungi` authority.

- [ ] **Step 1: Bind an audit-map premanifest**

List exact commands, expected test counts, time/output ceilings, input path digests, Git HEAD and the required no-`.fungi` range assertion. Validate and draw the map before executing its commands; a wrong path or unlisted command refuses the phase.

- [ ] **Step 2: Run the proportional compiler/native matrix**

Run in the premanifested order: core compiler typecheck; build; the four Unit 4 test files; existing `requirement-interpreter.test.mjs`; owned-process-tree tests; process-warden tests; native launcher build/test; and `git diff --check`. Require zero fail/cancel/skip/todo and exact expected counts.

- [ ] **Step 3: Run controlled RED-capability mutations**

In a disposable external copy, weaken each of these one at a time: `authorizing:false`, nonce equality, runtime digest equality, frame maximum, one-request state, timeout-to-ERROR, environment exclusion, process-image equality, no-fallback adapter and scalar profile equality. Each mutation must make its named permanent control fail. Delete nothing in the shared repository.

- [ ] **Step 4: Commit the final evidence/docs update locally**

Update `docs/TODO.md` with exact commit/evidence locators and `HOLD` unless every remaining gate passes. Do not include absolute workstation paths or copied evidence bodies.

Commit: `git add docs/TODO.md packages-galerina/galerina-core-compiler/tests/requirement-process-protocol.test.mjs packages-galerina/galerina-core-compiler/tests/requirement-process-worker.test.mjs packages-galerina/galerina-core-compiler/tests/requirement-process-adapter.test.mjs scripts/tests/requirement-launcher.test.mjs && git commit -m "test: close RD-0858 process-root matrix"`

- [ ] **Step 5: Refresh and verify every required index**

Run a full codebase-memory refresh at final HEAD; require `indexed_head_sha == git rev-parse HEAD`, `actual_nodes == expected_nodes`, `actual_edges == expected_edges`, skipped files `0`, exact repository root and current worktree. Run project graph, graph-integrity, code-index, diagnostic, docs and KB checks in their maintained order. Treat Hypha as a scanner and Myco as a bounded project index; neither can substitute for the persistent code graph or exact Git evidence.

- [ ] **Step 6: Obtain two reviews at one build point**

Independent review must replay source-first protocol, process, authority and mutation controls. Model-diverse review must receive a bounded source-independent packet and independently challenge the architecture. Any material finding returns `HOLD`; repair RED-first and repeat both reviews at the repaired exact commit.

- [ ] **Step 7: Apply the completion algebra**

Claim `CONFIRMED` only if custody is clean, all permanent controls and mutation Reds pass, the graph is exact, both reviews PASS at the same commit and the range contains no `.fungi` path. Otherwise record the exact blocker and retain `HOLD`. Never claim checked snapshot, GIR, SLIDE, VOK, production or conversion authority from this Unit 4 receipt.
