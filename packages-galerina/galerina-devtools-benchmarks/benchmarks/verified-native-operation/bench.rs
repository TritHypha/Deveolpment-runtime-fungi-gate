use std::convert::TryFrom;
use std::hint::black_box;
use std::time::Instant;

const ITERATIONS: usize = 1_000_000;
const WARMUPS: usize = 2;
const SAMPLES: usize = 9;

fn traverse(values: &[i32]) -> (i32, usize) {
    let mut index = 0usize;
    let mut last = 0i32;
    while index < ITERATIONS {
        last = black_box(values[index]);
        index += 1;
    }
    (last, index)
}

fn main() {
    let values: Vec<i32> = (0..ITERATIONS).map(|value| value as i32).collect();
    for _ in 0..WARMUPS {
        let (last, observed) = traverse(black_box(&values));
        if last != 999_999 || observed != ITERATIONS {
            panic!("REFUSED: warmup semantic mismatch");
        }
    }

    let mut samples: Vec<u64> = Vec::with_capacity(SAMPLES);
    for _ in 0..SAMPLES {
        let started = Instant::now();
        let (last, observed) = traverse(black_box(&values));
        let elapsed_u128 = started.elapsed().as_nanos();
        if last != 999_999 || observed != ITERATIONS || elapsed_u128 == 0 {
            panic!("REFUSED: measured semantic mismatch");
        }
        let elapsed = u64::try_from(elapsed_u128).expect("elapsed time must fit u64");
        samples.push(elapsed);
    }
    let mut ordered = samples.clone();
    ordered.sort_unstable();
    let median = ordered[ordered.len() / 2];
    let operations_per_second = ((ITERATIONS as u128) * 1_000_000_000u128)
        / (median as u128);
    let sample_json = samples
        .iter()
        .map(u64::to_string)
        .collect::<Vec<_>>()
        .join(",");
    println!(
        "{{\"runtime\":\"rust\",\"iterations\":{},\"result\":999999,\"samplesNs\":[{}],\"medianNs\":{},\"operationsPerSecond\":{},\"unit\":\"element-reads/s\",\"antiElision\":\"std::hint::black_box-per-index\"}}",
        ITERATIONS,
        sample_json,
        median,
        operations_per_second,
    );
}
