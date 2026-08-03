import { fileURLToPath } from "node:url";

import { admitVerifiedNativeOperationEvidence } from "../../src/verified-native-operation-adapter.mjs";

const EVIDENCE = fileURLToPath(new URL(
  "../../evidence/slide-verified-native-operation-reference.json",
  import.meta.url,
));

export async function runSlideReferenceBenchmark(hostFacts) {
  return hostFacts === undefined
    ? admitVerifiedNativeOperationEvidence(EVIDENCE)
    : admitVerifiedNativeOperationEvidence(EVIDENCE, hostFacts);
}
