# Galerina beta-v1 developer platform matrix

Date: 2026-08-01
Scope: beta-v1 functional portability plus separately labelled native
durability implementation; not production admission

## Result

Only Windows 10 is locally verified at the current commit. The remaining rows
are configured for independent execution, but are not called verified until
their own runner returns a complete `galerina.platform.functional-evidence.v2`
record. Functional success is K3 `0` and non-authorizing; it does not claim
native or physical durability.

| Platform | Execution surface | State | Evidence |
|---|---|---:|---|
| Windows 10 x64 | owner workstation, build 19045 | **VERIFIED** | Clean commit `26f5755c...`; 6/6 smoke checks; 98 packages; compiler build; strict `.fungi`; Wasm result 42, 91 bytes |
| Windows 11 x64 | exact self-hosted runner | **UNVERIFIED / CONFIGURED** | opt-in job requires `windows-11` label and `GALERINA_WINDOWS11_RUNNER=enabled` |
| Windows Server 2022 x64 | GitHub-hosted proxy | **UNVERIFIED / CONFIGURED** | useful Windows portability signal; explicitly not Windows 11 proof |
| macOS 14 arm64 | GitHub-hosted | **UNVERIFIED / CONFIGURED** | `macos-14`, Node 20 |
| Ubuntu 24.04 x64 | GitHub-hosted | **UNVERIFIED / CONFIGURED** | `ubuntu-24.04`, Node 20 |
| Debian 12.15 x64 | Docker Official Image | **UNVERIFIED / CONFIGURED** | immutable image digest in workflow |
| Fedora 43 x64 | Fedora official image | **UNVERIFIED / CONFIGURED** | immutable image digest in workflow |
| Linux Mint 22 x64 | exact self-hosted runner | **UNVERIFIED / CONFIGURED** | no third-party Mint image is admitted; opt-in job requires `linux-mint-22` label and `GALERINA_MINT22_RUNNER=enabled` |

GitHub documents `windows-2022` as Windows Server 2022, not a desktop Windows
11 image. Its runner inventory also lists the pinned Ubuntu/macOS labels used
here: <https://github.com/actions/runner-images>. Debian is the Docker Official
Image maintained by Debian developers:
<https://hub.docker.com/_/debian>. The Fedora official image is maintained by
Fedora Release Engineering:
<https://hub.docker.com/_/fedora>.

## Smoke contract

Run from the repository root:

```powershell
node --test scripts/tests/platform-smoke.test.mjs
node scripts/platform-smoke.mjs --json --expect-os windows-10
```

The command uses direct child-process argument arrays and never shell
concatenation. On Windows it calls npm's JavaScript CLI through the active Node
binary because spawning `npm.cmd` with `shell:false` is not portable.

Every admitted run must positively prove:

1. the npm build tool exists and returns version evidence;
2. all workspace packages resolve to unique manifests and agree with the
   generated release count;
3. repository paths use canonical `/`-separated, non-traversing relative
   identities;
4. the compiler typechecks and builds;
5. a real source fixture passes `check --strict-governance`;
6. a fresh `.fungi` flow lowers to Wasm and returns the pinned value.

The structured result contains OS/distribution identity, architecture, Node/npm
versions, timings, and non-sensitive counts only. Child output, command
arguments, working directories, and environment values are not included.
Before emission, a final guard rejects local home paths, private-key material,
and secret-shaped fields. Empty, failed, duplicated, or untimed evidence is a
terminal refusal.

## Local evidence

Command:

```text
node scripts/platform-smoke.mjs --json --expect-os windows-10
```

Admitted identity and result:

```text
Windows 10.0.19045 x64
Node v24.18.0
npm 11.16.0
98 package manifests
6/6 evidence rows passed
Wasm result 42; 91-byte module
```

The result is `FUNCTIONAL_PORTABILITY`, verdict `0`,
`authenticated: false`, `authorityReleased: false` and
`productionAuthorizing: false`.

## Native durability implementation

| Profile | Repository implementation | Live evidence at current commit |
|---|---:|---:|
| Windows 10 x64, local NTFS | **COMPLETE** | 7/7 native/profile plus seven-boundary process termination pass |
| Windows 11 x64, local NTFS | **COMPLETE** | **PENDING exact Windows 11 host** |
| GNU Linux x64/Arm64, direct ext4 | **COMPLETE** | **PENDING current Ubuntu round two**; returned `2ceaf479...` evidence predates this adapter |
| macOS Arm64, internal APFS | **COMPLETE** | **PENDING exact Apple Arm64 APFS host**; cross-target compilation is not live evidence |
| Controlled reboot/power loss | **PROTOCOL COMPLETE** | **PENDING sacrificial hosts/volumes** |

The recovery worker cannot reboot or cut power and optimized builds refuse its
feature. The independent verifier permits only exact `PRIOR` or exact
`CANDIDATE`, writes one exclusive public result and refuses replay or mixed
state. These controls make external experiments reproducible; they do not make
an unexecuted experiment green.

No complete external seven-OS matrix has returned from this unpushed branch.
The beta-v1 release verifier therefore remains K3 `0`; Windows 11, macOS,
Ubuntu, Debian, Fedora and Mint are not relabelled as verified.
