import { createHash } from "node:crypto";

const RESERVED_IDENTIFIERS = new Set([
  "version", "flow", "FLOW", "secure", "pure", "guarded", "privileged", "unsafe", "experimental",
  "fn", "route", "effects", "with", "intent", "governance", "api", "package",
  "authority", "policy", "guard", "access", "gate", "static", "bitfield",
  "let", "mut", "readonly", "match", "if", "else", "return", "while", "for", "where",
  "type", "record", "enum", "import", "use", "borrow", "move", "pinned",
  "block", "fallback", "reason", "safe", "validated", "unvalidated",
  "tainted", "secret", "protected", "redacted", "compute", "target", "prefer",
  "contract", "emit", "emits", "event", "types", "resource", "hallmark", "const",
  "and", "or", "unless", "is", "flip", "all", "any", "when", "trap", "governed",
  "assimilate", "check", "fault", "vault", "prefilter", "deny", "ambig", "maybe", "audit",
  "shared", "transfer", "atomic", "barrier", "async", "await", "yield", "comptime", "macro",
  "trait", "impl", "loop", "break", "continue", "until",
  "Bool", "Int", "String", "Verdict", "Result", "Option", "Array",
  "true", "false", "Ok", "Err", "Some", "None", "Allow", "Deny", "Unknown",
]);

function assertSource(source) {
  if (typeof source !== "string" || source.length === 0) {
    throw new TypeError("Fungi fingerprint source must be nonempty text");
  }
  return source;
}

function protectQuotedLiterals(source) {
  const literals = [];
  let protectedSource = "";
  for (let index = 0; index < source.length;) {
    const quote = source[index];
    if (quote !== '"' && quote !== "'") {
      protectedSource += quote;
      index += 1;
      continue;
    }
    const start = index;
    index += 1;
    let escaped = false;
    while (index < source.length) {
      const character = source[index++];
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) break;
    }
    const literalIndex = literals.push(source.slice(start, index)) - 1;
    protectedSource += `\uE000${literalIndex}\uE001`;
  }
  return Object.freeze({
    protectedSource,
    restore(value) {
      return value.replace(/\uE000(\d+)\uE001/gu, (_match, literalIndex) => literals[Number(literalIndex)]);
    },
  });
}

function canonicalizeIdentifiers(source) {
  const identifiers = new Map();
  return source.replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/gu, (identifier) => {
    if (RESERVED_IDENTIFIERS.has(identifier) || /^[A-Z]/u.test(identifier)) return identifier;
    let replacement = identifiers.get(identifier);
    if (replacement === undefined) {
      replacement = `ID${identifiers.size}`;
      identifiers.set(identifier, replacement);
    }
    return replacement;
  });
}

function sha256(source) {
  return createHash("sha256").update(source, "utf8").digest("hex");
}

export function exactFungiFingerprint(source) {
  return sha256(assertSource(source));
}

export function alphaFungiFingerprint(source) {
  const protectedLiterals = protectQuotedLiterals(assertSource(source));
  const normalized = protectedLiterals.restore(canonicalizeIdentifiers(protectedLiterals.protectedSource
    .replace(/^\uFEFF/u, "")
    .replace(/\/\*[\s\S]*?\*\//gu, " ")
    .replace(/^\s*\/\/.*$/gmu, " ")
    .replace(/\b((?:pure|secure)\s+)?flow\s+[A-Za-z_][A-Za-z0-9_]*/gu, (match) =>
      match.replace(/([A-Za-z_][A-Za-z0-9_]*)$/u, "FLOW"))
    .replace(/\s+/gu, " ")
    .trim()));
  if (normalized.length === 0) {
    throw new Error("Fungi duplication check found an empty executable source");
  }
  return sha256(normalized);
}

export function findFungiCollision(candidateSource, corpus) {
  if (!Array.isArray(corpus)) throw new TypeError("Fungi collision corpus must be an array");
  const exact = exactFungiFingerprint(candidateSource);
  const shadow = alphaFungiFingerprint(candidateSource);
  for (const item of corpus) {
    if (item === null || typeof item !== "object" || typeof item.path !== "string" || typeof item.source !== "string") {
      throw new TypeError("Fungi collision corpus entries must contain path and source text");
    }
    if (exactFungiFingerprint(item.source) === exact) {
      return Object.freeze({ kind: "EXACT_DUPLICATE", path: item.path });
    }
    if (alphaFungiFingerprint(item.source) === shadow) {
      return Object.freeze({ kind: "ALPHA_SHADOW", path: item.path });
    }
  }
  return undefined;
}
