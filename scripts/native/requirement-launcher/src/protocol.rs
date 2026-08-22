use std::collections::{BTreeMap, HashSet};

pub const MAX_FRAME_BYTES: usize = 262_144;
const MAX_DEPTH: usize = 32;
const MAX_VALUES: usize = 4_096;
const MAX_FIELDS: usize = 128;

#[derive(Clone, Debug)]
enum Value {
    Null,
    Bool(bool),
    Number(i64),
    String(String),
    Array(Vec<Value>),
    Object(BTreeMap<String, Value>),
}

#[derive(Debug)]
pub struct RequestEvidence {
    pub nonce: String,
    pub request_digest: String,
}

#[derive(Debug)]
pub struct Refusal {
    pub code: &'static str,
}

impl Refusal {
    fn new(code: &'static str) -> Self {
        Self { code }
    }
}

struct Parser<'a> {
    source: &'a str,
    index: usize,
    values: usize,
}

impl<'a> Parser<'a> {
    fn new(source: &'a str) -> Self {
        Self {
            source,
            index: 0,
            values: 0,
        }
    }

    fn parse(mut self) -> Result<Value, Refusal> {
        let value = self.value(1)?;
        if self.index != self.source.len() {
            return Err(Refusal::new("JSON_TRAILING"));
        }
        Ok(value)
    }

    fn spend(&mut self, depth: usize) -> Result<(), Refusal> {
        if depth > MAX_DEPTH {
            return Err(Refusal::new("DEPTH_BOUND"));
        }
        self.values += 1;
        if self.values > MAX_VALUES {
            return Err(Refusal::new("VALUE_BOUND"));
        }
        Ok(())
    }

    fn byte(&self) -> Option<u8> {
        self.source.as_bytes().get(self.index).copied()
    }

    fn value(&mut self, depth: usize) -> Result<Value, Refusal> {
        self.spend(depth)?;
        match self.byte() {
            Some(b'{') => self.object(depth),
            Some(b'[') => self.array(depth),
            Some(b'"') => self.string().map(Value::String),
            Some(b't') if self.literal("true") => Ok(Value::Bool(true)),
            Some(b'f') if self.literal("false") => Ok(Value::Bool(false)),
            Some(b'n') if self.literal("null") => Ok(Value::Null),
            Some(b'-' | b'0'..=b'9') => self.number().map(Value::Number),
            _ => Err(Refusal::new("JSON_TOKEN")),
        }
    }

    fn literal(&mut self, expected: &str) -> bool {
        if !self.source[self.index..].starts_with(expected) {
            return false;
        }
        self.index += expected.len();
        true
    }

    fn string(&mut self) -> Result<String, Refusal> {
        if self.byte() != Some(b'"') {
            return Err(Refusal::new("JSON_STRING"));
        }
        self.index += 1;
        let mut result = String::new();
        loop {
            let current = self
                .byte()
                .ok_or_else(|| Refusal::new("JSON_STRING_TRUNCATED"))?;
            match current {
                b'"' => {
                    self.index += 1;
                    return Ok(result);
                }
                0x00..=0x1f => return Err(Refusal::new("JSON_STRING_CONTROL")),
                b'\\' => {
                    self.index += 1;
                    let escaped = self.byte().ok_or_else(|| Refusal::new("JSON_ESCAPE"))?;
                    self.index += 1;
                    match escaped {
                        b'"' => result.push('"'),
                        b'\\' => result.push('\\'),
                        b'/' => result.push('/'),
                        b'b' => result.push('\u{0008}'),
                        b'f' => result.push('\u{000c}'),
                        b'n' => result.push('\n'),
                        b'r' => result.push('\r'),
                        b't' => result.push('\t'),
                        b'u' => result.push(self.unicode_escape()?),
                        _ => return Err(Refusal::new("JSON_ESCAPE")),
                    }
                }
                0x20..=0x7f => {
                    result.push(current as char);
                    self.index += 1;
                }
                _ => {
                    let tail = &self.source[self.index..];
                    let ch = tail
                        .chars()
                        .next()
                        .ok_or_else(|| Refusal::new("UTF8_INVALID"))?;
                    result.push(ch);
                    self.index += ch.len_utf8();
                }
            }
        }
    }

    fn unicode_escape(&mut self) -> Result<char, Refusal> {
        let first = self.hex_quad()?;
        if (0xd800..=0xdbff).contains(&first) {
            if self.source.as_bytes().get(self.index..self.index + 2) != Some(b"\\u") {
                return Err(Refusal::new("JSON_SURROGATE"));
            }
            self.index += 2;
            let second = self.hex_quad()?;
            if !(0xdc00..=0xdfff).contains(&second) {
                return Err(Refusal::new("JSON_SURROGATE"));
            }
            let code = 0x10000 + (((first - 0xd800) as u32) << 10) + (second - 0xdc00) as u32;
            return char::from_u32(code).ok_or_else(|| Refusal::new("JSON_SURROGATE"));
        }
        if (0xdc00..=0xdfff).contains(&first) {
            return Err(Refusal::new("JSON_SURROGATE"));
        }
        char::from_u32(first as u32).ok_or_else(|| Refusal::new("JSON_ESCAPE"))
    }

    fn hex_quad(&mut self) -> Result<u16, Refusal> {
        if self.index + 4 > self.source.len() {
            return Err(Refusal::new("JSON_ESCAPE"));
        }
        let digits = &self.source[self.index..self.index + 4];
        self.index += 4;
        u16::from_str_radix(digits, 16).map_err(|_| Refusal::new("JSON_ESCAPE"))
    }

    fn number(&mut self) -> Result<i64, Refusal> {
        let start = self.index;
        if self.byte() == Some(b'-') {
            self.index += 1;
        }
        match self.byte() {
            Some(b'0') => self.index += 1,
            Some(b'1'..=b'9') => {
                self.index += 1;
                while matches!(self.byte(), Some(b'0'..=b'9')) {
                    self.index += 1;
                }
            }
            _ => return Err(Refusal::new("JSON_NUMBER")),
        }
        if matches!(self.byte(), Some(b'.' | b'e' | b'E')) {
            return Err(Refusal::new("NUMBER_REQUIRED"));
        }
        self.source[start..self.index]
            .parse::<i64>()
            .map_err(|_| Refusal::new("NUMBER_REQUIRED"))
    }

    fn array(&mut self, depth: usize) -> Result<Value, Refusal> {
        self.index += 1;
        let mut values = Vec::new();
        if self.byte() == Some(b']') {
            self.index += 1;
            return Ok(Value::Array(values));
        }
        loop {
            if values.len() >= MAX_VALUES {
                return Err(Refusal::new("VALUE_BOUND"));
            }
            values.push(self.value(depth + 1)?);
            match self.byte() {
                Some(b']') => {
                    self.index += 1;
                    return Ok(Value::Array(values));
                }
                Some(b',') => self.index += 1,
                _ => return Err(Refusal::new("JSON_ARRAY")),
            }
        }
    }

    fn object(&mut self, depth: usize) -> Result<Value, Refusal> {
        self.index += 1;
        let mut fields = BTreeMap::new();
        let mut seen = HashSet::new();
        if self.byte() == Some(b'}') {
            self.index += 1;
            return Ok(Value::Object(fields));
        }
        loop {
            if fields.len() >= MAX_FIELDS {
                return Err(Refusal::new("FIELD_BOUND"));
            }
            let key = self.string()?;
            if !seen.insert(key.clone()) {
                return Err(Refusal::new("DUPLICATE_KEY"));
            }
            if self.byte() != Some(b':') {
                return Err(Refusal::new("JSON_OBJECT_COLON"));
            }
            self.index += 1;
            fields.insert(key, self.value(depth + 1)?);
            match self.byte() {
                Some(b'}') => {
                    self.index += 1;
                    return Ok(Value::Object(fields));
                }
                Some(b',') => self.index += 1,
                _ => return Err(Refusal::new("JSON_OBJECT")),
            }
        }
    }
}

fn string_value<'a>(fields: &'a BTreeMap<String, Value>, key: &str) -> Result<&'a str, Refusal> {
    match fields.get(key) {
        Some(Value::String(value)) => Ok(value),
        _ => Err(Refusal::new("FIELD_TYPE")),
    }
}

fn contains_outer_whitespace(source: &str) -> bool {
    let mut quoted = false;
    let mut escaped = false;
    for byte in source.bytes() {
        if quoted {
            if escaped {
                escaped = false;
            } else if byte == b'\\' {
                escaped = true;
            } else if byte == b'"' {
                quoted = false;
            }
        } else if byte == b'"' {
            quoted = true;
        } else if matches!(byte, b' ' | b'\t' | b'\r' | b'\n') {
            return true;
        }
    }
    false
}

fn escape_json(value: &str) -> String {
    let mut result = String::with_capacity(value.len() + 2);
    result.push('"');
    for ch in value.chars() {
        match ch {
            '"' => result.push_str("\\\""),
            '\\' => result.push_str("\\\\"),
            '\u{0008}' => result.push_str("\\b"),
            '\u{000c}' => result.push_str("\\f"),
            '\n' => result.push_str("\\n"),
            '\r' => result.push_str("\\r"),
            '\t' => result.push_str("\\t"),
            ch if ch <= '\u{001f}' => result.push_str(&format!("\\u{:04x}", ch as u32)),
            _ => result.push(ch),
        }
    }
    result.push('"');
    result
}

fn canonical(value: &Value) -> String {
    match value {
        Value::Null => "null".to_string(),
        Value::Bool(value) => value.to_string(),
        Value::Number(value) => value.to_string(),
        Value::String(value) => escape_json(value),
        Value::Array(values) => format!(
            "[{}]",
            values.iter().map(canonical).collect::<Vec<_>>().join(",")
        ),
        Value::Object(fields) => format!(
            "{{{}}}",
            fields
                .iter()
                .map(|(key, value)| format!("{}:{}", escape_json(key), canonical(value)))
                .collect::<Vec<_>>()
                .join(",")
        ),
    }
}

fn validate_request(value: &Value) -> Result<String, Refusal> {
    let fields = match value {
        Value::Object(fields) => fields,
        _ => return Err(Refusal::new("RECORD_REQUIRED")),
    };
    let expected = [
        "argumentBytes",
        "argumentDigest",
        "flowDigest",
        "flowLocator",
        "nonce",
        "runtimeProfile",
        "schemaVersion",
        "subjectDigest",
    ];
    if fields.len() != expected.len() || expected.iter().any(|key| !fields.contains_key(*key)) {
        return Err(Refusal::new("UNKNOWN_FIELD"));
    }
    if !matches!(fields.get("schemaVersion"), Some(Value::Number(1))) {
        return Err(Refusal::new("SCHEMA_VERSION"));
    }
    if string_value(fields, "runtimeProfile")? != "scalar-1" {
        return Err(Refusal::new("PROFILE_SCALAR_ONLY"));
    }
    let nonce = string_value(fields, "nonce")?;
    if nonce.len() != 32
        || !nonce
            .bytes()
            .all(|byte| byte.is_ascii_hexdigit() && !byte.is_ascii_uppercase())
    {
        return Err(Refusal::new("NONCE_FIELD"));
    }
    for key in ["subjectDigest", "flowDigest", "argumentDigest"] {
        let digest = string_value(fields, key)?;
        if digest.len() != 64
            || !digest
                .bytes()
                .all(|byte| byte.is_ascii_hexdigit() && !byte.is_ascii_uppercase())
        {
            return Err(Refusal::new("DIGEST_FIELD"));
        }
    }
    let locator = string_value(fields, "flowLocator")?;
    if locator.is_empty() || locator.len() > 256 || locator.contains("..") || locator.contains('\\')
    {
        return Err(Refusal::new("LOCATOR_FIELD"));
    }
    let arguments = string_value(fields, "argumentBytes")?;
    if arguments.len() > MAX_FRAME_BYTES
        || !arguments
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || b"+/=".contains(&byte))
    {
        return Err(Refusal::new("ARGUMENT_BYTES"));
    }
    Ok(nonce.to_string())
}

pub fn decode_request(frame: &[u8]) -> Result<RequestEvidence, Refusal> {
    if frame.len() < 9 {
        return Err(Refusal::new("FRAME_TRUNCATED"));
    }
    let declared = u64::from_be_bytes(
        frame[0..8]
            .try_into()
            .map_err(|_| Refusal::new("FRAME_TRUNCATED"))?,
    );
    if declared as usize > MAX_FRAME_BYTES {
        return Err(Refusal::new("FRAME_BOUND"));
    }
    if declared == 0 {
        return Err(Refusal::new("FRAME_TRUNCATED"));
    }
    if frame.len() != declared as usize + 8 {
        return Err(Refusal::new("FRAME_LENGTH"));
    }
    let source = std::str::from_utf8(&frame[8..]).map_err(|_| Refusal::new("UTF8_INVALID"))?;
    if contains_outer_whitespace(source) {
        return Err(Refusal::new("JSON_NON_CANONICAL"));
    }
    let parsed = Parser::new(source).parse()?;
    let nonce = validate_request(&parsed)?;
    if canonical(&parsed) != source {
        return Err(Refusal::new("JSON_NON_CANONICAL"));
    }
    Ok(RequestEvidence {
        nonce,
        request_digest: sha256_hex(frame),
    })
}

fn field(object: &mut BTreeMap<String, Value>, key: &str, value: Value) {
    object.insert(key.to_string(), value);
}

pub fn refusal_frame(nonce: &str, refusal_code: &str, request_digest: &str) -> Vec<u8> {
    let zero = "0".repeat(64);
    let mut receipt = BTreeMap::new();
    field(&mut receipt, "schemaVersion", Value::Number(1));
    field(
        &mut receipt,
        "hashAlgorithm",
        Value::String("sha256".to_string()),
    );
    field(&mut receipt, "launcherDigest", Value::String(zero.clone()));
    field(
        &mut receipt,
        "processOwnerDigest",
        Value::String(zero.clone()),
    );
    field(&mut receipt, "runtimeDigest", Value::String(zero.clone()));
    field(&mut receipt, "workerDigest", Value::String(zero.clone()));
    field(&mut receipt, "registryDigest", Value::String(zero.clone()));
    field(
        &mut receipt,
        "osEvidenceLocator",
        Value::String("evidence/os/windows-proof-slice-v1".to_string()),
    );
    field(
        &mut receipt,
        "processPolicyEvidenceLocator",
        Value::String("evidence/process/no-worker-v1".to_string()),
    );
    field(
        &mut receipt,
        "environmentPolicyDigest",
        Value::String(zero.clone()),
    );
    field(
        &mut receipt,
        "scalarProfileDigest",
        Value::String(zero.clone()),
    );
    field(
        &mut receipt,
        "requestDigest",
        Value::String(request_digest.to_string()),
    );
    field(&mut receipt, "subjectDigest", Value::String(zero.clone()));
    field(&mut receipt, "flowDigest", Value::String(zero.clone()));
    field(&mut receipt, "argumentDigest", Value::String(zero.clone()));
    field(&mut receipt, "responseDigest", Value::String(zero.clone()));
    field(&mut receipt, "valueDigest", Value::String(zero.clone()));
    field(&mut receipt, "auditDigest", Value::String(zero));
    field(&mut receipt, "nonce", Value::String(nonce.to_string()));
    field(&mut receipt, "monotonicDurationMs", Value::Number(0));
    field(
        &mut receipt,
        "executionState",
        Value::String("REFUSED".to_string()),
    );
    field(&mut receipt, "timedOut", Value::Bool(false));
    field(&mut receipt, "truncated", Value::Bool(false));
    field(&mut receipt, "partial", Value::Bool(false));
    field(&mut receipt, "missingEvidence", Value::Array(Vec::new()));
    field(&mut receipt, "exitCode", Value::Number(1));
    field(
        &mut receipt,
        "refusalCode",
        Value::String(refusal_code.to_string()),
    );
    field(&mut receipt, "authorizing", Value::Bool(false));
    encode_frame(canonical(&Value::Object(receipt)).as_bytes())
}

fn encode_frame(body: &[u8]) -> Vec<u8> {
    let mut frame = Vec::with_capacity(body.len() + 8);
    frame.extend_from_slice(&(body.len() as u64).to_be_bytes());
    frame.extend_from_slice(body);
    frame
}

pub fn sha256_hex(bytes: &[u8]) -> String {
    const INITIAL: [u32; 8] = [
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab,
        0x5be0cd19,
    ];
    const K: [u32; 64] = [
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4,
        0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe,
        0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f,
        0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
        0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc,
        0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
        0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116,
        0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7,
        0xc67178f2,
    ];
    let bit_len = (bytes.len() as u64).wrapping_mul(8);
    let mut padded = bytes.to_vec();
    padded.push(0x80);
    while padded.len() % 64 != 56 {
        padded.push(0);
    }
    padded.extend_from_slice(&bit_len.to_be_bytes());
    let mut state = INITIAL;
    for block in padded.chunks_exact(64) {
        let mut words = [0u32; 64];
        for (index, chunk) in block.chunks_exact(4).enumerate() {
            words[index] = u32::from_be_bytes(chunk.try_into().unwrap_or([0; 4]));
        }
        for index in 16..64 {
            let s0 = words[index - 15].rotate_right(7)
                ^ words[index - 15].rotate_right(18)
                ^ (words[index - 15] >> 3);
            let s1 = words[index - 2].rotate_right(17)
                ^ words[index - 2].rotate_right(19)
                ^ (words[index - 2] >> 10);
            words[index] = words[index - 16]
                .wrapping_add(s0)
                .wrapping_add(words[index - 7])
                .wrapping_add(s1);
        }
        let [mut a, mut b, mut c, mut d, mut e, mut f, mut g, mut h] = state;
        for index in 0..64 {
            let s1 = e.rotate_right(6) ^ e.rotate_right(11) ^ e.rotate_right(25);
            let choice = (e & f) ^ ((!e) & g);
            let temp1 = h
                .wrapping_add(s1)
                .wrapping_add(choice)
                .wrapping_add(K[index])
                .wrapping_add(words[index]);
            let s0 = a.rotate_right(2) ^ a.rotate_right(13) ^ a.rotate_right(22);
            let majority = (a & b) ^ (a & c) ^ (b & c);
            let temp2 = s0.wrapping_add(majority);
            h = g;
            g = f;
            f = e;
            e = d.wrapping_add(temp1);
            d = c;
            c = b;
            b = a;
            a = temp1.wrapping_add(temp2);
        }
        state[0] = state[0].wrapping_add(a);
        state[1] = state[1].wrapping_add(b);
        state[2] = state[2].wrapping_add(c);
        state[3] = state[3].wrapping_add(d);
        state[4] = state[4].wrapping_add(e);
        state[5] = state[5].wrapping_add(f);
        state[6] = state[6].wrapping_add(g);
        state[7] = state[7].wrapping_add(h);
    }
    state.iter().map(|word| format!("{word:08x}")).collect()
}
