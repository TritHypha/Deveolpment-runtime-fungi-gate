import { after, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import {
  copyFileSync,
  existsSync,
  linkSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve, toNamespacedPath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const RUNNER = join(TEST_DIR, "..", "run-phase-close.mjs");
const LEGACY_RUNNER = join(TEST_DIR, "..", "run-phase-close-legacy.mjs");
const require = createRequire(import.meta.url);
const { acquireSuiteLease } = require("../lib/suite-run-lease.cjs");
const RESULT_MODULE = new URL("../lib/phase-close-result.mjs", import.meta.url);
const resultApi = await import(RESULT_MODULE).catch(() => ({}));
const runnerSource = readFileSync(RUNNER, "utf8");
const legacyRunnerSource = readFileSync(LEGACY_RUNNER, "utf8");
const liveManifest = JSON.parse(readFileSync(resolve("governance/phase-close-commands.json"), "utf8"));
const PROJECT_RECEIPT = "build/fungi-corpus-check/evidence/project.json";
const GIT_DIGEST = "a".repeat(64);
const MAX_TEST_OUTPUT_BYTES = 4_194_304;
const roots = [];

after(() => {
  for (const root of roots) {
    rmSync(root, { recursive: true, force: true });
  }
});

function write(root, relativePath, contents) {
  const absolutePath = join(root, ...relativePath.split("/"));
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, contents);
}

function manifestEntry(entry, cadences) {
  const requirementId = `REQ-${entry.name.toUpperCase().replace(/[^A-Z0-9]+/g, "-")}`;
  return {
    id: entry.name,
    requirementId,
    satisfies: [requirementId],
    execution: { kind: "process", command: entry.command },
    acceptedExitCodes: [0],
    leasePolicy: "none",
    cwd: entry.cwd ?? ".",
    toolClass: "legacy-oracle",
    authorityClass: "blocking",
    cadences,
    outcomePolicy: "blocking",
    subjects: { kind: "requirements", values: [requirementId], expectedCount: 1 },
    timeoutMs: entry.timeoutMs ?? 30_000,
    maxOutputBytes: 1_048_576,
    generatedOutputs: [],
    nestedTools: [],
    mutationPolicy: "read-only",
    platforms: ["win32", "linux", "darwin"],
    selfTest: { kind: "absent", reason: "runner fixture" },
    predecessors: [],
    lifecycle: {
      replacementId: { kind: "absent", reason: "not replaced" },
      overlap: "canonical",
      retirement: "active",
      evidence: { kind: "absent", reason: "active fixture" },
    },
  };
}

function fixture({ phaseClose = [], exhaustive = [], entries, useManifest = true }) {
  const root = mkdtempSync(join(tmpdir(), "galerina-phase-close-"));
  roots.push(root);
  write(root, "scripts/conversion-queue.mjs", "process.exit(0);\n");
  if (useManifest) {
    write(root, "governance/phase-close-commands.json", JSON.stringify({
      schemaVersion: 1,
      entries: entries ?? [
        ...phaseClose.map((entry) => manifestEntry(entry, ["normal", "exhaustive"])),
        ...exhaustive.map((entry) => manifestEntry(entry, ["exhaustive"])),
      ],
    }));
  }
  return root;
}

function run(root, ...args) {
  return spawnSync(
    process.execPath,
    [RUNNER, "--root", root, ...args, "--json"],
    { encoding: "utf8", timeout: 30_000, maxBuffer: MAX_TEST_OUTPUT_BYTES },
  );
}

function runWithEnvironment(root, environment, ...args) {
  return spawnSync(
    process.execPath,
    [RUNNER, "--root", root, ...args, "--json"],
    {
      encoding: "utf8", timeout: 30_000, maxBuffer: MAX_TEST_OUTPUT_BYTES,
      env: { ...process.env, ...environment },
    },
  );
}

function queueRuntimeArguments(root) {
  return [
    "--project-corpus-receipt", PROJECT_RECEIPT,
    "--git-executable", join(root, "pinned-git.exe"),
    "--git-digest", GIT_DIGEST,
  ];
}

function queueFixture(command = ["node", "scripts/conversion-queue.mjs", "--check"]) {
  const root = fixture({
    phaseClose: [{ name: "audit:conversion-queue", command }],
  });
  write(root, "scripts/conversion-queue.mjs", [
    'import { writeFileSync } from "node:fs";',
    'writeFileSync("queue-args.json", JSON.stringify(process.argv.slice(2)));',
  ].join("\n"));
  return root;
}

function queueIdentityFixture(phaseClose) {
  const root = fixture({ phaseClose });
  write(root, "scripts/conversion-queue.mjs", [
    'import { writeFileSync } from "node:fs";',
    'writeFileSync("queue-args.json", JSON.stringify(process.argv.slice(2)));',
  ].join("\n"));
  return root;
}

function queueLikeAliasFixture(entryFactory) {
  const root = fixture({ useManifest: false });
  write(root, "scripts/conversion-queue.mjs", [
    'import { writeFileSync } from "node:fs";',
    'writeFileSync(new URL("../queue-like-ran.txt", import.meta.url), "bad");',
  ].join("\n"));
  write(root, "ordinary.mjs", [
    'import { writeFileSync } from "node:fs";',
    'writeFileSync("queue-like-ran.txt", "bad");',
  ].join("\n"));
  write(root, "benign-loader.mjs", [
    'import { writeFileSync } from "node:fs";',
    'writeFileSync("queue-like-ran.txt", "bad");',
  ].join("\n"));
  write(root, "benign-require.cjs", [
    'const { writeFileSync } = require("node:fs");',
    'writeFileSync("queue-like-ran.txt", "bad");',
  ].join("\n"));
  mkdirSync(join(root, "scripts", "nested"), { recursive: true });
  const entry = entryFactory(root);
  write(root, "governance/phase-close-commands.json", JSON.stringify({
    schemaVersion: 1,
    entries: [manifestEntry(entry, ["normal", "exhaustive"])],
  }));
  return root;
}

test("phase-close binds exact runtime authority arguments only to the conversion queue", () => {
  const root = queueFixture();

  const result = run(root, ...queueRuntimeArguments(root));

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(readFileSync(join(root, "queue-args.json"), "utf8")), [
    "--check",
    "--project-corpus-receipt", PROJECT_RECEIPT,
    "--git-executable", join(root, "pinned-git.exe"),
    "--git-digest", GIT_DIGEST,
  ]);
});

test("phase-close refuses missing partial and duplicate conversion queue authority before launch", () => {
  const cases = [
    { name: "missing", expectedCode: "ASSURANCE-CONVERSION-QUEUE-BINDING" },
    {
      name: "partial",
      expectedCode: "ASSURANCE-CONVERSION-QUEUE-BINDING",
      args: ["--project-corpus-receipt", PROJECT_RECEIPT],
    },
    { name: "duplicate", expectedCode: "ASSURANCE-ARGUMENT-REFUSED", duplicateDigest: true },
  ];
  for (const item of cases) {
    const root = queueFixture();
    const args = item.duplicateDigest
      ? [...queueRuntimeArguments(root), "--git-digest", GIT_DIGEST]
      : item.args ?? [];

    const result = run(root, ...args);

    assert.equal(result.status, 1, item.name);
    assert.equal(existsSync(join(root, "queue-args.json")), false, item.name);
    const report = JSON.parse(result.stdout);
    assert.equal(report.verdict, "REFUSED", item.name);
    assert.equal(report.code, item.expectedCode, item.name);
  }
});

test("phase-close refuses surplus queue authority and base-command drift before launch", () => {
  const noQueueRoot = fixture({
    phaseClose: [{ name: "ordinary", command: ["node", "ordinary.mjs"] }],
  });
  write(noQueueRoot, "ordinary.mjs", 'import { writeFileSync } from "node:fs"; writeFileSync("ran.txt", "bad");\n');
  const surplus = run(noQueueRoot, ...queueRuntimeArguments(noQueueRoot));
  assert.equal(surplus.status, 1);
  assert.equal(existsSync(join(noQueueRoot, "ran.txt")), false);
  assert.equal(JSON.parse(surplus.stdout).code, "ASSURANCE-CONVERSION-QUEUE-BINDING");

  const driftRoot = queueFixture(["node", "scripts/conversion-queue.mjs", "--write"]);
  const drift = run(driftRoot, ...queueRuntimeArguments(driftRoot));
  assert.equal(drift.status, 1);
  assert.equal(existsSync(join(driftRoot, "queue-args.json")), false);
  assert.equal(JSON.parse(drift.stdout).code, "ASSURANCE-CONVERSION-QUEUE-BINDING");
});

test("phase-close refuses a renamed exact conversion queue before launch", () => {
  const root = queueIdentityFixture([
    { name: "audit:conversion-queue-alias", command: ["node", "scripts/conversion-queue.mjs", "--check"] },
  ]);

  const result = run(root);

  assert.equal(result.status, 1);
  assert.equal(existsSync(join(root, "queue-args.json")), false);
  assert.equal(JSON.parse(result.stdout).code, "ASSURANCE-CONVERSION-QUEUE-BINDING");
});

test("phase-close refuses duplicate command aliases before launch", () => {
  const root = queueIdentityFixture([
    { name: "audit:conversion-queue", command: ["node", "scripts/conversion-queue.mjs", "--check"] },
    { name: "audit:conversion-queue-alias", command: ["node", "scripts/conversion-queue.mjs", "--check"] },
  ]);

  const result = run(root, ...queueRuntimeArguments(root));

  assert.equal(result.status, 1);
  assert.equal(existsSync(join(root, "queue-args.json")), false);
  assert.equal(JSON.parse(result.stdout).code, "ASSURANCE-CONVERSION-QUEUE-BINDING");
});

test("phase-close refuses duplicate exact conversion queue identities before launch", () => {
  const root = queueIdentityFixture([
    { name: "audit:conversion-queue", command: ["node", "scripts/conversion-queue.mjs", "--check"] },
    { name: "audit:conversion-queue", command: ["node", "scripts/conversion-queue.mjs", "--check"] },
  ]);

  const result = run(root, ...queueRuntimeArguments(root));

  assert.equal(result.status, 1);
  assert.equal(existsSync(join(root, "queue-args.json")), false);
  assert.equal(JSON.parse(result.stdout).code, "ASSURANCE-CONVERSION-QUEUE-BINDING");
});

test("phase-close pins the conversion queue process kind and repository cwd before launch", () => {
  const alternateCwdRoot = queueIdentityFixture([
    {
      name: "audit:conversion-queue",
      command: ["node", "scripts/conversion-queue.mjs", "--check"],
      cwd: "attacker",
    },
  ]);
  write(alternateCwdRoot, "attacker/scripts/conversion-queue.mjs", [
    'import { writeFileSync } from "node:fs";',
    'writeFileSync("attacker-ran.txt", "bad");',
  ].join("\n"));
  const alternateCwd = run(alternateCwdRoot, ...queueRuntimeArguments(alternateCwdRoot));
  assert.equal(alternateCwd.status, 1);
  assert.equal(existsSync(join(alternateCwdRoot, "attacker", "attacker-ran.txt")), false);
  assert.equal(JSON.parse(alternateCwd.stdout).code, "ASSURANCE-CONVERSION-QUEUE-BINDING");

  const wrongKindEntry = manifestEntry({
    name: "audit:conversion-queue",
    command: ["node", "scripts/conversion-queue.mjs", "--check"],
  }, ["normal", "exhaustive"]);
  wrongKindEntry.execution.kind = "module";
  const wrongKindRoot = fixture({ entries: [wrongKindEntry] });
  write(wrongKindRoot, "scripts/conversion-queue.mjs", [
    'import { writeFileSync } from "node:fs";',
    'writeFileSync("wrong-kind-ran.txt", "bad");',
  ].join("\n"));
  const wrongKind = run(wrongKindRoot, ...queueRuntimeArguments(wrongKindRoot));
  assert.equal(wrongKind.status, 1);
  assert.equal(existsSync(join(wrongKindRoot, "wrong-kind-ran.txt")), false);
  assert.equal(JSON.parse(wrongKind.stdout).code, "ASSURANCE-CONVERSION-QUEUE-BINDING");
});

test("phase-close refuses resolved conversion queue path aliases before launch", async (t) => {
  const cases = [
    {
      name: "dot-prefix",
      entry: () => ({
        name: "audit:conversion-queue-alias",
        command: ["node", "./scripts/conversion-queue.mjs", "--check"],
      }),
    },
    {
      name: "dot-segment",
      entry: () => ({
        name: "audit:conversion-queue-alias",
        command: ["node", "scripts/./conversion-queue.mjs", "--check"],
      }),
    },
    {
      name: "backslash",
      entry: () => ({
        name: "audit:conversion-queue-alias",
        command: ["node", "scripts\\conversion-queue.mjs", "--check"],
      }),
    },
    {
      name: "absolute",
      entry: (root) => ({
        name: "audit:conversion-queue-alias",
        command: ["node", join(root, "scripts", "conversion-queue.mjs"), "--check"],
      }),
    },
    {
      name: "node-exe",
      entry: () => ({
        name: "audit:conversion-queue-alias",
        command: ["node.exe", "scripts/conversion-queue.mjs", "--check"],
      }),
    },
    {
      name: "extra-argv",
      entry: () => ({
        name: "audit:conversion-queue-alias",
        command: ["node", "scripts/conversion-queue.mjs", "--check", "--extra"],
      }),
    },
    {
      name: "cwd-relative",
      entry: () => ({
        name: "audit:conversion-queue-alias",
        command: ["node", "conversion-queue.mjs", "--check"],
        cwd: "scripts",
      }),
    },
    {
      name: "cwd-parent",
      entry: () => ({
        name: "audit:conversion-queue-alias",
        command: ["node", "../conversion-queue.mjs", "--check"],
        cwd: "scripts/nested",
      }),
    },
  ];

  for (const item of cases) {
    await t.test(item.name, () => {
      const root = queueLikeAliasFixture(item.entry);

      const result = run(root);

      assert.equal(result.status, 1);
      assert.equal(existsSync(join(root, "queue-like-ran.txt")), false);
      assert.equal(JSON.parse(result.stdout).code, "ASSURANCE-CONVERSION-QUEUE-BINDING");
    });
  }
});

test("phase-close refuses conversion queue filesystem identity aliases before launch", async (t) => {
  const cases = [
    {
      name: "hardlink",
      entry: (root) => {
        linkSync(join(root, "scripts", "conversion-queue.mjs"), join(root, "queue-hardlink.mjs"));
        return { name: "audit:conversion-queue-alias", command: ["node", "queue-hardlink.mjs"] };
      },
    },
    {
      name: "directory-junction",
      entry: (root) => {
        symlinkSync(
          join(root, "scripts"),
          join(root, "queue-junction"),
          process.platform === "win32" ? "junction" : "dir",
        );
        return {
          name: "audit:conversion-queue-alias",
          command: ["node", "queue-junction/conversion-queue.mjs"],
        };
      },
    },
    {
      name: "extended-path",
      skip: process.platform !== "win32",
      entry: (root) => ({
        name: "audit:conversion-queue-alias",
        command: ["node", toNamespacedPath(join(root, "scripts", "conversion-queue.mjs"))],
      }),
    },
    {
      name: "file-url",
      entry: (root) => ({
        name: "audit:conversion-queue-alias",
        command: [
          "node", "--import", pathToFileURL(join(root, "scripts", "conversion-queue.mjs")).href,
          "ordinary.mjs",
        ],
      }),
    },
  ];

  for (const item of cases) {
    await t.test(item.name, { skip: item.skip }, () => {
      const root = queueLikeAliasFixture(item.entry);

      const result = run(root);

      assert.equal(result.status, 1);
      assert.equal(existsSync(join(root, "queue-like-ran.txt")), false);
      assert.equal(JSON.parse(result.stdout).code, "ASSURANCE-CONVERSION-QUEUE-BINDING");
    });
  }
});

test("phase-close refuses Node preload and inline execution aliases before launch", async (t) => {
  const inline = 'require("node:fs").writeFileSync("queue-like-ran.txt", "bad")';
  const cases = [
    ["import-separate", ["node", "--import", "./scripts/conversion-queue.mjs", "ordinary.mjs"]],
    ["import-equals", ["node", "--import=./scripts/conversion-queue.mjs", "ordinary.mjs"]],
    ["require-separate", ["node", "--require", "./scripts/conversion-queue.mjs", "ordinary.mjs"]],
    ["require-equals", ["node", "--require=./scripts/conversion-queue.mjs", "ordinary.mjs"]],
    ["require-short", ["node", "-r./scripts/conversion-queue.mjs", "ordinary.mjs"]],
    ["loader-separate", ["node", "--loader", "./scripts/conversion-queue.mjs", "ordinary.mjs"]],
    ["loader-equals", ["node", "--loader=./scripts/conversion-queue.mjs", "ordinary.mjs"]],
    [
      "experimental-loader-separate",
      ["node", "--experimental-loader", "./scripts/conversion-queue.mjs", "ordinary.mjs"],
    ],
    [
      "experimental-loader-equals",
      ["node", "--experimental-loader=./scripts/conversion-queue.mjs", "ordinary.mjs"],
    ],
    ["eval-long", ["node", "--eval", inline]],
    ["eval-short", ["node", "-e", inline]],
    ["print-long", ["node", "--print", inline]],
    ["print-short", ["node", "-p", inline]],
  ];

  for (const [name, command] of cases) {
    await t.test(name, () => {
      const root = queueLikeAliasFixture(() => ({ name: "ordinary-alias", command }));

      const result = run(root);

      assert.equal(result.status, 1);
      assert.equal(existsSync(join(root, "queue-like-ran.txt")), false);
      assert.equal(JSON.parse(result.stdout).code, "ASSURANCE-CONVERSION-QUEUE-BINDING");
    });
  }
});

test("phase-close refuses embedded conversion queue authority aliases before launch", async (t) => {
  const options = ["--project-corpus-receipt", "--git-executable", "--git-digest"];
  for (const option of options) {
    for (const style of ["separate", "equals"]) {
      await t.test(`${option}-${style}`, () => {
        const authority = style === "separate" ? [option, "smuggled"] : [`${option}=smuggled`];
        const root = queueLikeAliasFixture(() => ({
          name: "ordinary-alias",
          command: ["node", "ordinary.mjs", ...authority],
        }));

        const result = run(root);

        assert.equal(result.status, 1);
        assert.equal(existsSync(join(root, "queue-like-ran.txt")), false);
        assert.equal(JSON.parse(result.stdout).code, "ASSURANCE-CONVERSION-QUEUE-BINDING");
      });
    }
  }
});

test("phase-close refuses an indirect data URL queue preload alongside full authority", () => {
  const root = fixture({ useManifest: false });
  write(root, "scripts/conversion-queue.mjs", [
    'import { writeFileSync } from "node:fs";',
    'writeFileSync("queue-like-ran.txt", "bad");',
  ].join("\n"));
  write(root, "ordinary.mjs", "process.exit(0);\n");
  const queueUrl = pathToFileURL(join(root, "scripts", "conversion-queue.mjs")).href;
  const dataUrl = `data:text/javascript,${encodeURIComponent(`import ${JSON.stringify(queueUrl)};`)}`;
  write(root, "governance/phase-close-commands.json", JSON.stringify({
    schemaVersion: 1,
    entries: [
      manifestEntry({
        name: "audit:conversion-queue",
        command: ["node", "scripts/conversion-queue.mjs", "--check"],
      }, ["normal", "exhaustive"]),
      manifestEntry({
        name: "data-import-alias",
        command: ["node", `--import=${dataUrl}`, "ordinary.mjs"],
      }, ["normal", "exhaustive"]),
    ],
  }));

  const result = run(root, ...queueRuntimeArguments(root));

  assert.equal(result.status, 1);
  assert.equal(existsSync(join(root, "queue-like-ran.txt")), false);
  assert.equal(JSON.parse(result.stdout).code, "ASSURANCE-CONVERSION-QUEUE-BINDING");
});

test("phase-close refuses benign Node preload forms before launch", async (t) => {
  const cases = [
    ["import-separate", ["node", "--import", "./benign-loader.mjs", "ordinary.mjs"]],
    ["import-equals", ["node", "--import=./benign-loader.mjs", "ordinary.mjs"]],
    ["require-separate", ["node", "--require", "./benign-require.cjs", "ordinary.mjs"]],
    ["require-equals", ["node", "--require=./benign-require.cjs", "ordinary.mjs"]],
    ["require-short", ["node", "-r./benign-require.cjs", "ordinary.mjs"]],
    ["loader-separate", ["node", "--loader", "./benign-loader.mjs", "ordinary.mjs"]],
    ["loader-equals", ["node", "--loader=./benign-loader.mjs", "ordinary.mjs"]],
    [
      "experimental-loader-separate",
      ["node", "--experimental-loader", "./benign-loader.mjs", "ordinary.mjs"],
    ],
    [
      "experimental-loader-equals",
      ["node", "--experimental-loader=./benign-loader.mjs", "ordinary.mjs"],
    ],
  ];

  for (const [name, command] of cases) {
    await t.test(name, () => {
      const root = queueLikeAliasFixture(() => ({ name: "ordinary-alias", command }));

      const result = run(root);

      assert.equal(result.status, 1);
      assert.equal(existsSync(join(root, "queue-like-ran.txt")), false);
      assert.equal(JSON.parse(result.stdout).code, "ASSURANCE-CONVERSION-QUEUE-BINDING");
    });
  }
});

test("phase-close refuses underscore Node loader aliases alongside full authority", async (t) => {
  const cases = [
    {
      name: "experimental-loader-data-equals",
      command: (root) => {
        const queueUrl = pathToFileURL(join(root, "scripts", "conversion-queue.mjs")).href;
        const dataUrl = `data:text/javascript,${encodeURIComponent(`import ${JSON.stringify(queueUrl)};`)}`;
        return ["node", `--experimental_loader=${dataUrl}`, "ordinary.mjs"];
      },
    },
    {
      name: "experimental-loader-separate",
      command: () => ["node", "--experimental_loader", "./benign-loader.mjs", "ordinary.mjs"],
    },
  ];

  for (const item of cases) {
    await t.test(item.name, () => {
      const root = fixture({ useManifest: false });
      write(root, "scripts/conversion-queue.mjs", [
        'import { writeFileSync } from "node:fs";',
        'writeFileSync("queue-like-ran.txt", "bad");',
      ].join("\n"));
      write(root, "ordinary.mjs", "process.exit(0);\n");
      write(root, "benign-loader.mjs", [
        'import { writeFileSync } from "node:fs";',
        'writeFileSync("queue-like-ran.txt", "bad");',
      ].join("\n"));
      write(root, "governance/phase-close-commands.json", JSON.stringify({
        schemaVersion: 1,
        entries: [
          manifestEntry({
            name: "audit:conversion-queue",
            command: ["node", "scripts/conversion-queue.mjs", "--check"],
          }, ["normal", "exhaustive"]),
          manifestEntry({
            name: "underscore-loader-alias",
            command: item.command(root),
          }, ["normal", "exhaustive"]),
        ],
      }));

      const result = run(root, ...queueRuntimeArguments(root));

      assert.equal(result.status, 1);
      assert.equal(existsSync(join(root, "queue-like-ran.txt")), false);
      assert.equal(JSON.parse(result.stdout).code, "ASSURANCE-CONVERSION-QUEUE-BINDING");
    });
  }
});

test("phase-close refuses a renamed Node executable data preload alongside full authority", () => {
  const root = fixture({ useManifest: false });
  const renamedNode = join(root, "node-alias.exe");
  copyFileSync(process.execPath, renamedNode);
  write(root, "scripts/conversion-queue.mjs", [
    'import { writeFileSync } from "node:fs";',
    'writeFileSync("queue-like-ran.txt", "bad");',
  ].join("\n"));
  write(root, "ordinary.mjs", "process.exit(0);\n");
  const queueUrl = pathToFileURL(join(root, "scripts", "conversion-queue.mjs")).href;
  const dataUrl = `data:text/javascript,${encodeURIComponent(`import ${JSON.stringify(queueUrl)};`)}`;
  write(root, "governance/phase-close-commands.json", JSON.stringify({
    schemaVersion: 1,
    entries: [
      manifestEntry({
        name: "audit:conversion-queue",
        command: ["node", "scripts/conversion-queue.mjs", "--check"],
      }, ["normal", "exhaustive"]),
      manifestEntry({
        name: "renamed-node-data-import",
        command: ["node-alias.exe", `--import=${dataUrl}`, "ordinary.mjs"],
      }, ["normal", "exhaustive"]),
    ],
  }));

  const result = run(root, ...queueRuntimeArguments(root));

  assert.equal(result.status, 1);
  assert.equal(existsSync(join(root, "queue-like-ran.txt")), false);
  assert.equal(JSON.parse(result.stdout).code, "ASSURANCE-CONVERSION-QUEUE-BINDING");
});

test("one failed child makes phase-close exit non-zero", () => {
  const root = fixture({
    phaseClose: [
      { name: "green", command: ["node", "green.mjs"] },
      { name: "red", command: ["node", "red.mjs"] },
    ],
  });
  write(root, "green.mjs", "process.exit(0);\n");
  write(root, "red.mjs", "process.exit(7);\n");

  const result = run(root, "--tier", "phase-close");

  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);
  assert.equal(report.verdict, "FAIL");
  assert.deepEqual(report.failed, ["red"]);
  assert.equal(report.results[1].exitCode, 7);
  assert.deepEqual(report.results[0].processControl, {
    ownedTree: true,
    cleanupAttempted: false,
    cleanupAcknowledged: false,
    timedOut: false,
    outputLimitExceeded: false,
  });
});

test("each phase-close child has an observable start and end heartbeat", () => {
  const root = fixture({
    phaseClose: [{ name: "visible-gate", command: ["node", "visible.mjs"] }],
  });
  write(root, "visible.mjs", "process.exit(0);\n");

  const result = run(root);

  assert.equal(result.status, 0);
  assert.match(result.stderr, /PHASE-CLOSE START visible-gate/);
  assert.match(result.stderr, /PHASE-CLOSE END visible-gate PASS/);
});

test("the branded plan supplies the exact cadence to child wrappers", () => {
  const root = fixture({
    phaseClose: [{ name: "cadence", command: ["node", "cadence.mjs"] }],
  });
  write(root, "cadence.mjs", [
    'if (process.env.GALERINA_ASSURANCE_CADENCE !== "normal") process.exit(9);',
    'console.log(`SUMMARY: ${process.env.GALERINA_ASSURANCE_CADENCE}`);',
  ].join("\n"));

  const result = run(root, "--cadence", "normal");

  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).results[0].detail, "normal");
});

test("phase-close supplies explicit absolute KB and SLIDE roots to governed children", () => {
  const root = fixture({
    phaseClose: [{ name: "external-roots", command: ["node", "external-roots.mjs"] }],
  });
  const kb = join(root, "kb");
  const slide = join(root, "slide");
  mkdirSync(kb);
  mkdirSync(slide);
  write(root, "external-roots.mjs", [
    `if (process.env.GALERINA_KB_DIR !== ${JSON.stringify(kb)}) process.exit(8);`,
    `if (process.env.GALERINA_SLIDE_DIR !== ${JSON.stringify(slide)}) process.exit(9);`,
  ].join("\n"));

  const result = runWithEnvironment(root, {
    GALERINA_KB_DIR: kb,
    GALERINA_SLIDE_DIR: slide,
  });

  assert.equal(result.status, 0, result.stderr);
});

test("phase-close refuses relative external repository roots before child execution", () => {
  const root = fixture({
    phaseClose: [{ name: "must-not-run", command: ["node", "must-not-run.mjs"] }],
  });
  write(root, "must-not-run.mjs", 'import { writeFileSync } from "node:fs"; writeFileSync("ran.txt", "yes");\n');

  const result = runWithEnvironment(root, { GALERINA_SLIDE_DIR: "relative-slide" });

  assert.notEqual(result.status, 0);
  const report = JSON.parse(result.stdout);
  assert.equal(report.verdict, "REFUSED");
  assert.match(report.detail, /GALERINA_SLIDE_DIR requires an absolute path/u);
  assert.equal(existsSync(join(root, "ran.txt")), false);
});

test("phase-close supplies a bounded Go cache outside the repository", () => {
  const root = fixture({
    phaseClose: [{ name: "go-cache", command: ["node", "go-cache.mjs"] }],
  });
  write(root, "go-cache.mjs", [
    'import { isAbsolute, relative } from "node:path";',
    'const cache = process.env.GOCACHE ?? "";',
    'if (!isAbsolute(cache)) process.exit(8);',
    'if (!relative(process.cwd(), cache).startsWith("..")) process.exit(9);',
    'if (!cache.endsWith("galerina-go-build-cache")) process.exit(10);',
  ].join("\n"));

  const result = run(root);

  assert.equal(result.status, 0, result.stderr);
});

test("--report-only cannot describe a failed run as green", () => {
  const root = fixture({
    phaseClose: [{ name: "red", command: ["node", "red.mjs"] }],
  });
  write(root, "red.mjs", "process.exit(9);\n");

  const result = run(root, "--report-only");

  assert.equal(result.status, 0);
  const report = JSON.parse(result.stdout);
  assert.equal(report.verdict, "REPORT_ONLY_FAILED");
  assert.equal(report.authorizing, false);
  assert.deepEqual(report.failed, ["red"]);
});

test("exhaustive includes both phase-close and exhaustive commands", () => {
  const root = fixture({
    phaseClose: [{ name: "base", command: ["node", "base.mjs"] }],
    exhaustive: [{ name: "heavy", command: ["node", "heavy.mjs"] }],
  });
  write(root, "base.mjs", "process.exit(0);\n");
  write(root, "heavy.mjs", "process.exit(0);\n");

  const result = run(root, "--tier", "exhaustive");

  assert.equal(result.status, 0);
  const report = JSON.parse(result.stdout);
  assert.equal(report.verdict, "PASS");
  assert.deepEqual(
    report.results.map((item) => item.name),
    ["base", "heavy"],
  );
});

test("a missing or malformed command result fails closed", () => {
  const root = fixture({
    phaseClose: [{
      name: "missing",
      command: ["node-command-that-does-not-exist", "x"],
    }],
  });

  const result = run(root);

  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);
  assert.equal(report.verdict, "FAIL");
  assert.equal(report.results[0].ok, false);
  assert.match(report.results[0].detail, /spawn|status|missing/i);
});

test("a Node test child uses its final pass summary instead of an unrelated total", () => {
  const root = fixture({
    phaseClose: [{ name: "tests:tooling", command: ["node", "tooling.mjs"] }],
  });
  write(root, "tooling.mjs", [
    `console.log("fixture total debt: 999");`,
    `console.log("pass 3");`,
    `console.log("fail 0");`,
  ].join("\n") + "\n");

  const result = run(root);

  assert.equal(result.status, 0);
  const report = JSON.parse(result.stdout);
  assert.equal(report.results[0].detail, "3 tests pass");
});

test("malformed governance-diff JSON is an explicit failed result", () => {
  assert.equal(typeof resultApi.parseGovernanceDiff, "function");

  const malformed = resultApi.parseGovernanceDiff("{", {
    status: 0,
    signal: null,
    error: undefined,
  });
  assert.equal(malformed.ok, false);
  assert.equal(malformed.code, "GOVERNANCE-DIFF-UNPARSEABLE");

  const clean = resultApi.parseGovernanceDiff(
    JSON.stringify({ changeClass: "neutral", summary: "no .fungi changes" }),
    { status: 0, signal: null, error: undefined },
  );
  assert.equal(clean.ok, true);
  assert.equal(clean.changeClass, "neutral");
});

test("the preserved legacy oracle retains the former generated-evidence checks", () => {
  assert.doesNotMatch(
    legacyRunnerSource,
    /spawnSync\(/,
    "every phase-close child must use the owned process-tree boundary",
  );
  assert.match(
    legacyRunnerSource,
    /run\("audit:node-floor", "node", \["scripts\/audit-node-dependencies\.mjs"\]\)/,
  );
  assert.match(
    legacyRunnerSource,
    /run\("graph:all", "node", \["scripts\/graph-all\.mjs", "--quiet", "--check", "--json"\]\)/,
  );
  assert.match(
    legacyRunnerSource,
    /runSemanticCoverageFromGraphAll\(graphAll\)/,
  );
  assert.match(legacyRunnerSource, /if \(options\.staticOracle\) return null/);
  assert.equal(
    (legacyRunnerSource.match(/^runSemanticCoverageFromGraphAll\(graphAll\);$/gm) ?? []).length,
    1,
    "semantic coverage must be one exact blocking phase-close gate",
  );
  assert.equal(
    (legacyRunnerSource.match(/run\("semantic:coverage"/g) ?? []).length,
    0,
    "the named semantic gate must consume exactly one graph-all result rather than launch a second owner",
  );
  assert.match(
    legacyRunnerSource,
    /run\("remote-shell-install", "node", \["scripts\/audit-remote-shell-install\.mjs"\]\)/,
  );
  assert.match(
    legacyRunnerSource,
    /run\("code-index", "node", \["scripts\/code-index\.mjs", "--check"\]\)/,
  );
  assert.match(
    legacyRunnerSource,
    /run\("audit:canonical-test-counts", "node", \["scripts\/audit-canonical-test-counts\.mjs"\]\)/,
  );
  assert.match(
    legacyRunnerSource,
    /run\("code-registry", "node", \["scripts\/gen-code-registry\.mjs", "--check"\]\)/,
  );
  assert.match(
    legacyRunnerSource,
    /run\("code-catalog-coverage:selftest", "node", \["scripts\/audit-code-catalog-coverage\.mjs", "--self-test"\]\)/,
  );
  assert.match(
    legacyRunnerSource,
    /run\("code-catalog-coverage", "node", \["scripts\/audit-code-catalog-coverage\.mjs"\]\)/,
  );
  assert.match(
    legacyRunnerSource,
    /run\("r4-twin-hashes", "node", \["scripts\/gather-r4-twin-hashes\.mjs", "--verify-ledger"\]\)/,
  );
  for (const [name, mode] of [
    ["tests:patterns", "patterns"],
    ["audit:security", "security"],
    ["audit:naming", "naming"],
    ["manifest:cbor", "cbor"],
    ["governance:diff", "governance-diff"],
  ]) {
    assert.match(
      legacyRunnerSource,
      new RegExp(`runStaticOracleSpecial\\("${name}", "${mode}"\\)`),
      `${name} must use the same owned special-check process in the static oracle`,
    );
  }
});

test("composed phase-close invokes semantic coverage once and blocks its refusal", () => {
  const graphEntry = manifestEntry({
    name: "graph:all",
    command: ["node", "scripts/graph-all.mjs", "--quiet", "--check", "--json"],
  }, ["normal"]);
  const semanticEntry = {
    ...manifestEntry({ name: "semantic:coverage", command: ["node", "unused.mjs"] }, ["normal"]),
    toolClass: "verifier",
    execution: {
      kind: "predecessor-receipt",
      predecessorId: "graph:all",
      verifierId: "graph-all-semantic-v1",
    },
    predecessors: ["graph:all"],
  };
  const root = fixture({ entries: [graphEntry, semanticEntry] });
  write(root, "scripts/graph-all.mjs", readFileSync(resolve("scripts/graph-all.mjs"), "utf8"));
  const graphChildren = [
    "package-graph-generator.mjs",
    "project-graph-generator.mjs",
    "audit-graph-integrity.mjs",
    "kb-graph-generator.mjs",
    "dev-tool-index.mjs",
    "fungi-source-capability-inventory.mjs",
  ];
  for (const name of graphChildren) {
    write(root, `scripts/${name}`, "process.exit(0);\\n");
  }
  write(root, "scripts/gen-assurance-semantic-graph.mjs", [
    'import { appendFileSync } from "node:fs";',
    'appendFileSync("semantic-calls.log", "semantic\\n");',
    'process.exit(7);',
  ].join("\n"));

  const result = run(root, "--tier", "phase-close");

  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);
  const semantic = report.results.find((entry) => entry.name === "semantic:coverage");
  assert.equal(semantic?.ok, false);
  assert.equal(semantic?.exitCode, 1);
  assert.equal(semantic?.detail, "predecessor receipt refused");
  assert.deepEqual(readFileSync(join(root, "semantic-calls.log"), "utf8").trim().split(/\r?\n/), ["semantic"]);
});

test("composed phase-close accepts semantic coverage from the complete graph receipt", () => {
  const graphEntry = manifestEntry({
    name: "graph:all",
    command: ["node", "scripts/graph-all.mjs", "--quiet", "--check", "--json"],
  }, ["normal"]);
  const semanticEntry = {
    ...manifestEntry({ name: "semantic:coverage", command: ["node", "unused.mjs"] }, ["normal"]),
    toolClass: "verifier",
    execution: {
      kind: "predecessor-receipt",
      predecessorId: "graph:all",
      verifierId: "graph-all-semantic-v1",
    },
    predecessors: ["graph:all"],
  };
  const root = fixture({ entries: [graphEntry, semanticEntry] });
  write(root, "scripts/graph-all.mjs", readFileSync(resolve("scripts/graph-all.mjs"), "utf8"));
  for (const name of [
    "package-graph-generator.mjs",
    "project-graph-generator.mjs",
    "audit-graph-integrity.mjs",
    "kb-graph-generator.mjs",
    "dev-tool-index.mjs",
    "fungi-source-capability-inventory.mjs",
    "ts-retirement-graph.mjs",
    "gen-assurance-semantic-graph.mjs",
    "gen-roadmap.mjs",
  ]) {
    write(root, `scripts/${name}`, "process.exit(0);\n");
  }

  const result = run(root, "--tier", "phase-close");

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  const semantic = report.results.find((entry) => entry.name === "semantic:coverage");
  assert.equal(semantic?.ok, true);
  assert.equal(semantic?.detail, "semantic coverage validated from exact graph-all result");
});

test("a held checkout lease refuses phase-close before any child starts", () => {
  const root = fixture({
    phaseClose: [{ name: "must-not-run", command: ["node", "must-not-run.mjs"] }],
  });
  write(
    root,
    "must-not-run.mjs",
    "import { writeFileSync } from 'node:fs'; writeFileSync('ran.txt', 'bad');\n",
  );
  const lease = acquireSuiteLease({ root, commandClass: "all-tests" });

  const result = run(root);

  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);
  assert.equal(report.verdict, "REFUSED");
  assert.equal(report.code, "SUITE-LEASE-HELD");
  assert.equal(existsSync(join(root, "ran.txt")), false);
  assert.equal(lease.release(), true);
});

test("the public runner has no source-coded cadence or missing-manifest fallback", () => {
  assert.match(legacyRunnerSource, /run\("audit:node-floor"/);
  assert.doesNotMatch(runnerSource, /run\("audit:node-floor"/);
  assert.doesNotMatch(runnerSource, /if \(!existsSync\(manifestPath\)\) return null/);
  assert.match(runnerSource, /validateAssuranceManifest/);
  assert.match(runnerSource, /buildCadencePlan/);
});

test("the live example diagnostic gate admits the measured Windows runtime envelope", () => {
  const entry = liveManifest.entries.find((candidate) => candidate.id === "example-diagnostics");
  assert.deepEqual(entry?.execution?.command, ["node", "scripts/audit-example-diagnostics.mjs"]);
  assert.equal(Number.isSafeInteger(entry?.timeoutMs), true);
  assert.equal(entry.timeoutMs >= 180_000, true);
});

test("owner-selected phase-close gates retain the 130-second Windows timeout floor", () => {
  for (const [id, minimumTimeoutMs] of [
    ["compiler-stage-twins", 130_000],
    ["kernel-fungi-twins", 130_000],
    ["governance:diff", 130_000],
  ]) {
    const entry = liveManifest.entries.find((candidate) => candidate.id === id);
    assert.equal(Number.isSafeInteger(entry?.timeoutMs), true, `${id} must declare a finite timeout`);
    assert.equal(entry.timeoutMs >= minimumTimeoutMs, true, `${id} timeout is below the owner-selected floor`);
  }
});
