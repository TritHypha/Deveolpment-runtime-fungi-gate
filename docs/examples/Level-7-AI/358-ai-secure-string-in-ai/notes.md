# 358 — AI secure string in AI call

**Concept:** passing a SecureString to an AI model is a secret-exposure error

`SecureString` values (API keys, tokens, passwords) are classified as secrets. Passing them to an AI model inference call risks leaking the secret into model context, state, tensors, plugins, generated output, or telemetry even when execution is local. The compiler raises `FUNGI-SECRET-007` to block this model-boundary exposure without falsely claiming every local model call is network egress.

**AI rule:** Never pass a `SecureString` or secret-typed value to an AI model call.
