# Registry native loader: verified bytes versus executed image

Date: 2026-07-31

Status: researched constraint; production loader remains unbuilt and
non-authorizing

Policy: verify rather than assume; fail closed

## Result

The current app-kernel can prove that one fixed-path native artifact had exact
expected bytes while held open. It cannot prove that a subsequent standard
Node native-addon load executes that same open file.

This is not an implementation omission that can be closed by another hash
after `require()`. Native module initialization runs during loading. A
post-load identity check occurs after untrusted native code may already have
executed.

## Primary-source findings

Node documents `.node` addons as dynamically linked objects initialized by
`require()` or `process.dlopen()`. The public `process.dlopen()` interface takes
a filename string, not an already verified file descriptor. Node-API provides
ABI stability and version selection, but it does not add a file-handle loading
primitive.

On Windows, `LoadLibraryExW` accepts an `hFile` parameter syntactically, but
Microsoft explicitly reserves it for future use and requires it to be `NULL`.
The executable load is therefore path-based. `LOAD_LIBRARY_AS_DATAFILE_EXCLUSIVE`
can prevent other processes modifying a file while it is mapped as data, but
that mode is non-executing and cannot be used with `GetProcAddress`; it does
not initialize a Node addon.

Linux `dlopen()` and Apple's `dlopen()` also take a path. Linux-specific
`/proc/self/fd/<n>` techniques may reduce one namespace lookup but are not a
portable contract, do not solve dependency resolution by themselves and are
not available as the cross-platform Node addon contract.

Primary references:

- [Node C++ addons](https://nodejs.org/api/addons.html)
- [Node `process.dlopen()`](https://nodejs.org/api/process.html#processdlopenmodule-filename-flags)
- [Node-API version matrix](https://nodejs.org/api/n-api.html#node-api-version-matrix)
- [Microsoft `LoadLibraryExW`](https://learn.microsoft.com/en-us/windows/win32/api/libloaderapi/nf-libloaderapi-loadlibraryexw)
- [Microsoft `FILE_ID_INFO`](https://learn.microsoft.com/en-us/windows/win32/api/winbase/ns-winbase-file_id_info)
- [Linux `dlopen(3)`](https://man7.org/linux/man-pages/man3/dlmopen.3.html)
- [Apple `dlopen(3)`](https://developer.apple.com/library/archive/documentation/System/Conceptual/ManPages_iPhoneOS/man3/dlopen.3.html)

## Threat consequence

The standard dynamic sequence is:

```text
open + hash candidate
        |
        v
close or retain advisory handle
        |
        v
path lookup by process.dlopen / OS loader
        |
        v
module/dependency initialization executes
        |
        v
post-load inspection (too late to prevent first execution)
```

On Windows, the verified file handle cannot be supplied to the executable
loader. Keeping a normal Node file descriptor open does not establish the
exclusive Windows share mode needed to make replacement impossible. A
same-user or privileged namespace adversary may target the gap. Comparing
`FILE_ID_INFO` after loading detects some substitutions but cannot retract code
that already ran.

The current non-executing inspector is still useful: it rejects malformed,
wrong-architecture, multi-link and content-mismatched candidates before any
possible load. Its result must remain `CANDIDATE`.

## Options

| Option | Zero-trust verdict | Consequence |
|---|---|---|
| Pre-hash, `process.dlopen(path)`, post-hash | **REJECT for production authority** | Post-check is after native initialization; Windows handle identity is not bound to the executable load |
| Spawned helper/CLI or writable sidecar | **REJECT under current owner rule** | Moves the race and grants an external process authority; violates the in-process boundary |
| OS signing + ACLs + absolute path | **RESEARCH / owner threat-model decision** | Useful defence in depth, but trusts OS policy and does not meet the current memory/OS-hostile claim by itself |
| Node single-executable asset | **REJECT as a direct fix** | Node documents native assets being written to a temporary file and then passed to `process.dlopen()`; the path boundary remains |
| Custom runtime with durability primitive linked into the trusted executable | **PROTOTYPE candidate** | Removes the dynamic addon load seam but creates a larger build/release/toolchain obligation |
| Independent SLIDE runtime owns the syscall primitive | **Architecturally preferred later state** | Matches the long-term design, but the owner currently requires Galerina beta-v1 before SLIDE implementation |

## Current decision

Do not admit a dynamic `.node` loader merely because the pre-load and
post-load hashes match. Keep the production digest list empty.

Continue building and falsifying the platform durability primitive as a
non-authorizing Rust library. That work can close syscall ordering, error
propagation and recovery behavior without pretending the bootstrap loader
problem is solved.

The beta release eventually needs one owner architecture decision:

1. build/link the durability primitive into a custom trusted runtime;
2. explicitly narrow the threat claim and admit a signed/ACL-controlled
   dynamic-addon boundary with documented residual risk; or
3. change the release sequence so the independent SLIDE runtime supplies the
   primitive before Galerina beta authorization.

No option is selected by this research note.

## Zero-trust adoption score

Dynamic path loader: **4.6/10 — REJECT for production authority**.

Linked-in runtime primitive: **7.4/10 — PROTOTYPE**, gated on reproducible
builds, binary provenance, fixed syscall surface, platform crash evidence and
independent review.

No hard veto is relaxed. Unknown loader identity remains a denial.
