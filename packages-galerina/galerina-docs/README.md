# @galerina/docs

The Galerina **API documentation generator**. It turns the App Kernel's governed
route table into a valid **OpenAPI 3.x** document, so a Galerina service ships the
same machine-readable API description every other framework provides (NestJS via
`@nestjs/swagger`, Spring via springdoc).

This is the backing implementation for the OpenAPI export described — but never
built — in
[`galerina-framework-api-server` README §30](../galerina-framework-api-server/README.md).
The spec there states the rule this package obeys:

> OpenAPI is generated **FROM** the Galerina manifest/route table — it is **not**
> the source of truth.

## What it does

Given the routes a Galerina app declares (the App Kernel's `RouteDeclaration[]`)
or the fully-resolved policies the kernel actually enforces
(`EffectiveRoutePolicy[]`, from
[`galerina-framework-app-kernel`](../galerina-framework-app-kernel)), `@galerina/docs`
emits an OpenAPI 3.x document whose every operation reflects the **real governed
behaviour**:

| Kernel route policy | OpenAPI output |
|---|---|
| `method` + `path` (`:param` → `{param}`) | path item + operation + path parameters |
| `handler` | `operationId` (de-duplicated) |
| `requestType` / `responseType` | `requestBody` / `200` response `$ref` to a component schema |
| `auth.mode = "required"` | `security: [{ bearerAuth: [] }]` + `401`/`403` responses |
| `auth.mode = "public"` | `security: []` (the documented relaxation) |
| `auth.scopes` | `x-galerina-scopes` + documented in the operation description |
| `body.contentType` / `maxSizeBytes` | request `content` key + `413` response + `x-galerina-max-body-bytes` |
| `body.unknownFields` / `duplicateKeys` | `422` response + `x-galerina-*` extensions |
| `idempotency.enabled` | `Idempotency-Key` header parameter + `409` response |
| `limits.rate` / `timeoutMs` / … | `429` response + `x-galerina-rate-limit` / `x-galerina-*` extensions |

The error responses on each operation are exactly the ones the kernel's
fixed pipeline can return for that route — not a generic guess. The OpenAPI
document is therefore a faithful description of the governance surface, suitable
for client generation, contract review, and gateway configuration.

## Security posture — fail closed

`@galerina/docs` follows the same zero-trust defaults as the rest of Galerina:

- **It never invents permissive defaults.** An auth-required route is documented
  as requiring authentication; a `public` route is documented with `security: []`
  *because the source explicitly relaxed it*. The generator reports the API as the
  kernel enforces it, never looser.
- **It fails closed on a bad document.** Before returning, the generator runs a
  structural self-check (valid version, non-empty `info`, every `$ref` resolves,
  unique `operationId`s, every operation has responses). If it cannot produce a
  **valid** OpenAPI 3 document it throws `OpenApiGenerationError` rather than emit
  a broken or misleading API contract.
- **It cannot leak secrets.** The generator reads route *policy metadata* only —
  never request bodies, environment, or credentials. There is no I/O.

## Usage

```ts
import { generateOpenApi, exportOpenApi } from "@galerina/docs";
import { resolveEffectiveRoutePolicy } from "@galerina/framework-app-kernel";

// From the declarations a developer writes (resolved through the secure defaults):
const doc = generateOpenApi({
  info: { title: "Orders API", version: "1.0.0" },
  routes: [
    { method: "POST", path: "/orders", handler: "createOrder",
      requestType: "CreateOrderRequest", responseType: "OrderResponse" },
  ],
});

// Or from policies you already resolved (documents what the kernel enforces verbatim):
const policies = routes.map((r) => resolveEffectiveRoutePolicy(r, { posture: "on" }));
const doc2 = exportOpenApi({ info: { title: "Orders API", version: "1.0.0" }, policies });

console.log(JSON.stringify(doc, null, 2)); // a valid OpenAPI 3.1.0 document
```

`exportOpenApi` is the spec-named entry point from the api-server README;
`generateOpenApi` is its alias. Both accept either `routes` (resolved for you) or
`policies` (used as-is) and an optional `openApiVersion` (`"3.1.0"` default, or
`"3.0.3"`).

## Build

The repo is not an npm workspace, so build with the vendored compiler:

```sh
node ../galerina-tower-citizen/node_modules/typescript/lib/tsc.js -p tsconfig.json
# → dist/index.js (+ .d.ts)
node --test tests/*.test.mjs
```

## Checked Galerina reference

The package can also build a deterministic reference manifest from canonical
Galerina parser, type-checker, effect-checker and governance-verifier output.
The manifest contains public signatures, qualifiers, effects, contract facts,
repository-relative byte locators and source/build digests. It never embeds a
source body, absolute path or private-custody document.

`buildReferenceManifest` accepts source bytes supplied by a trusted repository
walker. `buildReferenceOutputFiles` then derives JSON, Markdown and static HTML
solely from that admitted manifest. Optional graph caller links are included
only when their graph build point exactly matches the manifest build point and
each link remains labelled `ASSERTED` or `INFERRED`; a stale graph is simply
omitted and never becomes declaration authority.

The CLI publishes a new output tree atomically and without overwrite:

```sh
npm run docs:reference -- --manifest build/reference-manifest.json --out build/reference
npm run docs:reference:check -- --manifest build/reference-manifest.json --out build/reference
```

`write` refuses an existing output root. `check` refuses missing, additional or
hand-edited generated files. To regenerate, publish to a new root and switch it
through the owning repository's normal generated-artifact process; do not edit
the output in place.

## What this package does NOT do

- It does not serve HTTP, route requests, or run handlers — that is the App
  Kernel and `galerina-framework-api-server`.
- It does not own the route model — it reads the App Kernel's types.
- It is not the source of truth — the governed source and the kernel are. The
  generated OpenAPI is a derived view and is regenerated, never hand-edited.
- The checked reference is not a replacement for `.fungi`, the compiler, GIR,
  SLIDE or VOK. It documents admitted AST facts and carries no execution or
  verification authority.
