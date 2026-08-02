import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const {
  acquireSuiteLease,
  admitInheritedSuiteLease,
  leasePathForRoot,
} = require("../lib/suite-run-lease.cjs");

const roots = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "galerina-suite-lease-test-"));
  const leaseBase = join(root, "leases");
  const checkout = join(root, "checkout");
  mkdirSync(checkout, { recursive: true });
  roots.push(root);
  return { root: checkout, leaseBase };
}

function errorCode(fn) {
  try {
    fn();
  } catch (error) {
    return error.code;
  }
  return null;
}

test("a second root suite refuses while the exact checkout lease is held", () => {
  const { root, leaseBase } = fixture();
  const first = acquireSuiteLease({
    root,
    leaseBase,
    commandClass: "phase-close",
    ownerPid: 41001,
    ownerParentPid: 41000,
    now: "2026-08-02T20:00:00.000Z",
    nonce: "a".repeat(64),
  });

  assert.equal(errorCode(() => acquireSuiteLease({
    root,
    leaseBase,
    commandClass: "all-tests",
    ownerPid: 42001,
    ownerParentPid: 42000,
    now: "2026-08-02T20:00:01.000Z",
    nonce: "b".repeat(64),
  })), "SUITE-LEASE-HELD");

  assert.equal(first.release(), true);
});

test("different checkout identities do not share a lease", () => {
  const { root, leaseBase } = fixture();
  const otherRoot = join(root, "other");
  mkdirSync(otherRoot, { recursive: true });

  assert.notEqual(
    leasePathForRoot(root, { leaseBase }),
    leasePathForRoot(otherRoot, { leaseBase }),
  );
});

test("a nested aggregate requires the exact nonce and an admitted process parent", () => {
  const { root, leaseBase } = fixture();
  const lease = acquireSuiteLease({
    root,
    leaseBase,
    commandClass: "phase-close",
    ownerPid: 43001,
    ownerParentPid: 43000,
    now: "2026-08-02T20:01:00.000Z",
    nonce: "c".repeat(64),
  });
  const environment = lease.childEnvironment({});

  const inherited = admitInheritedSuiteLease({
    root,
    leaseBase,
    expectedCommandClass: "phase-close",
    environment,
    parentPid: 43001,
  });
  assert.equal(inherited.inherited, true);
  assert.equal(inherited.ownerPid, 43001);

  const mediated = admitInheritedSuiteLease({
    root,
    leaseBase,
    expectedCommandClass: "phase-close",
    environment: {
      ...environment,
      GALERINA_SUITE_LEASE_MEDIATOR_PID: "43002",
    },
    parentPid: 43002,
  });
  assert.equal(mediated.inherited, true);

  assert.equal(errorCode(() => admitInheritedSuiteLease({
    root,
    leaseBase,
    expectedCommandClass: "phase-close",
    environment,
    parentPid: 43003,
  })), "SUITE-LEASE-PARENT-MISMATCH");

  assert.equal(errorCode(() => admitInheritedSuiteLease({
    root,
    leaseBase,
    expectedCommandClass: "phase-close",
    environment: {
      ...environment,
      GALERINA_SUITE_LEASE_OWNER_PID: "99999",
      GALERINA_SUITE_LEASE_MEDIATOR_PID: "43002",
    },
    parentPid: 43002,
  })), "SUITE-LEASE-OWNER-MISMATCH");

  assert.equal(errorCode(() => admitInheritedSuiteLease({
    root,
    leaseBase,
    expectedCommandClass: "phase-close",
    environment: {
      ...environment,
      GALERINA_SUITE_LEASE_NONCE: "d".repeat(64),
    },
    parentPid: 43001,
  })), "SUITE-LEASE-NONCE-MISMATCH");

  assert.equal(lease.release(), true);
});

test("malformed, missing, and wrong-root inherited lease records refuse", () => {
  const { root, leaseBase } = fixture();
  const environment = {
    GALERINA_SUITE_LEASE_NONCE: "e".repeat(64),
    GALERINA_SUITE_LEASE_ROOT_ID: "f".repeat(64),
  };

  assert.equal(errorCode(() => admitInheritedSuiteLease({
    root,
    leaseBase,
    expectedCommandClass: "phase-close",
    environment,
    parentPid: 44001,
  })), "SUITE-LEASE-MISSING");

  const leasePath = leasePathForRoot(root, { leaseBase });
  mkdirSync(leasePath, { recursive: true });
  writeFileSync(join(leasePath, "lease.json"), "{", "utf8");
  assert.equal(errorCode(() => admitInheritedSuiteLease({
    root,
    leaseBase,
    expectedCommandClass: "phase-close",
    environment,
    parentPid: 44001,
  })), "SUITE-LEASE-MALFORMED");
});

test("release never removes a lease whose nonce changed", () => {
  const { root, leaseBase } = fixture();
  const lease = acquireSuiteLease({
    root,
    leaseBase,
    commandClass: "all-tests",
    ownerPid: 45001,
    ownerParentPid: 45000,
    now: "2026-08-02T20:02:00.000Z",
    nonce: "1".repeat(64),
  });
  writeFileSync(join(lease.path, "lease.json"), JSON.stringify({
    schemaVersion: 1,
    root: lease.root,
    rootId: lease.rootId,
    commandClass: "all-tests",
    ownerPid: 45001,
    ownerParentPid: 45000,
    startedAt: "2026-08-02T20:02:00.000Z",
    nonce: "2".repeat(64),
  }), "utf8");

  assert.equal(lease.release(), false);
});
