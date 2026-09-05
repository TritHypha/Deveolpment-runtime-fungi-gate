use std::fs::OpenOptions;
use std::io::{self, Write};
use std::path::Path;

#[derive(Clone)]
pub struct Event {
    pub kind: &'static str,
    pub process_key: String,
    pub parent_process_key: Option<String>,
    pub pid: u64,
    pub parent_pid: u64,
    pub tick: String,
    pub peak_rss_kib: Option<u64>,
    pub termination_kind: Option<&'static str>,
    pub termination_code: Option<i64>,
}

pub struct ObserverResult {
    pub platform: &'static str,
    pub mechanism: &'static str,
    pub clock_kind: &'static str,
    pub clock_frequency: String,
    pub native_create_events: u64,
    pub native_exit_events: u64,
    pub secondary_create_events: u64,
    pub secondary_exit_events: u64,
    pub retained_handle_rows: u64,
    pub terminal_state: &'static str,
    pub root_termination_kind: &'static str,
    pub root_exit_code: i64,
    pub observer_digest: String,
    pub events: Vec<Event>,
}

fn json_string(value: &str) -> String {
    let mut out = String::from("\"");
    for ch in value.chars() {
        match ch {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            c if c <= '\u{1f}' => out.push_str(&format!("\\u{:04x}", c as u32)),
            c => out.push(c),
        }
    }
    out.push('"');
    out
}

pub fn write_result(path: &Path, result: &ObserverResult) -> Result<(), &'static str> {
    let mut bytes = String::new();
    bytes.push('{');
    bytes.push_str("\"clock\":{");
    bytes.push_str("\"frequency\":"); bytes.push_str(&json_string(&result.clock_frequency));
    bytes.push_str(",\"kind\":"); bytes.push_str(&json_string(result.clock_kind)); bytes.push_str("},");
    bytes.push_str("\"events\":[");
    let mut events = result.events.clone();
    events.sort_by(|left, right| left.process_key.cmp(&right.process_key).then(left.kind.cmp(right.kind)).then(left.tick.cmp(&right.tick)));
    let mut first = true;
    for event in &events {
        if !first { bytes.push(','); }
        first = false;
        bytes.push('{');
        bytes.push_str("\"kind\":"); bytes.push_str(&json_string(event.kind));
        bytes.push_str(",\"parentPid\":"); bytes.push_str(&event.parent_pid.to_string());
        bytes.push_str(",\"parentProcessKey\":");
        match &event.parent_process_key { Some(value) => bytes.push_str(&json_string(value)), None => bytes.push_str("null") }
        if let Some(rss) = event.peak_rss_kib { bytes.push_str(",\"peakRssKiB\":"); bytes.push_str(&rss.to_string()); }
        bytes.push_str(",\"pid\":"); bytes.push_str(&event.pid.to_string());
        bytes.push_str(",\"processKey\":"); bytes.push_str(&json_string(&event.process_key));
        if let Some(code) = event.termination_code { bytes.push_str(",\"terminationCode\":"); bytes.push_str(&code.to_string()); }
        if let Some(kind) = event.termination_kind { bytes.push_str(",\"terminationKind\":"); bytes.push_str(&json_string(kind)); }
        bytes.push_str(",\"tick\":"); bytes.push_str(&json_string(&event.tick));
        bytes.push('}');
    }
    bytes.push_str("],\"mechanism\":"); bytes.push_str(&json_string(result.mechanism));
    bytes.push_str(",\"observerDigest\":"); bytes.push_str(&json_string(&result.observer_digest));
    bytes.push_str(",\"reconciliation\":{");
    bytes.push_str("\"accountedProcessRows\":"); bytes.push_str(&result.retained_handle_rows.to_string());
    bytes.push_str(",\"nativeCreateEvents\":"); bytes.push_str(&result.native_create_events.to_string());
    bytes.push_str(",\"nativeExitEvents\":"); bytes.push_str(&result.native_exit_events.to_string());
    bytes.push_str(",\"retainedHandleRows\":"); bytes.push_str(&result.retained_handle_rows.to_string());
    bytes.push_str(",\"secondaryCreateEvents\":"); bytes.push_str(&result.secondary_create_events.to_string());
    bytes.push_str(",\"secondaryExitEvents\":"); bytes.push_str(&result.secondary_exit_events.to_string());
    bytes.push_str(",\"terminalState\":"); bytes.push_str(&json_string(result.terminal_state)); bytes.push('}');
    bytes.push_str(",\"rootTermination\":{");
    bytes.push_str("\"code\":"); bytes.push_str(&result.root_exit_code.to_string());
    bytes.push_str(",\"kind\":"); bytes.push_str(&json_string(result.root_termination_kind)); bytes.push('}');
    bytes.push_str(",\"schema\":\"galerina.process-tree-observer.v1\"}");
    let mut file = OpenOptions::new().write(true).create_new(true).open(path).map_err(|_| "HOLD_NATIVE_OUTPUT_WRITE")?;
    file.write_all(bytes.as_bytes()).map_err(|_| "HOLD_NATIVE_OUTPUT_WRITE")?;
    file.flush().map_err(|_| "HOLD_NATIVE_OUTPUT_WRITE")?;
    Ok(())
}

pub fn copy_stage_output(path: &Path, output: &[u8]) -> Result<(), &'static str> {
    if output.len() > 1024 * 1024 { return Err("HOLD_NATIVE_OUTPUT_LIMIT"); }
    let mut file = OpenOptions::new().write(true).create_new(true).open(path).map_err(|_| "HOLD_NATIVE_OUTPUT_WRITE")?;
    file.write_all(output).map_err(|_| "HOLD_NATIVE_OUTPUT_WRITE")?;
    file.flush().map_err(|_| "HOLD_NATIVE_OUTPUT_WRITE")?;
    Ok(())
}

pub fn empty_stage_output(path: &Path) -> Result<(), &'static str> { copy_stage_output(path, &[]) }

pub fn io_error(_: io::Error) -> &'static str { "HOLD_NATIVE_OUTPUT_WRITE" }
