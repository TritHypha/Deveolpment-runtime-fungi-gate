# Galerina offline registry signing — DO NOW

**Current state: READY FOR OPERATIONAL REGISTRY-INDEX SIGNING ONLY.**

This page contains one current owner operation. It does not mix completed
steps or later commands into the action chart.

## Current action chart

| Order | State | Evidence |
|---:|:---:|---|
| 1 | 🟩 **COMPLETE** | Root `21415420b447e219` hybrid-signed serial-1 delegation for operational key `f3172a48372bfb23`; signature, window, serial, roles, revocation and public pins verify. |
| 2 | 🟩 **COMPLETE** | Operational key `f3172a48372bfb23` hybrid-signed `@galerina/auth`; the returned public manifest is byte-identical in the live tree and independently verifies against package bytes and the complete authority chain. |
| 3 | 🟩 **COMPLETE** | The public-only builder re-opened the live tree and produced exactly one unsigned index entry at `2026-07-30T16:33:10.307Z`; SHA-256 `15D531566E9FB71F152E34BD9C4C62D4D6FAE15DB0309CBCFA0834BE2E020383`. |
| 4 | 🟩 **DO NOW** | On the offline machine, use operational key `f3172a48372bfb23` to hybrid-sign that exact one-entry index. |
| 5 | 🟥 **LOCKED** | Mark production signing green or publish the index. This page advances only after the returned public signed index independently verifies. |

## Run this now

Use a clean copy of the current Galerina commit on the offline Windows machine.
Keep the operational private file outside the repository.

Replace:

- `<offline-operational-file>` with the mounted path to
  `env.slide-hybrid-f3172a48372bfb23`; and
- `<offline-staging-directory>` with an existing directory for the public
  signed output.

Run the complete block in one PowerShell session. The variables do not survive
opening a new terminal.

```powershell
Set-Location <clean-galerina-checkout>

$OperationalFile = "<offline-operational-file>"
$SigningStage = "<offline-staging-directory>"
$AuthorityAt = [DateTime]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
$IssuedAt = "2026-07-30T16:33:10.307Z"

if (-not (Test-Path -LiteralPath $OperationalFile -PathType Leaf)) {
  throw "STOP: operational hybrid-key file is unavailable."
}

if (-not (Test-Path -LiteralPath $SigningStage -PathType Container)) {
  throw "STOP: signing-stage directory is unavailable."
}

"AUTHORITY_AT=$AuthorityAt"
"ISSUED_AT=$IssuedAt"

$env:GALERINA_SIGNING_KEY_ID = "f3172a48372bfb23"
$env:GALERINA_REGISTRY_SIGNING_ENV_PATH = $OperationalFile
try {
  node scripts/registry-index-cli.mjs sign `
    --registry-dir packages-galerina/galerina-registry/packages `
    --workspace-packages-dir packages-galerina `
    --registry "https://registry.galerina.dev" `
    --delegation governance/registry-delegation-f3172a48372bfb23-v1.json `
    --root-pubkey governance/signing-key-21415420b447e219.pub.pem `
    --root-mldsa65-pubkey governance/signing-key-21415420b447e219.mldsa.pub.b64 `
    --root-key-id 21415420b447e219 `
    --operational-ed25519-pubkey governance/signing-key-f3172a48372bfb23.pub.pem `
    --operational-mldsa65-pubkey governance/signing-key-f3172a48372bfb23.mldsa.pub.b64 `
    --authority-at $AuthorityAt `
    --min-delegation-serial 0 `
    --issued-at $IssuedAt `
    --out (Join-Path $SigningStage "registry-index-v2.json")

  if ($LASTEXITCODE -ne 0) {
    throw "STOP: operational registry-index signing refused."
  }
}
finally {
  Remove-Item Env:GALERINA_REGISTRY_SIGNING_ENV_PATH -ErrorAction SilentlyContinue
  Remove-Item Env:GALERINA_SIGNING_KEY_ID -ErrorAction SilentlyContinue
}
```

Stop after that command. Return only:

- the public staged file `registry-index-v2.json`;
- the CLI status;
- `AUTHORITY_AT`; and
- `ISSUED_AT`.

Never return, paste, inspect or transmit the private signing environment.

## Hard stop

Do not publish or mark production signing green. The returned signed index
must independently verify against:

- the exact one-entry live registry;
- both tracked operational public halves;
- operational key ID `f3172a48372bfb23`;
- current revocation state;
- the fixed issued time;
- the signed manifest and package bytes; and
- the previously built unsigned index content.

The engineering reference is
`OFFLINE-KEY-SIGNING-CEREMONY-REFERENCE.md`. It is not the live instruction
page.
