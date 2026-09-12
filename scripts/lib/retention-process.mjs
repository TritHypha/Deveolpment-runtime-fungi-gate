/**
 * Small, pure helpers for the retention gate's child-process and scanner contracts.
 * They deliberately reject ambiguous process results and incomplete scan payloads.
 */

export function checkedChildResult(result, { name, acceptedStatuses = [0] } = {}) {
  const label = name || "child process";
  if (!result || result.error) {
    return { ok: false, reason: `${label} could not start: ${result?.error?.message ?? "unknown spawn error"}` };
  }
  if (result.signal) {
    return { ok: false, reason: `${label} terminated by signal ${result.signal}` };
  }
  if (result.status === null || result.status === undefined) {
    return { ok: false, reason: `${label} did not produce an exit status (timeout or harness failure)` };
  }
  if (!acceptedStatuses.includes(result.status)) {
    return { ok: false, reason: `${label} exited with status ${result.status}; accepted statuses: ${acceptedStatuses.join(", ")}` };
  }
  return { ok: true, output: `${result.stdout ?? ""}${result.stderr ?? ""}` };
}

export function parseRetentionScanJson(text) {
  let report;
  try {
    report = JSON.parse(String(text).trim());
  } catch (error) {
    return { ok: false, reason: `scanner output is not valid JSON: ${error.message}` };
  }
  if (!report || report.schema !== "galerina.audit-leak-static.v1") {
    return { ok: false, reason: "scanner output has an unknown schema" };
  }
  if (report.complete !== true || report.truncated !== false) {
    return { ok: false, reason: "scanner output is not marked complete" };
  }
  if (!Number.isInteger(report.scanned) || report.scanned <= 0) {
    return { ok: false, reason: "scanner output does not prove that files were scanned" };
  }
  const tally = report.tally;
  const reportable = ["UNBOUNDED", "TEST-ONLY-CLEAR", "CLEAR-NEVER-CALLED"];
  if (!tally || typeof tally !== "object"
    || reportable.some((key) => !Number.isInteger(tally[key]) || tally[key] < 0)) {
    return { ok: false, reason: "scanner output has no valid retention tally" };
  }
  if (!Array.isArray(report.findings)) {
    return { ok: false, reason: "scanner output has no complete findings array" };
  }
  for (const finding of report.findings) {
    if (!finding || typeof finding !== "object"
      || !reportable.includes(finding.verdict)
      || typeof finding.id !== "string" || finding.id.length === 0
      || typeof finding.file !== "string" || finding.file.length === 0
      || !Number.isInteger(finding.line) || finding.line < 1) {
      return { ok: false, reason: "scanner output contains a finding with incomplete identity" };
    }
  }
  if (!Number.isInteger(report.exitCode) || ![0, 1].includes(report.exitCode)) {
    return { ok: false, reason: "scanner output has no recognized exit code" };
  }
  const expectedFindings = reportable.reduce((sum, key) => sum + tally[key], 0);
  if (report.findings.length !== expectedFindings) {
    return { ok: false, reason: "scanner tally and complete findings array disagree" };
  }
  if (report.exitCode !== (expectedFindings > 0 ? 1 : 0)) {
    return { ok: false, reason: "scanner exit code does not match its complete findings" };
  }
  return { ok: true, value: report };
}
