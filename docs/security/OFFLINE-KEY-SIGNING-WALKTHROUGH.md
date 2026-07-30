# Galerina offline registry signing — DO NOW

**Current state: READY FOR OPERATIONAL AUTH-MANIFEST SIGNING ONLY.**

This page contains one current owner operation. It does not mix completed
steps or later commands into the action chart.

## Current action chart

| Order | State | What to do now | Completion evidence |
|---:|:---:|---|---|
| 1 | 🟩 **COMPLETE** | Root `21415420b447e219` signed serial-1 delegation for operational key `f3172a48372bfb23`. | Hybrid signature, current window, serial floor `0`, exact two roles, revocation state and both operational public-key pins independently verified. |
| 2 | 🟩 **DO NOW** | On an offline machine, use operational key `f3172a48372bfb23` to sign only the reviewed auth candidate. | A public `auth.package.galerina.yaml` is created in offline staging and the CLI reports `SIGNED package manifest`. |
| 3 | 🟥 **LOCKED** | Move auth into the live registry, build the live index, sign the index, or mark production signing green. | This page advances only after the returned public manifest independently verifies. |

## Run this now

Use a clean copy of the current Galerina commit on an offline Windows machine.
Keep the operational private file outside the repository. Replace only
`<offline-operational-file>` and `<offline-staging-directory>` with their
actual mounted paths.

`<offline-operational-file>` means the private signing environment for
**operational key `f3172a48372bfb23`**, custodied as
`env.slide-hybrid-f3172a48372bfb23`. It is not the root file.

```powershell
Set-Location <clean-galerina-checkout>

$OperationalFile = "<offline-operational-file>"
$SigningStage = "<offline-staging-directory>"
$AuthorityAt = [DateTime]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
"AUTHORITY_AT=$AuthorityAt"

$env:GALERINA_SIGNING_KEY_ID = "f3172a48372bfb23"
$env:GALERINA_REGISTRY_SIGNING_ENV_PATH = $OperationalFile
try {
  node scripts/registry-authority-cli.mjs sign-manifest `
    --in packages-galerina/galerina-registry/candidates/@galerina/auth/package.galerina.yaml `
    --out (Join-Path $SigningStage "auth.package.galerina.yaml") `
    --workspace-packages-dir packages-galerina `
    --delegation governance/registry-delegation-f3172a48372bfb23-v1.json `
    --root-pubkey governance/signing-key-21415420b447e219.pub.pem `
    --root-mldsa65-pubkey governance/signing-key-21415420b447e219.mldsa.pub.b64 `
    --root-key-id 21415420b447e219 `
    --operational-ed25519-pubkey governance/signing-key-f3172a48372bfb23.pub.pem `
    --operational-mldsa65-pubkey governance/signing-key-f3172a48372bfb23.mldsa.pub.b64 `
    --operational-key-id f3172a48372bfb23 `
    --authority-at $AuthorityAt `
    --min-delegation-serial 0

  if ($LASTEXITCODE -ne 0) {
    throw "STOP: operational auth-manifest signing refused."
  }
}
finally {
  Remove-Item Env:GALERINA_REGISTRY_SIGNING_ENV_PATH -ErrorAction SilentlyContinue
  Remove-Item Env:GALERINA_SIGNING_KEY_ID -ErrorAction SilentlyContinue
}
```

Stop after that command. Do not run a command from the ceremony reference.
Return only:

- the public staged file `auth.package.galerina.yaml`;
- the CLI status; and
- the printed value of `$AuthorityAt`.

Never return, paste, inspect or transmit the private signing environment.

## Hard stop

Do not move the staged manifest into
`packages-galerina/galerina-registry/packages`, build or sign the registry
index, or mark the release gate green. Those steps remain locked until the
returned manifest independently verifies against:

- the exact reviewed candidate bytes;
- the signed serial-1 delegation;
- both tracked root public halves;
- both tracked operational public halves;
- the current revocation state;
- the exact closed package-manifest role; and
- the reported authority instant.

The engineering reference is
`OFFLINE-KEY-SIGNING-CEREMONY-REFERENCE.md`. It is not the live instruction
page.
