import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { checkEffects, checkTypes, executeFlow, parseProgram, snapshotCheckedFlow } from '../dist/index.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SOURCE = join(ROOT, 'packages', 'fungi', 'products', 'galerina', 'rd0873-first-native-slice', 'slice.fungi');
const ARTIFACT = join(ROOT, 'packages', 'fungi', 'products', 'galerina', 'rd0873-first-native-slice', 'slice.checked.json');
const SELECTION_REPORT_RELATIVE = 'docs/reports/rd-0873-first-native-slice-selection.md';
const SELECTION_REPORT = join(ROOT, SELECTION_REPORT_RELATIVE);
const ACCEPTED = ['development', 'test', 'staging', 'production'];
const REJECTED = ['', 'Development', ' production', 'production ', 'development\n', 'unknown'];

function sha256(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

function semanticDigest(artifact) {
  return sha256(Buffer.from(JSON.stringify({
    name: 'isEnvironmentMode',
    qualifier: artifact.qualifier,
    params: ['value: String'],
    returnType: artifact.returnType,
    declaredEffects: artifact.declaredEffects,
    ast: artifact.checkedAst,
  }), 'utf8'));
}

function assertCanonicalText(bytes, label) {
  assert.ok(bytes.length > 0, `${label} must not be empty`);
  assert.notEqual(bytes[0], 0xef, `${label} must not contain a UTF-8 BOM`);
  assert.equal(bytes.includes(0x0d), false, `${label} must use LF only`);
  assert.equal(bytes[bytes.length - 1], 0x0a, `${label} must end with one LF`);
  const text = bytes.toString('utf8');
  assert.equal(Buffer.from(text, 'utf8').equals(bytes), true, `${label} must be valid UTF-8`);
  assert.equal(text.normalize('NFC'), text, `${label} must be NFC`);
}

function assertArtifactIdentity(artifact, program) {
  assert.equal(artifact.schema, 'galerina.rd0873.checked-flow.v1');
  assert.equal(artifact.productId, 'galerina');
  assert.equal(artifact.packageId, 'rd0873-first-native-slice');
  assert.equal(artifact.flowLocator, 'rd0873/first-native-slice/isEnvironmentMode');
  assert.equal(artifact.physicalProfile, 'scalar-1');
  assert.equal(artifact.buildMode, 'STRICT_LOCAL_CHECK');
  assert.equal(artifact.sourceCanonicalization, 'UTF8_NO_BOM_LF_NFC_V1');
  assert.equal(artifact.selectionReportCommit, '12a28a691597659520a6cebc3c8ac6d773e5be47');
  assert.equal(artifact.selectionReportDigest, 'sha256:41f53e0fd258abf9ee2896d4c99d1dd22409f5f96bfb2b5d0add2ec2c33d6cc1');
  assert.equal(artifact.inventoryPolicyDigest, 'sha256:4d59066932e789588874f2a4a529ccc7b634eaa5271ed49005fd55f76db995e4');
  assert.equal(artifact.task6ObligationDigest, 'sha256:a73cabbd9f80e187168557dfbca949889ad27ced0b31932b47fd487ba9fbc378');
  assert.equal(artifact.selectionDigest, 'sha256:c5eea959c70997063f62588f700c556e22048e4813800e48943b5307ae545149');
  assert.equal(artifact.authorizing, false);
  assert.equal(artifact.authentication, 'NONE');
  const sourceBytes = readFileSync(SOURCE);
  assertCanonicalText(sourceBytes, 'native source');
  assert.equal(artifact.sourceDigest, sha256(sourceBytes));
  assert.equal(artifact.referenceSourceDigest, 'sha256:80b4b0b8b1a8a31cff824d71ef85dba17ffcc69ef2aca1e90ba3f0a1c339864b');
  const committedReport = execFileSync('git', ['show', `${artifact.selectionReportCommit}:${SELECTION_REPORT_RELATIVE}`], { cwd: ROOT });
  assert.equal(sha256(committedReport), artifact.selectionReportDigest);
  assertCanonicalText(readFileSync(ARTIFACT), 'checked artifact');
  assert.equal(artifact.semanticDigest, semanticDigest(artifact));
  assert.deepEqual(artifact.parameters, [{ name: 'value', type: 'String' }]);
  assert.deepEqual(artifact.declaredEffects, []);
  assert.equal(artifact.returnType, 'Bool');
  assert.equal(artifact.checkedAst.kind, 'pureFlowDecl');
  assert.equal(artifact.checkedAst.value, 'isEnvironmentMode');
  const flow = program.flows.find((entry) => entry.name === 'isEnvironmentMode');
  const flowNode = program.ast.children.find((node) => node.kind === 'pureFlowDecl' && node.value === 'isEnvironmentMode');
  assert.deepEqual(artifact.checkedAst, snapshotCheckedFlow(flow, flowNode).ast);
}

function compile(sourcePath = SOURCE) {
  const source = readFileSync(sourcePath, 'utf8').replace(/^\uFEFF/u, '');
  const program = parseProgram(source, sourcePath);
  assert.deepEqual(
    (program.diagnostics ?? []).filter((diagnostic) => diagnostic.severity === 'error'),
    [],
  );
  const typeDiagnostics = checkTypes(program.ast);
  assert.deepEqual(
    (typeDiagnostics.diagnostics ?? [])
      .filter((diagnostic) => diagnostic.severity === 'error'),
    [],
  );
  const effects = checkEffects(program.flows, program.ast);
  assert.deepEqual(
    effects.flatMap((result) => result.diagnostics ?? [])
      .filter((diagnostic) => diagnostic.severity === 'error'),
    [],
  );
  return program;
}

async function invoke(program, value) {
  const interpreted = await executeFlow(
    'isEnvironmentMode',
    new Map([['value', { __tag: 'string', value }]]),
    program.ast,
    program.flows,
  );
  return interpreted.value;
}

test('RD-0873 first native slice preserves the exact environment-mode classifier', () => {
  const program = compile();
  const artifact = JSON.parse(readFileSync(ARTIFACT, 'utf8'));
  assertArtifactIdentity(artifact, program);
  const source = readFileSync(SOURCE, 'utf8');
  assert.match(source, /@version 1/u);
  assert.match(source, /pure flow isEnvironmentMode\(value: String\) -> Bool/u);
  assert.match(source, /_ => return false/u);

  return Promise.all([
    ...ACCEPTED.map(async (value) => assert.deepEqual(
      await invoke(program, value),
      { __tag: 'bool', value: true },
      value,
    )),
    ...REJECTED.map(async (value) => assert.deepEqual(
      await invoke(program, value),
      { __tag: 'bool', value: false },
      JSON.stringify(value),
    )),
  ]);
});

test('RD-0873 first native slice artifact identity controls refuse one-field mutations', () => {
  const program = compile();
  const artifact = JSON.parse(readFileSync(ARTIFACT, 'utf8'));
  assertArtifactIdentity(artifact, program);
  for (const [field, value] of [
    ['productId', 'trametes'],
    ['physicalProfile', 'scalar-64'],
    ['sourceCanonicalization', 'UTF8_NO_BOM_CRLF_NFC_V1'],
    ['semanticDigest', 'sha256:' + '0'.repeat(64)],
    ['selectionReportCommit', '0000000000000000000000000000000000000000'],
    ['selectionReportDigest', 'sha256:' + '1'.repeat(64)],
    ['inventoryPolicyDigest', 'sha256:' + '2'.repeat(64)],
    ['task6ObligationDigest', 'sha256:' + '3'.repeat(64)],
    ['selectionDigest', 'sha256:' + '4'.repeat(64)],
    ['declaredEffects', ['filesystem.read']],
  ]) {
    const mutated = { ...artifact, [field]: value };
    assert.throws(() => assertArtifactIdentity(mutated, program), /AssertionError/u, field);
  }
  const forgedAst = { ...artifact, checkedAst: { ...artifact.checkedAst, value: 'forgedFlow' } };
  forgedAst.semanticDigest = semanticDigest(forgedAst);
  assert.throws(() => assertArtifactIdentity(forgedAst, program), /AssertionError/u, 'checkedAst');
});

test('RD-0873 first native slice mutation control rejects a missing canonical arm', async () => {
  const original = readFileSync(SOURCE, 'utf8');
  const mutated = original.replace('"production" => return true', '"prod" => return true');
  assert.notEqual(mutated, original);
  const tempRoot = mkdtempSync(join(tmpdir(), 'rd0873-native-slice-'));
  const mutatedPath = join(tempRoot, 'slice.fungi');
  try {
    writeFileSync(mutatedPath, mutated, 'utf8');
    const program = compile(mutatedPath);
    assert.deepEqual(
      await invoke(program, 'production'),
      { __tag: 'bool', value: false },
    );
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
