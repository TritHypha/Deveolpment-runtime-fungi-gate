# Ubuntu Desktop static-link portability runbook

## Prerequisites

- A separately cloned Galerina repository on Ubuntu Desktop.
- Git.
- Node.js 18 or newer.
- A Rust/Cargo toolchain capable of the repository lockfile.
- No private signing keys in the repository or shell environment.

This first chapter does not require `sudo`, Docker, a VM or a destructive
reboot test.

## Run now

From the Galerina repository root:

```bash
set -eu
git status --short --branch
git rev-parse HEAD
uname -a
cat /etc/os-release
findmnt -T . -o TARGET,SOURCE,FSTYPE,OPTIONS
node --version
rustc --version
cargo --version
node scripts/verify-registry-static-profile.mjs
```

Before running, derive the required return filenames:

```bash
set -eu
RUN_DATE="$(date -u +%F)"
RUN_COMMIT="$(git rev-parse --short=12 HEAD)"
RETURN_BASE="docs/platform-handover/ubuntu-desktop/reports/ubuntu-desktop-static-profile-${RUN_DATE}-${RUN_COMMIT}"
test ! -e "${RETURN_BASE}.md"
test ! -e "${RETURN_BASE}.receipt.json"
```

Copy `REPORT-TEMPLATE.md` to `${RETURN_BASE}.md`. Run the verifier again with
stdout redirected to `${RETURN_BASE}.receipt.json`, check that it is one valid
JSON object, and record its SHA-256 in the Markdown report. The first failed
attempt, if any, must remain described in the report even after a valid rerun.

Expected terminal result: one JSON receipt with:

```text
schema = galerina-registry-durability-static-link-proof/v1
verdict = CANDIDATE
productionAuthorizing = false
platform = linux
buildProfile = release
pollutedWorkingDirectoryInvariant = true
```

The exact executable/source/contract digests are build evidence and must be
copied into the dated report. Do not substitute values from a Windows run.

Then run the native crate's complete current verification:

```bash
set -eu
cd packages-galerina/galerina-framework-app-kernel/native/registry-durability
cargo fmt --check
cargo test --locked
cargo test --locked --all-features
cargo build --locked --release
```

On Linux, Windows-specific operations must return their explicit unavailable
denial. A test skip, silent fallback, pathname loader or unexpected candidate
is a failure to investigate, not a portability success.

## Not ready yet

Do not invent commands for the following. They will be added after the Linux
adapter and recovery harness are reviewed and committed:

- direct-local filesystem admission;
- retained-directory-handle publication;
- file and containing-directory durability barriers;
- short-write, disk-full and barrier-refusal injection;
- process-termination boundary matrix;
- controlled reboot recovery;
- physical power-loss recovery.

No result from this runbook changes the production adapter allow-list.

If any expected statement is false, stop at that point and follow the failure
policy in `CODEX-HANDOVER.md`. Do not continue merely to collect a green-looking
later result.
