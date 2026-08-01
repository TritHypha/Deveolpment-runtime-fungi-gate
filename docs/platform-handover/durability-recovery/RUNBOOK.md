# Controlled durability-recovery runbook

**Status:** implementation-ready; external sacrificial-host execution pending

**Authority:** test evidence only; never production-authorizing by itself

## Do now

Do not run this procedure on the Galerina development machine, its system
volume, a home volume, a repository volume, or any volume containing unique
data. The next action is to prepare a separate sacrificial host and volume,
then copy this runbook and the report template to that host. No reboot or power
removal is currently requested on this Windows 10 development computer.

## Safety boundary

The recovery worker can prepare one publication boundary and wait. It contains
no reboot, shutdown or power-control API. Only the owner/operator may perform
the separately chosen reboot or physical power removal after the worker prints
`ARMED_FOR_OPERATOR_ACTION:<boundary>`.

The `recovery-evidence` feature is absent from default builds and compile-
refused in optimized builds. Its records are public, canonical and explicitly
`authenticated: false`, `productionAuthorizing: false`. The production
admission verifier must later authenticate and compose the complete matrix.

## Mandatory preconditions

Stop `_=>` unless every item is true:

1. The checkout is clean and disposable; record its exact 40-hex commit.
2. The host is sacrificial and may be left unbootable without data loss.
3. The target is a dedicated sacrificial data volume, not merely another
   directory on the system/home/repository device.
4. Two independent custody copies of every non-disposable file are restored
   and hash-verified before the experiment.
5. The target filesystem, controller, firmware, kernel/OS and physical device
   identities are recorded in the report template.
6. The target contains the exact marker described below and no unique data.
7. The prior generation and prior checkpoint independently verify before arm.
8. The operator has selected exactly one mode and one boundary.

The live worker independently compares the native target device with the
repository, home and system devices. Equality or an unavailable identity
terminates before the arm record is created. Caller-provided device digests are
additional evidence labels; they cannot override the native comparison.

## Build the non-production tools

From
`packages-galerina/galerina-framework-app-kernel/native/registry-durability`:

```text
cargo build --locked --features recovery-evidence --bin registry-durability-recovery-worker --bin registry-durability-recovery-verifier
cargo test --locked --all-features --test recovery_protocol
```

Do not use `--release`. An optimized recovery-evidence build is deliberately
compile-refused.

## Prepare the sacrificial target

Choose unique lowercase 64-hex values for the experiment, prior generation,
candidate generation and each recorded device digest. Derive the prior and
candidate SHA-256 values from the exact bytes. The candidate bytes are fixed by
the worker and test corpus; do not edit them.

Create the direct marker by exclusive creation:

```text
GALERINA_DURABILITY_SACRIFICIAL_V1
experiment=<64-lower-hex-experiment-id>
device=<64-lower-hex-target-device-digest>
```

Create the initial checkpoint by exclusive creation:

```text
GALERINA_DURABILITY_CHECKPOINT_V1
experiment=<64-lower-hex-experiment-id>
selected=<64-lower-hex-prior-generation-id>
```

Both files end with one LF. The prior generation is named
`registry-generation-<prior-id>.json`. Any link, changed byte, wrong digest,
surplus line, missing file or ambiguous checkpoint refuses.

## Arm one experiment

Invoke the debug worker with exactly these 16 pairs, replacing every angle-
bracket value. Paths must be absolute, existing direct directories without
`.` or `..` components.

```text
registry-durability-recovery-worker \
  --execution live \
  --mode <controlled-reboot|controlled-power-loss> \
  --target <sacrificial-volume-directory> \
  --experiment-id <64-lower-hex> \
  --boundary <one-boundary> \
  --prior-id <64-lower-hex> \
  --candidate-id <64-lower-hex> \
  --prior-digest <64-lower-hex> \
  --candidate-digest <64-lower-hex> \
  --target-device-digest <64-lower-hex> \
  --repository-root <direct-repository-directory> \
  --home-root <direct-home-directory> \
  --system-root <direct-system-directory> \
  --repository-device-digest <64-lower-hex> \
  --home-device-digest <64-lower-hex> \
  --system-device-digest <64-lower-hex>
```

Allowed boundaries, each run under a fresh experiment ID:

- `stage-opened`
- `bytes-written`
- `file-flushed`
- `stage-closed`
- `published`
- `reopened-verified`
- `directory-flushed`

Do nothing if the worker exits or prints `REFUSED`. Record the exact public
error and preserve the target for analysis. Do not delete or hand-correct a
file to force a pass.

Only after the exact arm line appears may the owner perform the chosen external
action. Never automate physical power removal.

## Verify after a fresh boot

Mount the sacrificial volume read-only if the platform permits. Do not start
the worker. Run the independent verifier with the exact same 16 pairs. It is
read-only except for exclusive creation of one
`registry-durability-result-<experiment>.json` file.

The only accepted outcomes are:

- `PRIOR`: prior bytes are exact and the checkpoint still selects prior; or
- `CANDIDATE`: prior and candidate bytes are exact and the checkpoint selects
  the exact candidate.

Partial, linked or changed bytes, a mixed checkpoint, a copied arm record,
device/path overlap, an existing result, or any uncertainty refuses. A second
verification attempt is a replay and must refuse.

## Return evidence

Copy only the completed public report, arm record and result record into the
platform handover report directory. Do not copy private keys, environment
files, local usernames, full local paths, serial numbers that have not been
digested, or unique PII. Name the returned report:

`durability-recovery-<os>-<mode>-<short-commit>-<experiment-prefix>.md`

If anything fails, do not fix the evidence. Preserve it, record `REFUSED`, and
return the report for analysis.
