import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createRequirementValidatorAuthorityRegistry,
  verifyRequirementValidatorAuthority,
} from "../dist/index.js";

const SOURCE_UNIT = "package.example.policy";
const FLOW = "validateAge";
const QUALIFIED_FLOW = `${SOURCE_UNIT}::${FLOW}`;
const SOURCE_BUILD = "git:0123456789abcdef0123456789abcdef01234567";
const PROFILE = "slide.scalar-1";
const AUTHORITY_VERSION = "1.0.0";
const CHECKED_DIGEST = `sha256:${"a".repeat(64)}`;
const OTHER_DIGEST = `sha256:${"b".repeat(64)}`;
const VALID_FROM = "2026-08-20T00:00:00.000Z";
const EXPIRES_AT = "2026-08-21T00:00:00.000Z";
const COMPARISON_TIME = "2026-08-20T12:00:00.000Z";
const SINGLE_ROW_REGISTRY_KAT = "sha256:b6648890dd5a89eec7c4c5baf41a995e98dcb533fa86d35a4c1485aac967c94d";

const baseRow = (overrides = {}) => ({
  authorityVersion: AUTHORITY_VERSION,
  qualifiedFlowIdentity: QUALIFIED_FLOW,
  sourceBuild: SOURCE_BUILD,
  inputType: "String",
  taintClasses: ["web.request"],
  outputType: "Verdict",
  observedEffect: "EffectFree",
  checkedProfile: PROFILE,
  checkedDigest: CHECKED_DIGEST,
  validFrom: VALID_FROM,
  expiresAt: EXPIRES_AT,
  ...overrides,
});

const baseRequest = (overrides = {}) => ({
  localFlowName: FLOW,
  inputType: "String",
  taintClasses: ["web.request"],
  outputType: "Verdict",
  observedEffects: [],
  checkedDigest: CHECKED_DIGEST,
  ...overrides,
});

const baseContext = (registry, overrides = {}) => ({
  expectedRegistryDigest: registry.digest,
  canonicalSourceUnitId: SOURCE_UNIT,
  sourceBuild: SOURCE_BUILD,
  checkedProfile: PROFILE,
  acceptedAuthorityVersion: AUTHORITY_VERSION,
  comparisonTime: COMPARISON_TIME,
  ...overrides,
});

const structured = (rows = [baseRow()], limits) => {
  const registry = createRequirementValidatorAuthorityRegistry(rows, limits);
  assert.equal(registry.state, "STRUCTURALLY_VALID", JSON.stringify(registry));
  return registry;
};

const assertRefused = (actual, reason) => {
  assert.deepEqual(actual, { state: "REFUSED", reason });
  assert.ok(Object.isFrozen(actual));
};

const freezeRow = (row) => Object.freeze({
  ...row,
  taintClasses: Object.freeze([...row.taintClasses]),
});

const forgeStructuredRegistry = (rows, digest) => Object.freeze({
  state: "STRUCTURALLY_VALID",
  rows: Object.freeze(rows.map(freezeRow)),
  digest,
  canonicalBytes: 0,
});

const assertForgedRegistryRefused = (registry) => {
  const result = verifyRequirementValidatorAuthority(
    registry,
    baseRequest(),
    baseContext({ digest: registry.digest }),
  );
  assert.equal(result.state, "REFUSED", JSON.stringify(result));
  assert.ok(Object.isFrozen(result));
};

const verifyRows = (rows, requestOverrides = {}, contextOverrides = {}) => {
  const registry = structured(rows);
  return verifyRequirementValidatorAuthority(
    registry,
    baseRequest(requestOverrides),
    baseContext(registry, contextOverrides),
  );
};

describe("RD-0858 validator authority registry", () => {
  it("exports the low-level non-admission authority contract", () => {
    assert.equal(typeof createRequirementValidatorAuthorityRegistry, "function");
    assert.equal(typeof verifyRequirementValidatorAuthority, "function");
  });

  it("canonicalizes, clones, orders and deeply freezes accepted rows", () => {
    const first = baseRow({
      qualifiedFlowIdentity: `${SOURCE_UNIT}::validateName`,
      taintClasses: ["web.storage", "web.request"],
      checkedDigest: OTHER_DIGEST,
    });
    const second = baseRow();
    const forward = structured([first, second]);
    const reverse = structured([second, first]);

    assert.equal(forward.digest, reverse.digest);
    assert.equal(forward.canonicalBytes, reverse.canonicalBytes);
    assert.deepEqual(forward.rows, reverse.rows);
    assert.deepEqual(forward.rows[1].taintClasses, ["web.request", "web.storage"]);
    assert.match(forward.digest, /^sha256:[0-9a-f]{64}$/);
    assert.ok(Number.isSafeInteger(forward.canonicalBytes));
    assert.ok(Object.isFrozen(forward));
    assert.ok(Object.isFrozen(forward.rows));
    assert.ok(forward.rows.every((row) => Object.isFrozen(row)));
    assert.ok(forward.rows.every((row) => Object.isFrozen(row.taintClasses)));
  });

  it("matches the independent one-row registry digest known answer", () => {
    assert.equal(structured().digest, SINGLE_ROW_REGISTRY_KAT);
  });

  it("does not retain caller-owned row or taint-array references", () => {
    const row = baseRow();
    const registry = structured([row]);
    row.qualifiedFlowIdentity = `${SOURCE_UNIT}::attacker`;
    row.taintClasses.push("environment.input");

    assert.equal(registry.rows[0].qualifiedFlowIdentity, QUALIFIED_FLOW);
    assert.deepEqual(registry.rows[0].taintClasses, ["web.request"]);
    const result = verifyRequirementValidatorAuthority(
      registry,
      baseRequest(),
      baseContext(registry),
    );
    assert.equal(result.state, "MATCHED");
  });

  it("refuses empty and duplicate-identity registries without partial rows", () => {
    const empty = createRequirementValidatorAuthorityRegistry([]);
    const duplicate = createRequirementValidatorAuthorityRegistry([
      baseRow(),
      baseRow({ checkedDigest: OTHER_DIGEST }),
    ]);

    assertRefused(empty, "EMPTY_REGISTRY");
    assertRefused(duplicate, "DUPLICATE_IDENTITY");
    assert.equal("rows" in empty, false);
    assert.equal("rows" in duplicate, false);
  });

  for (const [label, overrides] of [
    ["version", { authorityVersion: "v1" }],
    ["qualified identity", { qualifiedFlowIdentity: "not-qualified" }],
    ["digest", { checkedDigest: "sha256:bad" }],
    ["valid-from timestamp", { validFrom: "tomorrow" }],
    ["expiry timestamp", { expiresAt: "2026-08-19T00:00:00.000Z" }],
    ["output type", { outputType: "Bool" }],
    ["effect observation", { observedEffect: "network.outbound" }],
    ["taint class", { taintClasses: ["attacker.named"] }],
  ]) {
    it(`refuses a malformed ${label}`, () => {
      assertRefused(
        createRequirementValidatorAuthorityRegistry([baseRow(overrides)]),
        "MALFORMED_ROW",
      );
    });
  }

  it("refuses row and canonical-byte ceiling excess without truncation", () => {
    const rows = [
      baseRow(),
      baseRow({ qualifiedFlowIdentity: `${SOURCE_UNIT}::validateName` }),
    ];
    const tooMany = createRequirementValidatorAuthorityRegistry(rows, {
      maxRows: 1,
      maxCanonicalBytes: 1_048_576,
    });
    const tooLarge = createRequirementValidatorAuthorityRegistry([baseRow()], {
      maxRows: 64,
      maxCanonicalBytes: 64,
    });

    assertRefused(tooMany, "ROW_LIMIT_EXCEEDED");
    assertRefused(tooLarge, "BYTE_LIMIT_EXCEEDED");
    assert.equal("rows" in tooMany, false);
    assert.equal("rows" in tooLarge, false);
  });

  it("accepts exact hard ceilings and refuses caller overrides above either hard maximum", () => {
    const exactHardRows = Array.from({ length: 256 }, (_, index) => baseRow({
      qualifiedFlowIdentity: `${SOURCE_UNIT}::validate${index}`,
    }));
    const exact = createRequirementValidatorAuthorityRegistry(exactHardRows, {
      maxRows: 256,
      maxCanonicalBytes: 1_048_576,
    });

    assert.equal(exact.state, "STRUCTURALLY_VALID", JSON.stringify(exact));
    assert.ok(exact.canonicalBytes <= 1_048_576);
    assertRefused(
      createRequirementValidatorAuthorityRegistry([baseRow()], { maxRows: 257 }),
      "INVALID_LIMITS",
    );
    assertRefused(
      createRequirementValidatorAuthorityRegistry([baseRow()], { maxCanonicalBytes: 1_048_577 }),
      "INVALID_LIMITS",
    );
  });

  it("accepts only 40- or 64-hex source build identifiers", () => {
    for (const length of [40, 64]) {
      const registry = createRequirementValidatorAuthorityRegistry([
        baseRow({ sourceBuild: `git:${"c".repeat(length)}` }),
      ]);
      assert.equal(registry.state, "STRUCTURALLY_VALID", `accepted length ${length}`);
    }

    for (let length = 41; length <= 63; length += 1) {
      assertRefused(
        createRequirementValidatorAuthorityRegistry([
          baseRow({ sourceBuild: `git:${"c".repeat(length)}` }),
        ]),
        "MALFORMED_ROW",
      );
    }
  });
});

describe("RD-0858 validator authority verification", () => {
  it("returns one frozen MATCHED result without claiming checked-snapshot admission", () => {
    const registry = structured();
    const result = verifyRequirementValidatorAuthority(
      registry,
      baseRequest(),
      baseContext(registry),
    );

    assert.deepEqual(result, {
      state: "MATCHED",
      qualifiedFlowIdentity: QUALIFIED_FLOW,
      registryDigest: registry.digest,
      authorityVersion: AUTHORITY_VERSION,
    });
    assert.ok(Object.isFrozen(result));
    assert.equal("admission" in result, false);
    assert.equal("checkedSnapshot" in result, false);
  });

  it("refuses a structurally refused registry", () => {
    const registry = createRequirementValidatorAuthorityRegistry([]);
    assertRefused(
      verifyRequirementValidatorAuthority(registry, baseRequest(), {
        expectedRegistryDigest: `sha256:${"0".repeat(64)}`,
        canonicalSourceUnitId: SOURCE_UNIT,
        sourceBuild: SOURCE_BUILD,
        checkedProfile: PROFILE,
        acceptedAuthorityVersion: AUTHORITY_VERSION,
        comparisonTime: COMPARISON_TIME,
      }),
      "REGISTRY_REFUSED",
    );
  });

  it("requires an independently supplied exact registry digest", () => {
    const registry = structured();
    const absent = baseContext(registry);
    delete absent.expectedRegistryDigest;

    assertRefused(
      verifyRequirementValidatorAuthority(registry, baseRequest(), absent),
      "TRUST_ANCHOR_INVALID",
    );
    assertRefused(
      verifyRequirementValidatorAuthority(
        registry,
        baseRequest(),
        baseContext(registry, { expectedRegistryDigest: OTHER_DIGEST }),
      ),
      "REGISTRY_DIGEST_MISMATCH",
    );
  });

  it("refuses a frozen forged registry with a copied digest and duplicate identity", () => {
    const legitimate = structured();
    assertForgedRegistryRefused(forgeStructuredRegistry([
      baseRow(),
      baseRow({ checkedDigest: OTHER_DIGEST }),
    ], legitimate.digest));
  });

  it("refuses a frozen forged registry with a copied digest and malformed row", () => {
    const legitimate = structured();
    assertForgedRegistryRefused(forgeStructuredRegistry([
      baseRow(),
      baseRow({ validFrom: "tomorrow" }),
    ], legitimate.digest));
  });

  it("refuses a frozen forged registry with a copied digest and rows over the hard ceiling", () => {
    const legitimate = structured();
    const overLimitRows = [
      baseRow(),
      ...Array.from({ length: 256 }, (_, index) => baseRow({
        qualifiedFlowIdentity: `${SOURCE_UNIT}::forged${index}`,
      })),
    ];
    assertForgedRegistryRefused(forgeStructuredRegistry(overLimitRows, legitimate.digest));
  });

  for (const [label, overrides] of [
    ["registry digest", { expectedRegistryDigest: "sha256:bad" }],
    ["authority version", { acceptedAuthorityVersion: "latest" }],
    ["comparison time", { comparisonTime: "now" }],
    ["source unit", { canonicalSourceUnitId: "not::a::unit" }],
  ]) {
    it(`refuses a malformed trust-anchor ${label}`, () => {
      const registry = structured();
      assertRefused(
        verifyRequirementValidatorAuthority(
          registry,
          baseRequest(),
          baseContext(registry, overrides),
        ),
        "TRUST_ANCHOR_INVALID",
      );
    });
  }

  it("distinguishes not-yet-valid and expired authority", () => {
    assertRefused(
      verifyRows([baseRow()], {}, { comparisonTime: "2026-08-19T23:59:59.999Z" }),
      "NOT_YET_VALID",
    );
    assertRefused(
      verifyRows([baseRow()], {}, { comparisonTime: EXPIRES_AT }),
      "EXPIRED",
    );
  });

  for (const [label, rowOverrides, requestOverrides, contextOverrides] of [
    ["local flow", {}, { localFlowName: "validateName" }, {}],
    ["qualified identity", { qualifiedFlowIdentity: `${SOURCE_UNIT}::validateName` }, {}, {}],
    ["source build", { sourceBuild: "git:ffffffffffffffffffffffffffffffffffffffff" }, {}, {}],
    ["input type", {}, { inputType: "Bytes" }, {}],
    ["taint tuple", {}, { taintClasses: ["environment.input"] }, {}],
    ["output type", {}, { outputType: "Bool" }, {}],
    ["profile", { checkedProfile: "slide.scalar-64" }, {}, {}],
    ["checked digest", {}, { checkedDigest: OTHER_DIGEST }, {}],
    ["authority version", { authorityVersion: "2.0.0" }, {}, {}],
    ["trusted source build", {}, {}, { sourceBuild: "git:ffffffffffffffffffffffffffffffffffffffff" }],
    ["trusted profile", {}, {}, { checkedProfile: "slide.scalar-64" }],
    ["accepted version", {}, {}, { acceptedAuthorityVersion: "2.0.0" }],
  ]) {
    it(`refuses a wrong ${label}`, () => {
      assertRefused(
        verifyRows([baseRow(rowOverrides)], requestOverrides, contextOverrides),
        "NO_MATCH",
      );
    });
  }

  it("refuses observed effects even if a row self-asserts EffectFree", () => {
    assertRefused(
      verifyRows([baseRow()], { observedEffects: ["network.outbound"] }),
      "EFFECTFUL",
    );
  });
});
