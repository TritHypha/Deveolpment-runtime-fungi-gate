# Transfer the exact unpushed commits to Ubuntu Desktop

Use this only after the Windows working trees are clean and the primary Codex
session says the handover commit is ready. A normal remote clone is
insufficient because the admitted test branches are intentionally not pushed.

## On the Windows development computer

From the Galerina repository root:

```powershell
$Transfer = Join-Path $PWD "docs\platform-handover\ubuntu-desktop\transfer"
$GalerinaBranch = git branch --show-current
$SlideBranch = git -C ..\SLIDE branch --show-current

if ((git status --porcelain).Length -ne 0) {
  throw "STOP: Galerina working tree is not clean."
}
if ((git -C ..\SLIDE status --porcelain).Length -ne 0) {
  throw "STOP: SLIDE working tree is not clean."
}
if ([string]::IsNullOrWhiteSpace($GalerinaBranch)) {
  throw "STOP: Galerina is detached."
}
if ([string]::IsNullOrWhiteSpace($SlideBranch)) {
  throw "STOP: SLIDE is detached."
}

git bundle create (Join-Path $Transfer "Galerina-current.bundle") $GalerinaBranch
if ($LASTEXITCODE -ne 0) { throw "STOP: Galerina bundle creation failed." }
git -C ..\SLIDE bundle create (Join-Path $Transfer "SLIDE-current.bundle") $SlideBranch
if ($LASTEXITCODE -ne 0) { throw "STOP: SLIDE bundle creation failed." }

git bundle verify (Join-Path $Transfer "Galerina-current.bundle")
if ($LASTEXITCODE -ne 0) { throw "STOP: Galerina bundle verification failed." }
git bundle verify (Join-Path $Transfer "SLIDE-current.bundle")
if ($LASTEXITCODE -ne 0) { throw "STOP: SLIDE bundle verification failed." }

Get-FileHash -Algorithm SHA256 -LiteralPath @(
  (Join-Path $Transfer "Galerina-current.bundle"),
  (Join-Path $Transfer "SLIDE-current.bundle")
)

$GalerinaHash = (Get-FileHash -Algorithm SHA256 -LiteralPath `
  (Join-Path $Transfer "Galerina-current.bundle")).Hash.ToLowerInvariant()
$SlideHash = (Get-FileHash -Algorithm SHA256 -LiteralPath `
  (Join-Path $Transfer "SLIDE-current.bundle")).Hash.ToLowerInvariant()
$GalerinaHead = git rev-parse HEAD
$SlideHead = git -C ..\SLIDE rev-parse HEAD
$Manifest = @(
  "# Galerina branch=$GalerinaBranch head=$GalerinaHead"
  "$GalerinaHash  Galerina-current.bundle"
  "# SLIDE branch=$SlideBranch head=$SlideHead"
  "$SlideHash  SLIDE-current.bundle"
)
[System.IO.File]::WriteAllLines(
  (Join-Path $Transfer "CURRENT-BUNDLE-MANIFEST.txt"),
  $Manifest,
  [System.Text.UTF8Encoding]::new($false)
)
```

Record the two hashes out of band and copy both bundle files plus
`CURRENT-BUNDLE-MANIFEST.txt` to the Ubuntu Desktop computer as one transfer
set. The three generated files are deliberately ignored by Git. The manifest
is a convenience copy, not an independent custody record; compare its two
hashes with the values recorded out of band before using it. Never add private
keys, signing environments or custody material to the transfer folder.

## On Ubuntu Desktop

Put both bundle files in one temporary transfer directory, independently
verify their recorded SHA-256 values, and then run:

```bash
set -eu
TRANSFER_DIRECTORY="$PWD"
test -f "$TRANSFER_DIRECTORY/Galerina-current.bundle"
test -f "$TRANSFER_DIRECTORY/SLIDE-current.bundle"
test -f "$TRANSFER_DIRECTORY/CURRENT-BUNDLE-MANIFEST.txt"
sha256sum --check "$TRANSFER_DIRECTORY/CURRENT-BUNDLE-MANIFEST.txt"
git bundle verify "$TRANSFER_DIRECTORY/Galerina-current.bundle"
git bundle verify "$TRANSFER_DIRECTORY/SLIDE-current.bundle"

cd ..
test ! -e Galerina
test ! -e SLIDE
git clone --branch codex/galerina-beta-v1-completion \
  "$TRANSFER_DIRECTORY/Galerina-current.bundle" Galerina
git clone --branch codex/v2c-independent-frontend \
  "$TRANSFER_DIRECTORY/SLIDE-current.bundle" SLIDE
git -C Galerina status --short --branch
git -C SLIDE status --short --branch
git -C Galerina rev-parse HEAD
git -C SLIDE rev-parse HEAD
```

Both worktrees must be clean, the two named branches must exist, and both
commits must equal the bundle heads recorded on Windows. If either branch is
absent, stop and report the complete message; do not guess a branch or test a
different commit.

Continue with `CODEX-HANDOVER.md` and `RUNBOOK.md` from the transferred
Galerina tree.

## Return path

Return these five files without editing them:

```text
Galerina/docs/platform-handover/ubuntu-desktop/reports/
  ubuntu-desktop-linux-adapter-YYYY-MM-DD-<12-char-commit>.md
  ubuntu-desktop-linux-adapter-YYYY-MM-DD-<12-char-commit>.receipt.json
  ubuntu-desktop-linux-adapter-YYYY-MM-DD-<12-char-commit>.slide-platform.json
  ubuntu-desktop-linux-adapter-YYYY-MM-DD-<12-char-commit>.native-evidence.json
  ubuntu-desktop-linux-adapter-YYYY-MM-DD-<12-char-commit>.functional.json
```

If anything fails, return the Markdown report containing the exact command,
stdout, stderr and exit code. Do not fix an architecture, authority,
cryptographic or evidence-policy failure on the Ubuntu machine. A confirmed
ordinary portability defect may be fixed only under the separate fix-branch
procedure in `CODEX-HANDOVER.md`.
