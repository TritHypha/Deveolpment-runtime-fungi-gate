# Durability recovery evidence report

**Status:** `NOT RUN | REFUSED | COMPLETE`

**Public evidence only:** yes/no

## Exact identities

| Field | Recorded value |
|---|---|
| Galerina commit | `<40 lowercase hex>` |
| Operating system and version | `<exact>` |
| Architecture | `<exact>` |
| Kernel/build | `<exact>` |
| Filesystem | `<exact>` |
| Storage medium | `<exact class; no serial number>` |
| Controller and firmware | `<exact public description>` |
| Target device identity digest | `sha256:<64 lowercase hex>` |
| Repository device identity digest | `sha256:<64 lowercase hex>` |
| Home device identity digest | `sha256:<64 lowercase hex>` |
| System device identity digest | `sha256:<64 lowercase hex>` |
| Experiment ID | `<64 lowercase hex>` |
| Mode | `controlled-reboot | controlled-power-loss` |
| Boundary | `<one exact boundary>` |

## Preconditions

- [ ] Disposable host and checkout confirmed.
- [ ] Dedicated sacrificial volume confirmed.
- [ ] Native target device differs from repository, home and system devices.
- [ ] Two independent custody copies restore and hash-verify.
- [ ] Target contains no unique data.
- [ ] Prior generation and checkpoint independently verify.
- [ ] Exact debug recovery binaries came from the recorded clean commit.
- [ ] No production/private key was present or used.

## Execution

| Observation | Result |
|---|---|
| Worker preflight | `PASS | REFUSED` |
| Exact arm line | `<public line or absent>` |
| External action performed by | `<owner/operator role; no PII>` |
| Fresh-boot verifier exit | `<integer>` |
| Recovery outcome | `PRIOR | CANDIDATE | REFUSED` |
| Replay attempt | `REFUSED | NOT RUN` |

## Evidence digests

| File | SHA-256 |
|---|---|
| Arm record | `<64 lowercase hex>` |
| Result record | `<64 lowercase hex>` |
| Worker executable | `<64 lowercase hex>` |
| Verifier executable | `<64 lowercase hex>` |

## Refusal or anomaly

Record the exact public refusal code and observable state. Do not include a
local absolute path, username, secret, private key, environment value or raw
device serial. Do not repair or rewrite returned evidence.

## Claim boundary

This report describes one exact host/device/filesystem/controller/mode/boundary
experiment. It does not authorize production, generalize to another platform,
or prove physical persistence beyond the recorded evidence.
