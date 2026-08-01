# Ubuntu Desktop Linux adapter candidate runbook

## Prerequisites

- A separately cloned Galerina repository on Ubuntu Desktop, created from the
  exact verified local bundle when the tested branch has unpushed commits.
- A separately cloned SLIDE repository at the sibling path `../SLIDE`, created
  from its exact verified local bundle under the same condition.
- Git.
- Node.js 20 or newer (the independent SLIDE bootstrap floor).
- A Rust/Cargo toolchain capable of the repository lockfile.
- No private signing keys in the repository or shell environment.

This second chapter does not require `sudo`, Docker, a VM or a destructive
reboot test. It repeats the first chapter so evidence binds the new commit,
then executes the live Linux candidate and process-termination matrix.

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
REPO_ROOT="$PWD"
RETURN_BASE="${REPO_ROOT}/docs/platform-handover/ubuntu-desktop/reports/ubuntu-desktop-linux-adapter-${RUN_DATE}-${RUN_COMMIT}"
test ! -e "${RETURN_BASE}.md"
test ! -e "${RETURN_BASE}.receipt.json"
test ! -e "${RETURN_BASE}.slide-platform.json"
test ! -e "${RETURN_BASE}.native-evidence.json"
```

Verify and record the sibling SLIDE identity before executing it:

```bash
set -eu
test -d ../SLIDE/.git
git -C ../SLIDE status --short --branch
git -C ../SLIDE rev-parse HEAD
```

A dirty SLIDE tree is a stop-and-report condition. From the SLIDE repository,
run the exact contract, observer and complete reference suite:

```bash
set -eu
cd ../SLIDE
npm run contract:check
node --test tests/reference-platform-observer.test.mjs tests/reference-platform-report-cli.test.mjs
npm test
node src/reference-platform-report-cli.mjs > "${RETURN_BASE}.slide-platform.json"
```

The observer command must exit zero and its one JSON object must state
`platform: linux`, `distributionId: ubuntu`, `status: MATCH`,
`evidenceKind: LOCAL_SELF_OBSERVATION`, `authenticated: false`,
`executionEvidence: UNVERIFIED`, `authorityReleased: false` and
`productionAuthorizing: false`. Any different, missing or surplus result is a
stop-and-report condition. Compute and record the JSON file's SHA-256; do not
paste raw os-release content into the observer evidence.

Return to the Galerina root:

```bash
cd ../Galerina
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
cargo clippy --locked --all-targets --all-features -- -D warnings
cargo test --locked --test linux_host_admission
cargo test --locked
cargo test --locked --all-features
cargo build --locked --release
```

Create one new, exact, same-filesystem evidence directory. Do not substitute
`/tmp`, a container mount, network storage, a symlink or a pre-existing path:

```bash
set -eu
RUN_COMMIT="$(git -C ../../../../ rev-parse --short=12 HEAD)"
EVIDENCE_DIRECTORY="$PWD/.galerina-linux-evidence-${RUN_COMMIT}"
test ! -e "$EVIDENCE_DIRECTORY"
mkdir --mode=700 "$EVIDENCE_DIRECTORY"
export GALERINA_LINUX_EVIDENCE_DIRECTORY="$EVIDENCE_DIRECTORY"
```

Run the Linux-only tests explicitly. The exact ignored-test counts are part of
the evidence; zero tests, a skip, a refusal, a hang or a missing boundary is a
failure:

```bash
set -eu
cargo test --locked --all-features --test linux_live_host -- --ignored --test-threads=1
cargo test --locked --all-features --test linux_fault_refusal -- --ignored --test-threads=1
cargo test --locked --all-features --test linux_process_kill -- --ignored --test-threads=1
unset GALERINA_LINUX_EVIDENCE_DIRECTORY
rmdir "$EVIDENCE_DIRECTORY"
```

The first command must execute four tests: live host observation,
exact/idempotent no-replace publication, and symlink/hard-link refusal. The
fourth is hostile parent-namespace substitution. The second command must
execute one test covering all nine deterministic injected refusals. The third
must execute one test that kills a fresh worker at all seven named
boundaries and checks prior/candidate exactness. `rmdir` must succeed: a
leftover stage or fixture is evidence to report, not something to delete
recursively and hide.

The live adapter is intentionally compiled only on GNU Linux x86-64 and
AArch64. Any other ABI must return `LINUX_ABI_UNSUPPORTED`; do not broaden the
compile predicate or substitute a guessed C structure layout during this run.

On Linux, Windows-specific operations must return their explicit unavailable
denial. A test skip, silent fallback, pathname loader or unexpected candidate
is a failure to investigate, not a portability success.

## Create the closed native receipt

Only after every command above passes, return to the Galerina root and create
the non-authorizing native receipt. This receipt records the observed round;
its self-hash detects accidental mutation but is not authentication.

```bash
set -eu
cd "$REPO_ROOT"
export GALERINA_EVIDENCE_COMMIT="$(git rev-parse HEAD)"
export SLIDE_EVIDENCE_COMMIT="$(git -C ../SLIDE rev-parse HEAD)"
export GALERINA_EVIDENCE_ARCH="$(node -p 'process.arch')"
export GALERINA_EVIDENCE_FILESYSTEM="$(findmnt -n -o FSTYPE -T .)"
export GALERINA_NATIVE_RECEIPT="${RETURN_BASE}.native-evidence.json"
case "$GALERINA_EVIDENCE_FILESYSTEM" in
  ext4|xfs|btrfs) ;;
  *) printf '%s\n' 'STOP: filesystem is not in the admitted Linux set' >&2; exit 1 ;;
esac
node --input-type=module <<'NODE'
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
const base = {
  schema: "galerina.platform-native-evidence.v1",
  galerinaCommit: process.env.GALERINA_EVIDENCE_COMMIT,
  slideCommit: process.env.SLIDE_EVIDENCE_COMMIT,
  platform: "linux",
  distributionId: "ubuntu",
  architecture: process.env.GALERINA_EVIDENCE_ARCH,
  filesystem: process.env.GALERINA_EVIDENCE_FILESYSTEM,
  pureTests: 10,
  liveTests: 4,
  faultRefusals: 9,
  processTerminationBoundaries: [
    "stage-opened", "bytes-written", "file-flushed", "stage-closed",
    "published", "reopened-verified", "directory-flushed",
  ],
  failedTests: 0,
  skippedTests: 0,
  controlledReboot: false,
  controlledPowerLoss: false,
  authenticated: false,
  authorityReleased: false,
  productionAuthorizing: false,
};
const canonical = `${JSON.stringify(base, null, 2)}\n`;
const receipt = {
  ...base,
  selfSha256: createHash("sha256").update(canonical).digest("hex"),
};
writeFileSync(
  process.env.GALERINA_NATIVE_RECEIPT,
  `${JSON.stringify(receipt, null, 2)}\n`,
  { encoding: "utf8", flag: "wx", mode: 0o600 },
);
NODE
unset GALERINA_EVIDENCE_COMMIT SLIDE_EVIDENCE_COMMIT GALERINA_EVIDENCE_ARCH
unset GALERINA_EVIDENCE_FILESYSTEM GALERINA_NATIVE_RECEIPT
```

Copy `REPORT-TEMPLATE.md` to `${RETURN_BASE}.md`, complete its human-readable
rows using observed facts only, and replace the `{}` inside the final binding
block with canonical pretty JSON containing the two full commits and the
SHA-256 of all three receipt files. Do not record an absolute local path,
credential, token, private key or secret-shaped field.

Finally run the closed verifier:

```bash
node scripts/verify-platform-durability-evidence.mjs \
  --report "${RETURN_BASE}.md" \
  --static-receipt "${RETURN_BASE}.receipt.json" \
  --platform-receipt "${RETURN_BASE}.slide-platform.json" \
  --native-receipt "${RETURN_BASE}.native-evidence.json"
```

The only successful result is K3 `+1` with reason
`UBUNTU_ROUND_TWO_COMPLETE`, evidence class `PROCESS_TERMINATION`, and all of
`authenticated`, `authorityReleased` and `productionAuthorizing` false.
Controlled reboot and controlled physical power loss remain unverified and
must not be added to this round-two claim.

No result from this runbook changes the production adapter allow-list.

If any expected statement is false, stop at that point and follow the failure
policy in `CODEX-HANDOVER.md`. Do not continue merely to collect a green-looking
later result.
