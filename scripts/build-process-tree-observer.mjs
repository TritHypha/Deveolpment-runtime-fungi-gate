import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'native', 'process-tree-observer');
const RUSTC_ID = 'rustc 1.98.1 (48a229cea 2026-09-01)';
const CARGO_ID = 'cargo 1.98.1 (797e8a9bc 2026-08-05)';
const TARGETS = Object.freeze({ win32: 'x86_64-pc-windows-msvc', linux: 'x86_64-unknown-linux-gnu' });

function fail(code) {
  process.stderr.write(`${code}\n`);
  process.exitCode = 2;
}

function run(file, args, options = {}) {
  return execFileSync(file, args, { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'], ...options }).trim();
}

function ensurePinnedToolchain() {
  if (run('rustc', ['--version']) !== RUSTC_ID || run('cargo', ['--version']) !== CARGO_ID) throw new Error('HOLD_NATIVE_TOOLCHAIN_IDENTITY');
  const toolchain = readFileSync(path.join(ROOT, 'rust-toolchain.toml'), 'utf8').replace(/\r\n/gu, '\n');
  if (toolchain !== '[toolchain]\nchannel = "1.98.1"\nprofile = "minimal"\ntargets = ["x86_64-pc-windows-msvc", "x86_64-unknown-linux-gnu"]\n') throw new Error('HOLD_NATIVE_TOOLCHAIN_PIN');
  const target = TARGETS[process.platform];
  if (!target || process.arch !== 'x64') throw new Error('HOLD_NATIVE_PLATFORM_UNAVAILABLE');
  const installed = run('rustup', ['target', 'list', '--installed']).split(/\r?\n/gu).filter(Boolean);
  if (!installed.includes(target)) throw new Error('HOLD_NATIVE_TARGET_UNAVAILABLE');
  return target;
}

function ensureDependencyFree() {
  const metadata = JSON.parse(run('cargo', ['metadata', '--locked', '--offline', '--no-deps', '--format-version', '1'], { cwd: ROOT }));
  const pkg = metadata.packages.find((entry) => entry.name === 'process-tree-observer');
  if (!pkg || pkg.dependencies.length !== 0) throw new Error('HOLD_NATIVE_DEPENDENCY');
}

function build() {
  const target = ensurePinnedToolchain();
  ensureDependencyFree();
  const outputRoot = mkdtempSync(path.join(os.tmpdir(), 'galerina-process-tree-observer-build-'));
  try {
    run('cargo', ['build', '--locked', '--offline', '--release', '--target', target], {
      cwd: ROOT,
      env: { ...process.env, CARGO_TARGET_DIR: outputRoot },
    });
    const binaryName = process.platform === 'win32' ? 'process-tree-observer.exe' : 'process-tree-observer';
    const binary = path.join(outputRoot, target, 'release', binaryName);
    const stat = statSync(binary);
    if (!stat.isFile() || stat.size === 0) throw new Error('HOLD_NATIVE_BINARY');
    return { outputRoot, binary };
  } catch (error) {
    try { rmSync(outputRoot, { recursive: true, force: true }); } catch { /* preserve HOLD */ }
    throw error;
  }
}

if (process.argv.length > 3 || (process.argv.length === 3 && process.argv[2] !== '--check')) {
  fail('REFUSED_NATIVE_BUILD_ARGS');
} else {
  try {
    const result = build();
    if (process.argv[2] === '--check') {
      const proven = path.resolve(result.outputRoot);
      if (proven.startsWith(path.resolve(os.tmpdir()) + path.sep)) rmSync(proven, { recursive: true, force: true });
      process.stdout.write('PROCESS_TREE_OBSERVER_OK\n');
    } else {
      process.stdout.write(`${result.binary}\n`);
    }
  } catch (error) {
    fail(error instanceof Error && /^HOLD_[A-Z0-9_]+$/u.test(error.message) ? error.message : 'HOLD_NATIVE_BUILD');
  }
}
