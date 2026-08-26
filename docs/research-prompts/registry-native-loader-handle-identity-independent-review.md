# Independent deep-research prompt — native loader handle identity

Date: 2026-07-31

Status: read-only adversarial research; no implementation or authority grant

## Purpose

Challenge a newly discovered blocker in Galerina's production registry
durability design: the candidate native bytes can be opened, bounded and
hashed exactly, but standard Node/OS executable loaders accept a path and may
run module initialization before a post-load identity check.

Galerina, SLIDE and the Knowledge Base are read-only. Write only the assigned
review report. Do not inspect private material, install dependencies, compile,
sign, edit source, commit or push.

## Read first

- `Galerina/docs/research/registry-native-loader-content-identity-limit-2026-07-31.md`
- `Galerina/docs/architecture/registry-generation-platform-durability-2026-07-30.md`
- `Galerina/packages-ts/galerina-framework-app-kernel/src/registry-durability-artifact.ts`
- its focused tests and `.fungi` terminal contract
- the native Windows host-probe crate
- `ZTF-Knowledge-Bases/ai-reviews/ZERO-TRUST-ADOPTION-SCORE.md`

## Non-negotiable threat model

- Verify, do not assume; every unknown result fails closed.
- Native bytes must not execute merely because a path or digest string looks
  correct.
- A post-load check cannot undo code that already initialized.
- A shell, spawned CLI, writable sidecar or PowerShell bridge is not currently
  admitted.
- Implementation language earns no trust.
- Production authority stays on the old complete generation after every
  failure or uncertainty.
- The answer must support Windows 10/11, Debian/Ubuntu, Fedora/Mint and macOS,
  and must distinguish platform-specific facts.

## Questions

1. Confirm or refute from primary sources whether Node `process.dlopen`,
   Windows `LoadLibraryExW`, Linux `dlopen` and macOS `dlopen` can execute an
   already-open exact file handle rather than resolving a path.
2. On Windows, can a verifier retain a handle with share modes that prevent
   write/delete/rename and still allow the loader to map that same file? Can
   stock Node create that handle before any native addon is loaded?
3. Can `LOAD_LIBRARY_AS_DATAFILE_EXCLUSIVE`, section objects, transacted files,
   image mappings, file IDs or another supported Windows mechanism safely
   bridge verified bytes to Node-API initialization? Identify unsupported or
   deprecated mechanisms.
4. On Linux, does `/proc/self/fd/<fd>` plus `dlopen` bind the mapped primary
   object to the descriptor? What happens to dependencies, deleted files,
   mount namespaces, containers and systems without procfs?
5. On macOS, do `dlopen`, `fcntl`, code-signing APIs, Hardened Runtime or
   library validation provide an exact verified-handle execution property?
6. Can a native executable/container parser prove required Node-API exports,
   import allow-lists and `NAPI_VERSION=10` without executing the module? State
   what static inspection cannot prove.
7. Does a Node single-executable application remove the seam, or merely extract
   a native asset to a path and call `process.dlopen`?
8. Is a custom Node build with a statically linked/internal durability binding
   technically supportable and narrower than a dynamic addon? Quantify its
   toolchain, maintenance and reproducibility costs.
9. Could a minimal independent Galerina/SLIDE host runtime expose the required
   syscall ABI sooner and more safely than a custom Node fork without violating
   the owner-mandated release order?
10. What exact residual threat must be accepted if the project chooses
    absolute path + pinned digest + OS code signature + ACL + pre/post file-ID
    checks?
11. Propose falsification tests for path replacement, dependency hijack,
    module-cache confusion, constructor/DllMain execution, wrong ABI, wrong
    N-API version and post-load identity mismatch.
12. Identify any better option outside the supplied list. Use your own
    intuition and state when a desired guarantee is impossible.

## Required answer

1. Executive verdict: `REJECT`, `RESEARCH`, `PROTOTYPE` or `ADMIT-CANDIDATE`.
2. Evidence-labelled Windows/Linux/macOS table.
3. Exact load sequence for every viable option.
4. Earliest point at which candidate-controlled code may execute.
5. Whether executed bytes are cryptographically/content-identically bound.
6. Dependency-search and constructor threat analysis.
7. Static binary inspection limits.
8. Custom-runtime versus dynamic-addon versus SLIDE comparison.
9. Zero-trust score and hard-veto audit for each option.
10. Reproducible falsification plan.
11. Clear recommendation and owner-only decisions.
12. Additional findings outside scope.

Use current primary Node, Microsoft, Linux/POSIX and Apple documentation.
Separate documented guarantees, measured behavior, inference and unknowns.
Do not repeat Galerina's preferred answer if the evidence contradicts it.
