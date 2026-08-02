import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const NATIVE = join(HERE, "..", "native");
const AUTHORITY = join(NATIVE, "vok-authority");

test("native W^X is private to the affine VOK authority crate", () => {
  assert.equal(
    existsSync(join(NATIVE, "vok-native", "Cargo.toml")),
    false,
    "a separately depend-able safe executor would bypass VOK authority",
  );

  const manifest = readFileSync(join(AUTHORITY, "Cargo.toml"), "utf8");
  assert.doesNotMatch(manifest, /galerina-vok-native/);

  const source = readFileSync(join(AUTHORITY, "src", "lib.rs"), "utf8");
  assert.match(source, /#\[allow\(unsafe_code\)\]\s*mod native;/);
  assert.doesNotMatch(source, /pub(?:\([^)]*\))?\s+mod\s+native/);
});
