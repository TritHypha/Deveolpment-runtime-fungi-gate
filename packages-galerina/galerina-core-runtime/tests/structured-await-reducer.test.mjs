import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  STRUCTURED_AWAIT_PLAN_VERSION,
  admitStructuredAwaitPlan,
  advanceStructuredAwait,
  startStructuredAwait,
} from "../dist/index.js";

const validPlan = (overrides = {}) => ({
  version: "galerina.runtime.await.v1",
  scopeId: "request:orders-42",
  taskIds: ["customer", "orders", "permissions"],
  timeoutMs: 2_000,
  maxInFlight: 2,
  completion: { kind: "all", onFailure: "cancel_remaining" },
  ...overrides,
});

const admit = (plan = validPlan()) => {
  const result = admitStructuredAwaitPlan(plan);
  assert.equal(result.ok, true, result.ok ? "" : result.error.safeMessage);
  return result.plan;
};

const start = (plan = validPlan()) => {
  const result = startStructuredAwait(admit(plan));
  assert.equal(result.ok, true, result.ok ? "" : result.error.safeMessage);
  return result;
};

const advance = (state, event) => {
  const result = advanceStructuredAwait(state, event);
  assert.equal(result.ok, true, result.ok ? "" : result.error.safeMessage);
  return result;
};

describe("Structured Await plan admission", () => {
  it("reconstructs the exact closed plan instead of returning caller-owned state", () => {
    const input = validPlan();
    const result = admitStructuredAwaitPlan(input);

    assert.equal(result.ok, true);
    assert.equal(STRUCTURED_AWAIT_PLAN_VERSION, "galerina.runtime.await.v1");
    assert.notEqual(result.plan, input);
    assert.notEqual(result.plan.taskIds, input.taskIds);
    assert.deepEqual(result.plan, input);
    assert.equal(Object.isFrozen(result.plan), true);
    assert.equal(Object.isFrozen(result.plan.taskIds), true);
    assert.equal(Object.isFrozen(result.plan.completion), true);
  });

  it("refuses every malformed closed-plan dimension with a stable runtime code", () => {
    const cases = [
      [validPlan({ version: "galerina.runtime.await.v0" }), "ERR_RUNTIME_AWAIT_PLAN_VERSION"],
      [validPlan({ scopeId: "" }), "ERR_RUNTIME_AWAIT_SCOPE_ID"],
      [validPlan({ scopeId: "bad scope" }), "ERR_RUNTIME_AWAIT_SCOPE_ID"],
      [validPlan({ taskIds: [] }), "ERR_RUNTIME_AWAIT_TASKS"],
      [validPlan({ taskIds: ["ok", "bad task"] }), "ERR_RUNTIME_AWAIT_TASK_ID"],
      [validPlan({ taskIds: ["same", "same"] }), "ERR_RUNTIME_AWAIT_TASK_DUPLICATE"],
      [validPlan({ timeoutMs: 0 }), "ERR_RUNTIME_AWAIT_TIMEOUT"],
      [validPlan({ timeoutMs: Number.POSITIVE_INFINITY }), "ERR_RUNTIME_AWAIT_TIMEOUT"],
      [validPlan({ maxInFlight: 0 }), "ERR_RUNTIME_AWAIT_CONCURRENCY"],
      [validPlan({ maxInFlight: 4 }), "ERR_RUNTIME_AWAIT_CONCURRENCY"],
      [validPlan({ completion: { kind: "all", onFailure: "unknown" } }), "ERR_RUNTIME_AWAIT_COMPLETION"],
      [validPlan({ completion: { kind: "first_success", onFailure: "wait_for_all" } }), "ERR_RUNTIME_AWAIT_COMPLETION"],
      [{ ...validPlan(), extra: true }, "ERR_RUNTIME_AWAIT_PLAN_SHAPE"],
    ];

    for (const [input, code] of cases) {
      const result = admitStructuredAwaitPlan(input);
      assert.equal(result.ok, false, `expected ${code}`);
      assert.equal(result.error.code, code);
    }
  });

  it("refuses accessor-backed fields without invoking their getter", () => {
    let getterCalls = 0;
    const input = validPlan();
    Object.defineProperty(input, "timeoutMs", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 2_000;
      },
    });

    const result = admitStructuredAwaitPlan(input);
    assert.equal(result.ok, false);
    assert.equal(result.error.code, "ERR_RUNTIME_AWAIT_PLAN_SHAPE");
    assert.equal(getterCalls, 0);
  });

  it("caps task count at 1024", () => {
    const taskIds = Array.from({ length: 1_025 }, (_, index) => `task-${index}`);
    const result = admitStructuredAwaitPlan(validPlan({ taskIds, maxInFlight: 1 }));
    assert.equal(result.ok, false);
    assert.equal(result.error.code, "ERR_RUNTIME_AWAIT_TASKS");
  });
});

describe("Structured Await deterministic reducer", () => {
  it("starts no more than maxInFlight tasks in declared order", () => {
    const result = start();
    assert.equal(result.state.scopeStatus, "running");
    assert.deepEqual(result.commands, [
      { kind: "start", taskId: "customer" },
      { kind: "start", taskId: "orders" },
    ]);
    assert.deepEqual(result.state.tasks.map((task) => task.status), [
      "running",
      "running",
      "pending",
    ]);
  });

  it("wait_for_all fills capacity and fails only after every task is terminal", () => {
    let step = start(validPlan({
      completion: { kind: "all", onFailure: "wait_for_all" },
    }));

    step = advance(step.state, {
      kind: "task_failed",
      taskId: "customer",
      elapsedMs: 10,
    });
    assert.equal(step.state.scopeStatus, "running");
    assert.deepEqual(step.commands, [{ kind: "start", taskId: "permissions" }]);

    step = advance(step.state, {
      kind: "task_succeeded",
      taskId: "orders",
      elapsedMs: 11,
    });
    assert.equal(step.state.scopeStatus, "running");

    step = advance(step.state, {
      kind: "task_succeeded",
      taskId: "permissions",
      elapsedMs: 12,
    });
    assert.equal(step.state.scopeStatus, "failed");
    assert.deepEqual(step.commands, [{ kind: "terminal", outcome: "failed" }]);
  });

  it("cancel_remaining does not claim failure completion until running siblings acknowledge termination", () => {
    let step = start();
    step = advance(step.state, {
      kind: "task_failed",
      taskId: "customer",
      elapsedMs: 10,
    });

    assert.equal(step.state.scopeStatus, "cancelling");
    assert.equal(step.state.terminalIntent, "failed");
    assert.deepEqual(step.commands, [{ kind: "cancel", taskId: "orders" }]);
    assert.deepEqual(step.state.tasks.map((task) => task.status), [
      "failed",
      "running",
      "cancelled",
    ]);

    step = advance(step.state, {
      kind: "task_cancelled",
      taskId: "orders",
      elapsedMs: 11,
    });
    assert.equal(step.state.scopeStatus, "failed");
    assert.deepEqual(step.commands, [{ kind: "terminal", outcome: "failed" }]);
  });

  it("first_result retains the winner but waits for losing work to terminate", () => {
    let step = start(validPlan({ completion: { kind: "first_result" } }));
    step = advance(step.state, {
      kind: "task_succeeded",
      taskId: "customer",
      elapsedMs: 5,
    });

    assert.equal(step.state.scopeStatus, "cancelling");
    assert.equal(step.state.terminalIntent, "succeeded");
    assert.equal(step.state.terminalTaskId, "customer");
    assert.deepEqual(step.commands, [{ kind: "cancel", taskId: "orders" }]);

    step = advance(step.state, {
      kind: "task_failed",
      taskId: "orders",
      elapsedMs: 6,
    });
    assert.equal(step.state.scopeStatus, "succeeded");
    assert.deepEqual(step.commands, [{
      kind: "terminal",
      outcome: "succeeded",
      taskId: "customer",
    }]);
  });

  it("treats an unsolicited task cancellation as failure, never success", () => {
    let step = start();
    step = advance(step.state, {
      kind: "task_cancelled",
      taskId: "customer",
      elapsedMs: 5,
    });

    assert.equal(step.state.scopeStatus, "cancelling");
    assert.equal(step.state.terminalIntent, "failed");
    assert.deepEqual(step.commands, [{ kind: "cancel", taskId: "orders" }]);

    step = advance(step.state, {
      kind: "task_cancelled",
      taskId: "orders",
      elapsedMs: 6,
    });
    assert.equal(step.state.scopeStatus, "failed");
  });

  it("first_success continues after failures and cancels only after a success", () => {
    let step = start(validPlan({ completion: { kind: "first_success" } }));
    step = advance(step.state, {
      kind: "task_failed",
      taskId: "customer",
      elapsedMs: 5,
    });
    assert.equal(step.state.scopeStatus, "running");
    assert.deepEqual(step.commands, [{ kind: "start", taskId: "permissions" }]);

    step = advance(step.state, {
      kind: "task_succeeded",
      taskId: "permissions",
      elapsedMs: 6,
    });
    assert.equal(step.state.scopeStatus, "cancelling");
    assert.deepEqual(step.commands, [{ kind: "cancel", taskId: "orders" }]);

    step = advance(step.state, {
      kind: "task_cancelled",
      taskId: "orders",
      elapsedMs: 7,
    });
    assert.equal(step.state.scopeStatus, "succeeded");
  });

  it("times out exactly at the declared boundary and waits for acknowledgements", () => {
    let step = start();
    step = advance(step.state, { kind: "tick", elapsedMs: 1_999 });
    assert.equal(step.state.scopeStatus, "running");
    assert.deepEqual(step.commands, []);

    step = advance(step.state, { kind: "tick", elapsedMs: 2_000 });
    assert.equal(step.state.scopeStatus, "cancelling");
    assert.equal(step.state.terminalIntent, "timed_out");
    assert.deepEqual(step.commands, [
      { kind: "cancel", taskId: "customer" },
      { kind: "cancel", taskId: "orders" },
    ]);

    step = advance(step.state, {
      kind: "task_cancelled",
      taskId: "customer",
      elapsedMs: 2_001,
    });
    assert.equal(step.state.scopeStatus, "cancelling");

    step = advance(step.state, {
      kind: "task_cancelled",
      taskId: "orders",
      elapsedMs: 2_001,
    });
    assert.equal(step.state.scopeStatus, "timed_out");
  });

  it("refuses backwards time, unknown tasks, contradictory events and post-terminal events", () => {
    let step = start(validPlan({
      taskIds: ["only"],
      maxInFlight: 1,
      completion: { kind: "all", onFailure: "wait_for_all" },
    }));

    step = advance(step.state, { kind: "tick", elapsedMs: 10 });
    const backwards = advanceStructuredAwait(step.state, {
      kind: "tick",
      elapsedMs: 9,
    });
    assert.equal(backwards.ok, false);
    assert.equal(backwards.error.code, "ERR_RUNTIME_AWAIT_TIME_REGRESSION");

    const unknown = advanceStructuredAwait(step.state, {
      kind: "task_succeeded",
      taskId: "other",
      elapsedMs: 10,
    });
    assert.equal(unknown.ok, false);
    assert.equal(unknown.error.code, "ERR_RUNTIME_AWAIT_UNKNOWN_TASK");

    step = advance(step.state, {
      kind: "task_succeeded",
      taskId: "only",
      elapsedMs: 11,
    });
    assert.equal(step.state.scopeStatus, "succeeded");

    const late = advanceStructuredAwait(step.state, {
      kind: "task_failed",
      taskId: "only",
      elapsedMs: 12,
    });
    assert.equal(late.ok, false);
    assert.equal(late.error.code, "ERR_RUNTIME_AWAIT_TERMINAL_STATE");
  });

  it("refuses a second terminal event for a task while sibling work remains active", () => {
    let step = start(validPlan({
      taskIds: ["first", "second"],
      maxInFlight: 2,
      completion: { kind: "all", onFailure: "wait_for_all" },
    }));

    step = advance(step.state, {
      kind: "task_succeeded",
      taskId: "first",
      elapsedMs: 1,
    });
    assert.equal(step.state.scopeStatus, "running");

    const repeated = advanceStructuredAwait(step.state, {
      kind: "task_failed",
      taskId: "first",
      elapsedMs: 2,
    });
    assert.equal(repeated.ok, false);
    assert.equal(repeated.error.code, "ERR_RUNTIME_AWAIT_TASK_STATE");
  });

  it("refuses copied state and accessor-backed events without invoking getters", () => {
    const step = start();
    const copied = { ...step.state };
    const forged = advanceStructuredAwait(copied, { kind: "tick", elapsedMs: 1 });
    assert.equal(forged.ok, false);
    assert.equal(forged.error.code, "ERR_RUNTIME_AWAIT_STATE");

    let getterCalls = 0;
    const event = { kind: "tick" };
    Object.defineProperty(event, "elapsedMs", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 1;
      },
    });
    const accessor = advanceStructuredAwait(step.state, event);
    assert.equal(accessor.ok, false);
    assert.equal(accessor.error.code, "ERR_RUNTIME_AWAIT_EVENT");
    assert.equal(getterCalls, 0);
  });

  it("gives the exact deadline precedence over a task success", () => {
    let step = start(validPlan({
      taskIds: ["only"],
      maxInFlight: 1,
      completion: { kind: "first_result" },
    }));
    step = advance(step.state, {
      kind: "task_succeeded",
      taskId: "only",
      elapsedMs: 2_000,
    });

    assert.equal(step.state.scopeStatus, "timed_out");
    assert.deepEqual(step.commands, [{ kind: "terminal", outcome: "timed_out" }]);
  });

  it("replays the same admitted event sequence byte-for-byte deterministically", () => {
    const run = () => {
      let step = start(validPlan({ completion: { kind: "first_result" } }));
      const trace = [step];
      step = advance(step.state, {
        kind: "task_failed",
        taskId: "orders",
        elapsedMs: 7,
      });
      trace.push(step);
      step = advance(step.state, {
        kind: "task_cancelled",
        taskId: "customer",
        elapsedMs: 8,
      });
      trace.push(step);
      return JSON.stringify(trace);
    };

    assert.equal(run(), run());
  });
});
