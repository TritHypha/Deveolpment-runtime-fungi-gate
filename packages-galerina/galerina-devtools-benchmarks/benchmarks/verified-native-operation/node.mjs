const ITERATIONS = 1_000_000;
const WARMUPS = 2;
const SAMPLES = 9;

function traverse(values) {
  let index = 0;
  let last = 0;
  while (index < ITERATIONS) {
    last = values[index];
    index += 1;
  }
  return Object.freeze({ last, iterations: index });
}

function median(values) {
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.floor(ordered.length / 2)];
}

const values = new Int32Array(ITERATIONS);
for (let index = 0; index < ITERATIONS; index += 1) values[index] = index;

for (let warmup = 0; warmup < WARMUPS; warmup += 1) {
  const result = traverse(values);
  if (result.last !== 999_999 || result.iterations !== ITERATIONS) {
    throw new Error("REFUSED: warmup semantic mismatch");
  }
}

const samplesNs = [];
for (let sample = 0; sample < SAMPLES; sample += 1) {
  const start = process.hrtime.bigint();
  const result = traverse(values);
  const elapsed = Number(process.hrtime.bigint() - start);
  if (
    result.last !== 999_999
    || result.iterations !== ITERATIONS
    || !Number.isSafeInteger(elapsed)
    || elapsed <= 0
  ) throw new Error("REFUSED: measured semantic mismatch");
  samplesNs.push(elapsed);
}

const medianNs = median(samplesNs);
process.stdout.write(`${JSON.stringify({
  runtime: "nodejs",
  iterations: ITERATIONS,
  result: 999_999,
  samplesNs,
  medianNs,
  operationsPerSecond: Math.floor((ITERATIONS * 1_000_000_000) / medianNs),
  unit: "element-reads/s",
  antiElision: "returned-last-value-and-iteration-count",
})}\n`);
