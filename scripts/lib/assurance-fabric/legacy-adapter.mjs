import { isAbsolute, relative, resolve } from "node:path";
import ownedProcessTree from "../owned-process-tree.cjs";
import { isValidatedAssuranceEntry } from "./manifest.mjs";
import {
  RESULT_TAG,
  SOURCE_CLASS,
  TRIT,
  makeAssuranceResult,
} from "./result-model.mjs";

const { runOwnedProcessSync } = ownedProcessTree;

function presentOrAbsent(value, label, reason) {
  if (label === "exit" && Number.isSafeInteger(value)) {
    return Object.freeze({ kind: "present", value });
  }
  if (label === "signal" && typeof value === "string" && value.length > 0) {
    return Object.freeze({ kind: "present", value });
  }
  return Object.freeze({ kind: "absent", reason });
}

function inside(root, target) {
  const rel = relative(root, target);
  return rel === "" || (!isAbsolute(rel) && rel !== ".." && !rel.startsWith(`..\\`) && !rel.startsWith("../"));
}

function processControlOf(output) {
  const owned = output?.owned;
  return Object.freeze({
    ownedTree: owned !== null && typeof owned === "object",
    cleanupAttempted: owned?.cleanupAttempted === true,
    cleanupAcknowledged: owned?.cleanupAcknowledged === true,
    timedOut: owned?.timedOut === true,
    outputLimitExceeded: owned?.outputLimitExceeded === true,
  });
}

function result(tag, sourceClass, subjectId, detail, trit) {
  return makeAssuranceResult({ tag, sourceClass, subjectId, detail, trit });
}

function captureOutputs(intake, entryId, stdout, stderr) {
  const stdoutHandle = intake.capture(Buffer.from(stdout, "utf8"), `${entryId}:stdout`);
  const stderrHandle = intake.capture(Buffer.from(stderr, "utf8"), `${entryId}:stderr`);
  return {
    stdoutHandle,
    stderrHandle,
    stdoutState: intake.stateOf(stdoutHandle),
    stderrState: intake.stateOf(stderrHandle),
  };
}

function response(entry, intake, output, assuranceResult) {
  const stdout = typeof output.stdout === "string" ? output.stdout : "";
  const stderr = typeof output.stderr === "string" ? output.stderr : "";
  const captured = captureOutputs(intake, entry.id, stdout, stderr);
  return Object.freeze({
    result: assuranceResult,
    ...captured,
    exitStatus: presentOrAbsent(output.status, "exit", "numeric exit status was not observed"),
    signalStatus: presentOrAbsent(output.signal, "signal", "process signal was not observed"),
    processControl: processControlOf(output),
  });
}

function refusedBeforeRun(entry, intake, detail) {
  return response(
    entry,
    intake,
    { status: undefined, signal: undefined, stdout: "", stderr: "", owned: null },
    result(RESULT_TAG.REFUSED, SOURCE_CLASS.HOST, entry.id, detail, TRIT.UNKNOWN),
  );
}

export function runLegacyEntry(entry, context) {
  if (!isValidatedAssuranceEntry(entry)) {
    throw new TypeError("a validated manifest entry is required");
  }
  if (!context || typeof context !== "object" || typeof context.root !== "string"
      || !context.intake || typeof context.intake.capture !== "function"
      || typeof context.intake.stateOf !== "function") {
    throw new TypeError("legacy adapter context requires a root and unsafe intake");
  }
  const root = resolve(context.root);
  if (!Array.isArray(entry.command) || entry.command.length < 1 || entry.command[0] !== "node") {
    return refusedBeforeRun(entry, context.intake, "legacy adapter admits only the explicit node executable");
  }
  if (typeof entry.cwd !== "string" || isAbsolute(entry.cwd)) {
    return refusedBeforeRun(entry, context.intake, "legacy entry cwd is not repository-relative");
  }
  const cwd = resolve(root, entry.cwd);
  if (!inside(root, cwd)) {
    return refusedBeforeRun(entry, context.intake, "legacy entry cwd escapes the repository root");
  }
  if (!Number.isSafeInteger(entry.timeoutMs) || entry.timeoutMs < 1
      || !Number.isSafeInteger(entry.maxOutputBytes) || entry.maxOutputBytes < 1) {
    return refusedBeforeRun(entry, context.intake, "legacy entry bounds are invalid");
  }

  let output;
  try {
    output = runOwnedProcessSync({
      command: process.execPath,
      args: entry.command.slice(1),
      cwd,
      timeoutMs: entry.timeoutMs,
      cleanupGraceMs: Number.isSafeInteger(context.cleanupGraceMs) ? context.cleanupGraceMs : 2_000,
      maxOutputBytes: entry.maxOutputBytes,
      windowsHide: true,
    });
  } catch {
    return refusedBeforeRun(entry, context.intake, "owned process admission refused before execution");
  }

  const control = processControlOf(output);
  let assuranceResult;
  if (!control.ownedTree) {
    assuranceResult = result(
      RESULT_TAG.REFUSED,
      SOURCE_CLASS.HOST,
      entry.id,
      "owned process wrapper did not return private tree evidence",
      TRIT.UNKNOWN,
    );
  } else if (control.cleanupAttempted && !control.cleanupAcknowledged) {
    assuranceResult = result(
      RESULT_TAG.REFUSED,
      SOURCE_CLASS.HOST,
      entry.id,
      "owned process tree cleanup was not acknowledged",
      TRIT.UNKNOWN,
    );
  } else if (control.outputLimitExceeded) {
    assuranceResult = result(
      RESULT_TAG.REFUSED,
      SOURCE_CLASS.HOST,
      entry.id,
      "owned process exceeded its bounded output limit",
      TRIT.UNKNOWN,
    );
  } else if (control.timedOut) {
    assuranceResult = control.cleanupAcknowledged
      ? result(
        RESULT_TAG.UNKNOWN,
        SOURCE_CLASS.LEGACY_EXIT,
        entry.id,
        "owned process timed out after acknowledged cleanup",
        TRIT.UNKNOWN,
      )
      : result(
        RESULT_TAG.REFUSED,
        SOURCE_CLASS.HOST,
        entry.id,
        "owned process timeout cleanup was not acknowledged",
        TRIT.UNKNOWN,
      );
  } else if (output.error) {
    assuranceResult = result(
      RESULT_TAG.REFUSED,
      SOURCE_CLASS.HOST,
      entry.id,
      "owned process returned a spawn or wrapper refusal",
      TRIT.UNKNOWN,
    );
  } else if (!Number.isSafeInteger(output.status)) {
    assuranceResult = result(
      RESULT_TAG.REFUSED,
      SOURCE_CLASS.HOST,
      entry.id,
      "owned process returned no numeric exit status",
      TRIT.UNKNOWN,
    );
  } else if (output.status === 0) {
    assuranceResult = result(
      RESULT_TAG.LEGACY_EXIT,
      SOURCE_CLASS.LEGACY_EXIT,
      entry.id,
      "legacy exit zero is transitional evidence, not proof",
      TRIT.UNKNOWN,
    );
  } else if (entry.outcomePolicy === "blocking") {
    assuranceResult = result(
      RESULT_TAG.BLOCKING_FAIL,
      SOURCE_CLASS.LEGACY_EXIT,
      entry.id,
      "legacy blocking command returned a nonzero exit",
      TRIT.DISTRUSTED,
    );
  } else if (entry.outcomePolicy === "advisory") {
    assuranceResult = result(
      RESULT_TAG.ADVISORY_FINDINGS,
      SOURCE_CLASS.LEGACY_EXIT,
      entry.id,
      "legacy advisory command returned findings",
      TRIT.DISTRUSTED,
    );
  } else {
    assuranceResult = result(
      RESULT_TAG.UNKNOWN,
      SOURCE_CLASS.LEGACY_EXIT,
      entry.id,
      "legacy informational exit has no authority effect",
      TRIT.UNKNOWN,
    );
  }
  return response(entry, context.intake, output, assuranceResult);
}
