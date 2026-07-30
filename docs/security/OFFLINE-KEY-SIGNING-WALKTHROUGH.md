# Galerina offline registry signing — DO NOW

**Current state: STOPPED AT CUSTODY. No signing CLI command is authorized.**

This is the live owner-action page. It contains only what to do now. Historical
work and later ceremony commands are deliberately kept out of this page.

## Current action chart

| Order | State | What to do now | Completion evidence | CLI now |
|---:|:---:|---|---|---|
| 1 | 🟩 **DO NOW** | Create a second encrypted offline custody copy of `env.galerina-registry-signing-f3172a48372bfb23` in a **separate physical location** from the first copy. | Two location labels, both copies confirmed readable, and the verification date recorded offline. Never record or print private values. | **None** |
| 2 | 🟨 **THEN REPORT** | Tell Codex: `two separate custody copies for f3172a48372bfb23 are verified`. | Owner confirmation only; do not send paths, file contents, environment values, screenshots, or hashes of private material. | **None** |
| 3 | 🟥 **LOCKED** | Public re-export, delegation draft, root delegation signing, package-manifest signing, live registry build, and index signing. | This page must be updated to move exactly one next operation into 🟩 **DO NOW**. | **Do not run** |

## Key separation — reference only

| Purpose | Key ID | Public filenames | Current use |
|---|---|---|---|
| Offline trust root | `21415420b447e219` | `signing-key-21415420b447e219.pub.pem` and `signing-key-21415420b447e219.mldsa.pub.b64` | No action now |
| Operational registry signer | `f3172a48372bfb23` | `signing-key-f3172a48372bfb23.pub.pem` and `signing-key-f3172a48372bfb23.mldsa.pub.b64` | Back up the private operational file only |

The root public filenames above are already correct. Do not replace a
`--root-*` value with the operational key. Do not run `keygen --hybrid` again.

## Hard stop

Do not run `registry-authority-cli.mjs`, `registry-index-cli.mjs`, mount the
root private key, sign a delegation, or sign a package/index yet.

The locked engineering reference is
`OFFLINE-KEY-SIGNING-CEREMONY-REFERENCE.md`. Do not follow commands from it
until this live page explicitly promotes one operation to 🟩 **DO NOW**.
