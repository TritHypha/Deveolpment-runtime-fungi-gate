# Galerina offline registry signing — DO NOW

**Current state: CUSTODY VERIFIED. A signing-environment structure check is the
one authorized operation. Public export is locked.**

This is the live owner-action page. It contains only what to do now. Historical
work and later ceremony commands are deliberately kept out of this page.

## Current action chart

| Order | State | What to do now | Completion evidence | CLI now |
|---:|:---:|---|---|---|
| 1 | 🟩 **DO NOW** | On the offline computer, inspect only the structure and encoding of operational key file `f3172a48372bfb23` using the exact block below. | CLI prints one `STRUCTURE OK:` line, or a refusal naming only the structural fault. Private values and the private path are never printed. | `inspect-environment` only |
| 2 | 🟨 **THEN REPORT** | Send Codex only the single `STRUCTURE OK:` or `REFUSED:` line. | No private path, private value, environment dump, screenshot, file content, or private-file hash is sent. | **None** |
| 3 | 🟥 **LOCKED** | Public export, delegation draft/signing, root mounting, package-manifest signing, live registry build, and index signing. | This page must be updated to move exactly one next operation into 🟩 **DO NOW**. | **Do not run** |

## Run this now

First disconnect Wi-Fi, Ethernet, VPN and any sync service. Run this from the
clean Galerina checkout on that offline computer:

```powershell
$SigningKeyPath = Join-Path `
  ([Environment]::GetFolderPath("MyDocuments")) `
  "GitHub\keys\env.galerina-registry-signing-f3172a48372bfb23"

if (-not (Test-Path -LiteralPath $SigningKeyPath -PathType Leaf)) {
  throw "STOP: operational private file is not present at the expected path."
}

$env:GALERINA_REGISTRY_SIGNING_ENV_PATH = $SigningKeyPath

try {
  node scripts/registry-authority-cli.mjs inspect-environment `
    --operational-key-id f3172a48372bfb23

  if ($LASTEXITCODE -ne 0) {
    throw "STOP: signing-environment structure check refused."
  }
}
finally {
  Remove-Item Env:GALERINA_REGISTRY_SIGNING_ENV_PATH -ErrorAction SilentlyContinue
}
```

## Key separation — reference only

| Purpose | Key ID | Public filenames | Current use |
|---|---|---|---|
| Offline trust root | `21415420b447e219` | `signing-key-21415420b447e219.pub.pem` and `signing-key-21415420b447e219.mldsa.pub.b64` | No action now |
| Operational registry signer | `f3172a48372bfb23` | `signing-key-f3172a48372bfb23.pub.pem` and `signing-key-f3172a48372bfb23.mldsa.pub.b64` | Structure inspection only |

The root public filenames above are already correct. Do not replace a
`--root-*` value with the operational key. Do not run `keygen --hybrid` again.

## Hard stop

Do not run any `registry-authority-cli.mjs` mode except
`inspect-environment`. In particular, do not retry `export-public`. Do not run
`registry-index-cli.mjs`, mount the root private key, draft/sign a delegation,
or sign a package/index yet.

The locked engineering reference is
`OFFLINE-KEY-SIGNING-CEREMONY-REFERENCE.md`. Do not follow commands from it
until this live page explicitly promotes one operation to 🟩 **DO NOW**.
