# Linux registry-durability adapter plan

Date: 2026-07-31

Status: in progress; pure admission model is repository-local, host execution
belongs to the Ubuntu Desktop handover

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
- [ ] Define bounded `/proc/self/mountinfo`, `statfs` and sysfs correlation;
  malformed escapes, surplus ambiguity and changing mount/device identity
  refuse.
- [ ] Implement retained-handle Linux publication with exclusive staging,
  checked writes, file `fsync`, no-replace publication, exact re-open and
  containing-directory `fsync`.
- [ ] Add planted short-write, disk-full, collision, link/symlink, namespace,
  barrier and recovery tests.
- [ ] Run the repository-owned Ubuntu Desktop handover and return its exact
  report plus raw receipt.
- [ ] Add process-termination, controlled reboot and separately controlled
  power-loss evidence; never infer one from another.
- [ ] Update TODO, roadmap, completion report and Knowledge Base with measured
  versus unverified rows.

The pure model and parser may be completed on Windows. Linux syscalls and
storage claims require the Ubuntu host. No result changes the empty production
adapter allow-list.

Current partial evidence: the closed pure facts model, bounded ASCII
`mountinfo` row parser/deepest-component selector and exact filesystem-magic/
device correlation pass 6/6 on Windows. The
parser refuses malformed/unknown escapes, controls, non-canonical paths,
ambiguous separators/access modes, surplus fields, oversized rows and duplicate
deepest mounts. Live `statfs`, sysfs device-chain measurement and Linux input
remain unimplemented, so the third checkbox remains open.
