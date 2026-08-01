# Statically linked Galerina host implementation plan

**Goal:** Replace the unreachable stock-Node beta durability seam with one
measured Galerina bridge executable in which Node, the narrow binding and the
Rust durability adapter are linked into the same image.

**Architecture:** The release build patches one exactly pinned Node source
archive. It registers a linked binding at build time and exposes only a
non-configurable Galerina host accessor. The Rust boundary independently
re-derives the generation identity before platform publication. The
app-kernel re-verifies the published generation and accepts only a native
receipt whose object identity is retained by the linked binding. Stock Node,
pathname-loaded addons, callbacks and child processes cannot mint the private
production receipt.

**Final-runtime boundary:** this host is a beta-v1 bridge, not the final
`.fungi` loader architecture. Owner-approved RD-0656 selects a Galerina-owned
Verified Execution Object: the final SLIDE/runtime path consumes an opaque
admitted object over owned bytes and never reopens a pathname. The bridge must
therefore remain replaceable and must not introduce a Node-shaped public
contract into `.fungi`.

**Pinned upstream:** Node.js `v24.18.0`; official source archive SHA-256
`c8348067b41d8739ec69fd4da615cd8995ad6a76eb53e84a7fa7291c8a477eb7`.
The large upstream tree stays outside Galerina. This repository owns only the
pin, patch, build recipe, binding and verification rules.

## Non-negotiable boundaries

- No `.node` file, `process.dlopen`, spawned helper, shell bridge or writable
  sidecar enters production authority.
- The linked call accepts bounded bytes, not a caller assertion that bytes
  were verified.
- Rust re-derives
  `SHA-256("galerina.registry.generation.v1\0" || canonical_bytes)` and
  refuses a different generation ID before opening the target.
- Direct binding access cannot overwrite a valid generation: publication is
  exact and no-replace; same ID/different bytes is impossible without a
  digest break and still fails readback.
- Stock Node has no production host accessor and must fail closed.
- The app-kernel brands only the exact native receipt object. Copies,
  serialization, Proxies and caller-created lookalikes fail.
- A built host is an implementation candidate, not production admission.
  Signed-host identity and the external OS/crash/power-loss evidence remain
  separate gates.

## Task 1 - Rust C ABI and identity gate

- [x] Add `staticlib` to the native crate output without removing `rlib` or
  the development `cdylib`.
- [x] Add a fixed-layout v1 output record and one `extern "C"` entry point.
- [x] Validate null pointers, lengths, UTF-8, absolute directory, exact
  lowercase generation ID and the 16 MiB ceiling before filesystem I/O.
- [x] Re-derive the domain-separated generation ID in Rust.
- [x] Dispatch only to the compiled Windows, GNU Linux or macOS admitted
  publication implementation. Unknown platform/profile terminates with a
  stable denial code.
- [x] Catch all recoverable boundary failures; no Rust panic may cross FFI.
- [x] Add pure hostile tests for every malformed pointer-independent input,
  identity mismatch, oversized bytes and platform denial.

## Task 2 - Linked Node binding

- [x] Add a small context-aware C++ linked binding using Node's documented
  embedder `NODE_MODULE_LINKED` mechanism.
- [x] Convert JS strings/byte views into bounded borrowed inputs without a
  pathname loader and return a closed frozen result.
- [x] Retain successful native receipt identity inside the binding and expose
  a native `isReceipt` predicate; a structurally equal object is false.
- [x] Patch the pinned host so a non-configurable
  `process._galerinaLinkedBinding()` selects only this linked module. It must
  exist before user modules and must not accept an arbitrary binding name.
- [ ] Add upstream-host tests proving stock Node lacks the accessor, the
  accessor cannot be replaced, a hostile `.node` decoy is irrelevant, and
  no child executable is invoked.

## Task 3 - Reproducible host construction

- [x] Add a closed build recipe containing the exact Node version/archive and
  pristine preimage digests, Galerina source-manifest/binding/patch digests,
  NASM archive/executable digests, Cargo lock, Rust target/profile/compiler and
  closed build switches. Exact Clang/SDK identity remains a generated build
  receipt field because the required component is not installed.
- [ ] Add a build tool that requires an already-present verified source tree;
  it may not silently download or accept an unpinned source directory.
- [ ] Apply the patch only when every preimage hunk matches.
- [ ] Build the Rust static library and then the custom Node executable with
  release assertions and fault injection absent.
- [ ] Verify the final executable imports no external Galerina adapter and
  that running from a polluted directory produces identical profile output.
- [ ] Record the final executable digest as build evidence, never as a source
  constant.

Current build prerequisite: Node 24 requires Visual Studio's supported
Clang/LLVM toolset. The installed Visual Studio instances do not yet expose
`Microsoft.VisualStudio.Component.VC.Llvm.Clang` and
`Microsoft.VisualStudio.Component.VC.Llvm.ClangToolset`. The binding itself
passes an isolated C++20 syntax compile; this does not substitute for a full
linked-host build. OpenSSL assembly also requires NASM; production will not
silently select `openssl-no-asm` merely to clear this gate.

The read-only preflight is now implemented at
`scripts/verify-registry-static-host-toolchain.mjs` and passes its focused
**4/4** tests, including accessor/Proxy refusal without side effects. It
requires direct absolute compiler/assembler paths and exact
version shapes, returns only `CANDIDATE` or `REFUSED`, and is always
non-authorizing. The current host refuses with
`STATIC_HOST_CLANG_COMPONENTS_ABSENT`. The installer is never invoked by this
probe; current owner actions are separated into
`docs/platform-handover/windows-static-host-toolchain/NOW.md`.

## Task 4 - App-kernel production integration

- [ ] Add a production persistence entry point distinct from
  `createRegistryGenerationHostEvidenceAdapter`.
- [ ] Verify the generation and canonical bytes before the linked call, then
  load and re-verify the exact published generation afterward.
- [ ] Brand a production receipt only when the linked binding's native
  identity predicate succeeds and all host/profile identities match.
- [x] Remove caller `verifyForwardProbe` from the production rotation surface;
  consume an exact one-use generation-bound host probe receipt instead.
- [ ] Keep the governed production digest list empty until signed-host and
  external evidence admission is complete.

## Task 5 - Falsification and close

- [ ] Prove callback injection, accessor/Proxy input, copied receipt,
  generation mismatch, polluted working directory, pathname decoy, process
  spawn and post-publication mutation do not grant authority.
- [ ] Run native fmt, Clippy with warnings denied, default/all-feature/release
  tests, the host build, app-kernel, strict/exhaustive phase-close, every graph
  tool and the standard plus independent security scan.
- [ ] Update `docs/TODO.md`, the beta roadmap, architecture report, platform
  matrix and external handovers from measured facts.
- [ ] Change the production-rotation roadmap node from red to amber only after
  the linked host builds and the app-kernel proves that stock Node cannot mint
  its receipt. Green still requires the complete signed external matrix.
