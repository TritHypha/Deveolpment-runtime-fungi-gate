import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

const REQUEST_SCHEMA = "galerina.slide-detached-scalar-request.v1";
const OUTPUT_SCHEMA = "galerina.slide-detached-scalar-handoff.v1";
const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const KINDS = Object.freeze({
  "canonical-gir": "canonical-gir",
});

function ownRecord(value, fields) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("request object required");
  const keys = Object.keys(value);
  if (keys.length !== fields.length || keys.some((key) => !fields.includes(key))) throw new Error("request fields refused");
  return value;
}

function digestBytes(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function hexDigest(digest) {
  if (typeof digest !== "string" || !DIGEST.test(digest)) throw new Error("digest refused");
  return digest.slice("sha256:".length);
}

async function readOwned(root, reference) {
  const fields = ownRecord(reference, ["schema", "owner", "kind", "digest", "byteLength"]);
  if (
    fields.schema !== "galerina.artifact-reference.v1"
    || fields.owner !== "galerina"
    || fields.kind !== KINDS[fields.kind]
    || !Number.isSafeInteger(fields.byteLength)
    || fields.byteLength < 1
  ) throw new Error("GIR reference refused");
  const bytes = Uint8Array.from(await readFile(join(root, fields.kind, hexDigest(fields.digest))));
  if (bytes.byteLength !== fields.byteLength || digestBytes(bytes) !== fields.digest) throw new Error("GIR bytes do not match reference");
  return bytes;
}

async function main() {
  const request = ownRecord(
    JSON.parse(readFileSync(0, "utf8")),
    [
      "schema", "galerinaRoot", "slideRoot", "girReference", "sourceDigest",
      "checkedSnapshotDigest", "runIdentity", "executionPolicyDigest",
      "artifactId", "entryFunctionId", "slideModuleRoot",
    ],
  );
  if (
    request.schema !== REQUEST_SCHEMA
    || typeof request.galerinaRoot !== "string"
    || typeof request.slideRoot !== "string"
    || typeof request.slideModuleRoot !== "string"
    || !DIGEST.test(request.sourceDigest)
    || !DIGEST.test(request.checkedSnapshotDigest)
    || !DIGEST.test(request.runIdentity)
    || !DIGEST.test(request.executionPolicyDigest)
    || typeof request.artifactId !== "string"
    || !Number.isSafeInteger(request.entryFunctionId)
  ) throw new Error("SLIDE request refused");

  const girBytes = await readOwned(request.galerinaRoot, request.girReference);
  const girReference = Object.freeze({ ...request.girReference });
  const [{ compileDetachedCanonicalGirToScalarSlide }, { planRepresentationProfile }] = await Promise.all([
    import(pathToFileURL(join(request.slideModuleRoot, "src", "checked-module-snapshot-scalar-compiler.mjs")).href),
    import(pathToFileURL(join(request.slideModuleRoot, "src", "representation-profile-registry.mjs")).href),
  ]);
  const profilePlan = planRepresentationProfile({
    preferredProfileIds: ["trit.scalar.v1"],
    availableTargetIds: ["slide.serial-reference-coordinator.v1"],
    availableProviderIds: ["slide.scalar-js-reference-provider.v1"],
  });
  if (profilePlan.kind !== "CANDIDATE_PLAN") throw new Error("SLIDE profile refused");
  const compiled = await compileDetachedCanonicalGirToScalarSlide({
    girReference,
    repository: Object.freeze({ read: async () => Uint8Array.from(girBytes) }),
    profilePlan,
    runIdentity: request.runIdentity,
    sourceDigest: request.sourceDigest,
    checkedSnapshotDigest: request.checkedSnapshotDigest,
    executionPolicyDigest: request.executionPolicyDigest,
    artifactId: request.artifactId,
    entryFunctionId: request.entryFunctionId,
  });
  if (compiled.kind !== "PHYSICAL_SLIDE") throw new Error(`SLIDE compile refused: ${compiled.failureId ?? "unknown"}`);
  const physicalBytes = Uint8Array.from(compiled.physicalBytes);
  const physicalPath = join(request.slideRoot, "physical-slide", hexDigest(compiled.physicalReference.digest));
  await mkdir(dirname(physicalPath), { recursive: true });
  await writeFile(physicalPath, physicalBytes);
  process.stdout.write(`${JSON.stringify({
    schema: OUTPUT_SCHEMA,
    manifest: compiled.manifest,
    physicalReference: compiled.physicalReference,
    profilePlanDigest: profilePlan.planDigest,
    actionDag: compiled.actionDag,
    workEvidence: compiled.workEvidence,
    preparation: compiled.preparation,
    authorityReleased: false,
  })}\n`);
}

try {
  await main();
} catch (error) {
  process.stderr.write(`${JSON.stringify({ schema: "galerina.slide-detached-scalar-refusal.v1", failureId: error instanceof Error ? error.message : "INTERNAL" })}\n`);
  process.exit(2);
}
