# Safe unsigned plugin regeneration design

## Purpose

Provide an explicit full-regeneration mode for every discovered fusable package without weakening ceremony-signed package custody.

## Decision

- `--rebuild-all` ignores freshness for unsigned and committed-placeholder packages.
- Committed ceremony-signed packages remain locked under `--rebuild-all`.
- `--allow-signed` is the only explicit ceremony-bypass option and is forwarded to the package builder as its existing `--force` guard override.
- The ambiguous top-level `--force` option refuses with exit code 2 and names the two precise alternatives.
- `--strict` remains the authority gate: empty discovery, skipped execution, or any failed child returns non-zero.
- Default hook behaviour remains informational and stale-only.

## Security invariants

The committed Git object, not mutable disk appearance, decides whether a package is ceremony-signed. Full regeneration cannot rewrite a committed ceremony artifact. A signed bypass is loud, individually names every package, and never implies a completed signing ceremony.

## Verification

Subprocess tests exercise real temporary repositories. They prove that fresh unsigned packages rebuild under `--rebuild-all`, signed packages stay byte-identical, `--allow-signed` is loud, legacy `--force` refuses, and strict failure conservation remains intact.
