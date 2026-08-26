import { isAbsolute, resolve } from "node:path";

function configuredAbsolutePath(value, label) {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim() === "" || !isAbsolute(value)) {
    throw new Error(`${label} requires a non-empty absolute path`);
  }
  return resolve(value);
}

export function resolveSlideRepository({
  env = process.env,
  galerinaRepository,
} = {}) {
  if (typeof galerinaRepository !== "string" || !isAbsolute(galerinaRepository)) {
    throw new Error("The Galerina repository root must be an absolute path");
  }
  const directory = configuredAbsolutePath(
    env.GALERINA_SLIDE_DIR,
    "GALERINA_SLIDE_DIR",
  );
  const repository = configuredAbsolutePath(
    env.GALERINA_SLIDE_REPO,
    "GALERINA_SLIDE_REPO",
  );
  if (directory !== undefined && repository !== undefined && directory !== repository) {
    throw new Error("GALERINA_SLIDE_DIR and GALERINA_SLIDE_REPO conflict");
  }
  return directory ?? repository ?? resolve(galerinaRepository, "..", "SLIDE");
}
