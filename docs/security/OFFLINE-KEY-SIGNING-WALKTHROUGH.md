# Galerina offline registry signing — DO NOW

**Current state: READY FOR ROOT DELEGATION SIGNING ONLY.**

This page contains one current owner operation. It does not mix completed
steps or later commands into the action chart.

## Current action chart

| Order | State | What to do now | Completion evidence |
|---:|:---:|---|---|
| 1 | 🟩 **DO NOW** | On an offline machine, use root key `21415420b447e219` to sign the prepared serial-1 delegation for operational key `f3172a48372bfb23`. | `governance/registry-delegation-f3172a48372bfb23-v1.json` is created and the CLI reports `ROOT-SIGNED delegation`. |
| 2 | 🟥 **LOCKED** | Package-manifest signing, moving auth live, live-index building, index signing, and roadmap green status. | This page advances only after the returned public delegation independently verifies. |

## Run this now

Use a clean copy of the current Galerina commit on an offline Windows machine.
Keep the root private file on the offline archive; do not copy it into the
repository. Replace only `<offline-root-file>` with its actual mounted path.

```powershell
Set-Location <clean-galerina-checkout>

$env:GALERINA_ROOT_SIGNING_ENV_PATH = "<offline-root-file>"
try {
  node scripts/registry-authority-cli.mjs sign `
    --in governance/registry-delegation-f3172a48372bfb23-v1.unsigned.json `
    --out governance/registry-delegation-f3172a48372bfb23-v1.json `
    --root-key-id 21415420b447e219

  if ($LASTEXITCODE -ne 0) {
    throw "STOP: root delegation signing refused."
  }
}
finally {
  Remove-Item Env:GALERINA_ROOT_SIGNING_ENV_PATH -ErrorAction SilentlyContinue
}
```

Stop after that command. Do not run a command from the ceremony reference.
Return only the public file
`governance/registry-delegation-f3172a48372bfb23-v1.json` and the CLI status;
never return, paste, inspect, or transmit the private environment.

## Hard stop

Do not mount the operational key yet. Do not sign the auth manifest or registry
index, and do not move the candidate into the live registry tree. Those steps
remain locked until this delegation is independently verified against both
tracked root public halves, serial floor `0`, the two closed roles, the
revocation state, and the active time window.

The engineering reference is
`OFFLINE-KEY-SIGNING-CEREMONY-REFERENCE.md`. It is not the live instruction
page.
