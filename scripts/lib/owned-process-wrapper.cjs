"use strict";

const {
  _encodeOwnedProcessFrame,
  _runOwnedProcessRaw,
} = require("./owned-process-tree.cjs");

const chunks = [];
let bytes = 0;

process.stdin.on("data", (chunk) => {
  bytes += chunk.length;
  if (bytes > 1024 * 1024) {
    process.stderr.write("OWNED_PROCESS_WRAPPER_INPUT_LIMIT\n");
    process.exit(126);
  }
  chunks.push(chunk);
});

process.stdin.on("end", async () => {
  let request;
  try {
    request = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    process.stderr.write("OWNED_PROCESS_WRAPPER_INPUT_MALFORMED\n");
    process.exit(126);
  }
  try {
    const childEnvironment = {
      ...process.env,
      GALERINA_SUITE_LEASE_MEDIATOR_PID: String(process.pid),
    };
    const result = await _runOwnedProcessRaw({ ...request, env: childEnvironment });
    const frame = _encodeOwnedProcessFrame(result);
    process.stdout.write(frame, (error) => {
      if (error) {
        process.stderr.write("OWNED_PROCESS_WRAPPER_OUTPUT_REFUSED\n");
        process.exit(126);
      }
      process.exit(0);
    });
  } catch (error) {
    process.stderr.write(`OWNED_PROCESS_WRAPPER_REFUSED ${error.code || "UNKNOWN"}\n`);
    process.exit(126);
  }
});
