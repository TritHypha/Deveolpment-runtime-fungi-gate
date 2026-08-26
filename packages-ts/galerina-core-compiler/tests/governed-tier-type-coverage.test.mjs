// =============================================================================
// The `governed` tier must be TYPE-CHECKED like every other tier.
//
// THE DEFECT UNDER TEST (IMP-232). `type-checker.ts` never mentions
// `governedFlowDecl` anywhere in the file. It is omitted at BOTH sites that
// decide whether a node is a flow:
//
//   :832  FLOW_DECL_KINDS  — the signature registry. Builds flowReturnTypes,
//         flowParamTypes, flowDeclaredEffects and declaredFlowNames.
//   :1343 the walk switch  — sets currentReturnType/currentFlowEffects, registers
//         parameters, and recurses into the body.
//
// So a governed flow is not merely missing one check: it is absent from the type
// system. Its return type is never registered (so a wrong `return` is unnoticed),
// its parameters are never typed, its declared effects are never recorded, and its
// name never enters the duplicate-name registry.
//
// This is the SAME class as IMP-229 (FUNGI-ARCH-002): a four-kind set that omits
// the fifth kind, compounded by keying the flow by `node.value` — which for a
// governed flow is the ENCODED `governed:<floor>:<name>`, not the name.
//
// WHY EVERY CASE IS PAIRED. A single silent arm proves nothing: the vector might
// simply not be an error. Each vector is therefore run at `guarded` AND at
// `governed` with the tier keyword as the ONLY variable. If a guarded arm ever
// stops firing, this file reports a dead control rather than a false gap.
// =============================================================================
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { parseProgram, checkTypes } from "../dist/index.js";

function typeErrors(src) {
  const p = parseProgram(src, "governed-tier-type.fungi");
  const parseErrors = p.diagnostics.filter((d) => d.severity === "error");
  const diags = checkTypes(p.ast).diagnostics.filter((d) => d.severity === "error");
  return { parseErrors, codes: diags.map((d) => d.code), diags };
}

/** A flow declared `-> Int` that returns a String. `tier` is the only variable. */
const badReturn = (tier) => `${tier} flow probe(x: Int) -> Int
contract { intent { "declared Int, returns String" } }
{ return "not an int" }`;

/** Two flows sharing one name — FUNGI-NAME-002 at every other tier. */
const dupName = (tier) => `${tier} flow twice(x: Int) -> Int
contract { intent { "first" } }
{ return x }
${tier} flow twice(x: Int) -> Int
contract { intent { "second — a duplicate" } }
{ return x }`;

describe("governed tier type coverage (IMP-232)", () => {
  it("CONTROL: the governed fixture parses clean — the vector is well-formed", () => {
    assert.deepEqual(typeErrors(badReturn("governed floor_3")).parseErrors, [],
      "a parse error here would make the governed arm untestable, not exempt");
  });

  it("CONTROL: a wrong return type IS refused at the guarded tier", () => {
    const { codes } = typeErrors(badReturn("guarded"));
    assert.ok(codes.includes("FUNGI-TYPE-008"),
      `if TYPE-008 is absent here the checker is not firing at all and this file proves nothing about tiers; got ${codes.join(",") || "(none)"}`);
  });

  it("CONTROL: a wrong return type IS refused at the pure tier — a second live tier", () => {
    assert.ok(typeErrors(badReturn("pure")).codes.includes("FUNGI-TYPE-008"));
  });

  it("CONTROL: a CORRECT governed flow is clean — refusal below would be confounded", () => {
    const ok = `governed floor_3 flow probe(x: Int) -> Int
contract { intent { "well typed" } }
{ return x }`;
    assert.deepEqual(typeErrors(ok).codes, [],
      "a governed flow that is right must pass, or a failure on the error arm proves nothing");
  });

  it("★ a wrong return type is refused at the GOVERNED tier", () => {
    const { codes } = typeErrors(badReturn("governed floor_3"));
    assert.ok(codes.includes("FUNGI-TYPE-008"),
      "the identical program is TYPE-008 at guarded and at pure. Cause: type-checker.ts:832 "
      + "(signature registry) and :1343 (walk switch) both omit governedFlowDecl, so the flow's "
      + "return type is never registered and its body is never walked. "
      + `Got: ${codes.join(",") || "(no diagnostics at all)"}`);
  });

  it("CONTROL: a duplicate flow name IS refused at the guarded tier", () => {
    assert.ok(typeErrors(dupName("guarded")).codes.includes("FUNGI-NAME-002"));
  });

  it("★ a duplicate flow name is refused at the GOVERNED tier", () => {
    const { codes } = typeErrors(dupName("governed floor_3"));
    assert.ok(codes.includes("FUNGI-NAME-002"),
      "declaredFlowNames is populated under the same omitted kind set, so two governed flows may "
      + "share a name and collide only at WASM instantiate ('Duplicate export name'). "
      + `Got: ${codes.join(",") || "(none)"}`);
  });

  it("★ the governed flow is registered under its DECLARED name, not the encoded value", () => {
    // `node.value` for a governed flow is "governed:<floor>:<name>". Admitting the
    // kind without decoding would key the registry by the encoding — every lookup
    // by `probe` would miss, and any diagnostic would print the encoding.
    const { diags } = typeErrors(badReturn("governed floor_3"));
    if (diags.length === 0) return;   // the arm above already reports the gap
    for (const d of diags) {
      assert.ok(!(d.message ?? "").includes("governed:floor_3:"),
        `the encoded value must never reach a diagnostic — decode via flow-name.ts; got: ${d.message}`);
    }
  });
});
