# Galerina offline registry signing — DO NOW

**Current state: CUSTODY VERIFIED. Public-only re-export is the one authorized
operation.**

This is the live owner-action page. It contains only what to do now. Historical
work and later ceremony commands are deliberately kept out of this page.

## Current action chart

| Order | State | What to do now | Completion evidence | CLI now |
|---:|:---:|---|---|---|
| 1 | 🟩 **DO NOW** | On the offline computer, re-export the two **public** halves of operational key `f3172a48372bfb23` into a new empty staging directory using the exact block below. | CLI prints `PUBLIC ONLY: exported both halves for keyId 'f3172a48372bfb23'.` and two public SHA-256 hashes are produced. | `export-public` only |
| 2 | 🟨 **THEN REPORT** | Send Codex only the success line plus the two public filenames and SHA-256 hashes. | No private path, private value, environment dump, screenshot, or private-file hash is sent. | **None** |
| 3 | 🟥 **LOCKED** | Delegation draft/signing, root mounting, package-manifest signing, live registry build, and index signing. | This page must be updated to move exactly one next operation into 🟩 **DO NOW**. | **Do not run** |

## Run this now

First disconnect Wi-Fi, Ethernet, VPN and any sync service. Run this from the
clean Galerina checkout on that offline computer:

```powershell
$SigningKeyPath = Join-Path `
  ([Environment]::GetFolderPath("MyDocuments")) `
  "GitHub\keys\env.galerina-registry-signing-f3172a48372bfb23"

$SigningStage = Join-Path `
  ([Environment]::GetFolderPath("MyDocuments")) `
  "ignore\galerina-registry-ceremony-f317-public-export"

if (-not (Test-Path -LiteralPath $SigningKeyPath -PathType Leaf)) {
  throw "STOP: operational private file is not present at the expected path."
}

if (Test-Path -LiteralPath $SigningStage) {
  throw "STOP: staging directory already exists; do not overwrite ceremony output."
}

New-Item -ItemType Directory -Path $SigningStage | Out-Null
$env:GALERINA_REGISTRY_SIGNING_ENV_PATH = $SigningKeyPath

try {
  node scripts/registry-authority-cli.mjs export-public `
    --operational-key-id f3172a48372bfb23 `
    --ed25519-out (Join-Path $SigningStage "signing-key-f3172a48372bfb23.pub.pem") `
    --mldsa65-out (Join-Path $SigningStage "signing-key-f3172a48372bfb23.mldsa.pub.b64")

  if ($LASTEXITCODE -ne 0) {
    throw "STOP: public export refused."
  }
}
finally {
  Remove-Item Env:GALERINA_REGISTRY_SIGNING_ENV_PATH -ErrorAction SilentlyContinue
}

$PublicFiles = @(
  (Join-Path $SigningStage "signing-key-f3172a48372bfb23.pub.pem")
  (Join-Path $SigningStage "signing-key-f3172a48372bfb23.mldsa.pub.b64")
)

Get-FileHash -LiteralPath $PublicFiles -Algorithm SHA256 |
  Select-Object @{Name="Name";Expression={Split-Path $_.Path -Leaf}}, Algorithm, Hash
```

## Key separation — reference only

| Purpose | Key ID | Public filenames | Current use |
|---|---|---|---|
| Offline trust root | `21415420b447e219` | `signing-key-21415420b447e219.pub.pem` and `signing-key-21415420b447e219.mldsa.pub.b64` | No action now |
| Operational registry signer | `f3172a48372bfb23` | `signing-key-f3172a48372bfb23.pub.pem` and `signing-key-f3172a48372bfb23.mldsa.pub.b64` | Public-only re-export now |

The root public filenames above are already correct. Do not replace a
`--root-*` value with the operational key. Do not run `keygen --hybrid` again.

## Hard stop

Do not run any `registry-authority-cli.mjs` mode except `export-public`. Do not
run `registry-index-cli.mjs`, mount the root private key, draft/sign a
delegation, or sign a package/index yet.

The locked engineering reference is
`OFFLINE-KEY-SIGNING-CEREMONY-REFERENCE.md`. Do not follow commands from it
until this live page explicitly promotes one operation to 🟩 **DO NOW**.
