#![forbid(unsafe_code)]

use std::collections::BTreeMap;
use std::env;
use std::hint::black_box;
use std::process;
use std::time::Instant;

use galerina_vok_authority::{
    AuthorityContext, AuthorityTable, AuthorityTag, MintRequest, NonceFailure, NonceSource, Trit,
};

const DEFAULT_SAMPLES: usize = 99;
const DEFAULT_ITERATIONS: usize = 1_000;

struct CounterNonce {
    next: u128,
}

impl CounterNonce {
    fn new() -> Self {
        Self { next: 1 }
    }
}

impl NonceSource for CounterNonce {
    fn next_nonce(&mut self) -> Result<[u8; 16], NonceFailure> {
        let nonce = self.next.to_le_bytes();
        self.next = self
            .next
            .checked_add(1)
            .ok_or_else(|| NonceFailure::new("VOK_BENCH_NONCE_EXHAUSTED"))?;
        Ok(nonce)
    }
}

fn main() {
    if let Err(error) = run() {
        eprintln!("{error}");
        process::exit(2);
    }
}

fn run() -> Result<(), String> {
    let (samples, iterations) = parse_args()?;
    let mut null_samples = Vec::with_capacity(samples);
    let mut checked_samples = Vec::with_capacity(samples);
    let mut vok_samples = Vec::with_capacity(samples);

    black_box(measure_null(32));
    black_box(measure_checked(32));
    black_box(measure_vok(32));

    for sample in 0..samples {
        match sample % 3 {
            0 => {
                null_samples.push(measure_null(iterations));
                checked_samples.push(measure_checked(iterations));
                vok_samples.push(measure_vok(iterations));
            }
            1 => {
                checked_samples.push(measure_checked(iterations));
                vok_samples.push(measure_vok(iterations));
                null_samples.push(measure_null(iterations));
            }
            _ => {
                vok_samples.push(measure_vok(iterations));
                null_samples.push(measure_null(iterations));
                checked_samples.push(measure_checked(iterations));
            }
        }
    }

    println!("VOKBENCHV1,samples={samples},iterations={iterations},unit=ns/op");
    println!("lane,min,p25,median,p75,max");
    print_summary("null_owned_value", null_samples);
    print_summary("checked_btree", checked_samples);
    print_summary("vok_affine_cycle", vok_samples);
    Ok(())
}

fn parse_args() -> Result<(usize, usize), String> {
    let mut samples = DEFAULT_SAMPLES;
    let mut iterations = DEFAULT_ITERATIONS;
    let mut args = env::args().skip(1);
    while let Some(argument) = args.next() {
        let value = args
            .next()
            .ok_or_else(|| format!("missing value for {argument}"))?;
        let parsed = value
            .parse::<usize>()
            .map_err(|_| format!("invalid integer for {argument}"))?;
        match argument.as_str() {
            "--samples" => samples = parsed,
            "--iterations" => iterations = parsed,
            _ => return Err(format!("unknown argument {argument}")),
        }
    }
    if !(3..=1_001).contains(&samples) {
        return Err("samples must be in 3..=1001".to_owned());
    }
    if !(1..=100_000).contains(&iterations) {
        return Err("iterations must be in 1..=100000".to_owned());
    }
    Ok((samples, iterations))
}

fn measure_null(iterations: usize) -> u128 {
    measure(iterations, |ordinal| {
        let bytes = vec![1_u8, 2, 3];
        black_box((ordinal, bytes));
    })
}

fn measure_checked(iterations: usize) -> u128 {
    let mut table = BTreeMap::<(usize, u64, [u8; 16]), Vec<u8>>::new();
    measure(iterations, |ordinal| {
        let key = (0, ordinal as u64, (ordinal as u128 + 1).to_le_bytes());
        assert!(table.insert(key, vec![1, 2, 3]).is_none());
        let admitted = table.get(&key).expect("just-inserted checked-map value");
        black_box(admitted);
        let consumed = table.remove(&key).expect("exact checked-map removal");
        black_box(consumed);
    })
}

fn measure_vok(iterations: usize) -> u128 {
    let context = AuthorityContext::new([1; 32], [2; 32], [3; 32], 1, 1);
    let tag = AuthorityTag::parse("slide.vok.execute.v1").expect("fixed benchmark tag");
    let mut table = AuthorityTable::new(1, 3, context.clone(), CounterNonce::new())
        .expect("fixed benchmark table");
    measure(iterations, |_| {
        let admitted = table
            .mint_admitted(MintRequest::new(
                tag.clone(),
                context.clone(),
                [Trit::Admit; 8],
                vec![1, 2, 3],
            ))
            .expect("fixed benchmark mint");
        let lease = table
            .open_lease(admitted, &context)
            .expect("fixed benchmark lease");
        let receipt = table
            .consume_lease(lease, &context, Trit::Admit)
            .expect("fixed benchmark consume");
        black_box(receipt);
    })
}

fn measure(mut iterations: usize, mut operation: impl FnMut(usize)) -> u128 {
    let original_iterations = iterations;
    let started = Instant::now();
    let mut ordinal = 0;
    while iterations > 0 {
        operation(ordinal);
        ordinal += 1;
        iterations -= 1;
    }
    started.elapsed().as_nanos() / original_iterations as u128
}

fn print_summary(name: &str, mut samples: Vec<u128>) {
    samples.sort_unstable();
    let last = samples.len() - 1;
    let p25 = samples[last * 25 / 100];
    let median = samples[last / 2];
    let p75 = samples[last * 75 / 100];
    println!(
        "{name},{},{p25},{median},{p75},{}",
        samples[0], samples[last]
    );
}
