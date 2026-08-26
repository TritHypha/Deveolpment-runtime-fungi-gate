import { fileURLToPath } from "node:url";

import { admitVerifiedNativeOperationEvidence } from "../../src/verified-native-operation-adapter.mjs";
import { verifyMillionIterationSourcePair } from "../../src/million-iteration-source-pair.mjs";

const EVIDENCE = fileURLToPath(new URL(
  "../../evidence/slide-verified-native-operation-reference.json",
  import.meta.url,
));
const MANIFEST = fileURLToPath(new URL(
  "../../contracts/million-iteration-source-pair-v1.json",
  import.meta.url,
));
const REPOSITORY_ROOT = fileURLToPath(new URL("../../../../", import.meta.url));

export async function runSlideReferenceBenchmark(hostFacts) {
  const sourcePair = await verifyMillionIterationSourcePair({
    repositoryRoot: REPOSITORY_ROOT,
    manifestPath: MANIFEST,
  });
  if (sourcePair.verdict !== 1) {
    return Object.freeze({
      verdict: -1,
      failureId: sourcePair.failureId,
      sourcePair,
      referenceOnly: true,
      authorityReleased: false,
    });
  }
  const admitted = hostFacts === undefined
    ? admitVerifiedNativeOperationEvidence(EVIDENCE)
    : admitVerifiedNativeOperationEvidence(EVIDENCE, hostFacts);
  return Object.freeze({ ...await admitted, sourcePair });
}
