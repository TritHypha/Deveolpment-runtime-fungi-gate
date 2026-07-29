export function parseGovernanceDiff(output, child) {
  if (child.error) {
    return {
      ok: false,
      code: "GOVERNANCE-DIFF-SPAWN",
      detail: child.error.message,
    };
  }
  if (child.signal) {
    return {
      ok: false,
      code: "GOVERNANCE-DIFF-SIGNAL",
      detail: `Terminated by signal ${child.signal}.`,
    };
  }
  if (child.status !== 0) {
    return {
      ok: false,
      code: "GOVERNANCE-DIFF-EXIT",
      detail: `Governance diff exited ${String(child.status)}.`,
    };
  }
  let parsed;
  try {
    parsed = JSON.parse(output);
  } catch (error) {
    return {
      ok: false,
      code: "GOVERNANCE-DIFF-UNPARSEABLE",
      detail: `Governance diff JSON is malformed: ${error.message}`,
    };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)
      || typeof parsed.changeClass !== "string"
      || typeof parsed.summary !== "string") {
    return {
      ok: false,
      code: "GOVERNANCE-DIFF-MALFORMED",
      detail: "Governance diff JSON lacks string changeClass/summary fields.",
    };
  }
  if (parsed.changeClass === "experimental") {
    return {
      ok: false,
      code: "GOVERNANCE-DIFF-EXPERIMENTAL",
      changeClass: parsed.changeClass,
      detail: parsed.summary,
    };
  }
  return {
    ok: true,
    code: "GOVERNANCE-DIFF-ACCEPTED",
    changeClass: parsed.changeClass,
    detail: parsed.summary,
  };
}
