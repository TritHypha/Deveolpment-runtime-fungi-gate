import {
  accessSync,
  constants,
  realpathSync,
  statSync,
} from "node:fs";
import {
  delimiter,
  isAbsolute,
  join,
} from "node:path";

const WINDOWS_APPS = /(?:^|[\\/])WindowsApps(?:[\\/]|$)/iu;

function unquotePathEntry(value) {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function admittedExecutable(path, platform) {
  try {
    const canonical = realpathSync(path);
    if (!statSync(canonical).isFile()) return undefined;
    if (platform === "win32") {
      if (WINDOWS_APPS.test(path) || WINDOWS_APPS.test(canonical)) return undefined;
    } else {
      accessSync(canonical, constants.X_OK);
    }
    return canonical;
  } catch {
    return undefined;
  }
}

/**
 * Resolve a real Python executable without invoking the Windows Store/App
 * Execution Alias manager. The benchmark lane is optional: an alias-only
 * host is reported as unavailable instead of spawning an unowned child.
 */
export function resolvePythonExecutable(
  pathValue = process.env.PATH,
  platform = process.platform,
) {
  if (typeof pathValue !== "string" || pathValue.length === 0) return undefined;
  const separator = platform === "win32" ? ";" : delimiter;
  const names = platform === "win32"
    ? ["python3.exe", "python.exe"]
    : ["python3", "python"];

  for (const rawDirectory of pathValue.split(separator)) {
    const directory = unquotePathEntry(rawDirectory);
    if (directory.length === 0 || !isAbsolute(directory)) continue;
    for (const name of names) {
      const admitted = admittedExecutable(join(directory, name), platform);
      if (admitted !== undefined) return admitted;
    }
  }
  return undefined;
}
