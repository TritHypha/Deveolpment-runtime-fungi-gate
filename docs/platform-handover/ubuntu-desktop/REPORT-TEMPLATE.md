# Ubuntu Desktop platform evidence report

Date: YYYY-MM-DD
Operator: OWNER OR REVIEWER
Evidence classification: CANDIDATE_NON_AUTHORIZING

## Repository identity

- Branch:
- Commit:
- Working tree before run:
- Working tree after run:

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

## Native crate checks

| Check | Exit code | Result | Notes |
|---|---:|---|---|
| `cargo fmt --check` | | UNVERIFIED | |
| `cargo test --locked` | | UNVERIFIED | |
| `cargo test --locked --all-features` | | UNVERIFIED | |
| `cargo build --locked --release` | | UNVERIFIED | |

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

Record every refusal, mismatch, skip, warning and unexpected environmental
fact. Do not omit a failed attempt when a later retry passes.

## Conclusion

State only what the evidence proves. The initial portability chapter may say
that the exact static-link proof reproduced on the named Ubuntu host. It must
not claim production admission or physical durability.
