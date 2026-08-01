# Ubuntu Desktop platform evidence report

Date: YYYY-MM-DD
Operator: OWNER OR REVIEWER
Evidence classification: CANDIDATE_NON_AUTHORIZING

## Repository identity

- Branch:
- Commit:
- Working tree before run:
- Working tree after run:
- SLIDE branch:
- SLIDE commit:
- SLIDE working tree before run:
- SLIDE working tree after run:

## Host facts

- Ubuntu release (`/etc/os-release`):
- Kernel (`uname -a`):
- Architecture:
- Mount target/source/filesystem/options (`findmnt -T .`):
- Bare host, VM or container:
- Storage/controller facts actually measured:

## Toolchain

- Node:
- Rust:
- Cargo:
- Git:

## Static-link proof

- Command:
- Exit code:
- Verdict:
- Executable SHA-256:
- Adapter-source SHA-256:
- `.fungi` contract SHA-256:
- ABI:
- Release profile verified:
- Polluted-working-directory invariant:
- `productionAuthorizing` value:

## Beta functional portability

- Command:
- Exit code:
- Receipt SHA-256:
- Platform-smoke refusal tests:
- Six ordered evidence rows:
- Critical warnings:
- Clean working tree at observation:
- `verdict` value:
- `authorityReleased` value:
- `productionAuthorizing` value:

## SLIDE bounded platform observation

- Command:
- Exit code:
- Report SHA-256:
- Contract check:
- Focused observer/CLI tests:
- Complete SLIDE tests:
- Platform/profile:
- Evidence kind:
- `authenticated` value:
- `executionEvidence` value:
- `authorityReleased` value:
- `productionAuthorizing` value:

## Native crate checks

| Check | Exit code | Result | Notes |
|---|---:|---|---|
| `cargo fmt --check` | | UNVERIFIED | |
| `cargo clippy --locked --all-targets --all-features -- -D warnings` | | UNVERIFIED | |
| `cargo test --locked` | | UNVERIFIED | |
| `cargo test --locked --all-features` | | UNVERIFIED | |
| `cargo build --locked --release` | | UNVERIFIED | |
| Pure Linux facts + parser/sysfs/correlation matrix (10 tests) | | UNVERIFIED | Pure model only |
| Linux live-host/publication matrix (4 ignored tests, explicitly executed) | | UNVERIFIED | Includes hostile namespace substitution |
| Linux deterministic fault matrix (1 ignored test, 9 fault cases) | | UNVERIFIED | No candidate receipt on injected refusal |
| Linux process-termination matrix (1 ignored test, 7 boundaries) | | UNVERIFIED | Not reboot/power loss |

## Durability evidence

| Evidence | Status | Why |
|---|---|---|
| Linux host/filesystem gate | UNVERIFIED | Candidate source exists; record the live result |
| File + directory barriers | UNVERIFIED | Record exact/idempotent and hostile-collision results |
| Process termination | UNVERIFIED | Record all seven boundaries; not reboot/power loss |
| Kernel crash | UNVERIFIED | Not run |
| Controlled reboot | UNVERIFIED | Not run |
| Physical power loss | UNVERIFIED | Not run |

## Refusals and anomalies

Record every refusal, mismatch, skip, warning and unexpected environmental
fact. Do not omit a failed attempt when a later retry passes.

## Conclusion

State only what the evidence proves. The second chapter may say that the exact
static-link proof, bounded SLIDE bootstrap suite, named live Linux candidate
tests and process-termination matrix reproduced on the named Ubuntu host only
when every corresponding row executed and passed. It must not claim native
SLIDE execution, kernel-crash, reboot, physical-power-loss or production
admission.

<!-- GALERINA_PLATFORM_DURABILITY_BINDING_BEGIN -->
```json
{
  "schema": "galerina.platform-durability-report-binding.v1",
  "galerinaCommit": "REPLACE_WITH_FULL_LOWERCASE_COMMIT",
  "slideCommit": "REPLACE_WITH_FULL_LOWERCASE_COMMIT",
  "staticReceiptSha256": "REPLACE_WITH_LOWERCASE_SHA256",
  "platformReceiptSha256": "REPLACE_WITH_LOWERCASE_SHA256",
  "nativeReceiptSha256": "REPLACE_WITH_LOWERCASE_SHA256",
  "productionAuthorizing": false
}
```
<!-- GALERINA_PLATFORM_DURABILITY_BINDING_END -->
