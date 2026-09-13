# RD-0873 direct Fungi conversion: waves 64-66

Date: 2026-09-13  
Plan: `RD-0873-FULL-PACKAGE-FUNGI-CONVERSION`  
Worker ceiling: **Luna - High** (compute, economics and reports workers)  
Validation: local only; Git is storage; no CI or hosted build

## Bounded leaves

- `packages-ts/galerina-web-components/src/index.ts#validateComponentProps` -> `packages/fungi/products/galerina-web-components/validate-component-props.fungi` (3,214 bytes; focused parity 8/8).
- `packages-ts/galerina-web-events/src/index.ts#validateEventPayloadField` -> `packages/fungi/products/galerina-web-events/validate-event-payload-field.fungi` (1,897 bytes; focused parity 12/12).
- `packages-ts/galerina-web-render/src/index.ts#validateRenderableContent` -> `packages/fungi/products/galerina-web-render/validate-renderable-content.fungi` (2,247 bytes; nine package-fixture cases exercised; a separate cross-backend parity run is not claimed).

TypeScript shadows remain retained. All targets pass strict Fungi checking with zero errors and zero governance warnings; the three targets also pass serial local Fungi builds.

## Verification

- Strict Fungi checks/builds: **3/3 PASS**.
- Retained package suites: **73/73 PASS** (26 web-components, 25 web-events, 22 web-render).
- Ten fresh local strict-check invocations per target: **30/30 PASS**; mean check times were 251.0 ms, 242.0 ms and 243.1 ms.
- Current source/target head binding: `675e1048304b11e109b1de4f68af97ebc64f5949`; tree receipt `b20138180928ed9d787d157d1faedbe86050be64`.

## Boundaries

These leaves cover pure validation and diagnostic behavior. Browser DOM/event effects, rendering, host marshalling, runtime probing, external effects, physical ABI admission and production authority remain explicit host/runtime boundaries. This is bounded conversion evidence, not a production-authority claim.

The manifest now records **64/100** package roots, **65** direct buildable leaves and **139,092** output bytes; **36** package roots remain. Receipts are `docs/independent-audits/2026-09-13-rd0873-fungi-wave064-web-components.json` through `wave066-web-render.json` plus the preceding wave 58-63 receipts.
