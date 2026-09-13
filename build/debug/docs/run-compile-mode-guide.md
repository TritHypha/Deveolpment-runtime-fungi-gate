# Run Mode and Compile Mode Guide

Generated from Galerina build output.

## Summary

Run Mode is quick execution for scripts, learning and development. Compile Mode is the full production build with reports, manifests, documentation and target outputs.

Core principle:

```text
Galerina can run directly, but it becomes fully Galerina when it is checked, compiled, mapped, reported and documented.
```

## Runtime Settings

- Run mode: checked
- Cache IR: false
- Hot reload: false

## Compile Settings

- Mode: debug
- Deterministic: false
- Source maps: true
- Reports: true
- Map manifest: true
- Documentation: false
- AI context: true
- AI guide: true

## Execution Modes

| Mode | Purpose | Command |
|---|---|---|
| run | Run a single script or project directly after checks. | `Galerina run hello.fungi` |
| generate | Generate development reports and documentation from checked source without production artefacts. | `Galerina generate` |
| dev | Check, generate development outputs and run locally. | `Galerina dev` |
| serve | Run a local API or web app in development mode. | `Galerina serve --dev` |
| check | Validate source without writing build artefacts. | `Galerina check` |
| build | Compile and generate build artefacts, reports and documentation. | `Galerina build` |
| release | Compile a deterministic production build. | `Galerina build --mode release` |

## Checked Run Mode

Before execution, Galerina Run Mode should:

- parse_source
- type_check_source
- security_check_source
- validate_imports
- validate_strict_comments_where_required
- validate_api_and_webhook_contracts_where_relevant

Run Mode should still enforce strict types, no undefined, no silent null, explicit errors, SecureString rules and source-located diagnostics.

## Compile Mode Outputs

- app.bin
- app.wasm
- app.gpu.plan
- app.photonic.plan
- app.ternary.sim
- app.omni-logic.sim
- app.source-map.json
- app.map-manifest.json
- app.security-report.json
- app.target-report.json
- app.api-report.json
- app.ai-guide.md
- app.ai-context.json
- app.build-manifest.json

## Production Rule

Use Galerina run while developing, Galerina check before committing and Galerina build --mode release before production deployment.

## AI Guide Rule

Only update the AI guide after a successful compile.

## Final Rule

```text
Run fast while developing.
Compile fully before deploying.
```
