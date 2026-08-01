export const STRUCTURED_AWAIT_PLAN_VERSION = "galerina.runtime.await.v1";
export const MAX_STRUCTURED_AWAIT_TASKS = 1_024;

export interface StructuredAwaitErrorMetadata {
  readonly code: string;
  readonly safeMessage: string;
}

export const ERR_RUNTIME_AWAIT_PLAN_SHAPE = Object.freeze({
  code: "ERR_RUNTIME_AWAIT_PLAN_SHAPE",
  safeMessage: "Structured Await plan shape is not the exact closed contract.",
});
export const ERR_RUNTIME_AWAIT_PLAN_VERSION = Object.freeze({
  code: "ERR_RUNTIME_AWAIT_PLAN_VERSION",
  safeMessage: "Structured Await plan version is not admitted.",
});
export const ERR_RUNTIME_AWAIT_SCOPE_ID = Object.freeze({
  code: "ERR_RUNTIME_AWAIT_SCOPE_ID",
  safeMessage: "Structured Await scope identifier is invalid.",
});
export const ERR_RUNTIME_AWAIT_TASKS = Object.freeze({
  code: "ERR_RUNTIME_AWAIT_TASKS",
  safeMessage: "Structured Await task collection is outside its finite bound.",
});
export const ERR_RUNTIME_AWAIT_TASK_ID = Object.freeze({
  code: "ERR_RUNTIME_AWAIT_TASK_ID",
  safeMessage: "Structured Await task identifier is invalid.",
});
export const ERR_RUNTIME_AWAIT_TASK_DUPLICATE = Object.freeze({
  code: "ERR_RUNTIME_AWAIT_TASK_DUPLICATE",
  safeMessage: "Structured Await task identifiers must be unique.",
});
export const ERR_RUNTIME_AWAIT_TIMEOUT = Object.freeze({
  code: "ERR_RUNTIME_AWAIT_TIMEOUT",
  safeMessage: "Structured Await timeout must be a positive safe integer.",
});
export const ERR_RUNTIME_AWAIT_CONCURRENCY = Object.freeze({
  code: "ERR_RUNTIME_AWAIT_CONCURRENCY",
  safeMessage: "Structured Await concurrency must be finite and no greater than task count.",
});
export const ERR_RUNTIME_AWAIT_COMPLETION = Object.freeze({
  code: "ERR_RUNTIME_AWAIT_COMPLETION",
  safeMessage: "Structured Await completion policy is not admitted.",
});
export const ERR_RUNTIME_AWAIT_STATE = Object.freeze({
  code: "ERR_RUNTIME_AWAIT_STATE",
  safeMessage: "Structured Await state is not owned by this runtime instance.",
});
export const ERR_RUNTIME_AWAIT_EVENT = Object.freeze({
  code: "ERR_RUNTIME_AWAIT_EVENT",
  safeMessage: "Structured Await event is malformed or contradictory.",
});
export const ERR_RUNTIME_AWAIT_TIME_REGRESSION = Object.freeze({
  code: "ERR_RUNTIME_AWAIT_TIME_REGRESSION",
  safeMessage: "Structured Await elapsed time must not move backwards.",
});
export const ERR_RUNTIME_AWAIT_UNKNOWN_TASK = Object.freeze({
  code: "ERR_RUNTIME_AWAIT_UNKNOWN_TASK",
  safeMessage: "Structured Await event references a task outside the admitted scope.",
});
export const ERR_RUNTIME_AWAIT_TASK_STATE = Object.freeze({
  code: "ERR_RUNTIME_AWAIT_TASK_STATE",
  safeMessage: "Structured Await task event contradicts the current task state.",
});
export const ERR_RUNTIME_AWAIT_TERMINAL_STATE = Object.freeze({
  code: "ERR_RUNTIME_AWAIT_TERMINAL_STATE",
  safeMessage: "Structured Await terminal scope refuses further events.",
});

export type StructuredAwaitCompletion =
  | {
      readonly kind: "all";
      readonly onFailure: "cancel_remaining" | "wait_for_all";
    }
  | { readonly kind: "first_success" }
  | { readonly kind: "first_result" };

export interface StructuredAwaitPlan {
  readonly version: typeof STRUCTURED_AWAIT_PLAN_VERSION;
  readonly scopeId: string;
  readonly taskIds: readonly string[];
  readonly timeoutMs: number;
  readonly maxInFlight: number;
  readonly completion: StructuredAwaitCompletion;
}

export type StructuredAwaitTaskStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export interface StructuredAwaitTaskState {
  readonly taskId: string;
  readonly status: StructuredAwaitTaskStatus;
}

export type StructuredAwaitTerminalOutcome =
  | "succeeded"
  | "failed"
  | "timed_out"
  | "cancelled";

export type StructuredAwaitScopeStatus =
  | "running"
  | "cancelling"
  | StructuredAwaitTerminalOutcome;

export interface StructuredAwaitState {
  readonly plan: StructuredAwaitPlan;
  readonly elapsedMs: number;
  readonly scopeStatus: StructuredAwaitScopeStatus;
  readonly terminalIntent?: StructuredAwaitTerminalOutcome;
  readonly terminalTaskId?: string;
  readonly tasks: readonly StructuredAwaitTaskState[];
}

export type StructuredAwaitEvent =
  | { readonly kind: "tick"; readonly elapsedMs: number }
  | { readonly kind: "cancel"; readonly elapsedMs: number }
  | {
      readonly kind: "task_succeeded" | "task_failed" | "task_cancelled";
      readonly taskId: string;
      readonly elapsedMs: number;
    };

export type StructuredAwaitCommand =
  | { readonly kind: "start"; readonly taskId: string }
  | { readonly kind: "cancel"; readonly taskId: string }
  | {
      readonly kind: "terminal";
      readonly outcome: StructuredAwaitTerminalOutcome;
      readonly taskId?: string;
    };

export type StructuredAwaitAdmission =
  | { readonly ok: true; readonly plan: StructuredAwaitPlan }
  | { readonly ok: false; readonly error: StructuredAwaitErrorMetadata };

export type StructuredAwaitStep =
  | {
      readonly ok: true;
      readonly state: StructuredAwaitState;
      readonly commands: readonly StructuredAwaitCommand[];
    }
  | { readonly ok: false; readonly error: StructuredAwaitErrorMetadata };

const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const ADMITTED_STATES = new WeakSet<object>();

function refuse(error: StructuredAwaitErrorMetadata): StructuredAwaitStep {
  return { ok: false, error };
}

function refuseAdmission(
  error: StructuredAwaitErrorMetadata,
): StructuredAwaitAdmission {
  return { ok: false, error };
}

function exactDataValues(
  input: unknown,
  expectedKeys: readonly string[],
): Readonly<Record<string, unknown>> | undefined {
  try {
    if (
      typeof input !== "object" ||
      input === null ||
      Array.isArray(input) ||
      Object.getPrototypeOf(input) !== Object.prototype
    ) {
      return undefined;
    }

    const descriptors = Object.getOwnPropertyDescriptors(input);
    const keys = Reflect.ownKeys(descriptors);
    if (
      keys.length !== expectedKeys.length ||
      keys.some((key) => typeof key !== "string" || !expectedKeys.includes(key))
    ) {
      return undefined;
    }

    const values: Record<string, unknown> = {};
    for (const key of expectedKeys) {
      const descriptor = descriptors[key];
      if (
        descriptor === undefined ||
        !("value" in descriptor) ||
        descriptor.enumerable !== true
      ) {
        return undefined;
      }
      values[key] = descriptor.value;
    }
    return values;
  } catch {
    return undefined;
  }
}

function exactStringArray(input: unknown): readonly string[] | undefined {
  try {
    if (!Array.isArray(input) || Object.getPrototypeOf(input) !== Array.prototype) {
      return undefined;
    }
    const descriptors = Object.getOwnPropertyDescriptors(input) as unknown as PropertyDescriptorMap;
    const lengthDescriptor = descriptors.length;
    if (lengthDescriptor === undefined || !("value" in lengthDescriptor)) {
      return undefined;
    }
    const lengthValue: unknown = lengthDescriptor.value;
    if (
      typeof lengthValue !== "number" ||
      !Number.isSafeInteger(lengthValue) ||
      lengthValue < 1 ||
      lengthValue > MAX_STRUCTURED_AWAIT_TASKS
    ) {
      return undefined;
    }
    const length = lengthValue;
    const keys = Reflect.ownKeys(descriptors);
    if (keys.some((key) => typeof key !== "string")) return undefined;
    const stringKeys = keys as string[];
    const expectedKeys = new Set(["length"]);
    const output: string[] = [];
    for (let index = 0; index < length; index += 1) {
      const key = String(index);
      expectedKeys.add(key);
      const descriptor = descriptors[key];
      if (
        descriptor === undefined ||
        !("value" in descriptor) ||
        descriptor.enumerable !== true ||
        typeof descriptor.value !== "string"
      ) {
        return undefined;
      }
      output.push(descriptor.value);
    }
    if (stringKeys.some((key) => !expectedKeys.has(key))) return undefined;
    return output;
  } catch {
    return undefined;
  }
}

function admitCompletion(input: unknown): StructuredAwaitCompletion | undefined {
  const first = exactDataValues(input, ["kind"]);
  if (first !== undefined && first.kind === "first_success") {
    return Object.freeze({ kind: "first_success" });
  }
  if (first !== undefined && first.kind === "first_result") {
    return Object.freeze({ kind: "first_result" });
  }

  const all = exactDataValues(input, ["kind", "onFailure"]);
  if (
    all !== undefined &&
    all.kind === "all" &&
    (all.onFailure === "cancel_remaining" || all.onFailure === "wait_for_all")
  ) {
    return Object.freeze({ kind: "all", onFailure: all.onFailure });
  }
  return undefined;
}

export function admitStructuredAwaitPlan(
  input: unknown,
): StructuredAwaitAdmission {
  const values = exactDataValues(input, [
    "version",
    "scopeId",
    "taskIds",
    "timeoutMs",
    "maxInFlight",
    "completion",
  ]);
  if (values === undefined) return refuseAdmission(ERR_RUNTIME_AWAIT_PLAN_SHAPE);
  if (values.version !== STRUCTURED_AWAIT_PLAN_VERSION) {
    return refuseAdmission(ERR_RUNTIME_AWAIT_PLAN_VERSION);
  }
  if (typeof values.scopeId !== "string" || !IDENTIFIER.test(values.scopeId)) {
    return refuseAdmission(ERR_RUNTIME_AWAIT_SCOPE_ID);
  }

  const taskIds = exactStringArray(values.taskIds);
  if (taskIds === undefined) return refuseAdmission(ERR_RUNTIME_AWAIT_TASKS);
  if (taskIds.some((taskId) => !IDENTIFIER.test(taskId))) {
    return refuseAdmission(ERR_RUNTIME_AWAIT_TASK_ID);
  }
  if (new Set(taskIds).size !== taskIds.length) {
    return refuseAdmission(ERR_RUNTIME_AWAIT_TASK_DUPLICATE);
  }
  if (!Number.isSafeInteger(values.timeoutMs) || Number(values.timeoutMs) <= 0) {
    return refuseAdmission(ERR_RUNTIME_AWAIT_TIMEOUT);
  }
  if (
    !Number.isSafeInteger(values.maxInFlight) ||
    Number(values.maxInFlight) <= 0 ||
    Number(values.maxInFlight) > taskIds.length
  ) {
    return refuseAdmission(ERR_RUNTIME_AWAIT_CONCURRENCY);
  }

  const completion = admitCompletion(values.completion);
  if (completion === undefined) return refuseAdmission(ERR_RUNTIME_AWAIT_COMPLETION);

  const plan: StructuredAwaitPlan = Object.freeze({
    version: STRUCTURED_AWAIT_PLAN_VERSION,
    scopeId: values.scopeId,
    taskIds: Object.freeze([...taskIds]),
    timeoutMs: Number(values.timeoutMs),
    maxInFlight: Number(values.maxInFlight),
    completion,
  });
  return { ok: true, plan };
}

function freezeState(input: {
  readonly plan: StructuredAwaitPlan;
  readonly elapsedMs: number;
  readonly scopeStatus: StructuredAwaitScopeStatus;
  readonly terminalIntent?: StructuredAwaitTerminalOutcome;
  readonly terminalTaskId?: string;
  readonly tasks: readonly StructuredAwaitTaskState[];
}): StructuredAwaitState {
  const tasks = Object.freeze(input.tasks.map((task) => Object.freeze({ ...task })));
  const state = Object.freeze({
    plan: input.plan,
    elapsedMs: input.elapsedMs,
    scopeStatus: input.scopeStatus,
    ...(input.terminalIntent === undefined
      ? {}
      : { terminalIntent: input.terminalIntent }),
    ...(input.terminalTaskId === undefined
      ? {}
      : { terminalTaskId: input.terminalTaskId }),
    tasks,
  });
  ADMITTED_STATES.add(state);
  return state;
}

function successfulStep(
  state: StructuredAwaitState,
  commands: readonly StructuredAwaitCommand[],
): StructuredAwaitStep {
  return Object.freeze({
    ok: true,
    state,
    commands: Object.freeze(commands.map((command) => Object.freeze({ ...command }))),
  });
}

function runningCount(tasks: readonly StructuredAwaitTaskState[]): number {
  return tasks.filter((task) => task.status === "running").length;
}

function fillCapacity(
  tasks: StructuredAwaitTaskState[],
  maxInFlight: number,
): StructuredAwaitCommand[] {
  const commands: StructuredAwaitCommand[] = [];
  let running = runningCount(tasks);
  for (let index = 0; index < tasks.length && running < maxInFlight; index += 1) {
    const task = tasks[index];
    if (task !== undefined && task.status === "pending") {
      tasks[index] = { taskId: task.taskId, status: "running" };
      commands.push({ kind: "start", taskId: task.taskId });
      running += 1;
    }
  }
  return commands;
}

function allTasksTerminal(tasks: readonly StructuredAwaitTaskState[]): boolean {
  return tasks.every((task) => task.status !== "pending" && task.status !== "running");
}

function beginCancellation(
  state: StructuredAwaitState,
  tasks: StructuredAwaitTaskState[],
  elapsedMs: number,
  terminalIntent: StructuredAwaitTerminalOutcome,
  terminalTaskId?: string,
): StructuredAwaitStep {
  const commands: StructuredAwaitCommand[] = [];
  for (let index = 0; index < tasks.length; index += 1) {
    const task = tasks[index];
    if (task === undefined) continue;
    if (task.status === "pending") {
      tasks[index] = { taskId: task.taskId, status: "cancelled" };
    } else if (task.status === "running") {
      commands.push({ kind: "cancel", taskId: task.taskId });
    }
  }

  if (runningCount(tasks) === 0) {
    commands.push({
      kind: "terminal",
      outcome: terminalIntent,
      ...(terminalTaskId === undefined ? {} : { taskId: terminalTaskId }),
    });
    return successfulStep(freezeState({
      plan: state.plan,
      elapsedMs,
      scopeStatus: terminalIntent,
      terminalIntent,
      ...(terminalTaskId === undefined ? {} : { terminalTaskId }),
      tasks,
    }), commands);
  }

  return successfulStep(freezeState({
    plan: state.plan,
    elapsedMs,
    scopeStatus: "cancelling",
    terminalIntent,
    ...(terminalTaskId === undefined ? {} : { terminalTaskId }),
    tasks,
  }), commands);
}

export function startStructuredAwait(input: unknown): StructuredAwaitStep {
  const admission = admitStructuredAwaitPlan(input);
  if (!admission.ok) return { ok: false, error: admission.error };
  const tasks: StructuredAwaitTaskState[] = admission.plan.taskIds.map((taskId) => ({
    taskId,
    status: "pending",
  }));
  const commands = fillCapacity(tasks, admission.plan.maxInFlight);
  return successfulStep(freezeState({
    plan: admission.plan,
    elapsedMs: 0,
    scopeStatus: "running",
    tasks,
  }), commands);
}

function admitEvent(input: unknown): StructuredAwaitEvent | undefined {
  const simple = exactDataValues(input, ["kind", "elapsedMs"]);
  if (
    simple !== undefined &&
    (simple.kind === "tick" || simple.kind === "cancel") &&
    Number.isSafeInteger(simple.elapsedMs) &&
    Number(simple.elapsedMs) >= 0
  ) {
    return { kind: simple.kind, elapsedMs: Number(simple.elapsedMs) };
  }

  const task = exactDataValues(input, ["kind", "taskId", "elapsedMs"]);
  if (
    task !== undefined &&
    (task.kind === "task_succeeded" ||
      task.kind === "task_failed" ||
      task.kind === "task_cancelled") &&
    typeof task.taskId === "string" &&
    IDENTIFIER.test(task.taskId) &&
    Number.isSafeInteger(task.elapsedMs) &&
    Number(task.elapsedMs) >= 0
  ) {
    return {
      kind: task.kind,
      taskId: task.taskId,
      elapsedMs: Number(task.elapsedMs),
    };
  }
  return undefined;
}

function isTerminalScope(status: StructuredAwaitScopeStatus): boolean {
  return status === "succeeded" ||
    status === "failed" ||
    status === "timed_out" ||
    status === "cancelled";
}

function eventTaskStatus(
  kind: "task_succeeded" | "task_failed" | "task_cancelled",
): StructuredAwaitTaskStatus {
  if (kind === "task_succeeded") return "succeeded";
  if (kind === "task_failed") return "failed";
  return "cancelled";
}

function terminalStep(
  state: StructuredAwaitState,
  tasks: StructuredAwaitTaskState[],
  elapsedMs: number,
  outcome: StructuredAwaitTerminalOutcome,
): StructuredAwaitStep {
  const terminalTaskId = state.terminalTaskId;
  return successfulStep(freezeState({
    plan: state.plan,
    elapsedMs,
    scopeStatus: outcome,
    terminalIntent: outcome,
    ...(terminalTaskId === undefined ? {} : { terminalTaskId }),
    tasks,
  }), [{
    kind: "terminal",
    outcome,
    ...(terminalTaskId === undefined ? {} : { taskId: terminalTaskId }),
  }]);
}

function handleRunningTaskEvent(
  state: StructuredAwaitState,
  tasks: StructuredAwaitTaskState[],
  taskIndex: number,
  event: Extract<StructuredAwaitEvent, { readonly taskId: string }>,
): StructuredAwaitStep {
  const task = tasks[taskIndex];
  if (task === undefined || task.status !== "running") {
    return refuse(ERR_RUNTIME_AWAIT_TASK_STATE);
  }
  const terminalStatus = eventTaskStatus(event.kind);
  tasks[taskIndex] = { taskId: task.taskId, status: terminalStatus };

  if (event.elapsedMs >= state.plan.timeoutMs) {
    return beginCancellation(state, tasks, event.elapsedMs, "timed_out");
  }

  const completion = state.plan.completion;
  if (completion.kind === "first_result") {
    return beginCancellation(
      state,
      tasks,
      event.elapsedMs,
      terminalStatus === "succeeded" ? "succeeded" : "failed",
      event.taskId,
    );
  }
  if (completion.kind === "first_success" && terminalStatus === "succeeded") {
    return beginCancellation(
      state,
      tasks,
      event.elapsedMs,
      "succeeded",
      event.taskId,
    );
  }
  if (
    completion.kind === "all" &&
    completion.onFailure === "cancel_remaining" &&
    (terminalStatus === "failed" || terminalStatus === "cancelled")
  ) {
    return beginCancellation(state, tasks, event.elapsedMs, "failed");
  }

  const commands = fillCapacity(tasks, state.plan.maxInFlight);
  if (!allTasksTerminal(tasks)) {
    return successfulStep(freezeState({
      plan: state.plan,
      elapsedMs: event.elapsedMs,
      scopeStatus: "running",
      tasks,
    }), commands);
  }

  const failed = tasks.some(
    (candidate) => candidate.status === "failed" || candidate.status === "cancelled",
  );
  const outcome: StructuredAwaitTerminalOutcome = failed ? "failed" : "succeeded";
  commands.push({ kind: "terminal", outcome });
  return successfulStep(freezeState({
    plan: state.plan,
    elapsedMs: event.elapsedMs,
    scopeStatus: outcome,
    terminalIntent: outcome,
    tasks,
  }), commands);
}

function handleCancellingTaskEvent(
  state: StructuredAwaitState,
  tasks: StructuredAwaitTaskState[],
  taskIndex: number,
  event: Extract<StructuredAwaitEvent, { readonly taskId: string }>,
): StructuredAwaitStep {
  const task = tasks[taskIndex];
  if (task === undefined || task.status !== "running") {
    return refuse(ERR_RUNTIME_AWAIT_TASK_STATE);
  }
  tasks[taskIndex] = { taskId: task.taskId, status: eventTaskStatus(event.kind) };
  if (runningCount(tasks) > 0) {
    const terminalIntent = state.terminalIntent;
    if (terminalIntent === undefined) return refuse(ERR_RUNTIME_AWAIT_STATE);
    return successfulStep(freezeState({
      plan: state.plan,
      elapsedMs: event.elapsedMs,
      scopeStatus: "cancelling",
      terminalIntent,
      ...(state.terminalTaskId === undefined
        ? {}
        : { terminalTaskId: state.terminalTaskId }),
      tasks,
    }), []);
  }
  if (state.terminalIntent === undefined) return refuse(ERR_RUNTIME_AWAIT_STATE);
  return terminalStep(state, tasks, event.elapsedMs, state.terminalIntent);
}

export function advanceStructuredAwait(
  inputState: unknown,
  inputEvent: unknown,
): StructuredAwaitStep {
  if (
    typeof inputState !== "object" ||
    inputState === null ||
    !ADMITTED_STATES.has(inputState)
  ) {
    return refuse(ERR_RUNTIME_AWAIT_STATE);
  }
  const state = inputState as StructuredAwaitState;
  const event = admitEvent(inputEvent);
  if (event === undefined) return refuse(ERR_RUNTIME_AWAIT_EVENT);
  if (event.elapsedMs < state.elapsedMs) {
    return refuse(ERR_RUNTIME_AWAIT_TIME_REGRESSION);
  }
  if (isTerminalScope(state.scopeStatus)) {
    return refuse(ERR_RUNTIME_AWAIT_TERMINAL_STATE);
  }

  const tasks = state.tasks.map((task) => ({ ...task }));
  if (event.kind === "tick") {
    if (state.scopeStatus === "running" && event.elapsedMs >= state.plan.timeoutMs) {
      return beginCancellation(state, tasks, event.elapsedMs, "timed_out");
    }
    return successfulStep(freezeState({
      plan: state.plan,
      elapsedMs: event.elapsedMs,
      scopeStatus: state.scopeStatus,
      ...(state.terminalIntent === undefined
        ? {}
        : { terminalIntent: state.terminalIntent }),
      ...(state.terminalTaskId === undefined
        ? {}
        : { terminalTaskId: state.terminalTaskId }),
      tasks,
    }), []);
  }
  if (event.kind === "cancel") {
    if (state.scopeStatus !== "running") return refuse(ERR_RUNTIME_AWAIT_EVENT);
    const intent = event.elapsedMs >= state.plan.timeoutMs ? "timed_out" : "cancelled";
    return beginCancellation(state, tasks, event.elapsedMs, intent);
  }

  const taskIndex = tasks.findIndex((task) => task.taskId === event.taskId);
  if (taskIndex < 0) return refuse(ERR_RUNTIME_AWAIT_UNKNOWN_TASK);
  if (state.scopeStatus === "cancelling") {
    return handleCancellingTaskEvent(state, tasks, taskIndex, event);
  }
  return handleRunningTaskEvent(state, tasks, taskIndex, event);
}
