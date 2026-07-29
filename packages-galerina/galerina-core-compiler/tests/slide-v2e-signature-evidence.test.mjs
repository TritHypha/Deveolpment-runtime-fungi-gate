import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign as signEd25519 } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { before, describe, it } from "node:test";

import { checkTypes, executeFlow, parseProgram } from "../dist/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const SELF_HOSTED = join(HERE, "..", "src", "self-hosted");
const FILES = [
  "slide-v2a-logical-model.fungi",
  "slide-v2a-validator.fungi",
  "slide-v2a-cbor-encoder.fungi",
  "slide-v2a-cbor-importer.fungi",
  "slide-v2c-aggregate-model.fungi",
  "slide-v2c-aggregate-validator.fungi",
  "slide-v2c-executable-model.fungi",
  "slide-v2c-executable-validator.fungi",
  "slide-v2c-cbor-importer.fungi",
  "slide-v2d-memory-model.fungi",
  "slide-v2d-memory-validator.fungi",
  "slide-v2d-executable-model.fungi",
  "slide-v2d-executable-validator.fungi",
  "slide-v2d-cbor-validator.fungi",
  "slide-v2d-cbor-importer.fungi",
  "slide-v2d-semantic-digest.fungi",
  "slide-v2e-frontend-schema.fungi",
  "slide-v2e-frontend-model.fungi",
  "slide-v2e-frontend-validator.fungi",
  "slide-v2e-cbor-importer.fungi",
];
const SIGNATURE_SOURCE = "slide-v2e-signature-evidence.fungi";

let parsed;
let verifyHybridSignature;
let sourceText;
let semanticBody;
let receiptBytes;
let ed25519;
let mlDsa65;
let mlDsaKeys;
let candidate;
let policy;
let authenticReceipt;

function field(record, name) {
  assert.equal(record.__tag, "record");
  const value = record.fields.get(name);
  assert.ok(value, `missing field ${name}`);
  return value;
}

const vString = (value) => ({ __tag: "string", value });
const vInt = (value) => ({ __tag: "int", value });
const vBool = (value) => ({ __tag: "bool", value });
const vBytes = (value) => ({ __tag: "bytes", value });
const vRecord = (fields) => ({
  __tag: "record",
  fields: new Map(Object.entries(fields)),
});

function externalEvidence() {
  return vRecord({
    compilerArtifactDigest: vString("c".repeat(64)),
    diagnosticSetDigest: vString("d".repeat(64)),
    corpusDigest: vString("e".repeat(64)),
    vectorSetDigest: vString("f".repeat(64)),
    buildActionRootDigest: vString("a".repeat(64)),
    toolchainLockDigest: vString("b".repeat(64)),
    environmentContractDigest: vString("9".repeat(64)),
  });
}

async function run(flowName, args = new Map()) {
  return executeFlow(
    flowName,
    args,
    parsed.ast,
    parsed.flows,
    undefined,
    undefined,
    { pureFastPath: false },
  );
}

function receiptDigest(bytes) {
  return createHash("sha256")
    .update(Buffer.from("slide.frontend.galerina.v1\0", "utf8"))
    .update(bytes)
    .digest("hex");
}

function signingInput(bytes) {
  return Buffer.concat([
    Buffer.from("slide.frontend.galerina.v1\0", "utf8"),
    Buffer.from(bytes),
  ]);
}

function signedCandidate(bytes = receiptBytes, overrides = {}) {
  const input = signingInput(bytes);
  return {
    schemaId: "slide.frontend.signature.v1",
    signatureSuiteId: 1,
    signerRoleId: 2,
    keyClassId: 1,
    keyId: "slide-v2e-development-key-1",
    canonicalBytes: bytes,
    receiptDigest: receiptDigest(bytes),
    ed25519Signature: new Uint8Array(
      signEd25519(null, input, ed25519.privateKey),
    ),
    mlDsa65Signature: mlDsa65.sign(input, mlDsaKeys.secretKey, {
      context: new TextEncoder().encode("slide.frontend.galerina.v1"),
    }),
    ...overrides,
  };
}

function fungiVerifierReceipt(value) {
  return vRecord({
    schemaId: vString(value.schemaId),
    verifierId: vString(value.verifierId),
    signatureSuiteId: vInt(value.signatureSuiteId),
    signerRoleId: vInt(value.signerRoleId),
    keyClassId: vInt(value.keyClassId),
    keyId: vString(value.keyId),
    subjectReceiptDigest: vString(value.subjectReceiptDigest),
    signatureDigest: vString(value.signatureDigest),
    verdict: { __tag: "verdict", value: value.verdict },
    verifiedAt: vInt(value.verifiedAt),
    evidenceDigest: vString(value.evidenceDigest),
  });
}

async function importReceipt(bytes = receiptBytes) {
  const result = await run(
    "verifySLIDEV2ECanonicalReceipt",
    new Map([
      ["receiptBytes", vBytes(bytes)],
      ["sourceText", vString(sourceText)],
      ["semanticBody", vBytes(semanticBody)],
      ["expectedExternalEvidence", externalEvidence()],
    ]),
  );
  assert.equal(result.audit.result, "ok", JSON.stringify(result.audit));
  return result.value;
}

async function validateSignature(
  imported,
  verifierReceipt,
  productionPolicy = false,
  validationTime = policy.verifiedAt,
  maximumEvidenceAge = 300,
) {
  const result = await run(
    "validateSLIDEV2EProducerSignatureEvidence",
    new Map([
      ["imported", imported],
      ["verifierReceipt", fungiVerifierReceipt(verifierReceipt)],
      ["productionPolicy", vBool(productionPolicy)],
      ["expectedKeyId", vString(policy.expectedKeyId)],
      ["validationTime", vInt(validationTime)],
      ["maximumEvidenceAge", vInt(maximumEvidenceAge)],
    ]),
  );
  assert.equal(result.audit.result, "ok", JSON.stringify(result.audit));
  return result.value;
}

function mutateUniqueAscii(bytes, text) {
  const value = bytes.slice();
  const needle = Buffer.from(text, "utf8");
  let found = -1;
  for (let i = 0; i <= value.length - needle.length; i += 1) {
    if (needle.every((byte, offset) => value[i + offset] === byte)) {
      assert.equal(found, -1);
      found = i;
    }
  }
  assert.notEqual(found, -1);
  value[found] = value[found] === 0x30 ? 0x31 : 0x30;
  return value;
}

before(async () => {
  const compiler = await import("../dist/index.js");
  verifyHybridSignature = compiler.verifySLIDEV2EHybridFrontendSignature;
  assert.equal(
    typeof verifyHybridSignature,
    "function",
    "V2-E host-crypto primitive is not implemented",
  );

  sourceText = await readFile(join(HERE, "fixtures", "slide-v2e-source.fungi"), "utf8");
  receiptBytes = Uint8Array.from(
    Buffer.from(
      (await readFile(join(HERE, "fixtures", "slide-v2e-receipt.cbor.hex"), "utf8")).trim(),
      "hex",
    ),
  );
  const sources = await Promise.all(
    FILES.map((name) => readFile(join(SELF_HOSTED, name), "utf8")),
  );
  try {
    sources.push(await readFile(join(SELF_HOSTED, SIGNATURE_SOURCE), "utf8"));
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  const combined = sources
    .map((source, index) =>
      index === 0 ? source : source.replace(/^@version 1\r?\n/, ""),
    )
    .join("\n");
  parsed = parseProgram(combined, SIGNATURE_SOURCE, { requireVersionHeader: true });
  assert.deepEqual(
    parsed.diagnostics.filter((item) => item.severity === "error"),
    [],
  );
  assert.deepEqual(
    checkTypes(parsed.ast).diagnostics.filter(
      (item) => item.severity === "error",
    ),
    [],
  );
  assert.ok(
    parsed.flows.some(
      (flow) => flow.name === "validateSLIDEV2EProducerSignatureEvidence",
    ),
    "V2-E .fungi signature-evidence policy is not implemented",
  );
  semanticBody = (await run("slideV2DCanonicalReferenceBytes")).value.value;

  ed25519 = generateKeyPairSync("ed25519", {
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  ({ ml_dsa65: mlDsa65 } = await import("@noble/post-quantum/ml-dsa.js"));
  mlDsaKeys = mlDsa65.keygen(
    Uint8Array.from({ length: 32 }, (_, index) => index + 31),
  );
  candidate = signedCandidate();
  policy = {
    expectedKeyId: candidate.keyId,
    ed25519PublicKeyPem: ed25519.publicKey,
    mlDsa65PublicKey: mlDsaKeys.publicKey,
    revokedKeyIds: new Set(),
    verifiedAt: 2001,
    productionPolicy: false,
  };
  authenticReceipt = await verifyHybridSignature(candidate, policy);
  assert.equal(authenticReceipt.verdict, 1);
});

describe("SLIDE V2-E producer signature evidence", () => {
  it("requires both registered signatures and remains non-authorizing", async () => {
    const derived = await run(
      "deriveSLIDEV2EVerifierEvidenceDigest",
      new Map([
        ["receipt", fungiVerifierReceipt(authenticReceipt)],
        ["productionPolicy", vBool(false)],
      ]),
    );
    assert.equal(
      derived.value.value,
      authenticReceipt.evidenceDigest,
      `${derived.value.value} != ${authenticReceipt.evidenceDigest}`,
    );
    const admitted = await validateSignature(
      await importReceipt(),
      authenticReceipt,
    );
    assert.equal(
      field(field(admitted, "decision"), "verdict").value,
      1,
      field(field(admitted, "decision"), "detail").value,
    );
    assert.equal(field(admitted, "producerVerified").value, true);
    assert.equal(
      field(admitted, "receiptDigest").value,
      receiptDigest(receiptBytes),
    );
    assert.equal(field(admitted, "authorityReleased").value, false);
  });

  for (const [name, makeCandidate, makePolicy] of [
    [
      "wrong signature suite",
      () => ({ ...candidate, signatureSuiteId: 2 }),
      () => policy,
    ],
    [
      "wrong key identity",
      () => ({ ...candidate, keyId: "slide-v2e-development-key-other" }),
      () => policy,
    ],
    [
      "revoked key identity",
      () => candidate,
      () => ({ ...policy, revokedKeyIds: new Set([candidate.keyId]) }),
    ],
    [
      "malformed signature shape",
      () => ({ ...candidate, ed25519Signature: new Uint8Array(63) }),
      () => policy,
    ],
  ]) {
    it(`refuses ${name}`, async () => {
      const cryptoReceipt = await verifyHybridSignature(
        makeCandidate(),
        makePolicy(),
      );
      assert.equal(cryptoReceipt.verdict, -1);
      const refused = await validateSignature(
        await importReceipt(),
        cryptoReceipt,
      );
      assert.equal(field(field(refused, "decision"), "verdict").value, -1);
      assert.equal(field(refused, "producerVerified").value, false);
      assert.equal(field(refused, "authorityReleased").value, false);
    });
  }

  it("refuses an ML-DSA signature made under the wrong context", async () => {
    const input = signingInput(receiptBytes);
    const wrongContextCandidate = {
      ...candidate,
      mlDsa65Signature: mlDsa65.sign(input, mlDsaKeys.secretKey, {
        context: new TextEncoder().encode("slide.capability.lease.v2b"),
      }),
    };
    const cryptoReceipt = await verifyHybridSignature(
      wrongContextCandidate,
      policy,
    );
    assert.equal(cryptoReceipt.verdict, -1);
    const refused = await validateSignature(
      await importReceipt(),
      cryptoReceipt,
    );
    assert.equal(field(field(refused, "decision"), "verdict").value, -1);
    assert.equal(field(refused, "authorityReleased").value, false);
  });

  for (const [name, malformedCandidate, malformedPolicy] of [
    ["missing candidate fields", () => ({}), () => policy],
    [
      "missing signature bytes",
      () => ({ ...candidate, ed25519Signature: undefined }),
      () => policy,
    ],
    [
      "missing revocation policy",
      () => candidate,
      () => ({ ...policy, revokedKeyIds: undefined }),
    ],
  ]) {
    it(`returns terminal denial for runtime-malformed ${name}`, async () => {
      const cryptoReceipt = await verifyHybridSignature(
        malformedCandidate(),
        malformedPolicy(),
      );
      assert.equal(cryptoReceipt.verdict, -1);
      assert.equal(cryptoReceipt.schemaId, "slide.frontend.crypto-verifier-receipt.v1");
      assert.equal(cryptoReceipt.evidenceDigest.length, 64);
    });
  }

  for (const [name, mutate] of [
    ["wrong verifier schema", (value) => {
      value.schemaId = "slide.frontend.crypto-verifier-receipt.v0";
    }],
    ["wrong verifier identity", (value) => {
      value.verifierId = "slide.crypto.frontend-unknown.v1";
    }],
    ["wrong verifier suite", (value) => {
      value.signatureSuiteId = 2;
    }],
    ["wrong verifier role", (value) => {
      value.signerRoleId = 1;
    }],
    ["wrong verifier key", (value) => {
      value.keyId = "slide-v2e-development-key-other";
    }],
    ["wrong verifier subject", (value) => {
      value.subjectReceiptDigest = "0".repeat(64);
    }],
    ["malformed signature digest", (value) => {
      value.signatureDigest = "0";
    }],
    ["lying evidence digest", (value) => {
      value.evidenceDigest = "0".repeat(64);
    }],
  ]) {
    it(`refuses ${name} typed evidence`, async () => {
      const changed = { ...authenticReceipt };
      mutate(changed);
      const refused = await validateSignature(
        await importReceipt(),
        changed,
      );
      assert.equal(field(field(refused, "decision"), "verdict").value, -1);
      assert.equal(field(refused, "producerVerified").value, false);
      assert.equal(field(refused, "receiptDigest").value, "");
      assert.equal(field(refused, "authorityReleased").value, false);
    });
  }

  it("refuses stale verifier evidence", async () => {
    const refused = await validateSignature(
      await importReceipt(),
      authenticReceipt,
      false,
      policy.verifiedAt + 301,
      300,
    );
    assert.equal(field(field(refused, "decision"), "verdict").value, -1);
    assert.equal(field(refused, "producerVerified").value, false);
    assert.equal(field(refused, "authorityReleased").value, false);
  });

  for (const [name, mutate] of [
    ["Ed25519 tamper", (value) => {
      value.ed25519Signature = value.ed25519Signature.slice();
      value.ed25519Signature[0] ^= 1;
    }],
    ["ML-DSA tamper", (value) => {
      value.mlDsa65Signature = value.mlDsa65Signature.slice();
      value.mlDsa65Signature[0] ^= 1;
    }],
    ["wrong role", (value) => {
      value.signerRoleId = 1;
    }],
    ["wrong subject digest", (value) => {
      value.receiptDigest = "0".repeat(64);
    }],
  ]) {
    it(`refuses ${name}`, async () => {
      const changed = { ...candidate };
      mutate(changed);
      const cryptoReceipt = await verifyHybridSignature(changed, policy);
      assert.equal(cryptoReceipt.verdict, -1);
      const refused = await validateSignature(
        await importReceipt(),
        cryptoReceipt,
      );
      assert.equal(field(field(refused, "decision"), "verdict").value, -1);
      assert.equal(field(refused, "producerVerified").value, false);
      assert.equal(field(refused, "receiptDigest").value, "");
      assert.equal(field(refused, "authorityReleased").value, false);
    });
  }

  it("refuses unavailable key evidence as unresolved", async () => {
    const cryptoReceipt = await verifyHybridSignature(candidate, {
      ...policy,
      ed25519PublicKeyPem: undefined,
    });
    assert.equal(cryptoReceipt.verdict, 0);
    const refused = await validateSignature(
      await importReceipt(),
      cryptoReceipt,
    );
    assert.equal(field(field(refused, "decision"), "verdict").value, -1);
    assert.equal(field(refused, "producerVerified").value, false);
  });

  it("rejects a development key under production policy", async () => {
    const cryptoReceipt = await verifyHybridSignature(candidate, {
      ...policy,
      productionPolicy: true,
    });
    assert.equal(cryptoReceipt.verdict, -1);
    const refused = await validateSignature(
      await importReceipt(),
      cryptoReceipt,
      true,
    );
    assert.equal(field(field(refused, "decision"), "verdict").value, -1);
    assert.equal(field(refused, "authorityReleased").value, false);
  });

  it("rejects an authentic signature over a lying plan", async () => {
    const lyingBytes = mutateUniqueAscii(
      receiptBytes,
      "639187103d9ac43677c2fbd698b1f92915a738d73bf7c8e9005a8a73855e90a0",
    );
    const lyingCandidate = signedCandidate(lyingBytes);
    const cryptoReceipt = await verifyHybridSignature(lyingCandidate, policy);
    assert.equal(cryptoReceipt.verdict, 1, "signature itself must be authentic");
    const imported = await importReceipt(lyingBytes);
    assert.equal(field(field(imported, "decision"), "verdict").value, -1);
    const refused = await validateSignature(imported, cryptoReceipt);
    assert.equal(field(field(refused, "decision"), "verdict").value, -1);
    assert.equal(field(refused, "producerVerified").value, false);
    assert.equal(field(refused, "receiptDigest").value, "");
    assert.equal(field(refused, "authorityReleased").value, false);
  });
});
