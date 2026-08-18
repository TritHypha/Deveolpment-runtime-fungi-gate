# TypeScript-to-Fungi signed-i32 subdomain functions implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate non-authorizing Fungi `Int` kernels for a closed subset of TypeScript functions over an explicitly narrowed signed-i32 input domain.

**Architecture:** Extend the existing classifier with a marker-bearing signed-i32 parameter profile while retaining its current closed AST whitelist. Extend differential-vector generation with a fixed five-value signed-i32 domain and add an immutable restriction marker to emitted Fungi. The controller continues to bind compiler, physical, mutation, source-digest, and duplication/shadow evidence without releasing authority.

**Tech Stack:** Node.js, TypeScript compiler API, `node:test`, Galerina compiler, SLIDE/VOK.

## Global Constraints

- Keep every TypeScript source unchanged and authoritative for the full JavaScript `number` domain.
- Generate only a non-authorizing signed-i32 subdomain kernel, never a whole-function replacement.
- Admit one or two required parameters, at least one exact `number`, with every parameter exactly `number` or `boolean`.
- Permit only existing closed return/branch syntax, primitive literals, identifiers, parentheses, Boolean negation, strict equality/inequality, numeric ordering, and Boolean conjunction/disjunction.
- Refuse calls, properties, arithmetic, modulo, bitwise, shifts, mutation, coercion, Float, negative zero, async, generators, optionals, defaults, rest, String, objects, and three-or-more parameters.
- Bind `numericDomain: signed-i32-subdomain` and `wholeSourceDomainProved: false` in the classifier and generated source.
- Use `[-2147483648, -1, 0, 1, 2147483647]` for each numeric differential input and `[false, true]` for Boolean inputs.
- Run discovery with a maximum of 10 real-package candidates.
- Preserve byte, normalized, identifier-alpha, and sibling-shadow refusal checks.
- Do not stage or commit below 40 new unique `.fungi` files; 50 is expected. Do not push.

---

### Task 1: Classifier and lowering contract tests

**Files:**
- Modify: `scripts/tests/ts-to-fungi-sandbox.test.mjs`
- Test: `scripts/tests/ts-to-fungi-sandbox.test.mjs`

**Interfaces:**
- Consumes: `classifyTypeScriptSource`, `lowerClassifiedSymbol`, compiler evidence, and physical evidence.
- Produces: failing tests for marker-bearing signed-i32 classifications, fixed vectors, restriction comments, and exact refusal cases.

- [ ] **Step 1: Add the positive classification test**

Add a test for `identity(value: number): number`, all six strict comparison operators over two numeric parameters, and a mixed `number`/`boolean` total branch. Assert `SUPPORTED`, numeric parameter domain markers, `numericDomain === "signed-i32-subdomain"`, `wholeSourceDomainProved === false`, and no authority/consumer/retirement flags set true.

- [ ] **Step 2: Add the lowering and vector test**

Assert numeric parameters lower to Fungi `Int`, the source contains the exact signed-i32 restriction comment, one numeric parameter yields the exact five vectors, two numeric parameters yield 25 vectors, and the emitted candidate passes compiler and physical evidence.

- [ ] **Step 3: Add the refusal test**

Assert non-`SUPPORTED` for three parameters, String/number mixtures, Float and negative-zero literals, arithmetic, modulo, bitwise, every shift, calls, properties, assignments, ternaries, loops, async, optional/default/rest/destructured parameters, and marker forgery or deletion at the lowerer boundary.

- [ ] **Step 4: Verify RED**

```powershell
node --test --test-name-pattern "signed-i32 subdomain" scripts/tests/ts-to-fungi-sandbox.test.mjs
```

Expected: positive classification fails because numeric parameters are currently blocked; refusal assertions either pass or identify an existing widening that Task 2 must close.

---

### Task 2: Minimal signed-i32 classifier and lowerer

**Files:**
- Modify: `scripts/lib/ts-to-fungi-sandbox/classifier.mjs`
- Modify: `scripts/lib/ts-to-fungi-sandbox/lowerer.mjs`
- Test: `scripts/tests/ts-to-fungi-sandbox.test.mjs`

**Interfaces:**
- Consumes: the classifier's existing AST whitelist, private admitted-classification custody, `physicalInt`, and the lowerer's existing expression/statement translation.
- Produces: numeric parameter records `{ name, type: "number", domain: "signed-i32-subdomain" }`, classification fields `numericDomain` and `wholeSourceDomainProved`, fixed integer differential vectors, and an exact generated-source restriction comment.

- [ ] **Step 1: Admit only the closed parameter shape**

Collect parameters before deciding the domain. When at least one parameter is `number`, require one or two total parameters and require every parameter to be `number` or `boolean`. Add the domain property only to numeric parameter records.

- [ ] **Step 2: Validate every numeric literal**

For the signed-i32 profile, accept only direct decimal/binary/octal/hexadecimal integer literals with optional unary minus, no separators, no leading plus, no exponent, no Float, no negative zero, and a value inside signed-i32. Refuse every numeric literal or unary numeric form outside that grammar before general lowering.

- [ ] **Step 3: Mint the restricted classification**

On an otherwise admitted function containing numeric parameters, add exactly:

```javascript
numericDomain: "signed-i32-subdomain",
wholeSourceDomainProved: false,
productionAuthorityReleased: false,
consumerSwitched: false,
typescriptRetired: false
```

Keep existing Boolean-only function classifications unchanged.

- [ ] **Step 4: Generate exact vectors and source marker**

Map numeric parameters to `Int` and the five-value integer domain. Add this fixed line before the flow declaration:

```text
/// Restricted input contract: signed-i32 subdomain only; TypeScript remains the whole-Number oracle.
```

Include `numericDomain` and `wholeSourceDomainProved` in the lowerer's frozen output so receipts and verification bind them.

- [ ] **Step 5: Verify GREEN**

```powershell
node --test --test-name-pattern "signed-i32 subdomain" scripts/tests/ts-to-fungi-sandbox.test.mjs
```

Expected: all signed-i32 tests pass.

---

### Task 3: Regression, bounded discovery, and commit refusal

**Files:**
- Verify: `scripts/lib/ts-to-fungi-sandbox/classifier.mjs`
- Verify: `scripts/lib/ts-to-fungi-sandbox/lowerer.mjs`
- Verify: `scripts/lib/ts-to-fungi-sandbox/controller.mjs`
- Verify: `scripts/tests/ts-to-fungi-sandbox.test.mjs`
- Create only when all gates pass: converter-selected real-package `.fungi` candidates

**Interfaces:**
- Consumes: the full converter test suite, real discovery, compiler/physical evidence, and the conversion commit guard.
- Produces: at most ten unique real-package candidates or an explicit exhausted/refusal log; never a premature commit.

- [ ] **Step 1: Run focused adjacent tests**

Run the signed-i32, existing Boolean function, base-prefixed constant, Float, lowerer, compiler, physical, and duplication/shadow tests together.

- [ ] **Step 2: Run the full converter suite**

```powershell
node --test scripts/tests/ts-to-fungi-sandbox.test.mjs
```

Expected: all tests pass with no failures.

- [ ] **Step 3: Run bounded discovery**

```powershell
node scripts/ts-to-fungi-sandbox.mjs discover --limit 10 --out build/ts-to-fungi-sandbox/signed-i32-subdomain-trial-10.json --project Galerina
```

Expected: zero to ten selected real-package requests, complete accounting, and no `galerina-test` source.

- [ ] **Step 4: Convert only the selected manifest**

Publish candidates only when compiler, physical SLIDE/VOK, mutation, source-digest, and all four duplication/shadow checks pass. Keep every `.ts` byte unchanged.

- [ ] **Step 5: Enforce the worktree gate**

Run uniqueness-only and full worktree commit guards. Refuse staging and commit when fewer than 40 new unique `.fungi` files exist. Recheck the previous two commits for zero or one report each and hard-refuse a second consecutive report-bearing commit.
