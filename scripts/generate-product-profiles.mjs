#!/usr/bin/env node
import { createHash, randomBytes } from "node:crypto";
import {
  existsSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, normalize, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { parseStrictJsonBytes } from "./lib/assurance-fabric/strict-json.mjs";

const MODULE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_PATH = "product-registry/product-profiles.source.v1.json";
const SOURCE_SCHEMA_PATH = "product-registry/product-profiles.source.v1.schema.json";
const GENERATED_PATH = "product-registry/product-profiles.v1.json";
const GENERATED_SCHEMA_PATH = "product-registry/product-profiles.v1.schema.json";
const MAX_SOURCE_BYTES = 1_048_576;
const MAX_SCHEMA_BYTES = 1_048_576;
const MAX_POLICY_BYTES = 16_777_216;
const NON_ADMITTED_STATES = new Set(["planned", "lab", "retired"]);

function refuse(code, detail) {
  throw new Error(`${code}: ${detail}`);
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sameValue(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function resolveLocalRef(rootSchema, ref, code, path) {
  if (typeof ref !== "string" || !ref.startsWith("#/$defs/")) {
    refuse(code, `${path} has an unsupported schema reference`);
  }
  const name = ref.slice("#/$defs/".length);
  const target = rootSchema.$defs?.[name];
  if (!isRecord(target)) refuse(code, `${path} references a missing schema definition`);
  return target;
}

function validateSchemaValue(value, schema, rootSchema, code, path, depth = 0) {
  if (!isRecord(schema) || depth > 32) refuse(code, `${path} exceeds the closed schema bounds`);
  if (schema.$ref !== undefined) {
    validateSchemaValue(value, resolveLocalRef(rootSchema, schema.$ref, code, path), rootSchema, code, path, depth + 1);
    return;
  }
  if (schema.const !== undefined && !sameValue(value, schema.const)) {
    refuse(code, `${path} does not match its required constant`);
  }
  if (Array.isArray(schema.enum) && !schema.enum.some((entry) => sameValue(value, entry))) {
    refuse(code, `${path} is outside its closed enum`);
  }
  if (schema.type === "object") {
    if (!isRecord(value)) refuse(code, `${path} must be an object`);
    const properties = isRecord(schema.properties) ? schema.properties : {};
    const required = Array.isArray(schema.required) ? schema.required : [];
    for (const key of required) {
      if (!Object.hasOwn(value, key)) refuse(code, `${path}.${key} is required`);
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!Object.hasOwn(properties, key)) refuse(code, `${path}.${key} is not admitted`);
      }
    }
    for (const [key, childSchema] of Object.entries(properties)) {
      if (Object.hasOwn(value, key)) {
        validateSchemaValue(value[key], childSchema, rootSchema, code, `${path}.${key}`, depth + 1);
      }
    }
    return;
  }
  if (schema.type === "array") {
    if (!Array.isArray(value)) refuse(code, `${path} must be an array`);
    if (Number.isInteger(schema.minItems) && value.length < schema.minItems) refuse(code, `${path} is too short`);
    if (Number.isInteger(schema.maxItems) && value.length > schema.maxItems) refuse(code, `${path} is too long`);
    if (schema.uniqueItems === true) {
      const identities = value.map((entry) => JSON.stringify(entry));
      if (new Set(identities).size !== identities.length) refuse(code, `${path} contains duplicates`);
    }
    if (schema.items !== undefined) {
      value.forEach((entry, index) =>
        validateSchemaValue(entry, schema.items, rootSchema, code, `${path}[${index}]`, depth + 1));
    }
    return;
  }
  if (schema.type === "string") {
    if (typeof value !== "string") refuse(code, `${path} must be a string`);
    if (Number.isInteger(schema.minLength) && value.length < schema.minLength) refuse(code, `${path} is too short`);
    if (Number.isInteger(schema.maxLength) && value.length > schema.maxLength) refuse(code, `${path} is too long`);
    if (typeof schema.pattern === "string" && !new RegExp(schema.pattern, "u").test(value)) {
      refuse(code, `${path} does not match its closed pattern`);
    }
    return;
  }
  if (schema.type === "integer" && !Number.isSafeInteger(value)) {
    refuse(code, `${path} must be a safe integer`);
  }
}

function parseSchema(schemaBytes, label) {
  return parseStrictJsonBytes(schemaBytes, { label, maxBytes: MAX_SCHEMA_BYTES });
}

function validateAgainstClosedSchema(value, schema, code) {
  validateSchemaValue(value, schema, schema, code, "$root");
}

function canonicalPolicyPath(path) {
  if (
    typeof path !== "string"
    || path.length === 0
    || path.includes("\\")
    || isAbsolute(path)
    || /^[A-Za-z]:/.test(path)
  ) {
    refuse("POLICY_PATH_REFUSED", "policy path must be a canonical repository-relative path");
  }
  const canonical = normalize(path).split(sep).join("/");
  if (canonical !== path || canonical === "." || canonical === ".." || canonical.startsWith("../")) {
    refuse("POLICY_PATH_REFUSED", "policy path escapes or is not canonical");
  }
  return canonical;
}

function unavailableBinding(row) {
  return Buffer.from(JSON.stringify({
    domain: "product-policy-unavailable.v1",
    productId: row.productId,
    compatibilityState: row.compatibilityState,
    policyId: row.policyId,
  }), "utf8");
}

function digest(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

export function generateProductProfiles(sourceBytes, readExactPolicy, options = {}) {
  if (typeof readExactPolicy !== "function") throw new TypeError("readExactPolicy must be a function");
  const sourceSchemaBytes = options.sourceSchemaBytes
    ?? readFileSync(resolve(MODULE_ROOT, SOURCE_SCHEMA_PATH));
  const generatedSchemaBytes = options.generatedSchemaBytes
    ?? readFileSync(resolve(MODULE_ROOT, GENERATED_SCHEMA_PATH));

  let source;
  try {
    source = parseStrictJsonBytes(sourceBytes, {
      label: SOURCE_PATH,
      maxBytes: MAX_SOURCE_BYTES,
    });
  } catch (error) {
    if (isRecord(error) && typeof error.code === "string") {
      refuse(error.code, error instanceof Error ? error.message : String(error));
    }
    throw error;
  }
  const sourceSchema = parseSchema(sourceSchemaBytes, SOURCE_SCHEMA_PATH);
  validateAgainstClosedSchema(source, sourceSchema, "SOURCE_SCHEMA_REFUSED");

  const productIds = source.products.map((row) => row.productId);
  if (new Set(productIds).size !== productIds.length) {
    refuse("SOURCE_SCHEMA_REFUSED", "productId values must be unique");
  }

  const rows = structuredClone(source.products).sort((left, right) =>
    left.productId.localeCompare(right.productId, "en"));
  for (const row of rows) {
    let bindingBytes;
    if (row.compatibilityState === "admitted") {
      const path = canonicalPolicyPath(row.policyPath);
      bindingBytes = readExactPolicy(path);
      if (!Buffer.isBuffer(bindingBytes) && !(bindingBytes instanceof Uint8Array)) {
        refuse("POLICY_BYTES_REFUSED", `${path} did not produce bytes`);
      }
      if (bindingBytes.byteLength < 1 || bindingBytes.byteLength > MAX_POLICY_BYTES) {
        refuse("POLICY_BYTES_REFUSED", `${path} is outside the closed byte bounds`);
      }
    } else if (NON_ADMITTED_STATES.has(row.compatibilityState)) {
      if (row.policyPath !== "") refuse("PLANNED_POLICY_PATH", `${row.productId} cannot name a policy path`);
      if (
        row.admittedSafetyProfiles.length !== 0
        || row.admittedBuildModes.length !== 0
        || row.admittedPhysicalProfiles.length !== 0
      ) {
        refuse("PLANNED_ADMISSION", `${row.productId} cannot carry admitted execution profiles`);
      }
      bindingBytes = unavailableBinding(row);
    } else {
      refuse("SOURCE_SCHEMA_REFUSED", `${row.productId} has an unsupported compatibility state`);
    }
    row.policyDigest = digest(bindingBytes);
    delete row.policyPath;
  }

  const output = {
    schema: "product-profiles.v1",
    schemaVersion: 1,
    products: rows,
  };
  const generatedBytes = Buffer.from(`${JSON.stringify(output, null, 2)}\n`, "utf8");
  const generatedSchema = parseSchema(generatedSchemaBytes, GENERATED_SCHEMA_PATH);
  validateAgainstClosedSchema(output, generatedSchema, "GENERATED_SCHEMA_REFUSED");
  return generatedBytes;
}

function readPolicyInsideRoot(root, relativePath) {
  const canonical = canonicalPolicyPath(relativePath);
  const realRoot = realpathSync(root);
  const candidate = resolve(root, ...canonical.split("/"));
  if (!existsSync(candidate)) refuse("POLICY_PATH_REFUSED", `${canonical} does not exist`);
  const realCandidate = realpathSync(candidate);
  const delta = relative(realRoot, realCandidate);
  if (delta === "" || delta === ".." || delta.startsWith(`..${sep}`) || isAbsolute(delta)) {
    refuse("POLICY_PATH_REFUSED", `${canonical} escapes the repository root`);
  }
  return readFileSync(realCandidate);
}

function parseCli(argv) {
  let root = MODULE_ROOT;
  let mode = null;
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--root") {
      const value = argv[index + 1];
      if (typeof value !== "string" || value.length === 0) refuse("CLI_REFUSED", "--root requires a path");
      root = resolve(value);
      index += 1;
    } else if (token === "--write" || token === "--check") {
      if (mode !== null) refuse("CLI_REFUSED", "exactly one mode is required");
      mode = token;
    } else {
      refuse("CLI_REFUSED", `unknown argument ${token}`);
    }
  }
  if (mode === null) refuse("CLI_REFUSED", "--write or --check is required");
  return { root, mode };
}

function atomicWrite(path, bytes) {
  const temporary = resolve(dirname(path), `.${path.split(/[\\/]/).at(-1)}.${randomBytes(8).toString("hex")}.tmp`);
  try {
    writeFileSync(temporary, bytes, { flag: "wx" });
    renameSync(temporary, path);
  } finally {
    rmSync(temporary, { force: true });
  }
}

function main(argv) {
  const { root, mode } = parseCli(argv);
  const generated = generateProductProfiles(
    readFileSync(resolve(root, SOURCE_PATH)),
    (path) => readPolicyInsideRoot(root, path),
    {
      sourceSchemaBytes: readFileSync(resolve(root, SOURCE_SCHEMA_PATH)),
      generatedSchemaBytes: readFileSync(resolve(root, GENERATED_SCHEMA_PATH)),
    },
  );
  const outputPath = resolve(root, GENERATED_PATH);
  if (mode === "--check") {
    if (!existsSync(outputPath) || !readFileSync(outputPath).equals(generated)) {
      refuse("PRODUCT_REGISTRY_DRIFT", `${GENERATED_PATH} is missing or stale`);
    }
    process.stdout.write("product profile registry: PASS (fixed point)\n");
    return;
  }
  atomicWrite(outputPath, generated);
  process.stdout.write(`product profile registry: generated ${generated.byteLength} bytes\n`);
}

const isMain = process.argv[1] !== undefined
  && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
