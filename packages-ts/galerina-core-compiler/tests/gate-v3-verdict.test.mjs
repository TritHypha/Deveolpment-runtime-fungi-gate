// gate-v3-verdict.test.mjs — G3 rung 5: the K3 verdict algebra as executable
// rows (KTA plan 27, step 5; RD-0231 V3's machine-proven properties re-proven
// here against THIS implementation, not assumed from the KB).
import { test } from "node:test";
import assert from "node:assert/strict";
import { vAnd, foldVerdicts } from "../dist/index.js";

const ALL = ["deny", "indeterminate", "allow"];
const rank = { deny: 0, indeterminate: 1, allow: 2 };

test("verdict: vAnd is min over ALL NINE pairs — the whole table, not samples", () => {
  for (const left of ALL) {
    for (const right of ALL) {
      const expected = rank[left] <= rank[right] ? left : right;
      assert.equal(vAnd(left, right), expected, `vAnd(${left}, ${right})`);
    }
  }
});

test("verdict: deny dominates — any fold containing deny is deny", () => {
  for (const other of ALL) {
    assert.equal(vAnd("deny", other), "deny");
    assert.equal(vAnd(other, "deny"), "deny");
  }
  assert.equal(foldVerdicts(["allow", "allow", "deny", "allow"]), "deny");
});

test("verdict: monotone — ANDing an operand can only LOWER a verdict, never raise it", () => {
  for (const start of ALL) {
    for (const operand of ALL) {
      assert.ok(rank[vAnd(start, operand)] <= rank[start], `vAnd(${start}, ${operand}) must not exceed ${start}`);
    }
  }
});

test("verdict: commutative and associative — fold order cannot change the answer", () => {
  for (const a of ALL) for (const b of ALL) {
    assert.equal(vAnd(a, b), vAnd(b, a), `commutativity at (${a}, ${b})`);
    for (const c of ALL) {
      assert.equal(vAnd(vAnd(a, b), c), vAnd(a, vAnd(b, c)), `associativity at (${a}, ${b}, ${c})`);
    }
  }
});

test("verdict: THE EMPTY FOLD IS INDETERMINATE — never allow", () => {
  // The load-bearing row. min's semiring identity is the TOP element (allow),
  // so the algebraically convenient empty answer is exactly the fail-open the
  // lattice forbids: nothing established must never read as permitted.
  assert.equal(foldVerdicts([]), "indeterminate");
  assert.notEqual(foldVerdicts([]), "allow");
});

test("verdict: singleton fold is the element itself — the fold adds nothing", () => {
  for (const v of ALL) assert.equal(foldVerdicts([v]), v);
});
