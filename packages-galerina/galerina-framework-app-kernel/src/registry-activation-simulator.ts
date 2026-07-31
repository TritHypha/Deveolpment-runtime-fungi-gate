/**
 * Deterministic registry-activation falsification model.
 *
 * This module cannot mint a persistence or production-admission capability.
 * Its replay receipts are model evidence only.
 */

export const REGISTRY_ACTIVATION_FAULT_MODEL_VERSION =
  "galerina.registry.activation.fault-model.v1" as const;

export const REGISTRY_ACTIVATION_BOUNDARIES = Object.freeze([
  "write",
  "file-flush",
  "close",
  "publication-order",
  "publish",
  "reopen",
  "verify",
  "directory-flush",
  "stage-checkpoint",
  "key-switch",
  "canary",
  "fallback",
  "acceptance-checkpoint",
  "drain",
  "custody-retire",
] as const);

export type RegistryActivationBoundary =
  (typeof REGISTRY_ACTIVATION_BOUNDARIES)[number];

export type RegistryActivationFaultKind =
  | "refuse"
  | "crash-before"
  | "crash-after"
  | "short-write"
  | "corrupt"
  | "collision"
  | "reorder";

export interface RegistryActivationFault {
  readonly boundary: RegistryActivationBoundary;
  readonly kind: RegistryActivationFaultKind;
}

export type RegistryActivationCanaryVerdict =
  | "allow"
  | "deny"
  | "indeterminate";

export interface RegistryActivationSimulationOptions {
  readonly seed: string;
  readonly simulatorDigest: string;
  readonly adapterDigest: string;
  readonly sourceDigest: string;
  readonly priorGenerationId: string;
  readonly candidateGenerationId: string;
  readonly exploredBudget: number;
  readonly canaryVerdict: RegistryActivationCanaryVerdict;
  readonly faults: readonly RegistryActivationFault[];
}

export type RegistryActivationTerminalState =
  | "PRIOR_COMPLETE"
  | "NEW_COMPLETE"
  | "INDETERMINATE";

export interface RegistryActivationReplayReceipt {
  readonly schema: "galerina-registry-activation-replay/v1";
  readonly faultModelVersion:
    typeof REGISTRY_ACTIVATION_FAULT_MODEL_VERSION;
  readonly seed: string;
  readonly simulatorDigest: string;
  readonly adapterDigest: string;
  readonly sourceDigest: string;
  readonly priorGenerationId: string;
  readonly candidateGenerationId: string;
  readonly exploredBudget: number;
  readonly canaryVerdict: RegistryActivationCanaryVerdict;
  readonly scheduledFaults: readonly RegistryActivationFault[];
  readonly executedBoundaries: readonly RegistryActivationBoundary[];
  readonly logicalTicks: number;
  readonly plantedFaultsExecuted: number;
  readonly invariant: "OLD_COMPLETE_OR_NEW_COMPLETE_NEVER_MIXED";
  readonly terminalState: RegistryActivationTerminalState;
  readonly authorityGenerationId: string | null;
  readonly complete: boolean;
  readonly reason: string;
  readonly receiptDigest: string;
}

export interface RegistryActivationFaultMatrix {
  readonly schema: "galerina-registry-activation-fault-matrix/v1";
  readonly faultModelVersion:
    typeof REGISTRY_ACTIVATION_FAULT_MODEL_VERSION;
  readonly seed: string;
  readonly control: RegistryActivationReplayReceipt;
  readonly receipts: readonly RegistryActivationReplayReceipt[];
  readonly scenarioOrder: readonly RegistryActivationBoundary[];
  readonly coveredBoundaries: readonly RegistryActivationBoundary[];
  readonly plantedFaultsExecuted: number;
  readonly mixedAuthorityOutcomes: number;
  readonly complete: boolean;
  readonly matrixDigest: string;
}

const GENERATION_ID = /^[0-9a-f]{64}$/;
const SHA256_DIGEST = /^sha256:[0-9a-f]{64}$/;
const SEED = /^[A-Za-z0-9._:-]{1,128}$/;
const MAX_EXPLORATION_BUDGET = 100_000;
const INVARIANT = "OLD_COMPLETE_OR_NEW_COMPLETE_NEVER_MIXED" as const;
const OPTION_KEYS = Object.freeze([
  "adapterDigest",
  "canaryVerdict",
  "candidateGenerationId",
  "exploredBudget",
  "faults",
  "priorGenerationId",
  "seed",
  "simulatorDigest",
  "sourceDigest",
]);
const boundaryIndex = new Map<RegistryActivationBoundary, number>(
  REGISTRY_ACTIVATION_BOUNDARIES.map((boundary, index) => [boundary, index]),
);
const faultKinds = new Set<RegistryActivationFaultKind>([
  "refuse",
  "crash-before",
  "crash-after",
  "short-write",
  "corrupt",
  "collision",
  "reorder",
]);

function hasPlainDataShape(
  value: object,
  expectedKeys: readonly string[],
): boolean {
  if (Object.getPrototypeOf(value) !== Object.prototype) return false;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Object.keys(descriptors).sort().join(",") !== expectedKeys.join(",")) {
    return false;
  }
  return Object.values(descriptors).every(
    (descriptor) =>
      "value" in descriptor
      && descriptor.get === undefined
      && descriptor.set === undefined,
  );
}

function deepFreeze<T>(value: T): T {
  if (
    typeof value !== "object"
    || value === null
    || Object.isFrozen(value)
  ) {
    return value;
  }
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function canonicalJson(value: unknown): string {
  if (
    value === null
    || typeof value === "boolean"
    || typeof value === "string"
  ) {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new TypeError("registry activation receipt number is not safe");
    }
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  if (typeof value !== "object") {
    throw new TypeError("registry activation receipt value is unsupported");
  }
  const record = value as Readonly<Record<string, unknown>>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(",")}}`;
}

async function sha256(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalJson(value));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return `sha256:${[...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;
}

function isBoundary(value: unknown): value is RegistryActivationBoundary {
  return typeof value === "string"
    && boundaryIndex.has(value as RegistryActivationBoundary);
}

function isCanaryVerdict(
  value: unknown,
): value is RegistryActivationCanaryVerdict {
  return value === "allow"
    || value === "deny"
    || value === "indeterminate";
}

function validFaultAtBoundary(fault: RegistryActivationFault): boolean {
  if (
    fault.kind === "refuse"
    || fault.kind === "crash-before"
    || fault.kind === "crash-after"
  ) {
    return true;
  }
  if (fault.kind === "short-write") return fault.boundary === "write";
  if (fault.kind === "corrupt") return fault.boundary === "verify";
  if (fault.kind === "collision") return fault.boundary === "publish";
  return fault.kind === "reorder"
    && fault.boundary === "publication-order";
}

function normalizeOptions(
  options: RegistryActivationSimulationOptions,
): RegistryActivationSimulationOptions {
  if (
    typeof options !== "object"
    || options === null
    || !hasPlainDataShape(options, OPTION_KEYS)
    || !SEED.test(options.seed)
    || !SHA256_DIGEST.test(options.simulatorDigest)
    || !SHA256_DIGEST.test(options.adapterDigest)
    || !SHA256_DIGEST.test(options.sourceDigest)
    || !GENERATION_ID.test(options.priorGenerationId)
    || !GENERATION_ID.test(options.candidateGenerationId)
    || options.priorGenerationId === options.candidateGenerationId
    || !Number.isSafeInteger(options.exploredBudget)
    || options.exploredBudget < 1
    || options.exploredBudget > MAX_EXPLORATION_BUDGET
    || !isCanaryVerdict(options.canaryVerdict)
    || !Array.isArray(options.faults)
    || options.faults.length > REGISTRY_ACTIVATION_BOUNDARIES.length
  ) {
    throw new TypeError("registry activation simulation options are malformed");
  }

  const seen = new Set<RegistryActivationBoundary>();
  let priorIndex = -1;
  const faults: RegistryActivationFault[] = [];
  for (const candidate of options.faults) {
    if (
      typeof candidate !== "object"
      || candidate === null
      || !hasPlainDataShape(candidate, ["boundary", "kind"])
      || !isBoundary(candidate.boundary)
      || typeof candidate.kind !== "string"
      || !faultKinds.has(candidate.kind as RegistryActivationFaultKind)
    ) {
      throw new TypeError("registry activation fault is malformed");
    }
    const fault = candidate as RegistryActivationFault;
    const index = boundaryIndex.get(fault.boundary);
    if (
      index === undefined
      || index <= priorIndex
      || seen.has(fault.boundary)
      || !validFaultAtBoundary(fault)
    ) {
      throw new TypeError(
        "registry activation fault schedule is ambiguous or unreachable",
      );
    }
    if (
      (fault.boundary === "fallback" && options.canaryVerdict === "allow")
      || (
        options.canaryVerdict !== "allow"
        && index > (boundaryIndex.get("fallback") ?? -1)
      )
    ) {
      throw new TypeError(
        "registry activation fault schedule targets an unreachable boundary",
      );
    }
    priorIndex = index;
    seen.add(fault.boundary);
    faults.push(Object.freeze({
      boundary: fault.boundary,
      kind: fault.kind,
    }));
  }
  return Object.freeze({
    seed: options.seed,
    simulatorDigest: options.simulatorDigest,
    adapterDigest: options.adapterDigest,
    sourceDigest: options.sourceDigest,
    priorGenerationId: options.priorGenerationId,
    candidateGenerationId: options.candidateGenerationId,
    exploredBudget: options.exploredBudget,
    canaryVerdict: options.canaryVerdict,
    faults: Object.freeze(faults),
  });
}

function activeSchedule(
  verdict: RegistryActivationCanaryVerdict,
): readonly RegistryActivationBoundary[] {
  if (verdict === "allow") {
    return REGISTRY_ACTIVATION_BOUNDARIES.filter(
      (boundary) => boundary !== "fallback",
    );
  }
  const fallback = boundaryIndex.get("fallback");
  if (fallback === undefined) {
    throw new TypeError("registry activation fallback boundary is unavailable");
  }
  return REGISTRY_ACTIVATION_BOUNDARIES.slice(0, fallback + 1);
}

function terminalForAcceptedAuthority(
  acceptedCandidate: boolean,
): Pick<
  RegistryActivationReplayReceipt,
  "terminalState" | "authorityGenerationId" | "complete"
> {
  return acceptedCandidate
    ? {
      terminalState: "NEW_COMPLETE",
      authorityGenerationId: "",
      complete: true,
    }
    : {
      terminalState: "PRIOR_COMPLETE",
      authorityGenerationId: "",
      complete: true,
    };
}

async function finishReceipt(
  base: Omit<RegistryActivationReplayReceipt, "receiptDigest">,
): Promise<RegistryActivationReplayReceipt> {
  const receiptDigest = await sha256(base);
  return deepFreeze({
    ...base,
    receiptDigest,
  });
}

/**
 * Executes a closed deterministic state model. No host I/O, keys, production
 * brands or authenticated checkpoints are created by this function.
 */
export async function simulateRegistryActivation(
  options: RegistryActivationSimulationOptions,
): Promise<RegistryActivationReplayReceipt> {
  const normalized = normalizeOptions(options);
  const faults = normalized.faults;
  const faultByBoundary = new Map(
    faults.map((fault) => [fault.boundary, fault]),
  );
  const executed: RegistryActivationBoundary[] = [];
  const schedule = activeSchedule(normalized.canaryVerdict);
  let logicalTicks = 0;
  let plantedFaultsExecuted = 0;
  let acceptedCandidate = false;
  let terminalState: RegistryActivationTerminalState = "INDETERMINATE";
  let authorityGenerationId: string | null = null;
  let complete = false;
  let reason = "UNREACHED_TERMINAL";

  const setAcceptedTerminal = (why: string): void => {
    const terminal = terminalForAcceptedAuthority(acceptedCandidate);
    terminalState = terminal.terminalState;
    authorityGenerationId = acceptedCandidate
      ? normalized.candidateGenerationId
      : normalized.priorGenerationId;
    complete = terminal.complete;
    reason = why;
  };

  for (const boundary of schedule) {
    if (logicalTicks >= normalized.exploredBudget) {
      terminalState = "INDETERMINATE";
      authorityGenerationId = null;
      complete = false;
      reason = "EXPLORATION_BUDGET_EXHAUSTED";
      break;
    }
    logicalTicks += 1;
    executed.push(boundary);
    const fault = faultByBoundary.get(boundary);
    if (fault !== undefined) plantedFaultsExecuted += 1;

    if (boundary === "fallback" && fault !== undefined) {
      terminalState = "INDETERMINATE";
      authorityGenerationId = null;
      complete = false;
      reason = `FALLBACK_${fault.kind.toUpperCase().replace("-", "_")}`;
      break;
    }
    if (
      fault?.kind === "refuse"
      || fault?.kind === "crash-before"
      || fault?.kind === "short-write"
      || fault?.kind === "corrupt"
      || fault?.kind === "collision"
      || fault?.kind === "reorder"
    ) {
      setAcceptedTerminal(
        `${boundary.toUpperCase().replaceAll("-", "_")}_${fault.kind
          .toUpperCase()
          .replace("-", "_")}`,
      );
      break;
    }

    if (boundary === "canary" && normalized.canaryVerdict !== "allow") {
      continue;
    }
    if (boundary === "fallback") {
      terminalState = "PRIOR_COMPLETE";
      authorityGenerationId = normalized.priorGenerationId;
      complete = true;
      reason = normalized.canaryVerdict === "deny"
        ? "CANARY_DENIED_FALLBACK_CONFIRMED"
        : "CANARY_INDETERMINATE_FALLBACK_CONFIRMED";
      break;
    }
    if (boundary === "acceptance-checkpoint") {
      acceptedCandidate = true;
    }
    if (fault?.kind === "crash-after") {
      setAcceptedTerminal(
        `${boundary.toUpperCase().replaceAll("-", "_")}_CRASH_AFTER`,
      );
      break;
    }
  }

  if (reason === "UNREACHED_TERMINAL") {
    if (
      normalized.canaryVerdict === "allow"
      && acceptedCandidate
      && executed.at(-1) === "custody-retire"
    ) {
      terminalState = "NEW_COMPLETE";
      authorityGenerationId = normalized.candidateGenerationId;
      complete = true;
      reason = "CONTROL_COMPLETED";
    } else {
      terminalState = "INDETERMINATE";
      authorityGenerationId = null;
      complete = false;
      reason = "SCHEDULE_DID_NOT_REACH_A_MODELLED_TERMINAL";
    }
  }

  return await finishReceipt({
    schema: "galerina-registry-activation-replay/v1",
    faultModelVersion: REGISTRY_ACTIVATION_FAULT_MODEL_VERSION,
    seed: normalized.seed,
    simulatorDigest: normalized.simulatorDigest,
    adapterDigest: normalized.adapterDigest,
    sourceDigest: normalized.sourceDigest,
    priorGenerationId: normalized.priorGenerationId,
    candidateGenerationId: normalized.candidateGenerationId,
    exploredBudget: normalized.exploredBudget,
    canaryVerdict: normalized.canaryVerdict,
    scheduledFaults: faults,
    executedBoundaries: Object.freeze([...executed]),
    logicalTicks,
    plantedFaultsExecuted,
    invariant: INVARIANT,
    terminalState,
    authorityGenerationId,
    complete,
    reason,
  });
}

function plantedFaultFor(
  boundary: RegistryActivationBoundary,
): RegistryActivationFaultKind {
  if (boundary === "write") return "short-write";
  if (boundary === "publication-order") return "reorder";
  if (boundary === "publish") return "collision";
  if (boundary === "verify") return "corrupt";
  return "crash-before";
}

async function seededScenarioOrder(
  seed: string,
): Promise<readonly RegistryActivationBoundary[]> {
  const scored = await Promise.all(
    REGISTRY_ACTIVATION_BOUNDARIES.map(async (boundary) => ({
      boundary,
      score: await sha256({
        boundary,
        domain: "galerina.registry.activation.scenario-order.v1",
        seed,
      }),
    })),
  );
  scored.sort(
    (left, right) =>
      left.score.localeCompare(right.score)
      || left.boundary.localeCompare(right.boundary),
  );
  return Object.freeze(scored.map(({ boundary }) => boundary));
}

export async function exploreRegistryActivationFaultMatrix(
  options: RegistryActivationSimulationOptions,
): Promise<RegistryActivationFaultMatrix> {
  const normalized = normalizeOptions(options);
  if (normalized.faults.length !== 0 || normalized.canaryVerdict !== "allow") {
    throw new TypeError(
      "registry activation matrix requires an unmodified allow control",
    );
  }
  const control = await simulateRegistryActivation(normalized);
  const receipts: RegistryActivationReplayReceipt[] = [control];
  const scenarioOrder = await seededScenarioOrder(normalized.seed);
  for (const boundary of scenarioOrder) {
    receipts.push(await simulateRegistryActivation({
      ...normalized,
      canaryVerdict: boundary === "fallback" ? "deny" : "allow",
      faults: [{
        boundary,
        kind: plantedFaultFor(boundary),
      }],
    }));
  }
  const covered = new Set<RegistryActivationBoundary>();
  let plantedFaultsExecuted = 0;
  let mixedAuthorityOutcomes = 0;
  for (const receipt of receipts) {
    for (const fault of receipt.scheduledFaults) covered.add(fault.boundary);
    plantedFaultsExecuted += receipt.plantedFaultsExecuted;
    if (
      receipt.authorityGenerationId !== null
      && receipt.authorityGenerationId !== normalized.priorGenerationId
      && receipt.authorityGenerationId !== normalized.candidateGenerationId
    ) {
      mixedAuthorityOutcomes += 1;
    }
  }
  const coveredBoundaries = REGISTRY_ACTIVATION_BOUNDARIES.filter(
    (boundary) => covered.has(boundary),
  );
  const base = {
    schema: "galerina-registry-activation-fault-matrix/v1" as const,
    faultModelVersion: REGISTRY_ACTIVATION_FAULT_MODEL_VERSION,
    seed: normalized.seed,
    control,
    receipts: Object.freeze([...receipts]),
    scenarioOrder,
    coveredBoundaries: Object.freeze(coveredBoundaries),
    plantedFaultsExecuted,
    mixedAuthorityOutcomes,
    complete:
      control.terminalState === "NEW_COMPLETE"
      && coveredBoundaries.length === REGISTRY_ACTIVATION_BOUNDARIES.length
      && plantedFaultsExecuted === REGISTRY_ACTIVATION_BOUNDARIES.length
      && mixedAuthorityOutcomes === 0,
  };
  return deepFreeze({
    ...base,
    matrixDigest: await sha256({
      ...base,
      control: control.receiptDigest,
      receipts: receipts.map((receipt) => receipt.receiptDigest),
    }),
  });
}
