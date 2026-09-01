#!/usr/bin/env node

import {
  closeSync,
  fstatSync,
  fsyncSync,
  lstatSync,
  openSync,
  readSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  ToolchainPinObservationRefusal,
  canonicalToolchainObservationText,
  collectToolchainPinObservation,
} from './lib/logic-aig-source-origin/toolchain-pin-observation.mjs';

const REFUSAL_CODE = /^TOOLCHAIN_OBSERVATION_REFUSED_[A-Z0-9_]+$/u;

function refuse(code) {
  throw new ToolchainPinObservationRefusal(code);
}

function parseArguments(args) {
  if (
    args.length !== 4
    || args[0] !== '--git'
    || args[2] !== '--out'
    || typeof args[1] !== 'string'
    || typeof args[3] !== 'string'
    || !path.isAbsolute(args[1])
    || !path.isAbsolute(args[3])
  ) refuse('TOOLCHAIN_OBSERVATION_REFUSED_USAGE');
  return { gitExecutable: args[1], outputPath: args[3] };
}

function prepareOutput(repositoryRoot, outputPath) {
  const relative = path.relative(repositoryRoot, outputPath);
  if (
    relative === ''
    || (relative !== '..' && !relative.startsWith(`..${path.sep}`))
    || path.isAbsolute(relative)
  ) refuse('TOOLCHAIN_OBSERVATION_REFUSED_OUTPUT');
  const parent = path.dirname(outputPath);
  const parentStats = lstatSync(parent, { throwIfNoEntry: false });
  if (!parentStats || !parentStats.isDirectory() || parentStats.isSymbolicLink()) {
    refuse('TOOLCHAIN_OBSERVATION_REFUSED_OUTPUT');
  }
  if (realpathSync.native(parent) !== path.resolve(parent)) {
    refuse('TOOLCHAIN_OBSERVATION_REFUSED_OUTPUT');
  }
  if (lstatSync(outputPath, { throwIfNoEntry: false })) {
    refuse('TOOLCHAIN_OBSERVATION_REFUSED_OUTPUT');
  }
}

function sameFileIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}

function assertRetainedOutputIdentity(stats, retainedIdentity, expectedBytes) {
  if (
    !stats
    || !stats.isFile()
    || stats.isSymbolicLink()
    || stats.nlink !== 1n
    || !sameFileIdentity(stats, retainedIdentity)
    || stats.size !== BigInt(expectedBytes)
  ) refuse('TOOLCHAIN_OBSERVATION_REFUSED_OUTPUT');
}

function readBackExact(descriptor, byteLength) {
  const readback = Buffer.alloc(byteLength);
  let offset = 0;
  while (offset < byteLength) {
    const count = readSync(descriptor, readback, offset, byteLength - offset, offset);
    if (count <= 0) refuse('TOOLCHAIN_OBSERVATION_REFUSED_OUTPUT');
    offset += count;
  }
  const trailingByte = Buffer.allocUnsafe(1);
  if (readSync(descriptor, trailingByte, 0, 1, byteLength) !== 0) {
    refuse('TOOLCHAIN_OBSERVATION_REFUSED_OUTPUT');
  }
  return readback;
}

async function run(args) {
  const { gitExecutable, outputPath } = parseArguments(args);
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  prepareOutput(repositoryRoot, outputPath);
  const observation = await collectToolchainPinObservation({ repositoryRoot, gitExecutable });
  const bytes = Buffer.from(canonicalToolchainObservationText(observation), 'utf8');

  let descriptor;
  try {
    descriptor = openSync(outputPath, 'wx+', 0o600);
    const retainedIdentity = fstatSync(descriptor, { bigint: true });
    assertRetainedOutputIdentity(retainedIdentity, retainedIdentity, 0);
    writeFileSync(descriptor, bytes);
    const afterWrite = fstatSync(descriptor, { bigint: true });
    assertRetainedOutputIdentity(afterWrite, retainedIdentity, bytes.length);
    if (!readBackExact(descriptor, bytes.length).equals(bytes)) {
      refuse('TOOLCHAIN_OBSERVATION_REFUSED_OUTPUT');
    }
    fsyncSync(descriptor);
    const beforeClose = fstatSync(descriptor, { bigint: true });
    assertRetainedOutputIdentity(beforeClose, retainedIdentity, bytes.length);
    assertRetainedOutputIdentity(
      lstatSync(outputPath, { bigint: true, throwIfNoEntry: false }),
      retainedIdentity,
      bytes.length,
    );
    const closingDescriptor = descriptor;
    descriptor = undefined;
    closeSync(closingDescriptor);
    assertRetainedOutputIdentity(
      lstatSync(outputPath, { bigint: true, throwIfNoEntry: false }),
      retainedIdentity,
      bytes.length,
    );
  } catch {
    if (descriptor !== undefined) {
      const closingDescriptor = descriptor;
      descriptor = undefined;
      try { closeSync(closingDescriptor); } catch { /* body-free refusal below */ }
    }
    refuse('TOOLCHAIN_OBSERVATION_REFUSED_OUTPUT');
  }
}

function emitRefusal(error) {
  const code = error instanceof ToolchainPinObservationRefusal && REFUSAL_CODE.test(error.code)
    ? error.code
    : 'TOOLCHAIN_OBSERVATION_REFUSED_INTERNAL';
  process.stderr.write(`${code}\n`);
  process.exitCode = 2;
}

const invokedPath = process.argv[1];
if (typeof invokedPath === 'string' && pathToFileURL(path.resolve(invokedPath)).href === import.meta.url) {
  run(process.argv.slice(2)).catch(emitRefusal);
}
