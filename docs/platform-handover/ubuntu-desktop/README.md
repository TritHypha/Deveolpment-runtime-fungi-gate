# Ubuntu Desktop platform-evidence handover

Date: 2026-07-31

Status: static-link portability, bounded SLIDE platform observation and pure
Linux admission/parser lanes ready; native Linux syscall adapter and
reboot/power-loss chapters not yet ready

This folder is the single handover point for running Galerina's Ubuntu Desktop
evidence on a separately booted Linux host. A fresh Codex session should read
the files in this order:

1. `CODEX-HANDOVER.md`
2. `RUNBOOK.md`
3. `REPORT-TEMPLATE.md`
4. `reports/README.md`

The current runnable step proves that the statically linked registry adapter
profile builds and independently verifies on Linux. It also runs the separate
SLIDE repository's bounded Node-bootstrap platform observer and complete
reference suite. Neither result admits a production adapter, proves native
SLIDE execution or claims filesystem durability. Later commits will add the
Linux host/filesystem gate, retained-handle publication primitive,
process-termination matrix and controlled reboot recovery procedure here.

The native crate also contains a platform-neutral 6/6 Linux fact-admission,
bounded `mountinfo` parser and pure filesystem/device-correlation matrix.
Ubuntu must rerun it, but the result remains
pure-model evidence until live `statfs` and sysfs identities are correlated.

Docker and virtual machines may run the portability lane, but their results
must be labelled `VIRTUAL_NON_AUTHORIZING`. Only a separately booted Ubuntu
Desktop host on an admitted direct local filesystem can become a bare-host
candidate, and even that remains non-authorizing until every required crash
and custody gate passes.

No private signing key is needed or permitted for this handover.

Return the completed report, raw Galerina receipt and raw SLIDE platform report
in this repository under `docs/platform-handover/ubuntu-desktop/reports/`; do
not leave the only copy in a terminal transcript or an untracked home-directory
file.
