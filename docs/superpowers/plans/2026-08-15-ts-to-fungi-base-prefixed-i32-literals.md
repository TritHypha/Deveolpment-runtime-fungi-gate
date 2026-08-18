# TypeScript-to-Fungi base-prefixed i32 literals implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admit only direct binary, octal, and hexadecimal TypeScript literals whose values fit the proved signed-i32 Fungi/SLIDE profile.

**Architecture:** Add one exact source-lexeme classifier for direct base-prefixed literals and keep it outside the existing general integer evaluator. Detect radix tokens inside aliases and expressions so they remain refused. Reuse the existing canonical decimal `Int` lowering and evidence pipeline.

**Tech Stack:** Node.js, TypeScript compiler API, `node:test`, Galerina compiler, SLIDE/VOK evidence.

## Global Constraints

- Keep every TypeScript source unchanged.
- Accept only direct immutable top-level constants and explicit `const enum` members.
- Accept optional unary minus plus binary, octal, or hexadecimal digits with no separators.
- Require the exact value to be within `[-2147483648, 2147483647]` and refuse negative zero.
- Refuse aliases, arithmetic, shifts, bitwise expressions, calls, properties, legacy octal, leading plus, BigInt, decimal Float, and exponent notation for this capability.
- Lower the admitted value to canonical decimal Fungi `Int`; do not invent radix syntax.
- Run real-package discovery with `--limit 10` only after focused and full converter tests pass.
- Do not stage or commit until at least 40 new unique `.fungi` files exist; 50 is expected.
- Check every candidate for byte, normalized, identifier-alpha, and sibling shadow duplication.
- Allow at most one report in a commit and refuse two consecutive report-bearing commits.
- Do not push.

---

### Task 1: Classifier contract tests

**Files:**
- Modify: `scripts/tests/ts-to-fungi-sandbox.test.mjs`
- Test: `scripts/tests/ts-to-fungi-sandbox.test.mjs`

**Interfaces:**
- Consumes: `classifyTypeScriptSource({ source, file, symbol })` and `lowerClassifiedSymbol(classification)`.
- Produces: failing tests that define the direct-radix admission and refusal boundary.

- [ ] **Step 1: Add the failing direct-literal test**

Add one test that classifies lower- and upper-case hexadecimal, octal, and binary constants, signed values, zero, and both signed-i32 boundaries. Assert `SUPPORTED`, `{ type: "number", value }`, canonical decimal `Int` lowering, and unchanged TypeScript-oracle provenance.

- [ ] **Step 2: Add the failing refusal test**

Add one test that asserts non-`SUPPORTED` outcomes for separators, leading plus, legacy octal, BigInt, Float/exponent, negative zero, `2^31`, below `-2^31`, aliases, arithmetic, shifts, bitwise expressions, property reads, calls, `let`, and runtime enums.

- [ ] **Step 3: Verify RED**

Run:

```powershell
node --test --test-name-pattern "base-prefixed i32" scripts/tests/ts-to-fungi-sandbox.test.mjs
```

Expected: the positive test fails because direct radix literals remain blocked; the refusal test must already pass or expose an existing widening that the implementation must close.

---

### Task 2: Minimal direct-radix classifier

**Files:**
- Modify: `scripts/lib/ts-to-fungi-sandbox/classifier.mjs`
- Test: `scripts/tests/ts-to-fungi-sandbox.test.mjs`

**Interfaces:**
- Consumes: `numericSourceLexeme`, `physicalInt`, TypeScript AST nodes, and exact `SourceFile` text.
- Produces: `basePrefixedI32Literal(node, sourceFile)` returning `{ type: "number", value } | undefined`, and `containsBasePrefixedNumericLiteral(node, sourceFile)` for fail-closed nested-token detection.

- [ ] **Step 1: Implement exact lexeme parsing**

Match only:

```text
-?0[xX][0-9a-fA-F]+
-?0[oO][0-7]+
-?0[bB][01]+
```

Parse the unsigned magnitude with `Number`, apply the unary-minus sign separately, and require `physicalInt(value)`.

- [ ] **Step 2: Admit only direct owner nodes**

In `classifyTypeScriptSource`, check the top-level initializer with `basePrefixedI32Literal` before the general `literalValue` path. In explicit `const enum` handling, do the same for the member initializer using the owning `SourceFile`.

- [ ] **Step 3: Refuse nested radix tokens**

Before the existing general integer evaluator runs, refuse any alias or expression tree containing a base-prefixed numeric source token. This preserves existing decimal integer behavior while preventing radix expressions from entering through `integerLiteral`.

- [ ] **Step 4: Verify GREEN**

Run:

```powershell
node --test --test-name-pattern "base-prefixed i32" scripts/tests/ts-to-fungi-sandbox.test.mjs
```

Expected: all radix-focused tests pass.

---

### Task 3: Regression and bounded real-package discovery

**Files:**
- Verify: `scripts/lib/ts-to-fungi-sandbox/classifier.mjs`
- Verify: `scripts/lib/ts-to-fungi-sandbox/lowerer.mjs`
- Verify: `scripts/tests/ts-to-fungi-sandbox.test.mjs`
- Create only when evidence passes: real-package `.fungi` files selected by the converter

**Interfaces:**
- Consumes: the existing compiler, physical evidence, receipt, and duplicate/shadow gates.
- Produces: at most ten evidence-backed real-package candidates or an explicit exhausted/refusal log.

- [ ] **Step 1: Run focused compatibility tests**

Run the existing explicit-i32, finite-Float, lowerer, compiler-evidence, physical-evidence, and duplication/shadow tests alongside the new radix tests.

- [ ] **Step 2: Run the full converter suite**

```powershell
node --test scripts/tests/ts-to-fungi-sandbox.test.mjs
```

Expected: all tests pass with no warnings.

- [ ] **Step 3: Run bounded discovery**

```powershell
node scripts/ts-to-fungi-sandbox.mjs discover --limit 10 --out build/ts-to-fungi-sandbox/base-prefixed-i32-trial-10.json --project Galerina
```

Expected: zero to ten real-package requests, with every scanned scope accounted for and `galerina-test` excluded.

- [ ] **Step 4: Convert only the selected batch**

Run the converter against the produced manifest without changing any `.ts` file. Publish only candidates whose compiler, physical SLIDE/VOK, mutation, and four duplication/shadow checks all pass.

- [ ] **Step 5: Enforce the commit gate**

Run the worktree conversion guard and uniqueness audit. Do not stage or commit if fewer than 40 new unique `.fungi` files exist. Record the remaining count and continue with another small approved capability block instead.
