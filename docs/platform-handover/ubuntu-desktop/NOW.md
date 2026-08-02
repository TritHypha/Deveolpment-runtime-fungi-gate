# Ubuntu Desktop round-two evidence - action needed now

Status: **the 2026-08-02 attempt stopped correctly; no Linux evidence was
admitted**.

The returned report for Galerina commit `134da79df318...` contains no receipt.
It stopped before host observation because the required independent sibling
checkout `../SLIDE` was absent. That is a setup failure, not a Linux adapter
failure, and cannot turn the roadmap green.

## Before the next Ubuntu session

The Ubuntu computer must receive one indivisible three-file transfer set, not
only a remote Galerina clone:

```text
Galerina-current.bundle
SLIDE-current.bundle
CURRENT-BUNDLE-MANIFEST.txt
```

Create them on the Windows computer only after both worktrees are clean by
following `TRANSFER-LOCAL-COMMITS.md`. Copy all three files and the two
independently recorded SHA-256 values to Ubuntu. Verify the manifest and both
Git bundles before cloning. Private signing files are neither needed nor
permitted.

## On Ubuntu

Follow the **On Ubuntu Desktop** block in `TRANSFER-LOCAL-COMMITS.md` first. It
must produce this exact sibling layout:

```text
<parent>/
  Galerina/.git
  SLIDE/.git
```

Both repositories must be on the named handover branches and clean. Only then
start with `CODEX-HANDOVER.md` and execute `RUNBOOK.md`.

If either bundle, branch, hash, sibling checkout or tool is missing, stop and
return one Markdown failure report. Do not substitute `triLowLevel-v2`, copied
SLIDE files, a remote branch, Docker or a renamed old receipt.

## Required return

A successful round returns the Markdown report plus four raw JSON files in
`docs/platform-handover/ubuntu-desktop/reports/`, exactly as named in
`CODEX-HANDOVER.md`. Until all four independently verify, Linux round two and
beta-v1 release admission remain non-authorizing.
