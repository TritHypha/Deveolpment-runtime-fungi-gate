#![forbid(unsafe_code)]

use std::io::{self, Write};

use galerina_vok_authority::{authority_verdict, Trit};

const VECTOR_COUNT: usize = 3_usize.pow(9);

fn main() -> io::Result<()> {
    let values = [Trit::Refuse, Trit::Unknown, Trit::Admit];
    let mut output = Vec::with_capacity(8 + 4 + VECTOR_COUNT);
    output.extend_from_slice(b"VOKK3V1\0");
    output.extend_from_slice(&(VECTOR_COUNT as u32).to_le_bytes());

    for ordinal in 0..VECTOR_COUNT {
        let mut remainder = ordinal;
        let mut vector = [Trit::Refuse; 9];
        for gate in &mut vector {
            *gate = values[remainder % 3];
            remainder /= 3;
        }
        let admission = vector[..8]
            .try_into()
            .expect("the fixed vector prefix contains exactly eight gates");
        let verdict = authority_verdict(admission, vector[8]);
        output.push((verdict as i8 + 1) as u8);
    }

    io::stdout().lock().write_all(&output)
}
