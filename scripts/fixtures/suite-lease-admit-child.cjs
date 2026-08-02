"use strict";

const [modulePath, root, leaseBase] = process.argv.slice(2);
const { admitInheritedSuiteLease } = require(modulePath);

const lease = admitInheritedSuiteLease({
  root,
  leaseBase,
  expectedCommandClass: "phase-close",
});
process.stdout.write(`${JSON.stringify({ inherited: lease.inherited, ownerPid: lease.ownerPid })}\n`);
