# Ubuntu Desktop platform evidence report

Date: 2026-08-02
Operator: Codex
Evidence classification: CANDIDATE_NON_AUTHORIZING

## Repository identity

- Branch: `codex/galerina-beta-v1-completion`
- Commit: `134da79df318e8d2189a154b0fe61794ebae6a48`
- Working tree before run: clean (`git status --short --branch` reported only the branch/tracking line)
- Working tree after run: this Markdown failure report is the only intended change; no source or receipt file was created
- SLIDE branch: UNVERIFIED
- SLIDE commit: UNVERIFIED
- SLIDE working tree before run: UNVERIFIED; required sibling `../SLIDE` checkout absent
- SLIDE working tree after run: UNVERIFIED; required sibling `../SLIDE` checkout absent

## Host facts

- Ubuntu release (`/etc/os-release`): UNVERIFIED; stopped at repository identity gate
- Kernel (`uname -a`): UNVERIFIED; stopped at repository identity gate
- Architecture: UNVERIFIED; stopped at repository identity gate
- Mount target/source/filesystem/options (`findmnt -T .`): UNVERIFIED; stopped at repository identity gate
- Bare host, VM or container: UNVERIFIED; stopped at repository identity gate
- Storage/controller facts actually measured: UNVERIFIED

## Toolchain

- Node: UNVERIFIED
- Rust: UNVERIFIED
- Cargo: UNVERIFIED
- Git: UNVERIFIED

## Static-link proof

- Command: UNVERIFIED; not run
- Exit code: UNVERIFIED
- Verdict: UNVERIFIED
- Executable SHA-256: UNVERIFIED
- Adapter-source SHA-256: UNVERIFIED
- `.fungi` contract SHA-256: UNVERIFIED
- ABI: UNVERIFIED
- Release profile verified: UNVERIFIED
- Polluted-working-directory invariant: UNVERIFIED
- `productionAuthorizing` value: UNVERIFIED

## Beta functional portability

- Command: UNVERIFIED; not run
- Exit code: UNVERIFIED
- Receipt SHA-256: UNVERIFIED
- Platform-smoke refusal tests: UNVERIFIED
- Six ordered evidence rows: UNVERIFIED
- Critical warnings: UNVERIFIED
- Clean working tree at observation: UNVERIFIED
- `verdict` value: UNVERIFIED
- `authorityReleased` value: UNVERIFIED
- `productionAuthorizing` value: UNVERIFIED

## SLIDE bounded platform observation

- Command: `test -d ../SLIDE/.git`
- Exit code: 1
- Report SHA-256: UNVERIFIED; no report created
- Contract check: UNVERIFIED
- Focused observer/CLI tests: UNVERIFIED
- Complete SLIDE tests: UNVERIFIED
- Platform/profile: UNVERIFIED
- Evidence kind: UNVERIFIED
- `authenticated` value: UNVERIFIED
- `executionEvidence` value: UNVERIFIED
- `authorityReleased` value: UNVERIFIED
- `productionAuthorizing` value: UNVERIFIED

## Native crate checks

| Check | Exit code | Result | Notes |
|---|---:|---|---|
| `cargo fmt --check` | | UNVERIFIED | Not run after identity-gate failure |
| `cargo clippy --locked --all-targets --all-features -- -D warnings` | | UNVERIFIED | Not run after identity-gate failure |
| `cargo test --locked` | | UNVERIFIED | Not run after identity-gate failure |
| `cargo test --locked --all-features` | | UNVERIFIED | Not run after identity-gate failure |
| `cargo build --locked --release` | | UNVERIFIED | Not run after identity-gate failure |
| Pure Linux facts + parser/sysfs/correlation matrix (10 tests) | | UNVERIFIED | Not run; pure model only |
| Linux live-host/publication matrix (4 ignored tests, explicitly executed) | | UNVERIFIED | Not run |
| Linux deterministic fault matrix (1 ignored test, 9 fault cases) | | UNVERIFIED | Not run |
| Linux process-termination matrix (1 ignored test, 7 boundaries) | | UNVERIFIED | Not run |

## Durability evidence

| Evidence | Status | Why |
|---|---|---|
| Linux host/filesystem gate | UNVERIFIED | Execution stopped before host observation |
| File + directory barriers | UNVERIFIED | Live tests not run |
| Process termination | UNVERIFIED | Process-termination test not run |
| Kernel crash | UNVERIFIED | Not run |
| Controlled reboot | UNVERIFIED | Not run |
| Physical power loss | UNVERIFIED | Not run |

## Refusals and anomalies

The required sibling SLIDE identity gate failed before any evidence command:

```text
$ test -d ../SLIDE/.git
exit code: 1
stdout: empty
stderr: empty

$ git -C ../SLIDE status --short --branch
fatal: cannot change to '../SLIDE': No such file or directory
exit code: 128
```

Per `CODEX-HANDOVER.md`, execution stopped immediately. No remote clone,
copied Galerina file, `triLowLevel-v2` source, verifier bypass or substitute
SLIDE identity was used. No functional, static, SLIDE, native, live-host,
fault-refusal or process-termination command ran. No JSON receipt was created.
No private signing key was requested, read, copied, generated or used.

## Conclusion

The Ubuntu Desktop round-two evidence chapter is inconclusive because the
required independent sibling SLIDE checkout at `../SLIDE` was absent. This
report proves only that the Galerina tree was clean on the named branch and
commit before the identity gate failed. It establishes no functional
portability, static-link, SLIDE observation, Linux live-adapter, fault-refusal,
process-termination, kernel-crash, reboot, physical-power-loss or production
admission evidence.

<!-- GALERINA_PLATFORM_DURABILITY_BINDING_BEGIN -->
```json
{}
```
<!-- GALERINA_PLATFORM_DURABILITY_BINDING_END -->
