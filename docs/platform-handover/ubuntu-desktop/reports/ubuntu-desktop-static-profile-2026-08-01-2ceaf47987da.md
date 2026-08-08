# Ubuntu Desktop platform evidence report

Date: 2026-08-01
Operator: Codex with owner-provided host prerequisites
Evidence classification: CANDIDATE_NON_AUTHORIZING

## Repository identity

- Branch: `codex/galerina-beta-v1-completion`
- Commit: `2ceaf47987daf6587b8c8e4771ca59ab0637ef73`
- Working tree before run: clean (`git status --short --branch` reported only the branch/tracking line)
- Working tree after run: this report and its paired raw receipt are the only intended evidence changes; Cargo build output is ignored and no source file changed

## Host facts

- Ubuntu release (`/etc/os-release`): Ubuntu 24.04.4 LTS (Noble Numbat), `VERSION_ID="24.04"`
- Kernel (`uname -a`, hostname redacted): `Linux <hostname> 7.0.0-28-generic #28~24.04.1-Ubuntu SMP PREEMPT_DYNAMIC Wed Jul  1 15:50:57 UTC 2 x86_64 x86_64 x86_64 GNU/Linux`
- Architecture: `x86_64` (`process.arch` in the verifier receipt: `x64`)
- Mount target/source/filesystem/options (`findmnt -T .`, user-home redacted): target `<repo-root>`; source `/dev/nvme0n1p2[<repo-root>]`; filesystem `ext4`; options `rw,nosuid,nodev,relatime`
- Bare host, VM or container: `systemd-detect-virt` reported `none`; no stronger bare-host inference was made
- Storage/controller facts actually measured: the repository mount was reported as ext4 backed by `/dev/nvme0n1p2`; controller-cache behavior and physical-media durability were not measured

## Toolchain

- Node: `v22.18.0`
- Rust: `rustc 1.97.1 (8bab26f4f 2026-07-14)`
- Cargo: `cargo 1.97.1 (c980f4866 2026-06-30)`
- Git: `git version 2.54.0`
- Native linker: `cc (Ubuntu 13.3.0-6ubuntu2~24.04.1) 13.3.0`

## Static-link proof

- Command: `node scripts/verify-registry-static-profile.mjs` (run twice; the second run supplied the paired raw receipt)
- Exit code: 0 on both runs
- Verdict: `CANDIDATE`
- Executable SHA-256: `0b24d8efa34415b828649c64cc8e0982cf8c6d65a06b2ebe87b4eebd55b1f937`
- Adapter-source SHA-256: `b1bd46c0e5fa868322a8fb9a8c3c82fa959e0cedf8d7620f92eed86dba362d15`
- `.fungi` contract SHA-256: `6a478938e44ce00dc413e7916c34fb95f6bd75123218db8466e5678306b6f9ae`
- ABI: `galerina.registry.durability.abi.v1`
- Release profile verified: yes (`release`, optimized)
- Polluted-working-directory invariant: `true`
- `productionAuthorizing` value: `false`
- Raw receipt SHA-256: `a1ce8af92129f042926b02f18982e33df12c15b430077cbb7ecf7b34169c050d`
- Independent `sha256sum` check: all three executable/source/contract values exactly matched the verifier receipt

## Native crate checks

| Check | Exit code | Result | Notes |
|---|---:|---|---|
| `cargo fmt --check` | 0 | PASS | No output |
| `cargo test --locked` | 0 | PASS | 13 passed, 0 failed; Windows process-kill target had 0 runnable Linux tests |
| `cargo test --locked --all-features` | 0 | PASS | 13 passed, 0 failed; Windows process-kill target had 0 runnable Linux tests |
| `cargo build --locked --release` | 0 | PASS | Optimized release build completed |
| Pure Linux facts + `mountinfo`/correlation matrix (6 tests) | 0 | PASS | `cargo test --locked --test linux_host_admission`: 6 passed, 0 failed; pure-model evidence only, no live-host claim |

## Durability evidence

| Evidence | Status | Why |
|---|---|---|
| Linux host/filesystem gate | UNVERIFIED | Adapter chapter not yet implemented |
| File + directory barriers | UNVERIFIED | Adapter chapter not yet implemented |
| Process termination | UNVERIFIED | Recovery harness not yet implemented |
| Kernel crash | UNVERIFIED | Not run |
| Controlled reboot | UNVERIFIED | Not run |
| Physical power loss | UNVERIFIED | Not run |

## Refusals and anomalies

Two earlier attempts stopped fail-closed and remain disclosed in this report:

1. At commit `a7a3dc0272ae252d79cfa783a42e700e51f540e7`,
   `rustc --version` and `cargo --version` each exited 127 with `command not
   found`. No verifier command ran.
2. At commit `8e4c5c2661befadee8d0b6cc14cc0d7ea0bb232d`, Rust/Cargo
   1.97.1 accepted the version-4 lockfile, but the verifier exited 1 because
   the nested Cargo build exited 101 with "error: linker `cc` not found" and
   `No such file or directory (os error 2)`.

The owner then supplied the Ubuntu native build prerequisites. No dependency
was installed by Codex and neither failed gate was bypassed.

Both complete test-suite commands emitted one warning on Linux for unused
imports `flush_windows_directory_candidate` and
`WindowsDirectoryFlushVerdict` in `tests/windows_host_probe.rs`. The warning
did not fail the tests. Four Windows-probe denial/model tests ran on Linux,
while `windows_process_kill.rs` had zero runnable tests. No Windows host,
Windows process-termination, or Windows durability evidence is inferred.

No private signing key was requested, read, copied, generated, or used. The
receipt has the exact required fields, is non-authorizing, and no output was
relabeled as filesystem, controller-cache, reboot, crash, or physical-media
evidence.

## Conclusion

The exact optimized static-link portability proof reproduced on the named
Ubuntu 24.04.4 host at commit
`2ceaf47987daf6587b8c8e4771ca59ab0637ef73`. The independently checked
executable, Rust adapter source and authoritative `.fungi` contract digests
matched; the ABI and release profile were bound; and a hostile external
`.node` decoy did not change the result. The receipt remains
`productionAuthorizing: false`.

The pure Linux admission and bounded `mountinfo`/correlation matrix also
reproduced 6/6. It is parser and decision-model evidence only. This run does
not establish live Linux host admission, filesystem or controller-cache
durability, process termination, kernel-crash, reboot, or physical power-loss
survival, and it does not change the empty production adapter allow-list.
