# RD-0858 Unit 4 Scalar-Oracle Admission Design

**Status:** OWNER-APPROVED DESIGN; EXTERNAL CHALLENGE ADJUDICATED; IMPLEMENTATION NOT YET CONFIRMED

**Date:** 2026-08-27

**Governing predecessors:**

- `docs/superpowers/specs/2026-08-21-rd-0858-unit4-process-root-boundary-design.md`
- `docs/superpowers/plans/2026-08-22-rd-0858-unit4-process-root-implementation.md`
- `docs/superpowers/plans/2026-08-26-product-family-package-readiness.md`

## 1. Decision

Create one hand-authored Galerina scalar-oracle `.fungi` source and one
committed, source-free, canonical checked-flow artifact. The artifact is the
only executable flow input admitted by the RD-0858 Unit 4 launcher and worker.
The native registry never names or admits a `.fungi` path.

The source is not a TypeScript conversion and retires no TypeScript owner. It
exists only to close Unit 4 Task 6's missing fixed-flow prerequisite. The
worker result remains bounded non-authorizing evidence; production authority
still requires the checked snapshot -> detached canonical GIR -> SLIDE
physical re-admission -> VOK affine lease and terminal receipt route.

## 2. Selected architecture

```text
committed scalar-oracle.fungi
  -> exact canonical-source admission
  -> strict parser/symbol/type/value/effect/governance/escape/name checks
  -> source-free canonical checked-flow artifact
  -> deterministic source/artifact fixed-point gate
  -> protected registry binds exact artifact bytes and identity
  -> clean single-use worker decodes checked AST
  -> tree-only scalar execution
  -> bounded non-authorizing worker result
  -> launcher recomputation and terminal receipt
```

Three routes were compared:

1. **Selected:** committed canonical checked-flow artifact. This is the
   smallest route that keeps source parsing outside the admitted worker.
2. **Rejected for Unit 4:** reuse the SLIDE checked-decision frontend receipt.
   It is reference-only and does not contain the executable checked AST that
   the current tree interpreter consumes. Reusing it would widen this chapter
   toward SLIDE/VOK authority.
3. **Denied:** compile `.fungi` inside the worker. That would add ambient
   compiler/toolchain authority to the admitted execution process and reopen
   substitution and replay risks.

## 3. Scope

### 3.1 Included

- one `@version 1` Galerina pure flow;
- one closed canonical artifact schema and codec;
- deterministic artifact generation and verification;
- exact protected-registry admission of the artifact;
- clean-worker tree execution for scalar profile `1`;
- deny, ambig and allow decision paths;
- total terminal-state and hostile-neighbour controls;
- the existing Unit 4 non-authorizing parent adapter and assurance matrix;
- exact-head graph/index refresh and two independent review modes.

### 3.2 Excluded

- TypeScript-to-Fungi conversion or TypeScript retirement;
- physical profiles `32`, `64`, `256`, adaptive widths or runtime replanning;
- GIR, `.slide`, VOK lease or production-effect authority;
- `.gate` synthesis;
- Trametes, quantum or another product-family implementation;
- a general checked-flow package format for arbitrary flows;
- dependencies outside the existing repository toolchain.

## 4. Semantic and profile contract

A Trit remains one widthless semantic value in `{−1, 0, +1}`. Physical profile
`1` means one admitted logical Trit is processed per operation; it does not
change Trit meaning.

The scalar oracle itself accepts one canonical `Verdict` subject and returns one decision
label:

```fungi
@version 1
pure flow scalarOracle(subject: Verdict) -> String
contract { effects {} }
{
  check(subject) {
    deny: { return "deny" }
    ambig: { return "ambig" }
    if: { return "allow" }
  }
}
```

The labels express the three governed continuation outcomes. They are not a
physical-width representation and are not an authorizing Boolean. The worker
and launcher receipts must retain `runtimeProfile: "scalar-1"` and
`authorizing: false`.

## 5. Repository layout

| Path | Responsibility |
|---|---|
| `packages/fungi/products/galerina/rd0858-unit4-scalar-oracle/scalar-oracle.fungi` | Human-owned scalar source; canonical UTF-8/LF/NFC bytes only. |
| `packages/fungi/products/galerina/rd0858-unit4-scalar-oracle/scalar-oracle.checked.json` | Committed source-free canonical checked-flow artifact. |
| `packages-ts/galerina-core-compiler/src/checked-flow-artifact.ts` | Closed artifact types, canonical codec, exact validation and digest helpers. |
| `packages-ts/galerina-core-compiler/tests/checked-flow-artifact.test.mjs` | Schema, canonicalization, bounds and mutation controls. |
| `scripts/generate-rd0858-scalar-oracle-artifact.mjs` | Fixed-input generator and fixed-point verifier; no arbitrary source locator. |
| `scripts/tests/rd0858-scalar-oracle-artifact.test.mjs` | Generator, source/artifact pair and CLI refusal controls. |
| Existing Unit 4 launcher/worker/adapter paths | Registry admission, scalar execution and non-authorizing evidence. |

No generic `packages/fungi/shared` contract is introduced. The first artifact
is intentionally product- and RD-specific. Generalization requires measured
reuse and a separate owner decision.

## 6. Canonical source boundary

The generator accepts no caller-selected source path. It resolves the fixed
repository-relative scalar-oracle path from the verified repository root and
requires:

- direct regular tracked file;
- UTF-8 without BOM;
- LF line endings and no other carriage return;
- every string and identifier already NFC;
- first line exactly `@version 1`;
- byte length `1..=65,536`;
- no warning or error from the maintained strict check pipeline;
- exactly one flow named `scalarOracle` with the exact signature, qualifier,
  effects and three explicit returns in Section 4.

The source is never normalized silently. A non-canonical neighbour refuses.
`sourceDigest` is SHA-256 over the exact admitted source bytes.

## 7. Closed artifact

### 7.1 Artifact fields

The artifact contains exactly these fields:

```text
schema                         = "galerina.rd0858.checked-flow.v1"
hashAlgorithm                  = "sha256"
productId                      = "galerina"
packageId                      = "rd0858-unit4-scalar-oracle"
flowLocator                    = "rd0858/unit4/scalar-oracle"
flowName                       = "scalarOracle"
languageVersion                = 1
runtimeProfile                 = "scalar-1"
sourceCanonicalization         = "UTF8_NO_BOM_LF_NFC_V1"
sourceDigest                   = "sha256:" + 64 lowercase hex
compilerPackageId              = "@galerina/core-compiler"
compilerVersion                = exact package version
compilerPackageGraphDigest     = "sha256:" + 64 lowercase hex
checkerSetId                   = "galerina.strict-checks.v1"
checkerSetDigest               = "sha256:" + 64 lowercase hex
generatorId                    = "rd0858-scalar-oracle-generator.v1"
generatorSourceDigest          = "sha256:" + 64 lowercase hex
qualifier                      = "pure"
parameters                     = [{"name":"subject","type":"Verdict"}]
returnType                     = "String"
declaredEffects                = []
checkedAst                     = closed location-free checked AST
```

There is no self-referential `artifactDigest` field. The generator, registry
and receipt compute the artifact digest over the complete canonical artifact
byte string and store it outside that byte string.

### 7.2 Canonical bytes

`encodeCheckedFlowArtifact` emits exactly one UTF-8 JSON byte string followed
by one LF. The codec:

- emits object keys in one fixed schema order;
- emits array elements in semantic order;
- accepts only integers, booleans, null, arrays, closed objects and NFC strings;
- rejects duplicate/unknown/missing fields, accessors, Proxies and symbols;
- rejects non-minimal escapes, non-canonical numbers and trailing bytes;
- bounds artifact bytes to `262,144`, depth to `64`, values to `16,384` and
  checked-AST nodes to `8,192`;
- decodes then re-encodes and requires byte equality;
- carries no source text, comments, memory bodies or absolute paths.

Every declared field is therefore inside the artifact digest. A field cannot
be edited, reordered or omitted while retaining the admitted identity.

### 7.3 Checked AST

The generator snapshots only the exact checked flow subtree after every strict
check passes. The snapshot includes every interpreter-semantic node kind,
operator, literal, identifier, ordered child and type/effect contract required
for execution. It excludes source locations, comments and presentation fields.

The decoder separately derives qualifier, parameters, return type and declared
effects from `checkedAst` and requires equality with the top-level fields. It
also requires the exact `require` shape and the three terminal string values.

## 8. Toolchain identity

The artifact binds the exact compiler package version, package-graph digest,
checker-set digest and generator-source digest used to produce it. The checker
set covers parser, symbol resolution, type checking, value-state checking,
effect checking, governance verification, source-escape checking, naming
policy and the checked-artifact codec.

The generator reads each toolchain file as a held direct regular file, hashes
it before use, performs the generation twice in separate clean Node processes,
and rechecks every held identity/digest afterwards. Drift refuses and leaves
the previously committed artifact untouched.

## 9. Source/artifact fixed point

Generation uses an explicit output candidate outside the committed artifact
path. It never overwrites the committed artifact directly.

The verifier requires:

1. two isolated generator runs over the same source/toolchain produce
   byte-identical candidates;
2. candidate `sourceDigest` equals the live canonical source digest;
3. candidate toolchain fields equal the live held identities;
4. the checked AST revalidates independently;
5. candidate bytes equal the committed artifact in `--check` mode.

Changing source or toolchain bytes without regenerating makes `--check`
refuse. The runtime launcher still never reads or admits source. The fixed-point
gate belongs to repository/build admission, while the protected registry binds
only the verified artifact.

## 10. Protected registry and TOCTOU

The build step accepts the checked artifact only through its fixed internal
locator. It refuses any `.fungi` argument or registry value. Before creating a
registry it requires the source/artifact fixed-point verifier to pass.

The registry adds exact closed fields for:

- product, package, flow and scalar-profile identity;
- checked-artifact absolute runtime locator;
- direct-file volume/file identity;
- exact artifact byte length and SHA-256 digest;
- artifact schema and compiler-package-graph digest.

The launcher opens and holds the artifact first, rejects reparse/link/non-disk
files, verifies identity and bytes from the held handle, rechecks metadata and
retains the handle through worker resume. The worker receives the admitted
artifact bytes through the owned channel; it does not reopen a name selected by
the caller.

## 11. Worker execution

The worker preserves the Task 5 single-use state machine. After bootstrap and
request admission it:

1. accepts only `flowLocator: "rd0858/unit4/scalar-oracle"` and profile
   `"scalar-1"`;
2. verifies the artifact digest and closed identity against launcher evidence;
3. decodes canonical arguments as exactly `{"subject": <canonical Verdict>}`;
4. decodes and independently revalidates the checked AST;
5. calls `executeFlow` with fast paths disabled and requires
   `executionTier: "tree"`;
6. requires exactly one value in `"deny" | "ambig" | "allow"` and a bounded
   audit result;
7. erases the checked AST and arguments before emitting one result frame;
8. closes permanently after the result or any refusal/error.

No dynamic import, source parse, compiler invocation, child process, network,
undeclared effect, second request, retry or profile substitution is available.

## 12. Total terminal-state algebra

Every invocation ends with exactly one bounded launcher receipt. A missing
worker result is represented as explicit missing evidence; it never suppresses
the launcher receipt.

| Condition | State | Code |
|---|---|---|
| Valid scalar flow completes | `COMPLETE` | `NONE` |
| Artifact schema/field/bound failure | `REFUSED` | `CHECKED_ARTIFACT_SCHEMA` |
| Artifact bytes are non-canonical | `REFUSED` | `CHECKED_ARTIFACT_CANONICAL` |
| Artifact digest/identity mismatch | `REFUSED` | `CHECKED_ARTIFACT_DIGEST` |
| Product/package/flow/profile mismatch | `REFUSED` | `CHECKED_ARTIFACT_IDENTITY` |
| Checked AST coherence/shape failure | `REFUSED` | `CHECKED_AST_UNSUPPORTED` |
| Argument field/type/digest failure | `REFUSED` | `ARGUMENT_CONTRACT` |
| Request nonce mismatch or replay | `REFUSED` | `NONCE_MISMATCH` |
| Second request/frame | `REFUSED` | `SECOND_REQUEST` |
| Bootstrap control failure | `REFUSED` | `BOOTSTRAP_CONTROL` |
| Unsupported platform | `REFUSED` | `UNSUPPORTED_PLATFORM` |
| Interpreter throws after execution begins | `ERROR` | `FLOW_EXECUTION` |
| Whole-operation deadline expires | `ERROR` | `WORKER_TIMEOUT` |
| Worker crashes or output is truncated | `ERROR` | `WORKER_CRASH` |
| Caller cancels | `CANCELLED` | `CALLER_CANCELLED` |

No timeout, crash, truncation, missing evidence, malformed input or unknown
condition becomes `COMPLETE`. Unclassified exceptions become bounded `ERROR`
with `authorizing: false`.

## 13. Assurance matrix

The smallest required matrix includes:

- strict source PASS and one-bit/LF/CRLF/BOM/NFC/NFD neighbours;
- two-process byte-identical generation;
- source edit with stale artifact refusal;
- toolchain edit with stale artifact refusal;
- missing/extra/reordered/forged artifact fields;
- product/package/flow/profile/generator/checker/package-graph mutations;
- duplicate keys, non-minimal escapes, invalid UTF-8, depth/value/node/byte bounds;
- direct-file replacement, link, junction, case alias and held-handle drift;
- runtime registry row pointing at `.fungi` refusal;
- canonical Verdict allow/ambig/deny and malformed-value refusal discriminators;
- every row of the terminal-state algebra;
- second request, nonce replay, timeout, crash and truncation;
- four existing process-root attacks producing byte-equivalent clean-worker
  semantic value/audit evidence;
- static no-fallback/no-compiler/no-source/no-profile-widening controls;
- controlled mutations proving each named permanent control can turn red.

Tests and audits run sequentially under the maintained phased manifest. No
all-at-once estate is permitted.

## 14. External challenge adjudication

Grok Expert received a 6,724-byte, five-vector, source-minimal prompt with
SHA-256 `0a200006d5ed90faf56ed5b9d8b69a4f966c22bc2edca0f6e5a618504b8fa31c`.
Its 7,542-byte captured reply has SHA-256
`bf034dcf94b3ba992ab421686042a329762e99f673ac7bd66294c14c1965f769`
and recommended `REVISE_BEFORE_SPEC`.

Adjudication:

| Hypothesis | Ruling | Design response |
|---|---|---|
| Incomplete hash envelope | `UPHELD` | Sections 7 and 8 put every closed identity field inside canonical bytes. |
| Non-canonical serialization/replay | `UPHELD` | Sections 6, 7 and 9 define exact source/artifact bytes and fixed-point tests. |
| Stale source versus committed artifact | `UPHELD` | Section 9 requires pair equality before registry creation. |
| Open worker failure path | `UPHELD` | Section 12 defines total terminal receipts. |
| Cross-product artifact reuse | `UPHELD` | Product/package/flow identity is inside artifact and registry admission. |
| Flow must return physical Trit values | `REJECTED` | Profile width is execution evidence; the flow returns K3 decision labels. |

The external answer is advisory and cannot mint PASS or implementation
authority.

## 15. Delivery and Git custody

- Work only on `codex/rd-0858-unit4-scalar-oracle` in its isolated worktree.
- Commit locally at independently reviewable task boundaries.
- Do not push or create a pull request.
- Preserve every other registered worktree and branch.
- Merge into `codex/rd-0858-unit4-process-root` only after exact-head tests,
  controlled red capability, full zero-exclusion graph and independent plus
  model-diverse review all pass at one build point.
- Do not merge to `main` from this chapter unless a later owner integration
  gate separately proves ancestry, custody and publication authority.

## 16. Completion claim

This design is `SPECIFIED`, not `CONFIRMED`. The implementation may claim only
`RD0858_UNIT4_SCALAR_EVIDENCE_CONFIRMED` when:

- source/artifact/toolchain fixed point passes;
- every terminal and hostile control passes;
- the four process-root attacks are isolated;
- registry and worker never admit source;
- all receipts remain bounded and non-authorizing;
- exact-head graphs/indexes are fresh with zero exclusions;
- independent and model-diverse reviews pass at the same commit;
- Git custody is clean and the changed-path set is exact.

Even then, GIR, SLIDE, VOK, production execution, TypeScript retirement,
profiles beyond `1`, Trametes and general conversion remain HOLD.
