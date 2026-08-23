# RD-0858 Unit 4 process-root boundary design

**Status:** INDEPENDENT DESIGN PASS; TASKS 1, 3, 4 AND 5 IMPLEMENTED;
TASK 5 INDEPENDENT IMPLEMENTATION PASS

**Date:** 2026-08-21

**Decision basis:** RD-0858 Unit 4 independent re-review Fix Round 6 at
`.superpowers/sdd/2026-08-21-rd-0858-requirement-interpreter/task-1-independent-rereview-6.md`

**Implementation checkpoint:** Fresh independent review of exact graph target
`e55c7b9e` returned `PASS` with zero findings. The permanent test mutates the
actual imported protocol bytes, independently turns RED when protocol admission
is bypassed, and returns GREEN on the unchanged target. Package identity,
receipt truth, the whole-operation deadline, proportional gates and the
39-path/zero-`.fungi` range also passed. Owner direction permits the remaining
non-`.fungi` prerequisites to continue, but this checkpoint does not authorize
`.fungi` authoring or conversion, GIR authority, SLIDE admission or a VOK lease.

## 1. Decision

Use a small native admitted launcher to start one clean, single-use Galerina
interpreter worker. The launcher binds the exact runtime and worker package,
removes ambient preload authority, owns the process tree, admits one bounded
canonical request, validates one bounded canonical response, records a
non-authorizing receipt and terminates the worker.

The calling Node process is not a trust anchor and cannot authorize the returned
result. Any later production route must independently admit the exact receipt
and subject through the checked snapshot -> detached canonical GIR -> SLIDE
physical execution/re-admission -> VOK lease route.

This design is the selected Windows-first proof slice. It is not a production
admission, a general sandbox claim, a `.fungi` conversion authority or a claim
that this is the only possible architecture.

## 2. Why another scalar JavaScript patch is denied

The current scalar boundary is green after a trustworthy module bootstrap, but
four fresh-process controls proved that same-realm code can poison shared Node
built-ins before the first interpreter evaluation. Capturing or freezing a
reference after that event preserves the hostile reference.

The defect is therefore earlier than the Galerina value boundary:

```text
host process starts
  -> attacker changes process roots
  -> interpreter captures the changed roots
  -> local validation observes attacker-selected functions
```

No later `const`, frozen object, fresh `vm` realm or reload rule can recover a
pristine root from that already-subverted process. Continuing that patch loop
would misclassify a process-root trust problem as an input-validation problem.

## 3. Alternatives compared

| Route | Result | Reason |
|---|---|---|
| Freeze and refuse inside the caller | DENY | A pre-bootstrap attacker decides what is frozen. |
| Capture more Node built-ins or use another `vm` realm | DENY | Named exports and new realms are initialized from shared process state. |
| Native helper loaded by the hostile Node process | HOLD | It may protect its own code, but returning an authorizing Boolean to a compromised caller does not protect the guarded continuation. |
| Exclude the pre-bootstrap threat | NOT SELECTED | This would narrow the security claim rather than close the demonstrated boundary. |
| Native admitted launcher plus one clean worker | SELECTED | It moves bootstrap ordering, process ownership and the complete governed execution outside the hostile Node realm. |

## 4. Trust boundary

### 4.1 Trusted for the Windows-first proof

- the operating-system process creation, image mapping and Job Object APIs;
- the exact native launcher bytes;
- the protected launcher/package directory and its custody policy;
- the exact admitted Node runtime image;
- the exact worker package bytes;
- the launcher's bounded canonical framing and digest implementation;
- the native identity and process-tree evidence named by the receipt.

Every trusted item must have an exact identity and an independently reopenable
evidence locator. A filename, PATH entry, version string or successful launch is
not identity evidence.

### 4.2 Untrusted

- the calling Node process and all of its intrinsics, module caches and globals;
- command-line, environment, current directory, PATH and preload configuration;
- the request body, flow bytes, arguments and claimed digests;
- filesystem names, links, junctions, case variants and replacement attempts;
- worker output before framing, bounds and digest checks pass;
- summaries, graph projections and generated roadmap views;
- the parent process's interpretation of a response;
- a capability report or profile proposal made by the executing component.

### 4.3 Explicit first-slice exclusions

The first proof does not claim resistance to a compromised kernel, local
administrator, compromised launcher binary, malicious firmware or physical
hardware attack. These exclusions are named residual trust, not silent PASSes.
Unsupported platforms refuse until their own native launcher and evidence
contract are admitted.

## 5. Components

### 5.1 Native launcher

Create a separate narrow launcher rather than widening `process-warden` into an
authority monolith. Reuse its proven Windows Job Object and suspended-start
patterns through a reviewed library seam where practical.

The launcher must:

1. accept one fixed-version request envelope over standard input or an
   anonymous inherited pipe;
2. resolve the registered runtime and worker package from a protected local
   registry, never from the caller's PATH or current directory;
3. reject links, reparse ambiguity, case ambiguity, unexpected file identity,
   byte-digest mismatch and unsupported file type;
4. create the worker suspended with a new process group and owned Job Object;
5. use an explicit environment allow-list and remove `NODE_OPTIONS`,
   `NODE_PATH`, preload hooks, inspector flags and package-manager injection;
6. verify the created process image and package identity before resume;
7. impose one whole-operation deadline plus byte, frame, depth, event and child
   process ceilings;
8. exchange one nonce-bound ready frame, one request and one response;
9. kill the complete owned process tree on timeout, cancellation, protocol
   error, identity drift or unexpected child creation;
10. emit one bounded receipt and exit with a closed classification.

The launcher cannot select a physical Trit profile based on worker preference.
For RD-0858 Unit 4 it registers scalar profile `1` only.

### 5.2 Clean worker

The worker is a fixed package with no user startup modules. It must:

- capture its required runtime roots before reading any caller-controlled byte;
- refuse if its bootstrap self-controls do not recognize canonical own-data
  Bool/Verdict values and reject Proxy/accessor inputs;
- load only the exact package graph admitted by the launcher;
- parse one bounded canonical request;
- execute the complete governed flow, including guarded continuation, inside
  the worker rather than returning an authorizing Boolean to the parent;
- return one canonical result/audit envelope;
- reject a second request, module reload, dynamic import outside the package,
  new child process, network effect or undeclared host effect;
- exit after the response or any refusal.

### 5.3 Existing process warden

`scripts/native/process-warden` remains a process-lifetime and Job Object owner.
Its current source/binary receipt proves its own build identity; it does not
prove the target runtime or worker identity and does not authorize Unit 4.

The implementation may extract its process-tree primitives into a narrow native
library. It must not relabel the existing warden receipt as a launcher admission.

### 5.4 Parent adapter

The existing TypeScript interpreter adapter may submit a request and display a
result, but it must treat the result and receipt as non-authorizing evidence.
It may not execute guarded effects, mint `ALLOW`, silently fall back to the
in-process interpreter or rescue a failed worker at runtime.

## 6. Protocol

Use length-prefixed canonical UTF-8 JSON for the proof slice. Every frame has a
fixed maximum size, closed fields, duplicate-key refusal, maximum nesting and
maximum value counts. Unknown fields and trailing bytes refuse.

```text
launcher request
  schemaVersion
  nonce
  runtimeProfile: "scalar-1"
  subjectDigest
  flowLocator
  flowDigest
  argumentDigest
  argumentBytes

worker ready
  schemaVersion
  nonce
  workerDigest
  runtimeDigest
  bootstrapControlDigest

worker result
  schemaVersion
  nonce
  executionState
  valueDigest
  auditDigest
  boundedValue
  boundedAudit
```

The launcher independently recomputes every digest over the admitted bytes. A
digest supplied by the caller or worker is a claim until recomputed.

Closed execution state:

`COMPLETE | REFUSED | ERROR | CANCELLED`

A timeout is `ERROR`, never `COMPLETE`. A malformed or partial frame is
`REFUSED` or `ERROR` according to whether admission or execution had begun.

## 7. Receipt

The receipt is a bounded locator-and-digest record containing:

- receipt schema and hash-algorithm identity;
- launcher, process-owner, runtime and worker identities/digests;
- protected package/registry identity;
- operating-system and process-policy evidence locators;
- environment-policy digest;
- scalar profile `1` registration digest;
- request, subject, flow, argument, response, value and audit digests;
- nonce, monotonic duration and closed execution state;
- timeout, truncation, partial and missing-evidence fields;
- exit code and refusal code;
- `authorizing: false`.

The receipt stores no source body and no copied project memory. It is replay
protection and evidence routing, not a VOK lease or review verdict.

## 8. Deterministic fallback algebra

There is no in-process rescue.

```text
launcher/package admitted and worker completes -> return non-authorizing receipt
launcher unavailable                            -> REFUSED
runtime or worker identity mismatch              -> REFUSED
bootstrap control fails                          -> REFUSED
protocol malformed or over bound                 -> REFUSED
worker crashes or exceeds deadline               -> ERROR
caller cancels                                   -> CANCELLED
unsupported platform                             -> REFUSED
```

If later width profiles are admitted, replanning is a new admission identity and
receipt. The registered order remains `256 -> 64 -> 32 -> 1`, while semantic
Trit values remain widthless in `{−1, 0, +1}`. RD-0858 Unit 4 implements and
proves only profile `1`.

## 9. Required RED/GREEN controls

Every RED has a green discriminator.

### 9.1 Existing causal attacks

- pre-first-import `node:util/types.isProxy` targeted poisoning;
- retained-state Proxy-detector poisoning armed after visible restoration;
- pre-first-import `node:vm.runInNewContext` descriptor-reader poisoning;
- retained-state descriptor-reader poisoning armed after restoration.

All four must fail to influence the clean worker. Reproducing them only against
the old in-process route is necessary RED evidence but not GREEN evidence.

### 9.2 Launcher and package admission

- runtime digest mismatch;
- worker digest mismatch;
- link, junction, reparse point, case shadow and replacement attempt;
- changed package after admission but before resume;
- unexpected process image after suspended creation;
- missing or stale registry evidence;
- unsupported platform;
- ambient PATH, current-directory and environment spoofing;
- preload, inspector, `NODE_OPTIONS` and `NODE_PATH` injection;
- extra child process or process-tree escape.

### 9.3 Protocol and resource bounds

- duplicate or unknown fields;
- invalid UTF-8, non-canonical JSON and trailing bytes;
- zero, oversized and truncated frames;
- depth, value-count, argument, result, audit and event ceilings;
- nonce mismatch and replay;
- result before ready;
- second request or response;
- timeout, cancellation and worker crash;
- output truncation that cannot become COMPLETE.

### 9.4 Authority separation

- forged parent `ALLOW` cannot satisfy receipt validation;
- worker output without launcher recomputation refuses;
- author-produced review verdict refuses;
- receipt with `authorizing: true` refuses;
- absent VOK admission cannot execute a production guarded effect;
- scalar profile evidence cannot authorize `32`, `64` or `256`.

## 10. Implementation sequence

1. Independently review this design against the Fix Round 6 attack evidence.
2. Write the launcher/worker protocol schema and known-answer vectors.
3. Plant the four causal pre-bootstrap RED controls against the current route.
4. Implement the smallest native launcher skeleton with fixed package identity,
   no interpreter behavior and controlled refusal exits.
5. Add the single-use worker bootstrap and canonical framing.
6. Move one complete RD-0858 governed flow into the worker.
7. Prove launcher, worker, process-tree, protocol and authority-separation
   controls; run proportional compiler regressions.
8. Commit local-only, refresh every required graph/index at the exact commit and
   obtain independent plus model-diverse review.
9. Keep Unit 4 on HOLD until both reviews PASS at one exact build point.

## 11. Stop conditions

Stop and return HOLD if:

- runtime or worker identity depends only on a path or version string;
- the launcher accepts ambient executable/module discovery;
- the parent can authorize or execute guarded effects from the response alone;
- the worker serves more than one request or loads caller-selected code;
- any timeout, partial frame, truncation or missing evidence becomes COMPLETE;
- the implementation widens `process-warden` into an unreviewed authority
  owner;
- a clean worker requires a new dependency without provenance and admission;
- graph/index freshness cannot be bound to the exact implementation commit;
- any `.fungi` conversion begins before Unit 4 and the remaining RD-0858 route
  are independently admitted.

## 12. Completion claim

The design earns only `SPECIFIED` after an independent design PASS. A later
implementation earns `CONFIRMED` only when the causal attacks turn red against
the old route, the complete clean-worker matrix turns green, custody is clean,
the graph is exact and both required reviews PASS at the same commit.

Until then RD-0858 Unit 4, checked snapshot, GIR, SLIDE, VOK, production and
`.fungi` conversion authority remain HOLD.
