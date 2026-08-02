# Windows static linked-host build report

Date: 2026-08-02

Platform: Windows 10 x86-64

Verdict: **CANDIDATE_NON_AUTHORIZING**

## Outcome

The pinned Node 24.18.0 source, Galerina linked binding and release Rust
durability static library now build as one Windows executable. This closes the
previously missing local linker/toolchain implementation seam. It does not
admit that executable for production: there is no signed-host admission, the
production executable-digest set remains empty, and the external crash,
power-loss and platform matrix remains incomplete.

Candidate executable SHA-256:
`5ef4060862ba9e44b60a4f9da58070f5a16983f7976914c69b7a911fa27660c1`.
The digest is measured build evidence, not a source constant or trust anchor.

## Exact inputs

- Node source: 24.18.0 archive, SHA-256
  `c8348067b41d8739ec69fd4da615cd8995ad6a76eb53e84a7fa7291c8a477eb7`.
- Visual Studio: 18.8.12023.21.
- Clang: 22.1.3, LLVM commit `e9846648fd6183ee6d8cbdb4502213fcf902a211`.
- NASM: 3.02, exact executable already pinned by `host-build-recipe.json`.
- Rust/Cargo: 1.96.1, Rust commit
  `31fca3adb283cc9dfd56b49cdee9a96eb9c96ffd`, target
  `x86_64-pc-windows-msvc`, release profile, no features.
- OpenSSL assembly stayed enabled. No `openssl-no-asm` fallback was used.

The read-only toolchain verifier returned `CANDIDATE` and
`productionAuthorizing:false` before construction.

## Build findings and bounded corrections

The first complete compile exposed an upstream Clang 22 type mismatch in
Node's bundled HdrHistogram source. `_BitScanReverse64` requires an
`unsigned long *`, while the source supplied `uint32_t *`. Windows uses a
32-bit `unsigned long`, so the pinned compatibility patch changes the local
variable's spelling without changing its width or arithmetic. The patch is
admitted only for the exact HdrHistogram preimage SHA-256
`ee2fff097bcdf1458931e27023bed08a6b00806b98bfd44261e88e8b547a4ebc`.
Warnings were not disabled.

The next link exposed missing Windows native-system imports from the manually
linked Rust static library: `RtlGetVersion`, `NtReadFile`,
`RtlNtStatusToDosError`, `NtCreateFile`, `NtWriteFile`, `NtOpenFile` and
`NtCreateNamedPipeFile`. The closed host patch now records `ntdll.lib` and
`userenv.lib` as its exact Windows system-library set. The third build exited
zero and produced `node.exe`.

## Executed boundary evidence

- Focused recipe/source verifier: 6/6.
- Stock Node reports no `_galerinaLinkedBinding` accessor.
- Custom-host integration: 2/2.
- The accessor is an own, non-configurable, non-enumerable, non-writable data
  property.
- The returned binding is frozen and exposes only `publishGeneration` and
  `isReceipt`.
- Malformed input returns verdict `-1` and
  `PRODUCTION_HOST_JS_INPUT_REFUSED`.
- Exact domain-separated generation bytes publish and reopen byte-for-byte.
- A same-directory `galerina_registry_durability.node` decoy has no effect.
- The native receipt brand succeeds once, then refuses reuse; a frozen
  structural copy refuses.
- The successful candidate receipt explicitly returns
  `productionAuthorizing:false`.
- PE imports include normal Windows system DLLs, including `ntdll.dll` and
  `USERENV.dll`; there is no external Galerina adapter or `.node` import.

## Remaining gates

1. Implement the reproducible construction command so a fresh exact source
   tree can repeat the complete preparation and build without manual edits.
2. Integrate the linked native receipt into the app-kernel production
   persistence entry point and retain the production executable allow-list as
   empty until signed-host admission.
3. Run the full app-kernel, repository, graph, audit, security and
   strict/exhaustive fixed point after integration.
4. Obtain current authenticated Windows, Linux and macOS release receipts plus
   the separately scoped crash/reboot/power-loss evidence.

No production rotation authority, release authority, cross-platform claim or
SLIDE final-runtime claim follows from this local build.
