import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const POLICY = new URL("../../../SECURITY.md", import.meta.url);

test("root security policy keeps Galerina's repository-wide zero-trust contract", async () => {
  const policy = await readFile(POLICY, "utf8");

  for (const required of [
    "security@trithypha.dev",
    "## Scope and precedence",
    "## Threat model",
    "## Authority and complete admission",
    "## Security invariants",
    "## Reportable findings",
    "## Non-findings and exclusions",
    "## Assurance and enforcement",
    "## Engineering-standards alignment",
    "## Known limitations",
    "A closer policy may tighten this policy; it must not weaken it.",
    "K3 `0` is non-authorizing",
    "No accepted security risk is created by this policy.",
  ]) {
    assert.equal(
      policy.includes(required),
      true,
      `SECURITY.md must retain: ${required}`,
    );
  }
});

test("root security policy cannot bless incomplete or forged evidence", async () => {
  const policy = await readFile(POLICY, "utf8");

  assert.match(
    policy,
    /Only complete current-context deterministic admission may release `\+1`\./,
  );
  assert.match(
    policy,
    /A verifier that accepts semantically forged content is always reportable\./,
  );
  assert.match(
    policy,
    /Self-hashed evidence must never be described as authenticated, independently verified or production-ready\./,
  );
});
