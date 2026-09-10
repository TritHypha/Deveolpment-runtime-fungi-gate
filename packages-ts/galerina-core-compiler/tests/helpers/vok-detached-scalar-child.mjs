import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const REQUEST_SCHEMA = "slide.vok-detached-scalar-request.v1";
const OUTPUT_SCHEMA = "slide.vok-detached-scalar-receipt.v1";
const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const STAGES = Object.freeze([
  ["SOURCE", "galerina"],
  ["SNAPSHOT", "galerina"],
  ["GIR", "galerina"],
  ["PHYSICAL", "slide"],
  ["LYTH", "lyth"],
]);

function ownRecord(value, fields) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("record required");
  const keys = Object.keys(value);
  if (keys.length !== fields.length || keys.some((key) => !fields.includes(key))) throw new Error("fields refused");
  return value;
}

function deepFreeze(value) {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function framedDigest(domain, values) {
  const hash = createHash("sha256");
  hash.update(`${domain}\0`, "utf8");
  for (const value of values) {
    const bytes = Buffer.from(String(value), "utf8");
    const length = Buffer.allocUnsafe(4);
    length.writeUInt32BE(bytes.length, 0);
    hash.update(length);
    hash.update(bytes);
  }
  return `sha256:${hash.digest("hex")}`;
}

function stageReceipt(stage, owner, runIdentity, authorityEpoch, subjectDigest) {
  const fields = {
    schema: "slide.detached-scalar-stage-receipt.v3",
    stage,
    owner,
    runIdentity,
    authorityEpoch,
    subjectDigest,
  };
  return Object.freeze({
    ...fields,
    receiptDigest: framedDigest("slide.detached-scalar-stage-receipt.v3", Object.values(fields)),
  });
}

async function main() {
  const request = ownRecord(
    JSON.parse(readFileSync(0, "utf8")),
    ["schema", "slideRoot", "slideModuleRoot", "physicalReference", "manifest", "lythEvidence", "authorityEpoch"],
  );
  if (request.schema !== REQUEST_SCHEMA || typeof request.slideRoot !== "string" || typeof request.slideModuleRoot !== "string" || !Number.isSafeInteger(request.authorityEpoch) || request.authorityEpoch < 1) {
    throw new Error("VOK request refused");
  }
  const {
    bindDetachedScalarHostAuthority,
    deriveDetachedScalarContext,
    deriveDetachedScalarLythEvidenceDigest,
    executePreparedDetachedScalarVok,
    prepareDetachedScalarVok,
    verifyTypedPackageExecutionReceiptV3,
  } = await import(pathToFileURL(join(request.slideModuleRoot, "src", "typed-package-execution-receipt-v3.mjs")).href);
  const manifest = deepFreeze(request.manifest);
  const physicalReference = deepFreeze(request.physicalReference);
  const lythEvidence = deepFreeze(request.lythEvidence);
  const context = deriveDetachedScalarContext(manifest);
  if (context.kind !== "CONTEXT") throw new Error("manifest context refused");
  const lythDigest = deriveDetachedScalarLythEvidenceDigest(lythEvidence, manifest);
  if (!DIGEST.test(lythDigest)) throw new Error("Lyth evidence refused");
  const subjects = [
    manifest.sourceDigest,
    manifest.checkedSnapshotDigest,
    manifest.girDigest,
    manifest.physicalDigest,
    lythDigest,
  ];
  const receipts = deepFreeze(STAGES.map(([stage, owner], index) => stageReceipt(stage, owner, manifest.runIdentity, request.authorityEpoch, subjects[index])));
  const verifyStageReceipt = (receipt) => {
    try {
      const fields = ownRecord(receipt, ["schema", "stage", "owner", "runIdentity", "authorityEpoch", "subjectDigest", "receiptDigest"]);
      return fields.schema === "slide.detached-scalar-stage-receipt.v3"
        && STAGES.some(([stage, owner]) => fields.stage === stage && fields.owner === owner)
        && fields.runIdentity === manifest.runIdentity
        && fields.authorityEpoch === request.authorityEpoch
        && subjects.includes(fields.subjectDigest)
        && fields.receiptDigest === framedDigest("slide.detached-scalar-stage-receipt.v3", Object.values({
          schema: fields.schema,
          stage: fields.stage,
          owner: fields.owner,
          runIdentity: fields.runIdentity,
          authorityEpoch: fields.authorityEpoch,
          subjectDigest: fields.subjectDigest,
        }));
    } catch {
      return false;
    }
  };
  const bound = bindDetachedScalarHostAuthority(Object.freeze({
    authorityEpoch: request.authorityEpoch,
    currentAuthorityEpoch: request.authorityEpoch,
    acceptedTargetDigest: context.targetDigest,
    acceptedPolicyDigest: context.policyDigest,
    acceptedVerifierDigest: context.verifierDigest,
    verifyStageReceipt,
    isSubjectRevoked: () => false,
  }));
  if (bound.verdict !== 1) throw new Error("host authority refused");
  const physicalBytes = Uint8Array.from(await readFile(join(request.slideRoot, "physical-slide", physicalReference.digest.slice("sha256:".length))));
  const prepared = await prepareDetachedScalarVok({
    physicalReference,
    repository: Object.freeze({ read: async () => Uint8Array.from(physicalBytes) }),
    manifest,
    lythEvidence,
    authority: bound.handle,
    stageReceipts: receipts,
  });
  if (prepared.verdict !== 1) throw new Error(`VOK prepare refused: ${prepared.failureId}`);
  let cleanupCalled = false;
  const cleanup = () => {
    cleanupCalled = true;
    return true;
  };
  const executed = executePreparedDetachedScalarVok(prepared.handle, {
    arguments: Object.freeze([]),
    stepMaximum: 96,
    terminalDirective: "EXECUTE",
    cleanup,
  });
  if (executed.verdict !== 1) throw new Error(`VOK execute refused: ${executed.failureId}; cleanupCalled=${cleanupCalled}`);
  const verified = verifyTypedPackageExecutionReceiptV3(executed.receipt, {
    runIdentity: manifest.runIdentity,
    authorityEpoch: request.authorityEpoch,
    receiptDigest: executed.receipt.receiptDigest,
    physicalDigest: manifest.physicalDigest,
    status: "SUCCEEDED",
  });
  if (verified.verdict !== 1) throw new Error("VOK receipt verification refused");
  process.stdout.write(`${JSON.stringify({
    schema: OUTPUT_SCHEMA,
    status: executed.status,
    runIdentity: manifest.runIdentity,
    authorityEpoch: request.authorityEpoch,
    physicalDigest: manifest.physicalDigest,
    receiptDigest: executed.receipt.receiptDigest,
    vokReceiptDigest: verified.vokReceiptDigest,
    value: executed.value,
    failureId: executed.failureId,
    lythEvidenceDigest: lythDigest,
    authorityReleased: false,
  })}\n`);
}

try {
  await main();
} catch (error) {
  process.stderr.write(`${JSON.stringify({ schema: "slide.vok-detached-scalar-refusal.v1", failureId: error instanceof Error ? error.message : "INTERNAL" })}\n`);
  process.exit(2);
}
