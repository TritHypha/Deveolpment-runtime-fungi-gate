# Linux registry-durability adapter plan

Date: 2026-07-31

Status: in progress; the initial Ubuntu static-profile run is admitted, the
live adapter candidate is repository-local, and execution belongs to the
second Ubuntu Desktop handover

Policy: verify rather than assume; fail closed; virtual evidence never becomes
bare-host evidence

## Outcome

Build the first Linux durability candidate without treating a distribution
name, successful `fsync` call or container run as proof. The first profile is
deliberately narrow: an absolute direct directory on a stable, read-write,
local block-device mount using ext4, XFS or Btrfs. Device Mapper, RAID,
network, overlay, removable, virtual and unknown storage refuse until each has
a separately specified and tested provenance chain.

## Sequence

- [x] Add a platform-neutral measured-facts type and pure admission function.
- [x] Add a hostile matrix covering every false/unknown fact, filesystem and
  device-identity mismatch on the Windows development host.
- [x] Define bounded `/proc/self/mountinfo`, `statfs` and sysfs correlation;
  malformed escapes, surplus ambiguity and changing mount/device identity
  refuse. The pure matrix is 10/10 on Windows; Linux execution is unverified.
- [x] Implement retained-handle Linux publication with exclusive staging,
  checked writes, file `fsync`, no-replace publication, exact re-open and
  containing-directory `fsync`. The source exists but is not admitted until it
  compiles and executes on the named Ubuntu host.
- [ ] Add planted short-write, disk-full, collision, link/symlink, namespace,
  barrier and recovery tests. Exact/idempotent, changed-collision, symlink and
  hard-link tests are written; short-write, disk-full, namespace and planted
  barrier refusal remain open.
- [x] Run the initial repository-owned Ubuntu Desktop static-profile handover.
  The exact report and raw LF receipt are retained; the missing SLIDE receipt
  means that aggregate first-round handover remains incomplete.
- [ ] Run the second Ubuntu handover for live observation, retained-handle
  publication, the seven-boundary process-termination matrix and the missing
  SLIDE observer receipt.
- [ ] Add controlled reboot and separately controlled power-loss evidence;
  never infer one from another.
- [ ] Update TODO, roadmap, completion report and Knowledge Base with measured
  versus unverified rows.

The pure model and parser may be completed on Windows. Linux syscalls and
storage claims require the Ubuntu host. No result changes the empty production
adapter allow-list.

Current partial evidence: the closed pure facts model, bounded complete
`mountinfo` document/row parser, deepest-component selector, device-number
decoder, sysfs-classification model and exact filesystem-magic/device
correlation pass 10/10 on Windows. The initial Ubuntu host independently passed
the earlier 6/6 pure matrix and the optimized static-link profile, but did not
run the new live adapter. The source now retains one Linux directory descriptor,
uses anchored `fstatfs`, correlates mountinfo and `/sys/dev/block`, creates an
exclusive descriptor-relative stage, checks its exact single-link identity,
publishes with no-replace `linkat`, removes the stage name, reopens exact bytes
and runs the containing-directory barrier. A separate ignored Ubuntu harness
plants symlink/hard-link collisions and terminates a worker at seven boundaries.
Those Linux-only results remain `UNVERIFIED` until round two returns. The
production allow-list remains empty.
