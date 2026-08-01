# Ubuntu Desktop platform evidence report

Date: 2026-08-01
Operator: Codex
Evidence classification: CANDIDATE_NON_AUTHORIZING

## Repository identity

- Branch: `codex/galerina-beta-v1-completion`
- Commit: `a7a3dc0272ae252d79cfa783a42e700e51f540e7`
- Working tree before run: clean (`git status --short --branch` reported only the branch/tracking line)
- Working tree after run: this report is the only intended evidence change; no source files were changed

## Host facts

- Ubuntu release (`/etc/os-release`): Ubuntu 24.04.4 LTS (Noble Numbat), `VERSION_ID="24.04"`
- Kernel (`uname -a`): `Linux Fittingly-phillip-booth-ThinkPad-P16v 7.0.0-28-generic #28~24.04.1-Ubuntu SMP PREEMPT_DYNAMIC Wed Jul  1 15:50:57 UTC 2 x86_64 x86_64 x86_64 GNU/Linux`
- Architecture: `x86_64`
- Mount target/source/filesystem/options (`findmnt -T .`): target `/home/phillip-booth/Documents/GitHub/Galerina`; source `/dev/nvme0n1p2[/home/phillip-booth/Documents/GitHub/Galerina]`; filesystem `ext4`; options `rw,nosuid,nodev,relatime`
- Bare host, VM or container: `systemd-detect-virt` reported `none`; no stronger bare-host inference was made
- Storage/controller facts actually measured: the repository mount was reported as ext4 backed by `/dev/nvme0n1p2`; controller-cache and physical-media durability were not measured

## Toolchain

- Node: `v22.18.0`
- Rust: unavailable; `rustc --version` exited 127 with `/bin/bash: line 1: rustc: command not found`
- Cargo: unavailable; `cargo --version` exited 127 with `/bin/bash: line 1: cargo: command not found`
- Git: `git version 2.54.0`

## Static-link proof

- Command: `node scripts/verify-registry-static-profile.mjs` — UNVERIFIED; not run because the required Rust/Cargo prerequisite was unavailable
- Exit code: UNVERIFIED
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
| `cargo fmt --check` | | UNVERIFIED | Not run: Cargo unavailable |
| `cargo test --locked` | | UNVERIFIED | Not run: Cargo unavailable |
| `cargo test --locked --all-features` | | UNVERIFIED | Not run: Cargo unavailable |
| `cargo build --locked --release` | | UNVERIFIED | Not run: Cargo unavailable |
| Pure Linux facts + `mountinfo`/correlation matrix (6 tests) | | UNVERIFIED | Not run: Cargo unavailable; no live-host claim |

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

The required toolchain check failed before the verifier or native crate checks:

```text
$ rustc --version
/bin/bash: line 1: rustc: command not found
exit code: 127

$ cargo --version
/bin/bash: line 1: cargo: command not found
exit code: 127
```

Per `CODEX-HANDOVER.md`, execution stopped immediately. No dependency was
installed, no gate was bypassed, no verifier JSON was produced, and no receipt
file was created.

## Conclusion

The Ubuntu Desktop portability chapter is inconclusive because the required
Rust/Cargo toolchain was unavailable. Only repository identity, host facts,
mount facts, and the available tool versions were observed. This report does
not establish the static-link proof, production admission, filesystem
durability, crash survival, reboot survival, or physical power-loss survival.
