import { runScalarSlideReferenceBenchmark } from "../../src/slide-reference-runner.mjs";

export function runSlideReferenceBenchmark(options = {}) {
  return runScalarSlideReferenceBenchmark("compute-mix", options);
}
