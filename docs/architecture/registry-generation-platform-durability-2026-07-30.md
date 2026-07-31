# Registry generation platform durability

Date: 2026-07-30

Status: host-evidence capability sealed; deterministic simulator implemented;
no production adapter admitted

Policy: verify rather than assume; fail closed

## Decision

The content-addressed registry store may produce a verified host-evidence
receipt, but that receipt cannot authorize a production rotation. Production
acceptance additionally requires a source-admitted platform adapter digest and
platform-specific crash/fault evidence. The admitted digest set is currently
empty.

This separation is deliberate. A caller-supplied callback returning `true`
does not prove that file data and the new directory entry survived a crash.
It therefore cannot change authenticated production authority.

The first implementation hardening is complete: persistence no longer accepts
a structural callback plus a caller-selected digest. It accepts only a
module-branded adapter object. The public factory can issue non-production
host-evidence adapters for engineering tests, but it cannot mint the separate
private production brand. Receipts retain that provenance in private
`WeakSet` state. Copying an admitted digest and reconstructing the public
object shape cannot create a production receipt. The production adapter set
remains empty.

## Required persistence sequence

1. Validate and canonicalize the complete registry generation.
2. Create a unique same-volume staging file exclusively.
3. Write the bounded bytes and flush the file.
4. Close and publish the content-addressed directory entry without replacing
   an existing file.
5. Re-open, re-read, re-hash and re-verify the published generation.
6. Execute the admitted platform directory/metadata durability barrier.
7. Only then issue a production-admitted receipt.
8. Only an authenticated checkpoint may select that exact generation ID.

Failure or uncertainty at any step leaves the prior accepted generation in
authority.

The final platform adapter may need to own steps 3–6 as one indivisible
primitive rather than merely implement step 6. This is especially important
on Windows, where the measured Node directory-handle path is unavailable and
`MoveFileEx` with `MOVEFILE_WRITE_THROUGH` changes the publication primitive
from POSIX hard-link-plus-directory-`fsync` semantics. A production adapter
must report one closed result for the complete platform sequence; a generic
callback after a Node publication is insufficient.

## Platform findings

### Linux family

The Linux `fsync(2)` manual states that flushing a file does not necessarily
persist its containing directory entry; an explicit `fsync()` on a descriptor
for the directory is also required. A candidate Linux adapter therefore needs
both a successful file `fsync` and a successful containing-directory `fsync`,
with every unsupported filesystem or error path refusing.

Source:
[Linux `fsync(2)` manual](https://www.man7.org/linux/man-pages/man2/fsync.2.html)

### macOS

Apple documents that ordinary `fsync` may not force a drive's own buffered
data to permanent media. `F_FULLFSYNC` asks the drive to flush its buffered
data and is the stronger available operation, but Apple also describes the
guarantee as best effort. A macOS adapter must therefore use the strongest
available admitted primitive, validate filesystem behavior, and still avoid
claiming physically impossible absolute persistence.

Sources:
[Apple `fcntl(2)` manual](https://developer.apple.com/library/archive/documentation/System/Conceptual/ManPages_iPhoneOS/man2/fcntl.2.html),
[Apple `fsync(2)` manual](https://developer.apple.com/library/archive/documentation/System/Conceptual/ManPages_iPhoneOS/man2/fsync.2.html)

### Windows 10/11

Microsoft documents `FlushFileBuffers` for flushing an open file and requires
`GENERIC_WRITE` access. Microsoft also documents that obtaining a directory
handle through `CreateFile` requires `FILE_FLAG_BACKUP_SEMANTICS`.
Write-through and unbuffered flags have separate alignment, caching and
metadata behavior that must be tested rather than inferred.

On the current Windows 10 development host, opening the generation directory
through the Node filesystem API and calling the file-handle `sync()` operation
was measured to fail with `EPERM`. The current Node-only seam therefore cannot
prove Windows directory-entry durability and is not production-admitted.

`MoveFileEx` documents `MOVEFILE_WRITE_THROUGH` and does not replace an
existing destination unless `MOVEFILE_REPLACE_EXISTING` is supplied. This is
a viable native candidate for exclusive publication, but the documentation's
strongest explicit flush statement discusses copy-and-delete moves. Galerina
therefore does not infer a complete same-volume crash guarantee from the API
name. The adapter needs real NTFS/ReFS crash testing, local-volume rejection
for unsupported/network filesystems, and exact last-error propagation before
admission.

Sources:
[Microsoft `FlushFileBuffers`](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-flushfilebuffers),
[Microsoft `CreateFile`](https://learn.microsoft.com/en-us/windows/win32/api/FileAPI/nf-fileapi-createfilea)

## Adapter admission requirements

An adapter digest may enter the production allow-set only after all of the
following exist:

- reviewed source with an exact platform and filesystem support matrix;
- non-forgeable dispatch selected by measured host facts;
- file-data and directory-entry/metadata barriers in the required order;
- refusal for unsupported filesystems, network shares and unknown devices;
- short-write, access-denied, disk-full and barrier-failure tests;
- process-kill and machine-crash fault injection at every activation boundary;
- recovery proof showing authority selects either the old complete generation
  or the new complete generation, never a mixture;
- Windows 10/11, Debian/Ubuntu, Fedora/Mint and macOS evidence;
- an independent security review and an explicit governed digest admission.

The production implementation must be in-process. A spawned CLI, writable
sidecar, shell command or PowerShell bridge is not admitted to the registry
authority path. During the Node bootstrap period, the narrow candidate is a
zero-dependency native module with an authoritative `.fungi` contract and a
bounded bootstrap implementation. Its source, built binary, ABI, target
triple and loader path must all be content-bound. SLIDE later replaces that
bootstrap with the same contract rather than preserving a language-specific
trusted component.

### Implemented pre-admission contract

The app-kernel now has a closed
`galerina-registry-durability-adapter/v1` descriptor and
`galerina.registry.durability.abi.v1` candidate gate. It binds platform,
architecture, target triple, filesystem allow-list, fixed loader path, binary
format, source/contract/binary/toolchain/build-recipe digests and five
evidence digests. Plain own data fields are required: inherited, accessor,
extra, missing, malformed, unsorted or mismatched records refuse.

Measured host facts separately refuse network, removable, overlay, virtual
and unknown storage. A fully formed, locally matching record reaches only
`CANDIDATE`; it cannot mint the private production adapter brand. The one
production digest list is exported, immutable and empty, and the persistence
store derives its internal allow-set from that exact list. The paired `.fungi`
candidate fold is checker-clean. App-kernel is **186/186**.

This closes schema and decision-shape work, not hostile-loader proof. Binary
re-hashing, loader race/substitution tests, native implementation and physical
platform evidence remain required before the empty list can change.

## Deterministic simulation role

A canonical seeded deterministic simulator is required for the registry
activation state machine. It must control logical time and scheduling and
inject bounded faults at every write, flush, close, publication, re-open,
verification, checkpoint, canary, fallback and custody boundary. The fault
model must include short writes, reordered or refused operations, collisions,
process termination and restart. Every run must emit a replay receipt binding
the seed, simulator and adapter/source digests, fault-model version, explored
budget, expected invariant and observed terminal state. A known-good control
and deliberately planted faults are required so a passing harness cannot be
mistaken for evidence that the fault injector did nothing.

The only admissible simulated terminal authority is the prior complete
generation or the new complete generation. Mixed, unauthenticated, uncovered
or budget-exhausted outcomes are `INDETERMINATE` and fail the release gate.
Simulation output is evidence about the declared state-machine model; it
cannot prove that a real filesystem, controller or storage device honoured a
physical durability barrier. Production admission therefore still requires
the platform-specific crash and power-loss evidence listed above.

### Implemented deterministic evidence

`registry-activation-simulator.ts` now executes a closed, seed-ordered model
across fifteen named boundaries: write, file flush, close, publication order,
exclusive publication, re-open, verification, directory flush, stage
checkpoint, key switch, canary, fallback, acceptance checkpoint, drain and
custody retirement.

The canonical replay receipt binds the seed, fault-model version, simulator,
adapter and source digests, prior/candidate generation identities, exploration
budget, exact planted fault schedule, executed boundaries, logical ticks,
terminal state and invariant. Extra input fields, accessors, duplicate or
out-of-order faults, boundary/fault mismatches and unreachable fallback
schedules refuse. An exhausted budget or failed fallback grants no authority.
The matrix uses the seed to order every planted boundary scenario, includes a
known-good control and requires all fifteen planted faults to execute.

The paired `.fungi` contract
`src/self-hosted/registry-activation-terminal.fungi` is checker-clean and
contains only the pure terminal fold. It uses `match` for the K3 canary token
and Boolean `if` for Boolean evidence. It cannot perform I/O, mint a receipt,
admit an adapter or change a checkpoint. The TypeScript model remains a
temporary executing bootstrap until independent SLIDE executes this contract.

Fresh evidence is app-kernel **180/180**, including eleven focused simulator
tests. Simulator receipts fail the production persistence-brand check even
when a caller copies their fields and adds a durability digest.

The source-bound research adjudication and its zero-trust scores are maintained
in the independent SLIDE repository's transcript-corpus adjudication. This
public document does not depend on a machine-local sibling-repository path.

## Zero-trust adoption score

Status: deterministic simulator `ADOPT-WITH-CONTROLS`; native adapter
`PENDING`

The object-capability seal is adopted because its negative/control evidence is
complete and it grants no production authority. The deterministic simulator
scores **8.85/10**: authority 10, fail-close/K3 9, integrity 8, memory/data 8,
injection/supply chain 9, determinism 9, resource/recovery 9, compatibility 8,
evidence 9 and benefit/cost 8. No hard veto fires because its receipt is
structurally non-authorizing. The decision is **ADOPT-WITH-CONTROLS**: keep the
model bounded, preserve anti-vacuity controls and never substitute it for
physical host evidence.

The native cross-platform adapter proposal is not scored yet: filesystem
support matrices, binary provenance, hostile-loader tests and power-loss
evidence are incomplete.

Hard vetoes:

- any external process or sidecar obtains publication authority;
- a digest alone can forge adapter identity;
- a network/unknown filesystem is silently treated as local durable storage;
- a failed, unsupported or non-Boolean platform result authorizes;
- the adapter publishes before exact bytes and signatures are verified.

## Current consequence

Generation construction, signature verification, immutable publication,
re-opening and exact authenticated-state binding are testable now. Automatic
production activation remains fail closed until a platform adapter satisfies
the admission requirements above. This is an engineering blocker, not an
owner-key ceremony blocker.
