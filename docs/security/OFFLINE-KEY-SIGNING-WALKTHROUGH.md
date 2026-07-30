# Galerina offline registry signing — DO NOW

**Current state: CUSTODY, STRUCTURE, PUBLIC EXPORT AND PUBLIC-BUNDLE ADMISSION
VERIFIED. The extra online private working copy has been removed. There is no
owner action now.**

This is the live owner-action page. It contains only what to do now. Historical
work and later ceremony commands are deliberately kept out of this page.

## Current action chart

| Order | State | What to do now | Completion evidence | CLI now |
|---:|:---:|---|---|---|
| 1 | 🟨 **WAIT** | Keep both verified custody copies offline. Codex is preparing the final unsigned delegation and package-approval evidence. | The live chart is updated only after the engineering gates pass. | **None** |
| 2 | 🟥 **LOCKED** | Removing either custody copy, delegation signing, root mounting, package-manifest signing, live registry build, and index signing. | This page must move exactly one owner operation into 🟩 **DO NOW** before any command is run. | **Do not run** |

## Do this now

No command. Keep the two verified custody copies offline and do not reconnect
or mount either one. Filesystem deletion does not prove physical erasure of
residual SSD cells; full-disk encryption is the control for residual blocks.

## Key separation — reference only

| Purpose | Key ID | Public filenames | Current use |
|---|---|---|---|
| Offline trust root | `21415420b447e219` | `signing-key-21415420b447e219.pub.pem` and `signing-key-21415420b447e219.mldsa.pub.b64` | No action now |
| Operational registry signer | `f3172a48372bfb23` | `signing-key-f3172a48372bfb23.pub.pem` and `signing-key-f3172a48372bfb23.mldsa.pub.b64` | Public export verified; private working copy removed |

The root public filenames above are already correct. Do not replace a
`--root-*` value with the operational key. Do not run `keygen --hybrid` again.

## Hard stop

Do not remove either verified custody copy or either public file. Do not run
any `registry-authority-cli.mjs` or `registry-index-cli.mjs` mode, mount the
root private key, draft/sign a delegation, or sign a package/index yet.

The locked engineering reference is
`OFFLINE-KEY-SIGNING-CEREMONY-REFERENCE.md`. Do not follow commands from it
until this live page explicitly promotes one operation to 🟩 **DO NOW**.
