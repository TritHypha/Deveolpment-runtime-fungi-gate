#!/usr/bin/env node

import {
  closeSync,
  fstatSync,
  fsyncSync,
  lstatSync,
  openSync,
  readFileSync,
  readSync,
  realpathSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  ToolchainLoadObservationRefusal,
  canonicalToolchainLoadObservationText,
  collectToolchainLoadObservation,
  validateToolchainLoadObservation,
} from './lib/logic-aig-source-origin/toolchain-load-observation.mjs';

const REFUSAL_CODE = /^TOOLCHAIN_LOAD_OBSERVATION_REFUSED_[A-Z0-9_]+$/u;
const SHA256 = /^[0-9a-f]{64}$/u;

function refuse(code) {
  throw new ToolchainLoadObservationRefusal(code);
}

function samePlatformPath(left, right) {
  return process.platform === 'win32' ? left.toLowerCase() === right.toLowerCase() : left === right;
}

function outsideRepository(repositoryRoot, target) {
  const relative = path.relative(repositoryRoot, target);
  return relative !== ''
    && (relative === '..' || relative.startsWith(`..${path.sep}`))
    && !path.isAbsolute(relative);
}

function parseArguments(args) {
  if (args.length !== 8
    || args[0] !== '--git'
    || args[2] !== '--source-observation'
    || args[4] !== '--source-observation-digest'
    || args[6] !== '--out'
    || typeof args[1] !== 'string'
    || typeof args[3] !== 'string'
    || typeof args[5] !== 'string'
    || typeof args[7] !== 'string'
    || !path.isAbsolute(args[1])
    || !path.isAbsolute(args[3])
    || !SHA256.test(args[5])
    || !path.isAbsolute(args[7])) {
    refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_USAGE');
  }
  return {
    gitExecutable: args[1],
    sourcePath: args[3],
    sourceObservationDigest: args[5],
    outputPath: args[7],
  };
}

function stableParent(repositoryRoot, target, requireAbsent) {
  if (!outsideRepository(repositoryRoot, target)) refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_OUTPUT');
  const parent = path.dirname(target);
  const stats = lstatSync(parent, { bigint: true, throwIfNoEntry: false });
  let canonical;
  try { canonical = realpathSync.native(parent); } catch { refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_OUTPUT'); }
  if (!stats || !stats.isDirectory() || stats.isSymbolicLink()
    || !samePlatformPath(canonical, path.resolve(parent))) {
    refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_OUTPUT');
  }
  if (requireAbsent && lstatSync(target, { throwIfNoEntry: false })) {
    refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_OUTPUT');
  }
  return { parent, dev: stats.dev, ino: stats.ino, canonical };
}

function assertParent(proof) {
  const stats = lstatSync(proof.parent, { bigint: true, throwIfNoEntry: false });
  let canonical;
  try { canonical = realpathSync.native(proof.parent); } catch { refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_OUTPUT'); }
  if (!stats || !stats.isDirectory() || stats.isSymbolicLink()
    || stats.dev !== proof.dev || stats.ino !== proof.ino
    || !samePlatformPath(canonical, proof.canonical)
    || !samePlatformPath(canonical, path.resolve(proof.parent))) {
    refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_OUTPUT');
  }
}

function sameIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}

function assertRegularIdentity(stats, retained, expectedLength) {
  if (!stats || !stats.isFile() || stats.isSymbolicLink() || stats.nlink !== 1n
    || !sameIdentity(stats, retained) || stats.size !== BigInt(expectedLength)) {
    refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_OUTPUT');
  }
}

function readStableSource(repositoryRoot, sourcePath) {
  stableParent(repositoryRoot, sourcePath, false);
  const before = lstatSync(sourcePath, { bigint: true, throwIfNoEntry: false });
  let canonical;
  try { canonical = realpathSync.native(sourcePath); } catch { refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SOURCE'); }
  if (!before || !before.isFile() || before.isSymbolicLink() || before.nlink !== 1n
    || !samePlatformPath(canonical, path.resolve(sourcePath))) {
    refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SOURCE');
  }
  let bytes;
  try { bytes = readFileSync(sourcePath); } catch { refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SOURCE'); }
  const after = lstatSync(sourcePath, { bigint: true, throwIfNoEntry: false });
  if (!after || !sameIdentity(before, after) || after.size !== BigInt(bytes.length)) {
    refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SOURCE');
  }
  return bytes;
}

function readBackExact(descriptor, byteLength) {
  const output = Buffer.alloc(byteLength);
  let offset = 0;
  while (offset < byteLength) {
    const count = readSync(descriptor, output, offset, byteLength - offset, offset);
    if (count <= 0) refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_OUTPUT');
    offset += count;
  }
  const trailing = Buffer.allocUnsafe(1);
  if (readSync(descriptor, trailing, 0, 1, byteLength) !== 0) {
    refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_OUTPUT');
  }
  return output;
}

function writeExternalObservation(repositoryRoot, outputPath, bytes) {
  const parent = stableParent(repositoryRoot, outputPath, true);
  let descriptor;
  let retained;
  let created = false;
  try {
    assertParent(parent);
    descriptor = openSync(outputPath, 'wx+', 0o600);
    created = true;
    retained = fstatSync(descriptor, { bigint: true });
    assertRegularIdentity(retained, retained, 0);
    writeFileSync(descriptor, bytes);
    assertRegularIdentity(fstatSync(descriptor, { bigint: true }), retained, bytes.length);
    if (!readBackExact(descriptor, bytes.length).equals(bytes)) refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_OUTPUT');
    fsyncSync(descriptor);
    assertParent(parent);
    assertRegularIdentity(lstatSync(outputPath, { bigint: true, throwIfNoEntry: false }), retained, bytes.length);
    closeSync(descriptor);
    descriptor = undefined;
    assertParent(parent);
    assertRegularIdentity(lstatSync(outputPath, { bigint: true, throwIfNoEntry: false }), retained, bytes.length);
  } catch (error) {
    if (descriptor !== undefined) {
      try { closeSync(descriptor); } catch { /* cleanup proof below decides whether removal is safe */ }
      descriptor = undefined;
    }
    if (created && retained !== undefined) {
      const pathname = lstatSync(outputPath, { bigint: true, throwIfNoEntry: false });
      if (pathname && sameIdentity(pathname, retained)) {
        try { unlinkSync(outputPath); } catch { refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_OUTPUT'); }
      }
    }
    if (error instanceof ToolchainLoadObservationRefusal) throw error;
    refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_OUTPUT');
  }
}

async function run(args) {
  const parsed = parseArguments(args);
  const repositoryRoot = realpathSync.native(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
  const sourceObservationBytes = readStableSource(repositoryRoot, parsed.sourcePath);
  const observation = validateToolchainLoadObservation(await collectToolchainLoadObservation({
    repositoryRoot,
    gitExecutable: parsed.gitExecutable,
    sourceObservationBytes,
    sourceObservationDigest: parsed.sourceObservationDigest,
  }));
  const bytes = Buffer.from(canonicalToolchainLoadObservationText(observation), 'utf8');
  writeExternalObservation(repositoryRoot, parsed.outputPath, bytes);
}

function emitRefusal(error) {
  const code = error instanceof ToolchainLoadObservationRefusal && REFUSAL_CODE.test(error.code)
    ? error.code
    : 'TOOLCHAIN_LOAD_OBSERVATION_REFUSED_INTERNAL';
  process.stderr.write(`${code}\n`);
  process.exitCode = 2;
}

const invokedPath = process.argv[1];
if (typeof invokedPath === 'string' && pathToFileURL(path.resolve(invokedPath)).href === import.meta.url) {
  run(process.argv.slice(2)).catch(emitRefusal);
}
