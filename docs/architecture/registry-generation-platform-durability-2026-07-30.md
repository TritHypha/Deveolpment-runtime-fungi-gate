# Registry generation platform durability

Date: 2026-07-30

Status: researched boundary; no production adapter admitted

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

## Current consequence

Generation construction, signature verification, immutable publication,
re-opening and exact authenticated-state binding are testable now. Automatic
production activation remains fail closed until a platform adapter satisfies
the admission requirements above. This is an engineering blocker, not an
owner-key ceremony blocker.
