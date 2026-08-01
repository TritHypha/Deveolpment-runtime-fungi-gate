# Codex handover: Ubuntu Desktop Galerina evidence

## Objective

Continue the repository-owned Ubuntu Desktop platform-evidence chapter without
weakening Galerina's or SLIDE's zero-trust boundary. Verify rather than assume,
fail closed, preserve unrelated work, commit locally only and never push.

## Required first checks

1. Read `AGENTS.md` completely.
2. Read this folder completely, including `TRANSFER-LOCAL-COMMITS.md`. If the
   primary branches contain unpushed commits, use the verified bundles from
   that document; a remote clone is not the same source identity.
3. Read:
   - `docs/architecture/registry-generation-platform-durability-2026-07-30.md`
   - `docs/superpowers/plans/2026-07-31-registry-durability-simulator-and-platform-admission.md`
   - `docs/superpowers/plans/2026-07-31-linux-registry-durability-adapter.md`
   - `packages-galerina/galerina-framework-app-kernel/native/registry-durability/README.md`
4. Confirm the intended branch and exact commit with `git status --short
   --branch` and `git rev-parse HEAD`. Do not silently switch, reset or clean a
   dirty tree.
5. Record `uname`, `/etc/os-release`, architecture, Rust, Cargo, Node and Git
   versions. Do not treat a distribution label as filesystem evidence.
6. Confirm a separate sibling SLIDE clone at `../SLIDE`, read its `README.md`
   and `TODO.md`, and record its branch, exact commit and clean starting tree.
   Do not substitute files copied from Galerina or `triLowLevel-v2`.

## Current executable scope

Run the repeated static-link proof, bounded SLIDE platform-observer suite and
new live Linux candidate chapter described in `RUNBOOK.md`. They must:

- build the optimized statically linked profile from the checked-out source;
- independently re-hash the exact Rust source and authoritative `.fungi`
  contract;
- bind the ABI and release profile;
- prove a hostile working-directory `.node` decoy cannot change the output;
- report `productionAuthorizing: false`.

The SLIDE observer chapter must:

- run from the exact sibling SLIDE commit recorded in the report;
- produce one closed local-self-observation JSON object;
- keep `authenticated: false`, `executionEvidence: UNVERIFIED`,
  `authorityReleased: false` and `productionAuthorizing: false`;
- pass the 16-file V2 contract check, observer/CLI focused tests and complete
  independent SLIDE suite; and
- remain bootstrap portability evidence, never native execution evidence.

Also rerun the expanded pure Linux fact/parser/sysfs matrix, then explicitly
run the ignored four-case live-host suite, nine-case injected-refusal suite and
seven-boundary process-termination suite against the one newly created named
evidence directory. A live test proves only its observed candidate boundary;
process termination remains weaker than kernel crash, reboot and power loss.

Stop and report rather than work around any refusal, digest mismatch, dirty
source ambiguity, missing prerequisite or unexpected output field.

## Forbidden inferences

- A Docker/VM pass is not bare-host evidence.
- A process-kill pass is not kernel-crash, reboot or power-loss evidence.
- `fsync` returning success is not proof of controller-cache or physical-media
  persistence.
- A static-link receipt is not a production admission or signature.
- Ubuntu evidence does not prove Debian, Fedora, Mint, macOS or Windows.
- Do not add a pathname-based dynamic-loader fallback.
- Do not read, copy, generate or use owner private signing keys.

## Required report

Copy `REPORT-TEMPLATE.md` to this exact repository path:

```text
docs/platform-handover/ubuntu-desktop/reports/ubuntu-desktop-linux-adapter-YYYY-MM-DD-<12-char-commit>.md
```

Replace the date and commit placeholder with the UTC run date and the first 12
characters of the Galerina commit that was actually tested. Save the raw
Galerina verifier JSON beside it as the same basename plus `.receipt.json` and
the raw SLIDE observer JSON as the same basename plus `.slide-platform.json`.
Save the closed native evidence receipt as the same basename plus
`.native-evidence.json`. Save the beta functional portability receipt as the
same basename plus `.functional.json`. Run `scripts/verify-platform-durability-evidence.mjs`
over all four files and preserve its exact non-authorizing decision in the
human report.
Record the independent SLIDE branch and full commit inside the report. Fill
only observed facts, include command exit codes and SHA-256 values, and leave
every unexecuted row `UNVERIFIED`. This repository path is the handback to the
primary Galerina session. Do not save the only copy elsewhere.

If no source change was needed, commit only the report and four raw JSON
receipts on the existing local work branch. If a source fix was
required, use a separate local fix branch and record both the failing and
passing commit IDs. Never push.
Update `docs/TODO.md` and the live roadmap only after evidence is reproduced.
Run the relevant checks before a local commit.

## Failure policy

Stop immediately and only report when any of these occurs:

- the starting worktree is dirty or the expected commit/branch is absent;
- a source, contract or executable digest mismatches;
- an output field is missing, surplus, malformed or unexpectedly authorizing;
- a security/refusal test fails;
- the host is a VM/container when bare-host evidence was requested;
- the filesystem or storage class is unsupported or indeterminate;
- a required tool is unavailable and installing it would require an unreviewed
  script, privilege change or network source;
- a command requests a private key, production signature or authority change.

Do not bypass, disable, soften, skip or relabel a failing gate. Preserve the
exact command, stdout, stderr and exit code in the report.

A confirmed ordinary portability defect may be fixed only after the original
failure is recorded. Create a separate local branch, add a regression test
that fails first, make the smallest zero-trust-preserving change, rerun the
complete chapter and record both commits. If the fix would change a threat
model, admission rule, cryptographic choice, production authority or evidence
claim, do not implement it; report it as an owner/architecture blocker.
