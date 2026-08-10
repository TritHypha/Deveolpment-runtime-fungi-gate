export class StrictJsonRefusal extends Error {
  constructor(code, detail) {
    super(detail);
    this.code = code;
  }
}

function refuse(code, detail) {
  throw new StrictJsonRefusal(code, detail);
}

function rejectDuplicateDecodedKeys(text, label) {
  const stack = [];
  let index = 0;
  while (index < text.length) {
    const character = text[index];
    if (character === '"') {
      let end = index + 1;
      while (end < text.length) {
        if (text[end] === "\\") {
          end += 2;
          continue;
        }
        if (text[end] === '"') break;
        end += 1;
      }
      if (end >= text.length) refuse("STRICT_JSON_SYNTAX", `${label} has an unterminated string`);
      const top = stack.at(-1);
      if (top?.kind === "object" && top.expectKey) {
        let key;
        try {
          key = JSON.parse(text.slice(index, end + 1));
        } catch {
          refuse("STRICT_JSON_SYNTAX", `${label} contains a malformed object key`);
        }
        if (top.keys.has(key)) {
          refuse("STRICT_JSON_DUPLICATE", `${label} contains duplicate decoded key ${JSON.stringify(key)}`);
        }
        top.keys.add(key);
        top.expectKey = false;
      }
      index = end + 1;
      continue;
    }
    if (character === "{") stack.push({ kind: "object", keys: new Set(), expectKey: true });
    else if (character === "[") stack.push({ kind: "array" });
    else if (character === "}" || character === "]") stack.pop();
    else if (character === ",") {
      const top = stack.at(-1);
      if (top?.kind === "object") top.expectKey = true;
    }
    index += 1;
  }
}

export function parseStrictJsonBytes(bytes, { label, maxBytes }) {
  if ((!Buffer.isBuffer(bytes) && !(bytes instanceof Uint8Array))
      || typeof label !== "string" || label.length === 0
      || !Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 67_108_864) {
    throw new TypeError("strict JSON requires bytes, a label and a bounded positive byte limit");
  }
  if (bytes.byteLength < 1 || bytes.byteLength > maxBytes) {
    refuse("STRICT_JSON_BOUNDS", `${label} byte length is outside the closed bounds`);
  }
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    refuse("STRICT_JSON_UTF8", `${label} is not canonical UTF-8`);
  }
  rejectDuplicateDecodedKeys(text, label);
  try {
    return JSON.parse(text);
  } catch {
    refuse("STRICT_JSON_SYNTAX", `${label} is not valid JSON`);
  }
}
