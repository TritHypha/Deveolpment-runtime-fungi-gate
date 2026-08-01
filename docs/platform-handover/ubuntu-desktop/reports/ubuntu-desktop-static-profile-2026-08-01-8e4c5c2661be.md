# Ubuntu Desktop platform evidence report

Date: 2026-08-01
Operator: Codex with owner-provided host toolchain
Evidence classification: CANDIDATE_NON_AUTHORIZING

## Repository identity

- Branch: `codex/galerina-beta-v1-completion`
- Commit: `8e4c5c2661befadee8d0b6cc14cc0d7ea0bb232d`
- Working tree before run: clean (`git status --short --branch` reported only the branch/tracking line)
- Working tree after run: this report is the only intended evidence change; Cargo build output is ignored and no source file was changed

## Host facts

- Ubuntu release (`/etc/os-release`): Ubuntu 24.04.4 LTS (Noble Numbat), `VERSION_ID="24.04"`
- Kernel (`uname -a`): `Linux Fittingly-phillip-booth-ThinkPad-P16v 7.0.0-28-generic #28~24.04.1-Ubuntu SMP PREEMPT_DYNAMIC Wed Jul  1 15:50:57 UTC 2 x86_64 x86_64 x86_64 GNU/Linux`
- Architecture: `x86_64`
- Mount target/source/filesystem/options (`findmnt -T .`): target `/home/phillip-booth/Documents/GitHub/Galerina`; source `/dev/nvme0n1p2[/home/phillip-booth/Documents/GitHub/Galerina]`; filesystem `ext4`; options `rw,nosuid,nodev,relatime`
- Bare host, VM or container: `systemd-detect-virt` reported `none`; no stronger bare-host inference was made
- Storage/controller facts actually measured: the repository mount was reported as ext4 backed by `/dev/nvme0n1p2`; controller-cache and physical-media durability were not measured

## Toolchain

- Node: `v22.18.0`
- Rust: `rustc 1.97.1 (8bab26f4f 2026-07-14)`
- Cargo: `cargo 1.97.1 (c980f4866 2026-06-30)`
- Git: `git version 2.54.0`
- Native linker: unavailable; Cargo reported "linker `cc` not found"

### Toolchain remediation assessment

- The first attempt at commit `a7a3dc0272ae252d79cfa783a42e700e51f540e7`
  stopped because Rust and Cargo were absent. It remains recorded in
  `ubuntu-desktop-static-profile-2026-08-01-a7a3dc0272ae.md`.
- Ubuntu APT advertised direct `rustc` and `cargo` candidates at 1.75.0. Those
  are not suitable for this checkout's version-4 `Cargo.lock`, which requires
  Cargo 1.78 or newer.
- The owner supplied Rust/Cargo 1.97.1. The repository accepted the lockfile
  and began compiling, proving that the original Rust/Cargo blocker was
  removed.
- The next missing native-build prerequisite is a `cc` linker. Local Ubuntu
  package metadata advertises `build-essential` 12.10ubuntu1, which depends on
  GCC, G++, Make, `dpkg-dev`, and C library development headers; direct GCC
  candidate metadata reports `4:13.2.0-7ubuntu1`. Neither package was installed
  by this run.
- Docker 29.6.2 is present as a client but daemon access was denied. Docker is
  not an equivalent bare-host route in any case: the handover requires a
  Docker result to remain `VIRTUAL_NON_AUTHORIZING`.
- A prebuilt executable or verifier `--no-build` mode is not an acceptable
  substitute because this chapter must build the optimized static profile from
  the checked-out source.

## Static-link proof

- Command: `node scripts/verify-registry-static-profile.mjs`
- Exit code: 1 (nested Cargo build exited 101)
- Verdict: UNVERIFIED
- Executable SHA-256: UNVERIFIED
- Adapter-source SHA-256: UNVERIFIED
- `.fungi` contract SHA-256: UNVERIFIED
- ABI: UNVERIFIED
- Release profile verified: UNVERIFIED
- Polluted-working-directory invariant: UNVERIFIED
- `productionAuthorizing` value: UNVERIFIED

## Native crate checks

| Check | Exit code | Result | Notes |
|---|---:|---|---|
| `cargo fmt --check` | | UNVERIFIED | Not run after verifier failure |
| `cargo test --locked` | | UNVERIFIED | Not run after verifier failure |
| `cargo test --locked --all-features` | | UNVERIFIED | Not run after verifier failure |
| `cargo build --locked --release` | | UNVERIFIED | Prescribed standalone check not run after verifier failure |
| Pure Linux facts + `mountinfo`/correlation matrix (6 tests) | | UNVERIFIED | Not run after verifier failure; no live-host claim |

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

The verifier's required Cargo build failed before producing a receipt:

```text
$ node scripts/verify-registry-static-profile.mjs
   Compiling galerina-registry-durability-native v0.1.0 (/home/phillip-booth/Documents/GitHub/Galerina/packages-galerina/galerina-framework-app-kernel/native/registry-durability)
error: linker `cc` not found
  |
  = note: No such file or directory (os error 2)

error: could not compile `galerina-registry-durability-native` (lib) due to 1 previous error
Error: Command failed: cargo build --locked --release --features static-profile-proof --bin registry-durability-static-profile
Cargo status: 101
Verifier exit code: 1
```

Per `CODEX-HANDOVER.md`, execution stopped immediately. No linker package was
installed, no prebuilt artifact or `--no-build` bypass was used, no later check
was run, and no receipt file was created.

## Conclusion

Rust/Cargo 1.97.1 successfully removed the first toolchain blocker and Cargo
accepted the checked-in lockfile, but the Ubuntu Desktop portability chapter
remains inconclusive because the native `cc` linker is unavailable. This
report does not establish the static-link proof, production admission,
filesystem durability, crash survival, reboot survival, or physical
power-loss survival.
