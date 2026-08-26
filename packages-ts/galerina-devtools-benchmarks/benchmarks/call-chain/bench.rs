use std::env;
use std::hint::black_box;
use std::process;
use std::time::Instant;

const ITERATIONS: usize = 50_000;

#[inline(never)]
fn leaf_compute(salt: i64, x: i64) -> i64 {
    black_box((salt + x) * 2 + 1)
}

struct DomainLayer;

impl DomainLayer {
    #[inline(never)]
    fn compute(&self, salt: i64, x: i64) -> i64 {
        leaf_compute(salt, x) + leaf_compute(salt, x + 1)
    }
}

struct ServiceLayer {
    domain: DomainLayer,
}

impl ServiceLayer {
    #[inline(never)]
    fn process(&self, salt: i64, x: i64) -> i64 {
        self.domain.compute(salt, x) + self.domain.compute(salt, x + 2)
    }
}

fn chain(iterations: usize) -> i64 {
    let service = ServiceLayer { domain: DomainLayer };
    let mut checksum = 0_i64;
    for index in 0..iterations {
        let value = index as i64;
        checksum = (checksum + service.process(value, value)) % 65_536;
    }
    black_box(checksum)
}

fn iterations_from_args() -> Result<usize, String> {
    let args: Vec<String> = env::args().collect();
    let mut iterations = ITERATIONS;
    let mut index = 1;
    while index < args.len() {
        if args[index] == "--iterations" || args[index] == "--operations" {
            let raw = args.get(index + 1).ok_or_else(|| "missing iteration count".to_string())?;
            let value = raw.parse::<usize>().map_err(|_| "invalid iteration count".to_string())?;
            if value != ITERATIONS {
                return Err(format!("iteration count must be {ITERATIONS}"));
            }
            iterations = value;
            index += 2;
        } else {
            index += 1;
        }
    }
    Ok(iterations)
}

fn main() {
    let iterations = iterations_from_args().unwrap_or_else(|error| {
        eprintln!("{error}");
        process::exit(2);
    });
    black_box(chain(iterations));
    let started = Instant::now();
    let result = chain(iterations);
    let elapsed = started.elapsed();
    let seconds = elapsed.as_secs_f64();
    if seconds <= 0.0 {
        eprintln!("elapsed time is not positive");
        process::exit(3);
    }
    println!(
        "{{\n  \"runtime\": \"rust\",\n  \"benchmark\": \"call-chain-v1\",\n  \"result\": {result},\n  \"iterations\": {iterations},\n  \"callsPerIteration\": 7,\n  \"elapsedMs\": {:.6},\n  \"iterationsPerSecond\": {:.6},\n  \"callsPerSecond\": {:.6}\n}}",
        seconds * 1000.0,
        iterations as f64 / seconds,
        (iterations * 7) as f64 / seconds,
    );
}
