import json
from array import array
from time import perf_counter_ns

ITERATIONS = 1_000_000
WARMUPS = 2
SAMPLES = 9


def traverse(values):
    index = 0
    last = 0
    while index < ITERATIONS:
        last = values[index]
        index += 1
    return last, index


values = array("i", range(ITERATIONS))
for _ in range(WARMUPS):
    last, observed = traverse(values)
    if last != 999_999 or observed != ITERATIONS:
        raise RuntimeError("REFUSED: warmup semantic mismatch")

samples_ns = []
for _ in range(SAMPLES):
    started = perf_counter_ns()
    last, observed = traverse(values)
    elapsed = perf_counter_ns() - started
    if last != 999_999 or observed != ITERATIONS or elapsed <= 0:
        raise RuntimeError("REFUSED: measured semantic mismatch")
    samples_ns.append(elapsed)

median_ns = sorted(samples_ns)[len(samples_ns) // 2]
print(json.dumps({
    "runtime": "python",
    "iterations": ITERATIONS,
    "result": 999_999,
    "samplesNs": samples_ns,
    "medianNs": median_ns,
    "operationsPerSecond": (ITERATIONS * 1_000_000_000) // median_ns,
    "unit": "element-reads/s",
    "antiElision": "interpreter-observes-returned-last-value-and-iteration-count",
}, separators=(",", ":")))
