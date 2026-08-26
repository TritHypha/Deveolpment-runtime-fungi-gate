/**
 * CLI regression — GD-024: the ROOT entry point must route `.gate` to the v3
 * frontend.
 *
 * The defect this pins: `galerina.mjs` had no knowledge of `.gate` at all. Every
 * file, whatever its extension, went through `readUntrustedSource` into
 * `parseProgram` — the `.fungi` parser. Handing it a valid v3 circuit produced
 * `FUNGI-SYNTAX-015` ("missing @version header") on a file whose header is
 * correct FOR ITS OWN LANGUAGE, followed by a cascade of `FUNGI-PARSE-001` on
 * the `#` comments and on `CIRCUIT`. It exited non-zero, so it failed closed —
 * but every diagnostic named the wrong language, which is a true refusal that
 * tells the author nothing.
 *
 * Round one wired the dispatcher into the compiler package's own `src/cli.ts`
 * and stopped there. There are TWO entry points and only one was wired; the
 * library was green the whole time. So these tests drive the REAL root CLI —
 * the binary a person actually runs — because that is the surface that was
 * broken.
 *
 * The `.fungi` control below runs the SAME command through the SAME entry point,
 * so it exercises the same axis as the measurement rather than confirming an
 * unrelated fact.
 */
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const BUILD = join(ROOT, "build");
const fixtures = [];

/** Write a fixture verbatim — a `.gate` file must NOT be given a `@version` header. */
function fixture(name, src) {
  mkdirSync(BUILD, { recursive: true });
  const p = join(BUILD, name);
  writeFileSync(p, src, "utf8");
  fixtures.push(p);
  return p;
}

/** Run the real root CLI and return its combined output plus exit status. */
function galerina(...args) {
  const r = spawnSync(process.execPath, [join(ROOT, "galerina.mjs"), ...args], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 120_000,
  });
  return { out: `${r.stdout ?? ""}${r.stderr ?? ""}`, status: r.status };
}

const VALID_CIRCUIT = `@gate 3.0.0
# a minimal authorised read: the K3 authority part routes all three arms
CIRCUIT probe(caller: CallerId) -> CustomerView
  INTENT "route a caller through an authority part and return a view"
  REQUIRES:
    capability customer.read
  PARTS:
    [authz :: galerina.tower.authorize@1.0.0 capability=customer.read]
    [record :: app.customer.read@1.0.0]
  WIRES:
    IN.caller -> authz.subject
    authz.allow -> record.authority
    authz.deny -> DENY.not_authorized
    authz.indeterminate -> DENY.authority_unknown
    record.value -> OUT.value
END
`;

/** The same circuit with the K3 indeterminate arm deleted — must be caught. */
const BROKEN_CIRCUIT = VALID_CIRCUIT
  .split(/\r?\n/)
  .filter((l) => !/^\s*authz\.indeterminate\s*->/.test(l))
  .join("\n");

after(() => {
  for (const p of fixtures) { try { rmSync(p); } catch { /* best effort */ } }
});

test("GD-024: a .gate file is NOT reported with .fungi diagnostics", () => {
  const { out } = galerina("check", fixture("gd024-valid.gate", VALID_CIRCUIT));
  assert.ok(!/FUNGI-SYNTAX-015/.test(out),
    `the .fungi version-header rule must not be applied to a .gate file:\n${out}`);
  assert.ok(!/FUNGI-PARSE-001/.test(out),
    `the .fungi parser must never see a .gate file:\n${out}`);
});

test("GD-024: a valid circuit reaches the v3 frontend through the root CLI", () => {
  const { out } = galerina("check", fixture("gd024-valid2.gate", VALID_CIRCUIT));
  assert.match(out, /\.gate v3 parsed/, `the v3 frontend must report on it:\n${out}`);
  assert.match(out, /circuit 'probe'/, `it must name the circuit it parsed:\n${out}`);
});

test("GD-024: signing stays withheld — FUNGI-GATELANG-002 still fires", () => {
  // Hard constraint: `.gate` production signing is gated on the sound
  // compile-time backstop. Routing the file correctly must not weaken that.
  const { out, status } = galerina("check", fixture("gd024-valid3.gate", VALID_CIRCUIT));
  assert.match(out, /FUNGI-GATELANG-002/, `the signing gate must still fire:\n${out}`);
  assert.notEqual(status, 0, "a .gate file must not report success while signing is withheld");
});

test("GD-024: a structurally broken circuit is caught with its GATE-* code", () => {
  const { out, status } = galerina("check", fixture("gd024-broken.gate", BROKEN_CIRCUIT));
  assert.match(out, /GATE-AUTH-002/,
    `deleting the K3 indeterminate arm must be reported by the verifier:\n${out}`);
  assert.notEqual(status, 0, "a broken circuit must exit non-zero");
});

test("GD-024 control: a .fungi file is unaffected by the routing change", () => {
  // Same CLI, same command, same axis — this is what makes it a control rather
  // than an unrelated fact.
  const src = `@version 1\npure flow ok() -> Int {\n  contract { intent "control fixture" }\n  return 7\n}\n`;
  const { out, status } = galerina("check", fixture("gd024-control.fungi", src));
  assert.ok(!/GATE-/.test(out), `a .fungi file must never reach the .gate frontend:\n${out}`);
  assert.equal(status, 0, `the .fungi path must still pass cleanly:\n${out}`);
});
