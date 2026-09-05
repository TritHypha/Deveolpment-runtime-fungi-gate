#!/usr/bin/env node

import { createHash, randomBytes } from 'node:crypto';
import { constants as fsConstants } from 'node:fs';
import { access, open, unlink } from 'node:fs/promises';

import {
  buildFrozenGitAdmissionFrame,
  runFrozenGitAdmissionFrameSelfTest,
} from './lib/logic-aig-source-origin/artifact-frame.mjs';

const PROFILE_LIMIT = 1_048_576;
const PINNED_PROFILE_JSON = '{"artifactRules":[{"id":"expected-parse-outcomes","maxBytes":67108864,"required":true,"role":"expected-parse-outcomes"},{"id":"export-sidecar","maxBytes":83886080,"required":true,"role":"export-sidecar"},{"id":"parse-outcomes-receipt","maxBytes":67108864,"required":true,"role":"parse-outcomes-receipt"},{"id":"project","maxBytes":67108864,"required":true,"role":"project-graph"},{"id":"resolution-inputs","maxBytes":67108864,"required":true,"role":"resolution-inputs"},{"id":"source-manifest","maxBytes":67108864,"required":true,"role":"source-manifest"},{"id":"toolchain-manifest","maxBytes":67108864,"required":true,"role":"toolchain-manifest"}],"authorizing":false,"ownerPolicy":{"mode":"none"},"profileId":"galerina.source-origin.unsigned.v1","rootArtifactId":"export-sidecar","runBinding":"manifest-artifact-row-equality.v1","schema":"artifact-admission-profile.v1","subjectRules":{"gitObjectFormat":"sha1","repositoryId":"galerina"},"supportedClaims":["captured-bytes-only"],"unsupportedClaims":["path-identity.no-reparse","path-identity.posix-device-inode","path-identity.single-hard-link","path-identity.windows-file-id"]}';
const PINNED_PROFILE_LENGTH = 1131;
const PINNED_PROFILE_SHA256 = '8b89fa23a5e84d2c16f885ce8946bf1b7e4547a8f06bf63c66b9e3db60479f0e';
const CLEAN_CODES = new Set([
  'REFUSED_OPTIONS_CAPTURE',
  'REFUSED_PROFILE_CAPTURE',
  'REFUSED_PROFILE_CANONICAL',
  'REFUSED_PREREQUISITE',
  'REFUSED_GIT_EXPORT',
  'REFUSED_EXPORT_CAPTURE',
  'REFUSED_EXPORT_SEMANTIC',
  'REFUSED_FRAME_ASSEMBLY',
  'REFUSED_OUTPUT_RESERVE',
  'REFUSED_OUTPUT_COLLISION',
  'REFUSED_OUTPUT_WRITE',
  'REFUSED_OUTPUT_FLUSH',
  'REFUSED_OUTPUT_READBACK',
  'OUTPUT_STATE_UNKNOWN',
]);

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

async function runSelfTest() {
  runFrozenGitAdmissionFrameSelfTest();
}

async function readProfile(path) {
  let handle;
  try {
    handle = await open(path, 'r');
    const before = await handle.stat();
    if (!before.isFile() || before.size < 0 || before.size > PROFILE_LIMIT) throw new Error('profile extent');
    const bytes = Buffer.allocUnsafeSlow(before.size);
    let offset = 0;
    while (offset < bytes.length) {
      const result = await handle.read(bytes, offset, bytes.length - offset, offset);
      if (!Number.isSafeInteger(result.bytesRead) || result.bytesRead <= 0) throw new Error('profile read');
      offset += result.bytesRead;
    }
    const after = await handle.stat();
    if (!after.isFile() || after.size !== before.size) throw new Error('profile drift');
    await handle.close();
    handle = undefined;
    return bytes;
  } catch {
    if (handle) {
      try { await handle.close(); } catch { /* profile capture remains refused */ }
    }
    const error = new Error('REFUSED_PROFILE_CAPTURE');
    error.code = 'REFUSED_PROFILE_CAPTURE';
    throw error;
  }
}

async function outputAbsent(path) {
  try {
    await access(path, fsConstants.F_OK);
    return false;
  } catch (error) {
    return error?.code === 'ENOENT';
  }
}

async function cleanupOutput(handle, path) {
  let certain = true;
  if (handle) {
    try { await handle.truncate(0); } catch { certain = false; }
    try { await handle.close(); } catch { certain = false; }
  }
  try { await unlink(path); } catch (error) { if (error?.code !== 'ENOENT') certain = false; }
  if (!await outputAbsent(path)) certain = false;
  return certain;
}

async function reserveWriteVerify(path, frame) {
  let handle;
  try {
    handle = await open(path, 'wx+', 0o600);
  } catch (error) {
    const refusal = new Error(error?.code === 'EEXIST' ? 'REFUSED_OUTPUT_COLLISION' : 'REFUSED_OUTPUT_RESERVE');
    refusal.code = refusal.message;
    throw refusal;
  }

  let stage = 'REFUSED_OUTPUT_WRITE';
  try {
    let offset = 0;
    while (offset < frame.length) {
      const result = await handle.write(frame, offset, frame.length - offset, offset);
      if (!Number.isSafeInteger(result.bytesWritten) || result.bytesWritten <= 0) throw new Error('write progress');
      offset += result.bytesWritten;
    }
    stage = 'REFUSED_OUTPUT_FLUSH';
    await handle.sync();
    stage = 'REFUSED_OUTPUT_READBACK';
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size !== frame.length) throw new Error('readback extent');
    const readback = Buffer.allocUnsafeSlow(frame.length);
    offset = 0;
    while (offset < readback.length) {
      const result = await handle.read(readback, offset, readback.length - offset, offset);
      if (!Number.isSafeInteger(result.bytesRead) || result.bytesRead <= 0) throw new Error('readback progress');
      offset += result.bytesRead;
    }
    if (!readback.equals(frame) || sha256(readback) !== sha256(frame)) throw new Error('readback mismatch');
    try {
      await handle.close();
      handle = undefined;
    } catch {
      const refusal = new Error('OUTPUT_STATE_UNKNOWN');
      refusal.code = 'OUTPUT_STATE_UNKNOWN';
      throw refusal;
    }
  } catch (error) {
    if (error?.code === 'OUTPUT_STATE_UNKNOWN') throw error;
    const cleaned = await cleanupOutput(handle, path);
    handle = undefined;
    const refusal = new Error(cleaned ? stage : 'OUTPUT_STATE_UNKNOWN');
    refusal.code = refusal.message;
    throw refusal;
  }
}

function parseProductionArguments(argv) {
  if (
    argv.length !== 6
    || argv[0] !== '--commit'
    || argv[2] !== '--profile'
    || argv[4] !== '--out'
    || argv[1].length === 0
    || argv[3].length === 0
    || argv[5].length === 0
  ) return null;
  return { commitOid: argv[1], profilePath: argv[3], outPath: argv[5] };
}

function validatePreProducerInputs(commitOid, profileBytes) {
  if (
    profileBytes.length !== PINNED_PROFILE_LENGTH
    || sha256(profileBytes) !== PINNED_PROFILE_SHA256
    || !profileBytes.equals(Buffer.from(PINNED_PROFILE_JSON, 'utf8'))
  ) {
    const refusal = new Error('REFUSED_PROFILE_CANONICAL');
    refusal.code = refusal.message;
    throw refusal;
  }
  if (typeof commitOid !== 'string' || !/^[0-9a-f]{40}$/.test(commitOid)) {
    const refusal = new Error('REFUSED_OPTIONS_CAPTURE');
    refusal.code = refusal.message;
    throw refusal;
  }
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 1 && argv[0] === '--self-test') {
    try {
      await runSelfTest();
      process.stdout.write('SELF_TEST_OK\n');
      return 0;
    } catch {
      process.stderr.write('REFUSED_SELF_TEST\n');
      return 2;
    }
  }
  const parsed = parseProductionArguments(argv);
  if (!parsed) {
    process.stderr.write('REFUSED_USAGE\n');
    return 2;
  }
  try {
    const profileBytes = await readProfile(parsed.profilePath);
    validatePreProducerInputs(parsed.commitOid, profileBytes);
    let runId;
    try { runId = randomBytes(32).toString('hex'); } catch {
      const refusal = new Error('REFUSED_PREREQUISITE');
      refusal.code = 'REFUSED_PREREQUISITE';
      throw refusal;
    }
    const frame = await buildFrozenGitAdmissionFrame({
      commitOid: parsed.commitOid,
      profileBytes,
      runId,
    });
    await reserveWriteVerify(parsed.outPath, frame);
    return 0;
  } catch (error) {
    const code = CLEAN_CODES.has(error?.code) ? error.code : 'REFUSED_FRAME_ASSEMBLY';
    process.stderr.write(`${code}\n`);
    return 2;
  }
}

process.exitCode = await main();
