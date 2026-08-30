import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  copyFileSync, cpSync, existsSync, linkSync, lstatSync, mkdtempSync, mkdirSync, readFileSync,
  realpathSync, renameSync, rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { aggregateCorpusReceipts } from "../lib/fungi-corpus-receipt.mjs";
import { deriveCorpusShards } from "../lib/fungi-corpus-shards.mjs";
import { RUNTIME_GIT_SHA256 } from "../run-rd0873-native-fungi-audit.mjs";
import { runAudit } from "../audit-conversion-slice-close.mjs";

const AUDIT = join(import.meta.dirname, "..", "audit-conversion-slice-close.mjs");
const REPOSITORY_ROOT = resolve(import.meta.dirname, "..", "..");
const PROJECT_EVIDENCE = "build/fungi-corpus-check/evidence/project.json";
const AUTHORITY_MANIFEST = "governance/rd0873-conversion-slice-authority.json";
const PLAN_PATH = "docs/superpowers/plans/2026-08-28-rd-0873-native-fungi-bootstrap.md";
const RD_DIGEST = `sha256:${"e".repeat(64)}`;
const limits = { maxFiles: 8, maxBytes: 1_048_576, timeoutMs: 10_000, maxOutputBytes: 65_536 };

function boundedSpawn(file, args, {
  cwd = undefined, encoding = "utf8", env = process.env, input = undefined,
} = {}) {
  return spawnSync(file, args, {
    cwd,
    encoding,
    env,
    input,
    maxBuffer: 16_777_216,
    shell: false,
    timeout: 30_000,
    windowsHide: true,
  });
}

function discoverPinnedGit() {
  const command = process.platform === "win32" ? "where.exe" : "which";
  const result = boundedSpawn(command, ["git"]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const candidates = result.stdout.split(/\r?\n/u).filter(Boolean).map((path) => realpathSync(path));
  const match = candidates.find((path) => lstatSync(path, { bigint: true }).nlink === 1n
    && createHash("sha256").update(readFileSync(path)).digest("hex") === RUNTIME_GIT_SHA256);
  assert.ok(match, "the Task 4 pinned Git executable must be available for this integration fixture");
  return match;
}

const PINNED_GIT = discoverPinnedGit();

function rawDigest(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function canonicalDigest(value) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex")}`;
}

function git(root, args, input = undefined) {
  const result = boundedSpawn(PINNED_GIT, args, { cwd: root, input });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}

function write(root, relativePath, contents) {
  const path = join(root, ...relativePath.split("/"));
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
}

function projectEvidence(request) {
  const shardsResult = deriveCorpusShards(request, limits);
  assert.equal(shardsResult.kind, "accepted");
  const shard = shardsResult.value[0];
  const completed = shard.files.map((file) => ({
    ...file,
    resultDigest: canonicalDigest({ path: file.path, ok: true }),
  }));
  const receiptBase = {
    schema: "galerina.fungi-corpus-shard-receipt.v2",
    shardId: shard.shardId,
    shardDigest: canonicalDigest(shard),
    requestDigest: shard.requestDigest,
    startIndex: shard.startIndex,
    endIndexExclusive: shard.endIndexExclusive,
    status: "PASS",
    termination: "COMPLETE",
    completed,
    unprocessed: [],
  };
  const receipt = { ...receiptBase, resultDigest: canonicalDigest(receiptBase) };
  const aggregate = aggregateCorpusReceipts(request, shardsResult.value, [receipt]);
  assert.equal(aggregate.kind, "accepted");
  const body = {
    schema: "galerina.fungi-corpus-evidence.v1",
    request,
    limits,
    run: {
      schema: "galerina.fungi-corpus-run.v2",
      receipts: [receipt],
      aggregate: aggregate.value,
    },
  };
  return { ...body, digest: canonicalDigest(body) };
}

function authorityManifest(facts, report) {
  return {
    schema: "galerina.conversion-slice-authority.v1",
    authorizing: false,
    status: "APPROVED",
    approval: {
      task: "RD-0873-TASK-6",
      criticalFindings: 0,
      importantFindings: 0,
      evidenceDigest: digest("6"),
    },
    entries: [{
      report,
      product: facts.product,
      scope: { ...facts.scope },
      target: { ...facts.target },
      governance: { ...facts.governance },
    }],
  };
}

function fixture(render, name = "candidate-fungi-conversion-2026-08-12.md", {
  sourceFile = "packages-ts/example/src/index.ts",
  sourceSymbol = "Candidate",
  includeTargetInProject = true,
  includeAlternates = false,
  sourceHeadKind = "commit",
  projectExecutable = null,
} = {}) {
  const root = mkdtempSync(join(tmpdir(), "galerina-slice-close-"));
  const sourceBytes = `export const ${sourceSymbol.split(".").at(-1)} = 1;\n`;
  const targetFile = "packages/fungi/products/galerina/example/slice.fungi";
  const targetBytes = "@version 1\npure flow Candidate() -> Int { return 1 }\n";
  const alternateSourceFile = "packages-ts/example/src/alternate.ts";
  const alternateSourceBytes = "export const Alternate = 2;\n";
  const alternateTargetFile = "packages/fungi/products/galerina/example/alternate.fungi";
  const alternateTargetBytes = "@version 1\npure flow Alternate() -> Int { return 2 }\n";
  const planBytes = "# RD-0873 fixture plan\n";
  write(root, ".gitignore", "/build/\n");
  write(root, "governance/conversion-slice-close-baseline.json", '{"schemaVersion":1,"legacyReports":[]}\n');
  write(root, sourceFile, sourceBytes);
  write(root, targetFile, targetBytes);
  if (includeAlternates || !includeTargetInProject) {
    write(root, alternateSourceFile, alternateSourceBytes);
    write(root, alternateTargetFile, alternateTargetBytes);
  }
  write(root, PLAN_PATH, planBytes);
  git(root, ["init", "--quiet"]);
  git(root, ["config", "user.name", "Slice Fixture"]);
  git(root, ["config", "user.email", "slice@example.invalid"]);
  git(root, ["add", "--", ".gitignore", "governance", "packages-ts", "packages", "docs/superpowers"]);
  if (projectExecutable !== null) {
    const executablePath = {
      source: sourceFile,
      target: targetFile,
      plan: PLAN_PATH,
    }[projectExecutable];
    assert.equal(typeof executablePath, "string", "unknown PROJECT executable-mode fixture");
    git(root, ["update-index", "--chmod=+x", "--", executablePath]);
  }
  git(root, ["commit", "--quiet", "-m", "fixture"]);
  const head = git(root, ["rev-parse", "HEAD"]);
  const tree = git(root, ["rev-parse", "HEAD^{tree}"]);
  let sourceHead = head;
  if (sourceHeadKind === "tree") sourceHead = tree;
  if (sourceHeadKind === "tag") {
    git(root, ["tag", "-a", "source-authority-tag", "-m", "tag object", head]);
    sourceHead = git(root, ["rev-parse", "refs/tags/source-authority-tag"]);
  }
  if (sourceHeadKind === "orphan") sourceHead = git(root, ["commit-tree", tree], "orphan\n");
  const projectFile = includeTargetInProject ? targetFile : alternateTargetFile;
  const projectBytes = includeTargetInProject ? targetBytes : alternateTargetBytes;
  const request = {
    schema: "galerina.fungi-corpus-request.v2",
    profile: "PROJECT",
    productId: "galerina",
    repositoryHead: head,
    repositoryTree: tree,
    compilerDigest: canonicalDigest({ compiler: "fixture" }),
    fileSetDigest: canonicalDigest({ files: [projectFile] }),
    shardCount: 1,
    files: [{
      path: projectFile,
      digest: rawDigest(projectBytes),
      expectationDigest: canonicalDigest({ expected: [] }),
      mode: "plain",
    }],
  };
  const evidence = projectEvidence(request);
  const facts = {
    product: "galerina",
    scope: { package: "example", file: sourceFile, symbol: sourceSymbol },
    source: { head: sourceHead, tree, contentDigest: rawDigest(sourceBytes) },
    target: {
      locator: `${targetFile}#${sourceSymbol}`,
      candidateDigest: rawDigest(targetBytes),
    },
    governance: { rdDigest: RD_DIGEST, planDigest: rawDigest(planBytes) },
    projectCorpusReceiptDigest: evidence.digest,
  };
  const body = typeof render === "function" ? render(facts) : render;
  const authority = authorityManifest(facts, name);
  const authorityBytes = `${JSON.stringify(authority)}\n`;
  write(root, AUTHORITY_MANIFEST, authorityBytes);
  write(root, `docs/reports/${name}`, body);
  git(root, ["add", "--", AUTHORITY_MANIFEST, `docs/reports/${name}`]);
  git(root, ["commit", "--quiet", "-m", "approve fixture slice"]);
  write(root, PROJECT_EVIDENCE, `${JSON.stringify(evidence)}\n`);
  return {
    root,
    facts,
    name,
    authority,
    authorityDigest: rawDigest(authorityBytes),
    projectRequest: request,
    alternate: {
      sourceFile: alternateSourceFile,
      sourceBytes: alternateSourceBytes,
      targetFile: alternateTargetFile,
      targetBytes: alternateTargetBytes,
    },
  };
}

function auditArguments(root, {
  projectCorpusReceipt = PROJECT_EVIDENCE,
  authorityManifestPath = AUTHORITY_MANIFEST,
  authorityDigest = undefined,
  gitExecutable = PINNED_GIT,
  gitDigest = RUNTIME_GIT_SHA256,
  env = process.env,
} = {}) {
  const args = ["--root", root];
  if (projectCorpusReceipt !== null) args.push("--project-corpus-receipt", projectCorpusReceipt);
  if (authorityManifestPath !== null) args.push("--authority-manifest", authorityManifestPath);
  const pin = authorityDigest === undefined && authorityManifestPath !== null
    ? rawDigest(readFileSync(join(root, ...authorityManifestPath.split("/"))))
    : authorityDigest;
  if (pin !== null) args.push("--authority-digest", pin);
  if (gitExecutable !== null) args.push("--git-executable", gitExecutable);
  if (gitDigest !== null) args.push("--git-digest", gitDigest);
  return { args, env };
}

function run(root, options = {}) {
  const { args, env } = auditArguments(root, options);
  return boundedSpawn(process.execPath, [AUDIT, ...args], { env });
}

const digest = (character) => `sha256:${character.repeat(64)}`;
const gates = ["project-corpus", "differential", "strict-fungi", "physical-slide-vok"];
const exclusions = [
  { name: "full-tooling", authority: "task-5-plan" },
  { name: "graph-all", authority: "task-5-plan" },
  { name: "normal-phase-close", authority: "task-5-plan" },
];

function conversionReceipt(facts) {
  return {
    schema: "galerina.conversion-slice-receipt.v2",
    authorizing: false,
    status: "PASS",
    product: facts.product,
    scope: { ...facts.scope },
    source: { ...facts.source },
    target: { ...facts.target },
    governance: { ...facts.governance },
    physicalProfile: 1,
    projectCorpusReceiptDigest: facts.projectCorpusReceiptDigest,
    gates: gates.map((name, index) => ({
      name, status: "PASS", evidenceDigest: digest(["2", "3", "4", "5"][index]),
    })),
    exclusions: exclusions.map((entry) => ({ ...entry })),
  };
}

function reportEvidence(facts) {
  return `Scope: \`${facts.scope.file}#${facts.scope.symbol}\`.\n\n`
    + `Evidence: source build point \`${facts.source.head}\`;\n`
    + `source SHA-256 \`${facts.source.contentDigest.slice(7).toUpperCase()}\`;\n`
    + `Target: \`${facts.target.locator}\`.\n`
    + `target SHA-256 \`${facts.target.candidateDigest.slice(7).toUpperCase()}\`;\n`;
}

function base(facts, receipt = conversionReceipt(facts)) {
  return `# Candidate Fungi Conversion Report

${reportEvidence(facts)}

## Slice-close receipt

Skill disposition: SKILL_UPDATE aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
Threadability: PARALLEL_PURE
Source classification: CANDIDATE
Bounded closure: COMPLETE
Conversion receipt: ${JSON.stringify(receipt)}
`;
}

function forward(facts, receipt = conversionReceipt(facts)) {
  return `# Slice 323 Candidate Fungi conversion adjudication

${reportEvidence(facts)}

## Slice-close receipt

Skill disposition: NO_SKILL_UPDATE: translating skill already covers this boundary
Authoring skill disposition: NO_SKILL_UPDATE: no Fungi candidate was authorized
Threadability: UNKNOWN
Source classification: BLOCKED
Bounded closure: COMPLETE
Conversion receipt: ${JSON.stringify(receipt)}
`;
}

test("complete exact slice-close receipt passes", () => {
  const { root } = fixture(base);
  const result = run(root);
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("canonical no-argument audit preserves the exact historical cutover as non-green", () => {
  const result = boundedSpawn(process.execPath, [AUDIT], { cwd: REPOSITORY_ROOT });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /0 v2 governed receipts valid; 1017 frozen historical non-green reports/u);
});

test("the historical cutover refuses any legacy rewrite, removal or addition", () => {
  const root = mkdtempSync(join(tmpdir(), "galerina-slice-cutover-"));
  mkdirSync(join(root, "docs"), { recursive: true });
  mkdirSync(join(root, "governance"), { recursive: true });
  cpSync(join(REPOSITORY_ROOT, "docs", "reports"), join(root, "docs", "reports"), { recursive: true });
  cpSync(
    join(REPOSITORY_ROOT, "governance", "conversion-slice-close-baseline.json"),
    join(root, "governance", "conversion-slice-close-baseline.json"),
  );
  const historical = join(root, "docs", "reports", "can-honour-fungi-conversion-2026-08-12.md");
  const original = readFileSync(historical);
  assert.equal(boundedSpawn(process.execPath, [AUDIT, "--root", root]).status, 0);

  writeFileSync(historical, Buffer.concat([original, Buffer.from("\nmutated\n", "utf8")]));
  assert.equal(boundedSpawn(process.execPath, [AUDIT, "--root", root]).status, 1);
  writeFileSync(historical, original);
  rmSync(historical);
  assert.equal(boundedSpawn(process.execPath, [AUDIT, "--root", root]).status, 1);
  writeFileSync(historical, original);
  write(root, "docs/reports/new-fungi-conversion-2099-01-01.md", "# unapproved historical form\n");
  assert.equal(boundedSpawn(process.execPath, [AUDIT, "--root", root]).status, 1);
});

test("closure refuses every post-PROJECT path outside the exact v2 evidence allow-list", () => {
  const mutations = [
    ["packages/fungi/products/galerina/example/post-project.fungi", "@version 1\npure flow PostProject() -> Int { return 2 }\n"],
    ["packages-ts/example/src/index.ts", "export const Candidate = 2;\n"],
    ["packages/fungi/products/galerina/example/slice.fungi.expected.diagnostics.txt", "FUNGI-TYPE-001\n"],
    [PLAN_PATH, "# changed plan after PROJECT\n"],
    ["docs/unrelated.md", "# unrelated post-PROJECT drift\n"],
  ];
  for (const [path, contents] of mutations) {
    const subject = fixture(base);
    write(subject.root, path, contents);
    git(subject.root, ["add", "--", path]);
    git(subject.root, ["commit", "--quiet", "-m", "unadmitted post-PROJECT drift"]);
    const result = run(subject.root);
    assert.equal(result.status, 1, `${path} was admitted`);
    assert.match(result.stderr, /outside the exact evidence allow-list/u);
  }
});

test("closure delta refuses rename and copy statuses before path admission", () => {
  for (const operation of ["rename", "copy"]) {
    const subject = fixture(base);
    const destination = `packages-ts/example/src/${operation}d.ts`;
    if (operation === "rename") {
      git(subject.root, ["mv", "--", subject.facts.scope.file, destination]);
    } else {
      copyFileSync(join(subject.root, ...subject.facts.scope.file.split("/")), join(subject.root, ...destination.split("/")));
      git(subject.root, ["add", "--", destination]);
    }
    git(subject.root, ["commit", "--quiet", "-m", `post-PROJECT ${operation}`]);
    const result = run(subject.root);
    assert.equal(result.status, 1, `${operation} was admitted`);
    assert.match(result.stderr, /rename or copy is not admitted/u);
  }
});

test("closure report and authority blobs refuse a mode-only 100644 to 100755 change", () => {
  const outcomes = [];
  for (const kind of ["authority", "report"]) {
    const subject = fixture(base);
    const path = kind === "authority" ? AUTHORITY_MANIFEST : `docs/reports/${subject.name}`;
    git(subject.root, ["update-index", "--chmod=+x", "--", path]);
    git(subject.root, ["commit", "--quiet", "-m", `${kind} executable mode`]);
    outcomes.push(run(subject.root).status);
  }
  assert.deepEqual(outcomes, [1, 1]);
});

test("PROJECT source target and plan blobs require canonical 100644 mode", () => {
  const outcomes = ["source", "target", "plan"].map((projectExecutable) => {
    const subject = fixture(base, undefined, { projectExecutable });
    return run(subject.root).status;
  });
  assert.deepEqual(outcomes, [1, 1, 1]);
});

test("v2 closure refuses staged post-PROJECT target drift", () => {
  const subject = fixture(base);
  write(
    subject.root,
    subject.facts.target.locator.split("#")[0],
    "@version 1\npure flow Candidate() -> Int { return 9 }\n",
  );
  git(subject.root, ["add", "--", subject.facts.target.locator.split("#")[0]]);
  assert.equal(run(subject.root).status, 1);
});

test("v2 closure refuses unstaged target modification addition deletion rename and copy", () => {
  const operations = [
    ["modification", (subject, target) => write(
      subject.root, target, "@version 1\npure flow Candidate() -> Int { return 8 }\n",
    )],
    ["addition", (subject) => write(
      subject.root,
      "packages/fungi/products/galerina/example/untracked.fungi",
      "@version 1\npure flow Untracked() -> Int { return 1 }\n",
    )],
    ["deletion", (subject, target) => rmSync(join(subject.root, ...target.split("/")))],
    ["rename", (subject, target) => renameSync(
      join(subject.root, ...target.split("/")),
      join(subject.root, "packages", "fungi", "products", "galerina", "example", "renamed.fungi"),
    )],
    ["copy", (subject, target) => copyFileSync(
      join(subject.root, ...target.split("/")),
      join(subject.root, "packages", "fungi", "products", "galerina", "example", "copied.fungi"),
    )],
  ];
  const outcomes = operations.map(([name, mutate]) => {
    const subject = fixture(base);
    const target = subject.facts.target.locator.split("#")[0];
    mutate(subject, target);
    return [name, run(subject.root).status];
  });
  assert.deepEqual(outcomes, operations.map(([name]) => [name, 1]));
});

test("v2 closure refuses assume-unchanged and skip-worktree across every tracked evidence class", () => {
  const outcomes = [];
  for (const flag of ["--assume-unchanged", "--skip-worktree"]) {
    for (const kind of ["target", "source", "plan", "authority", "report"]) {
      const subject = fixture(base);
      const path = {
        target: subject.facts.target.locator.split("#")[0],
        source: subject.facts.scope.file,
        plan: PLAN_PATH,
        authority: AUTHORITY_MANIFEST,
        report: `docs/reports/${subject.name}`,
      }[kind];
      git(subject.root, ["update-index", flag, "--", path]);
      if (kind === "target") write(
        subject.root, path, "@version 1\npure flow Candidate() -> Int { return 7 }\n",
      );
      if (kind === "source") write(subject.root, path, "export const Candidate = 7;\n");
      if (kind === "plan") write(subject.root, path, "# hidden changed plan\n");
      outcomes.push([flag, kind, run(subject.root).status]);
    }
  }
  assert.deepEqual(outcomes, ["--assume-unchanged", "--skip-worktree"].flatMap((flag) => (
    ["target", "source", "plan", "authority", "report"].map((kind) => [flag, kind, 1])
  )));
});

test("v2 closure rechecks hidden index flags changed after its initial observation", () => {
  const outcomes = ["--assume-unchanged", "--skip-worktree"].map((flag) => {
    const subject = fixture(base);
    const { args } = auditArguments(subject.root);
    let fired = false;
    let refused = false;
    try {
      runAudit(args, {
        afterInitialRepositoryObservation() {
          git(subject.root, ["update-index", flag, "--", subject.facts.target.locator.split("#")[0]]);
          fired = true;
        },
      });
    } catch {
      refused = true;
    }
    return [flag, fired, refused];
  });
  assert.deepEqual(outcomes, [
    ["--assume-unchanged", true, true],
    ["--skip-worktree", true, true],
  ]);
});

test("a coherent receipt cannot self-authorize forged source target governance and PROJECT evidence", () => {
  const { root } = fixture((facts) => {
    const forged = conversionReceipt(facts);
    forged.source = {
      head: "6".repeat(40),
      tree: "7".repeat(40),
      contentDigest: digest("8"),
    };
    forged.target = {
      locator: "packages/fungi/products/galerina/forged/slice.fungi#Candidate",
      candidateDigest: digest("9"),
    };
    forged.governance = { rdDigest: digest("a"), planDigest: digest("b") };
    forged.projectCorpusReceiptDigest = digest("c");
    return base(facts, forged);
  });
  const result = run(root);
  assert.equal(result.status, 1, "coherent forged authority must refuse");
});

test("a coherent report and receipt rewrite cannot replace the approved scope or target", () => {
  const subject = fixture(base, undefined, { includeAlternates: true });
  const changedRequest = { ...subject.projectRequest, compilerDigest: digest("7") };
  const changedEvidence = projectEvidence(changedRequest);
  write(subject.root, PROJECT_EVIDENCE, `${JSON.stringify(changedEvidence)}\n`);
  const rewritten = {
    ...subject.facts,
    scope: {
      package: "example",
      file: "packages-ts/example/src/alternate.ts",
      symbol: "Alternate",
    },
    source: {
      ...subject.facts.source,
      contentDigest: rawDigest(subject.alternate.sourceBytes),
    },
    target: {
      locator: "packages/fungi/products/galerina/example/slice.fungi#Alternate",
      candidateDigest: subject.facts.target.candidateDigest,
    },
    governance: { rdDigest: digest("8"), planDigest: digest("9") },
    projectCorpusReceiptDigest: changedEvidence.digest,
  };
  write(subject.root, `docs/reports/${subject.name}`, base(rewritten, conversionReceipt(rewritten)));
  git(subject.root, ["add", "--", `docs/reports/${subject.name}`]);
  git(subject.root, ["commit", "--quiet", "-m", "attempt coherent rewrite"]);
  assert.equal(run(subject.root).status, 1);
});

test("the approved target must be an exact path and digest member of PROJECT coverage", () => {
  const { root } = fixture(base, undefined, { includeTargetInProject: false });
  assert.equal(run(root).status, 1);
});

test("source build point must be a commit ancestor of the PROJECT head", () => {
  for (const sourceHeadKind of ["tree", "tag", "orphan"]) {
    const subject = fixture(base, undefined, { sourceHeadKind });
    assert.equal(run(subject.root).status, 1, `non-commit or unrelated identity accepted: ${sourceHeadKind}`);
  }
});

test("historical scope-less receipts cannot replay unless frozen in the baseline", () => {
  const { root } = fixture((facts) => base(facts).replace(/^Conversion receipt:.*\n/mu, ""));
  assert.equal(run(root).status, 1);
});

test("source scope, candidate scope, required gate and exclusion mutations refuse", () => {
  const mutations = [
    (receipt) => ({ ...receipt, scope: { ...receipt.scope, file: "packages-ts/other/src/index.ts" } }),
    (receipt) => ({ ...receipt, target: { ...receipt.target, locator: "packages/fungi/products/trametes/example/slice.fungi#Candidate" } }),
    (receipt) => ({ ...receipt, gates: receipt.gates.slice(1) }),
    (receipt) => ({ ...receipt, exclusions: receipt.exclusions.slice(1) }),
  ];
  for (const mutate of mutations) {
    const { root } = fixture((facts) => base(facts, mutate(conversionReceipt(facts))));
    assert.equal(run(root).status, 1);
  }
});

test("missing, duplicate and vague skill dispositions refuse", () => {
  for (const mutate of [
    (body) => body.replace(/Skill disposition:.*\n/u, ""),
    (body) => `${body}\nSkill disposition: NO_SKILL_UPDATE: duplicate\n`,
    (body) => body.replace(/SKILL_UPDATE [a-f0-9]{40}/u, "NO_SKILL_UPDATE:"),
  ]) {
    const { root } = fixture((facts) => mutate(base(facts)));
    assert.equal(run(root).status, 1);
  }
});

test("unknown and non-runtime threadability are valid fail-closed receipts", () => {
  for (const value of ["UNKNOWN", "N/A"]) {
    const { root } = fixture((facts) => base(facts).replace("PARALLEL_PURE", value));
    assert.equal(run(root).status, 0);
  }
});

test("unrecognised threadability and incomplete closure refuse", () => {
  for (const mutate of [
    (body) => body.replace("PARALLEL_PURE", "MAYBE"),
    (body) => body.replace("COMPLETE", "INCOMPLETE"),
  ]) {
    const { root } = fixture((facts) => mutate(base(facts)));
    assert.equal(run(root).status, 1);
  }
});

test("forward slice receipts require both skills and exact source identity", () => {
  const name = "slice-323-candidate-fungi-conversion-2026-08-13.md";
  const completeFixture = fixture(forward, name);
  const complete = run(completeFixture.root);
  assert.equal(complete.status, 0, complete.stderr || complete.stdout);
  for (const mutate of [
    (body) => body.replace(/Authoring skill disposition:.*\n/u, ""),
    (body) => body.replace(/Scope:.*\n/u, ""),
    (body) => body.replace(/Evidence: source build point.*\n/u, ""),
    (body) => body.replace(/source SHA-256.*\n/u, ""),
    (body) => body.replace(/Target:.*\n/u, ""),
    (body) => body.replace(/target SHA-256.*\n/u, ""),
  ]) {
    const { root } = fixture((facts) => mutate(forward(facts)), name);
    assert.equal(run(root).status, 1);
  }
});

test("forward scopes accept scripts and qualified methods", () => {
  const name = "slice-448-qualified-script-fungi-conversion-2026-08-13.md";
  const { root } = fixture(forward, name, {
    sourceFile: "packages-ts/example/scripts/run-tests.mjs",
    sourceSymbol: "SearchGraph.setFile",
  });
  const result = run(root);
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("forward scopes accept canonical tests and bench module scopes", () => {
  const name = "slice-583-test-module-fungi-conversion-2026-08-13.md";
  for (const scope of [
    "packages-ts/example/tests/search.test.ts#module",
    "packages-ts/example/bench/flight-boot.mjs#module",
  ]) {
    const [sourceFile, sourceSymbol] = scope.split("#");
    const { root } = fixture(forward, name, { sourceFile, sourceSymbol });
    const result = run(root);
    assert.equal(result.status, 0, result.stderr || result.stdout);
  }
});

test("forward scopes refuse traversal and empty path segments", () => {
  const name = "slice-448-noncanonical-scope-fungi-conversion-2026-08-13.md";
  for (const scope of [
    "packages-ts/example/scripts/../src/index.ts#Candidate",
    "packages-ts/example/scripts/./run-tests.mjs#module",
    "packages-ts/example/scripts//run-tests.mjs#module",
    "packages-ts/example/tests/../src/index.ts#Candidate",
    "packages-ts/example/bench//flight-boot.mjs#module",
  ]) {
    const { root } = fixture((facts) => forward(facts).replace(
      `${facts.scope.file}#${facts.scope.symbol}`,
      scope,
    ), name);
    assert.equal(run(root).status, 1);
  }
});

test("v2 reports require explicit pinned Git, authority and PROJECT evidence", () => {
  const { root, authorityDigest } = fixture(base);
  assert.equal(boundedSpawn(process.execPath, [AUDIT, "--root", root]).status, 1);
  assert.equal(run(root, { projectCorpusReceipt: null }).status, 1);
  assert.equal(run(root, { authorityManifestPath: null, authorityDigest: null }).status, 1);
  assert.equal(run(root, { authorityDigest: null }).status, 1);
  assert.equal(run(root, { gitExecutable: null }).status, 1);
  assert.equal(run(root, { gitDigest: null }).status, 1);
  assert.equal(run(root, {
    projectCorpusReceipt: "build/fungi-corpus-check/evidence/../project.json",
  }).status, 1);
  assert.equal(run(root, {
    authorityManifestPath: "governance/../authority.json",
    authorityDigest,
  }).status, 1);
  assert.equal(run(root, { authorityDigest: digest("0") }).status, 1);
  write(root, AUTHORITY_MANIFEST, `${JSON.stringify({ forged: true })}\n`);
  assert.equal(run(root, { authorityDigest }).status, 1);
});

test("the pinned Git path ignores hostile PATH and refuses a hard-link alias", () => {
  const { root } = fixture(base);
  const hostile = mkdtempSync(join(tmpdir(), "galerina-hostile-git-"));
  const sentinel = join(hostile, "sentinel.txt");
  const fake = process.platform === "win32" ? join(hostile, "git.cmd") : join(hostile, "git");
  writeFileSync(fake, process.platform === "win32"
    ? `@echo off\r\n>"${sentinel}" echo executed\r\nexit /b 99\r\n`
    : `#!/bin/sh\nprintf executed > '${sentinel}'\nexit 99\n`);
  const result = run(root, { env: { ...process.env, PATH: hostile } });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(existsSync(sentinel), false);

  const copy = join(hostile, process.platform === "win32" ? "git-copy.exe" : "git-copy");
  const linked = join(hostile, process.platform === "win32" ? "git-linked.exe" : "git-linked");
  copyFileSync(PINNED_GIT, copy);
  linkSync(copy, linked);
  try {
    assert.equal(run(root, { gitExecutable: linked }).status, 1);
  } finally {
    rmSync(linked);
  }
});
