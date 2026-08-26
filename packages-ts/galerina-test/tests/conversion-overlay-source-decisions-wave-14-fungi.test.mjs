import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { checkEffects, emitGIR, executeFlow, parseProgram } from "../../galerina-core-compiler/dist/index.js";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const PACKAGE_ROOT = join(ROOT, "packages-ts", "galerina-test");
const OVERLAY_ROOT = join(PACKAGE_ROOT, "src", "self-hosted", "conversion-overlays");
const PACKAGE = join(PACKAGE_ROOT, "package.json");
const bool = (value) => ({ __tag: "bool", value });
const string = (value) => ({ __tag: "string", value });
const args = (names) => new Map(names.map((name) => [name, bool(true)]));
const RESERVED = new Set(["version","pure","secure","flow","FLOW","contract","intent","record","return","if","match","check","deny","ambig","mut","let","Bool","Int","String","Verdict","Result","Option","Array","true","false","Ok","Err","Some","None","Allow","Deny","Unknown"]);
const I = "galerina-ext-secrets-vault/src/index.ts";
const C = "galerina-ext-secrets-vault/src/vault-client.ts";
const M = "galerina-ext-secrets-vault/src/rotation-manager.ts";
const VC = "galerina-ext-secrets-vault/src/cli.ts";
const SC = "galerina-ext-secrets-spore/src/cli.ts";
const A = "galerina-ext-secrets-spore/src/arena.ts";
const SS = "galerina-ext-secrets-spore/src/schema.ts";
const AN = "galerina-ext-secrets-spore/src/anchor.ts";
const RT = "galerina-ext-secrets-spore/src/runtime.ts";
const CANDIDATES = Object.freeze([
  ["vault-facade-class-status.fungi","vaultFacadeClassStatusCore",I,"export class GalerinaSecretsVault",["classReady","clientSlot","managerSlot"],"facade_class"],
  ["vault-facade-constructor-status.fungi","vaultFacadeConstructorStatusCore",I,"private constructor(",["clientOwned","managerCreated"],"facade_constructed"],
  ["vault-facade-from-env-status.fungi","vaultFacadeFromEnvStatusCore",I,"static fromEnv()",["environmentReady","clientCreated","facadeCreated"],"facade_from_env"],
  ["vault-facade-from-config-status.fungi","vaultFacadeFromConfigStatusCore",I,"static fromConfig(",["addressCaptured","tokenCaptured","clientCreated","facadeCreated"],"facade_from_config"],
  ["vault-facade-from-client-status.fungi","vaultFacadeFromClientStatusCore",I,"static fromClient(",["clientOwned","facadeCreated"],"facade_from_client"],
  ["vault-contract-load-status.fungi","vaultContractLoadStatusCore",I,"async loadContract(",["blockCaptured","credentialsPresent","allLoaded"],"contract_loaded"],
  ["vault-secret-use-status.fungi","vaultSecretUseStatusCore",I,"useSecret(",["idCaptured","callbackCaptured","delegated"],"secret_use_delegated"],
  ["vault-credential-rotate-facade-status.fungi","vaultCredentialRotateFacadeStatusCore",I,"async rotateCredential(",["credentialCaptured","clientBound","rotationCompleted"],"credential_rotated"],
  ["vault-credential-status-facade.fungi","vaultCredentialStatusFacadeCore",I,"getCredentialStatus(",["idCaptured","managerBound","redactedReturned"],"credential_status"],
  ["vault-rotation-start-facade.fungi","vaultRotationStartFacadeCore",I,"startRotation(",["blockCaptured","policyResolved","sweepStarted"],"rotation_started"],
  ["vault-stop-facade-status.fungi","vaultStopFacadeStatusCore",I,"stop(timer?",["timerHandled","managerDisposed"],"facade_stopped"],
  ["vault-rotation-manager-class-status.fungi","vaultRotationManagerClassStatusCore",M,"export class SecretsRotationManager",["classReady","handlesOwned","leasesOwned"],"rotation_manager_class"],
  ["vault-client-class-status.fungi","vaultClientClassStatusCore",C,"export class VaultClient",["classReady","addressSlot","tokenSlot","limitsSlots"],"vault_client_class"],
  ["vault-client-from-env-status.fungi","vaultClientFromEnvStatusCore",C,"static fromEnv(): VaultClient",["environmentCaptured","modeResolved","credentialsPresent","clientCreated"],"vault_client_from_env"],
  ["vault-request-reject-once-status.fungi","vaultRequestRejectOnceStatusCore",C,"const rejectOnce",["unsettled","errorCaptured","rejected"],"request_rejected_once"],
  ["vault-cli-usage-status.fungi","vaultCliUsageStatusCore",VC,"function usage()",["messageReady","stderrWritten"],"usage_written"],
  ["vault-cli-run-status.fungi","vaultCliRunStatusCore",VC,"async function run()",["commandPresent","branchKnown","operationCompleted","cleanupCompleted"],"cli_run_complete"],
  ["spore-cli-parse-args-status.fungi","sporeCliParseArgsStatusCore",SC,"function parseArgs",["argvCaptured","defaultsReady","flagsParsed","restCaptured"],"args_parsed"],
  ["spore-cli-die-status.fungi","sporeCliDieStatusCore",SC,"function die(",["messageCaptured","newlineReady","exitCodeReady"],"fatal_emitted"],
  ["spore-cli-argv-refusal-status.fungi","sporeCliArgvRefusalStatusCore",SC,"function rejectValueInArgv",["argsCaptured","secretAbsentFromArgv"],"argv_safe"],
  ["spore-cli-wrapped-key-status.fungi","sporeCliWrappedKeyStatusCore",SC,"function getWrappedKey",["pointerPresent","hexDecoded","partsSplit"],"wrapped_key_ready"],
  ["spore-cli-recipient-callback-status.fungi","sporeCliRecipientCallbackStatusCore",SC,"async function withRecipientSecret",["wrappedReady","passphraseRead","callbackCompleted","passphraseWiped"],"recipient_callback_wiped"],
  ["spore-cli-main-status.fungi","sporeCliMainStatusCore",SC,"async function main()",["argsParsed","commandKnown","secretDisciplineHeld","operationCompleted","cleanupCompleted"],"spore_cli_complete"],
  ["spore-cli-shell-status.fungi","sporeCliShellStatusCore",SC,"async function runShell",["interfaceReady","commandParsed","mutationContained","ciphertextSaved","closed"],"shell_closed"],
  ["spore-cli-prompt-status.fungi","sporeCliPromptStatusCore",SC,"const prompt =",["stderrReady","promptWritten"],"prompt_written"],
  ["seal-arena-class-status.fungi","sealArenaClassStatusCore",A,"export class SealArena",["classReady","entriesOwned","disposedOwned"],"seal_arena_class"],
  ["seal-arena-live-guard-status.fungi","sealArenaLiveGuardStatusCore",A,"private assertLive()",["notDisposed","operationAllowed"],"arena_live"],
  ["spore-concat-status.fungi","sporeConcatStatusCore",SS,"function concat(",["partsCaptured","lengthSummed","outputAllocated","allCopied"],"bytes_concatenated"],
  ["spore-to-hex-status.fungi","sporeToHexStatusCore",SS,"export function toHex",["bytesCaptured","bufferBound","hexEncoded"],"hex_encoded"],
  ["spore-from-hex-status.fungi","sporeFromHexStatusCore",SS,"export function fromHex",["textCaptured","hexDecoded","bytesOwned"],"hex_decoded"],
  ["spore-modality-structured-status.fungi","sporeModalityStructuredStatusCore",SS,"MODALITY_STRUCTURED = 9",["valueExact"],"modality_structured"],
  ["spore-secret-kind-status.fungi","sporeSecretKindStatusCore",SS,"SECTION_KIND_SECRET = 0",["valueExact","domainBound"],"secret_kind"],
  ["spore-manifest-kind-status.fungi","sporeManifestKindStatusCore",SS,"SECTION_KIND_MANIFEST = 1",["valueExact","domainBound","distinctFromSecret"],"manifest_kind"],
  ["spore-json-codec-status.fungi","sporeJsonCodecStatusCore",SS,"CODEC_JSON = 0x0601",["valueExact","structuredBound"],"json_codec"],
  ["spore-schema-version-status.fungi","sporeSchemaVersionStatusCore",SS,"ENV_SPORE_SCHEMA_VERSION = 0",["valueExact","schemaBound","containerIndependent"],"schema_v0"],
  ["spore-coordinate-domain-status.fungi","sporeCoordinateDomainStatusCore",SS,"const COORD_DOMAIN",["textExact","utf8Ready","domainDistinct"],"coordinate_domain"],
  ["spore-manifest-coordinate-status.fungi","sporeManifestCoordinateStatusCore",SS,"export const MANIFEST_COORD",["domainExact","shakeReady","width16","sentinelDistinct"],"manifest_coordinate"],
  ["spore-seal-magic-status.fungi","sporeSealMagicStatusCore",SS,"const SEAL_MAGIC = 0xe7",["valueExact","payloadBound"],"seal_magic"],
  ["spore-argon2-parameters-status.fungi","sporeArgon2ParametersStatusCore",AN,"export const ARGON2ID_PARAMS",["timeExact","memoryExact","parallelismExact","dkLenBound"],"argon2_parameters"],
  ["spore-section-epoch-status.fungi","sporeSectionEpochStatusCore",RT,"const SECTION_EPOCH = 0",["valueExact","contextBound"],"section_epoch"],
].map(([file,flow,source,symbol,names,expected]) => Object.freeze({file,flow,source,symbol,input:args(names),expected:string(expected)})));

function shadowFingerprint(source) {
  const identifiers = new Map();
  return createHash("sha256").update(source.replace(/^\uFEFF/u,"").replace(/\/\*[\s\S]*?\*\//gu," ").replace(/^\s*\/\/.*$/gmu," ").replace(/\b((?:pure|secure)\s+)?flow\s+[A-Za-z_][A-Za-z0-9_]*/gu,(m)=>m.replace(/([A-Za-z_][A-Za-z0-9_]*)$/u,"FLOW")).replace(/"(?:\\.|[^"\\])*"/gu,'"STRING"').replace(/\b-?(?:0x[0-9a-fA-F_]+|\d[\d_]*)\b/gu,"NUMBER").replace(/\s+/gu," ").trim().replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/gu,(id)=>{if(RESERVED.has(id))return id;let r=identifiers.get(id);if(r===undefined){r="ID"+identifiers.size;identifiers.set(id,r);}return r;}),"utf8").digest("hex");
}

describe("40-file source-bound Fungi decision-core overlay wave 14",()=>{
  it("binds 40 distinct live source behaviours and package assets",()=>{
    assert.equal(CANDIDATES.length,40);
    const loaded=JSON.parse(readFileSync(PACKAGE,"utf8")).packageGraph?.loadedAssets??[];
    const scopes=new Set();
    for(const c of CANDIDATES){assert.ok(loaded.includes(`src/self-hosted/conversion-overlays/${c.file}`),`${c.file} must be a loaded asset`);const source=readFileSync(join(ROOT,"packages-ts",c.source),"utf8");assert.ok(source.includes(c.symbol),`${c.source} must contain ${c.symbol}`);assert.equal(scopes.has(`${c.source}#${c.symbol}`),false);scopes.add(`${c.source}#${c.symbol}`);}
  });
  it("has no exact duplicate or normalized whole-corpus template shadow",()=>{
    const seen=new Map();const files=new Set(CANDIDATES.map(c=>c.file));
    for(const file of readdirSync(OVERLAY_ROOT).filter(f=>f.endsWith(".fungi")&&!files.has(f))){const source=readFileSync(join(OVERLAY_ROOT,file),"utf8");seen.set(createHash("sha256").update(source).digest("hex"),file);seen.set(shadowFingerprint(source),file);}
    const collisions=[];for(const c of CANDIDATES){const path=join(OVERLAY_ROOT,c.file);assert.ok(existsSync(path),`${c.file} must exist`);const source=readFileSync(path,"utf8");for(const [kind,fp] of [["exact duplicate",createHash("sha256").update(source).digest("hex")],["template shadow",shadowFingerprint(source)]]){if(seen.has(fp))collisions.push(`${c.file} ${kind} of ${seen.get(fp)}`);seen.set(fp,c.file);}}
    assert.deepEqual(collisions,[]);
  });
  it("parses, effect-checks, emits GIR and executes every decision core",async()=>{
    for(const c of CANDIDATES){const source=readFileSync(join(OVERLAY_ROOT,c.file),"utf8");const program=parseProgram(source,c.file);assert.deepEqual((program.diagnostics??[]).filter(d=>d.severity==="error"),[],c.file);const effects=checkEffects(program.flows,program.ast);assert.deepEqual(effects.flatMap(r=>r.diagnostics).filter(d=>d.severity==="error"),[],c.file);assert.equal(emitGIR(program.ast,program.flows,effects).gir.flows.length,1,c.file);assert.deepEqual((await executeFlow(c.flow,c.input,program.ast,program.flows)).value,c.expected,c.file);}
  });
});
