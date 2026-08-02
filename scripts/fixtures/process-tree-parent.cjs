"use strict";

const { spawn } = require("node:child_process");
const path = require("node:path");

const child = spawn(
  process.execPath,
  [path.join(__dirname, "process-tree-child.cjs")],
  { stdio: "ignore", windowsHide: true },
);

process.stdout.write(`${JSON.stringify({
  parentPid: process.pid,
  childPid: child.pid,
})}\n`);

setInterval(() => {}, 1_000);
