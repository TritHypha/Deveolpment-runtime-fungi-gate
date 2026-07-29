# 367 — AI inference without effect

AI model calls require `ai.inference`, and a `pure flow` cannot declare or
perform effects. Move inference to a secure flow with explicit authority.
