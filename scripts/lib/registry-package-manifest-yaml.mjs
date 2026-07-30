const TOP_LEVEL_FIELDS = new Set([
  "schema",
  "name",
  "version",
  "registry",
  "description",
  "artifactProfile",
  "artifactFiles",
  "capabilities",
  "effects",
  "targets",
  "installScript",
  "hash",
  "signature",
  "publisher",
  "keyId",
  "signerKeyId",
  "certificationLevel",
  "riskRating",
  "governance",
]);

const LIST_FIELDS = new Set([
  "artifactFiles",
  "capabilities",
  "effects",
  "targets",
]);

const GOVERNANCE_FIELDS = new Set([
  "reviewed",
  "reviewedBy",
  "reviewedAt",
  "notes",
  "complianceFramework",
]);

const TOP_LEVEL_ORDER = [
  "schema",
  "name",
  "version",
  "registry",
  "description",
  "artifactProfile",
  "artifactFiles",
  "capabilities",
  "effects",
  "targets",
  "installScript",
  "hash",
  "publisher",
  "keyId",
  "signerKeyId",
  "certificationLevel",
  "riskRating",
  "signature",
  "governance",
];

const GOVERNANCE_ORDER = [
  "reviewed",
  "reviewedBy",
  "reviewedAt",
  "notes",
  "complianceFramework",
];

function parseScalar(value, lineNumber) {
  const text = value.trim();
  if (text === "null") return null;
  if (text === "true") return true;
  if (text === "false") return false;
  if (text.startsWith("\"")) {
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed !== "string") throw new Error("not a string");
      return parsed;
    } catch {
      throw new Error(
        `REFUSED: manifest line ${lineNumber} has an invalid quoted scalar.`,
      );
    }
  }
  if (/^'(?:[^']|'')*'$/u.test(text)) {
    return text.slice(1, -1).replaceAll("''", "'");
  }
  if (/^[A-Za-z0-9@._:+/-]+$/u.test(text)) return text;
  throw new Error(
    `REFUSED: manifest line ${lineNumber} has a non-literal scalar.`,
  );
}

export function parseManifest(text) {
  if (typeof text !== "string") {
    throw new Error("REFUSED: package manifest must be UTF-8 text.");
  }
  const out = { governance: {} };
  const seenTop = new Set();
  const seenGovernance = new Set();
  let listKey = null;
  let inGovernance = false;
  for (const [offset, raw] of text.split(/\r?\n/u).entries()) {
    const lineNumber = offset + 1;
    if (raw.trim().length === 0 || raw.trimStart().startsWith("#")) continue;
    if (raw.includes("\t") || /\s+#/u.test(raw)) {
      throw new Error(
        `REFUSED: manifest line ${lineNumber} uses ambiguous whitespace or an inline comment.`,
      );
    }
    const listItem = /^ {2}- (.+)$/u.exec(raw);
    if (listItem !== null) {
      if (listKey === null) {
        throw new Error(
          `REFUSED: manifest line ${lineNumber} has an unowned list item.`,
        );
      }
      out[listKey].push(parseScalar(listItem[1], lineNumber));
      continue;
    }
    const governanceField =
      /^ {2}([A-Za-z][A-Za-z0-9]*): (.+)$/u.exec(raw);
    if (governanceField !== null) {
      const key = governanceField[1];
      if (!inGovernance || !GOVERNANCE_FIELDS.has(key)) {
        throw new Error(
          `REFUSED: manifest line ${lineNumber} has an unsupported nested field.`,
        );
      }
      if (seenGovernance.has(key)) {
        throw new Error(`REFUSED: manifest repeats governance.${key}.`);
      }
      seenGovernance.add(key);
      out.governance[key] = parseScalar(governanceField[2], lineNumber);
      continue;
    }
    const top = /^([A-Za-z][A-Za-z0-9]*):(?: (.*))?$/u.exec(raw);
    if (top === null) {
      throw new Error(
        `REFUSED: manifest line ${lineNumber} is outside the admitted YAML subset.`,
      );
    }
    const key = top[1];
    const value = top[2];
    if (!TOP_LEVEL_FIELDS.has(key)) {
      throw new Error(`REFUSED: manifest has unsupported field '${key}'.`);
    }
    if (seenTop.has(key)) {
      throw new Error(`REFUSED: manifest repeats top-level field '${key}'.`);
    }
    seenTop.add(key);
    inGovernance = key === "governance";
    listKey = null;
    if (inGovernance) {
      if (value !== undefined && value.length > 0) {
        throw new Error("REFUSED: governance must be a nested mapping.");
      }
      continue;
    }
    if (LIST_FIELDS.has(key)) {
      if (value !== undefined && value.length > 0) {
        throw new Error(`REFUSED: manifest ${key} must be a block list.`);
      }
      out[key] = [];
      listKey = key;
      continue;
    }
    if (value === undefined || value.length === 0) {
      throw new Error(`REFUSED: manifest scalar '${key}' is missing.`);
    }
    out[key] = parseScalar(value, lineNumber);
  }
  return out;
}

export function canonicalUtcInstant(value, label) {
  if (
    typeof value !== "string"
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)
    || new Date(value).toISOString() !== value
  ) {
    throw new Error(
      `REFUSED: ${label} must be a canonical UTC instant with milliseconds.`,
    );
  }
  return value;
}

export function assertReviewAtOrBefore(manifest, authorityAt) {
  const reviewedAt = canonicalUtcInstant(
    manifest?.governance?.reviewedAt,
    "governance.reviewedAt",
  );
  const verifiedAt = canonicalUtcInstant(authorityAt, "authority-at");
  if (Date.parse(reviewedAt) > Date.parse(verifiedAt)) {
    throw new Error(
      "REFUSED: governance.reviewedAt is later than authority-at.",
    );
  }
}

function scalar(value, field) {
  if (value === null) return "null";
  if (value === true) return "true";
  if (value === false) return "false";
  if (typeof value === "string") return JSON.stringify(value);
  throw new Error(
    `REFUSED: manifest field '${field}' cannot be represented in the admitted YAML subset.`,
  );
}

export function stringifyManifest(manifest) {
  if (typeof manifest !== "object" || manifest === null) {
    throw new Error("REFUSED: package manifest must be an object.");
  }
  for (const key of Object.keys(manifest)) {
    if (!TOP_LEVEL_FIELDS.has(key)) {
      throw new Error(`REFUSED: manifest has unsupported field '${key}'.`);
    }
  }
  const lines = [];
  for (const field of TOP_LEVEL_ORDER) {
    if (!(field in manifest)) continue;
    const value = manifest[field];
    if (LIST_FIELDS.has(field)) {
      if (!Array.isArray(value)) {
        throw new Error(`REFUSED: manifest ${field} must be a block list.`);
      }
      lines.push(`${field}:`);
      for (const item of value) {
        lines.push(`  - ${scalar(item, field)}`);
      }
      continue;
    }
    if (field === "governance") {
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new Error("REFUSED: governance must be a nested mapping.");
      }
      for (const key of Object.keys(value)) {
        if (!GOVERNANCE_FIELDS.has(key)) {
          throw new Error(
            `REFUSED: manifest has unsupported governance field '${key}'.`,
          );
        }
      }
      lines.push("governance:");
      for (const key of GOVERNANCE_ORDER) {
        if (key in value) {
          lines.push(`  ${key}: ${scalar(value[key], `governance.${key}`)}`);
        }
      }
      continue;
    }
    lines.push(`${field}: ${scalar(value, field)}`);
  }
  return `${lines.join("\n")}\n`;
}
