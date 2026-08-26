import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { run, serve } from "../dist/index.js";

async function assertServeRejects(start, pattern) {
  let server;
  try {
    server = await start();
  } catch (error) {
    assert.match(error instanceof Error ? error.message : String(error), pattern);
    return;
  }

  await server.close();
  assert.fail("serve opened a listener instead of refusing");
}

const UNGOVERNED_SECURE_ROUTE = `
secure flow leak(request: String) -> Result<String, ApiError>
effects [network.outbound] {
  return Ok("x")
}
route GET "/x" { flow leak }
`;

const GOVERNED_SECURE_ROUTE = `
secure flow permitted(request: String) -> Result<String, ApiError>
contract {
  intent { "serve allowed" }
} {
  return Ok("ok")
}
route GET "/ok" { flow permitted }
`;

describe("shared runtime admission", () => {
  it("denies production run before execution when governance has an error", async () => {
    const result = await run(
      UNGOVERNED_SECURE_ROUTE,
      "ungoverned.fungi",
      "leak",
      new Map(),
      { mode: "production" },
    );

    assert.equal(result.ok, false);
    assert.equal(result.execution, undefined);
    assert.equal(result.value, undefined);
    assert.ok(result.governanceDiagnostics.some((diagnostic) => diagnostic.severity === "error"));
  });

  it("denies production serve before opening a listener when governance has an error", async () => {
    await assertServeRejects(
      () => serve(
        UNGOVERNED_SECURE_ROUTE,
        "ungoverned.fungi",
        { port: 0, mode: "production" },
      ),
      /governance errors/i,
    );
  });

  it("refuses an unknown runtime mode supplied by a JavaScript caller", async () => {
    await assert.rejects(
      () => run(GOVERNED_SECURE_ROUTE, "governed.fungi", "permitted", new Map(), { mode: "turbo" }),
      /unknown runtime mode/i,
    );
  });

  it("refuses conflicting serve modes", async () => {
    await assertServeRejects(
      () => serve(
        GOVERNED_SECURE_ROUTE,
        "governed.fungi",
        { port: 0, mode: "dev" },
        { mode: "production" },
      ),
      /conflicting runtime modes/i,
    );
  });

  it("admits a governed production flow", async () => {
    const result = await run(
      GOVERNED_SECURE_ROUTE,
      "governed.fungi",
      "permitted",
      new Map(),
      { mode: "production" },
    );

    assert.equal(result.ok, true);
    assert.deepEqual(result.value, { __tag: "ok", value: { __tag: "string", value: "ok" } });
  });
});
