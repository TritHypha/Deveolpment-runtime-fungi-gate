import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { it } from "node:test";

const SLIDE_ROOT=process.env.GALERINA_SLIDE_REPO;
const AVAILABLE=typeof SLIDE_ROOT==="string"&&existsSync(join(SLIDE_ROOT,"src","checked-fungi-package-compiler.mjs"));
const ROOT=join(process.cwd(),"packages-ts","galerina-test","src","self-hosted","conversion-overlays");
const GATES=Object.freeze({identity:1,provenance:1,target:1,effects:1,policy:1,revocation:1,validation:1,memory:1});
const CANDIDATES=Object.freeze([
  ["vault-facade-class-status.fungi","vaultFacadeClassStatusCore",[true,true,true],"facade_class"],
  ["vault-facade-constructor-status.fungi","vaultFacadeConstructorStatusCore",[true,true],"facade_constructed"],
  ["vault-facade-from-env-status.fungi","vaultFacadeFromEnvStatusCore",[true,true,true],"facade_from_env"],
  ["vault-facade-from-config-status.fungi","vaultFacadeFromConfigStatusCore",[true,true,true,true],"facade_from_config"],
  ["vault-facade-from-client-status.fungi","vaultFacadeFromClientStatusCore",[true,true],"facade_from_client"],
  ["vault-contract-load-status.fungi","vaultContractLoadStatusCore",[true,true,true],"contract_loaded"],
  ["vault-secret-use-status.fungi","vaultSecretUseStatusCore",[true,true,true],"secret_use_delegated"],
  ["vault-credential-rotate-facade-status.fungi","vaultCredentialRotateFacadeStatusCore",[true,true,true],"credential_rotated"],
  ["vault-credential-status-facade.fungi","vaultCredentialStatusFacadeCore",[true,true,true],"credential_status"],
  ["vault-rotation-start-facade.fungi","vaultRotationStartFacadeCore",[true,true,true],"rotation_started"],
  ["vault-stop-facade-status.fungi","vaultStopFacadeStatusCore",[true,true],"facade_stopped"],
  ["vault-rotation-manager-class-status.fungi","vaultRotationManagerClassStatusCore",[true,true,true],"rotation_manager_class"],
  ["vault-client-class-status.fungi","vaultClientClassStatusCore",[true,true,true,true],"vault_client_class"],
  ["vault-client-from-env-status.fungi","vaultClientFromEnvStatusCore",[true,true,true,true],"vault_client_from_env"],
  ["vault-request-reject-once-status.fungi","vaultRequestRejectOnceStatusCore",[true,true,true],"request_rejected_once"],
  ["vault-cli-usage-status.fungi","vaultCliUsageStatusCore",[true,true],"usage_written"],
  ["vault-cli-run-status.fungi","vaultCliRunStatusCore",[true,true,true,true],"cli_run_complete"],
  ["spore-cli-parse-args-status.fungi","sporeCliParseArgsStatusCore",[true,true,true,true],"args_parsed"],
  ["spore-cli-die-status.fungi","sporeCliDieStatusCore",[true,true,true],"fatal_emitted"],
  ["spore-cli-argv-refusal-status.fungi","sporeCliArgvRefusalStatusCore",[true,true],"argv_safe"],
  ["spore-cli-wrapped-key-status.fungi","sporeCliWrappedKeyStatusCore",[true,true,true],"wrapped_key_ready"],
  ["spore-cli-recipient-callback-status.fungi","sporeCliRecipientCallbackStatusCore",[true,true,true,true],"recipient_callback_wiped"],
  ["spore-cli-main-status.fungi","sporeCliMainStatusCore",[true,true,true,true,true],"spore_cli_complete"],
  ["spore-cli-shell-status.fungi","sporeCliShellStatusCore",[true,true,true,true,true],"shell_closed"],
  ["spore-cli-prompt-status.fungi","sporeCliPromptStatusCore",[true,true],"prompt_written"],
  ["seal-arena-class-status.fungi","sealArenaClassStatusCore",[true,true,true],"seal_arena_class"],
  ["seal-arena-live-guard-status.fungi","sealArenaLiveGuardStatusCore",[true,true],"arena_live"],
  ["spore-concat-status.fungi","sporeConcatStatusCore",[true,true,true,true],"bytes_concatenated"],
  ["spore-to-hex-status.fungi","sporeToHexStatusCore",[true,true,true],"hex_encoded"],
  ["spore-from-hex-status.fungi","sporeFromHexStatusCore",[true,true,true],"hex_decoded"],
  ["spore-modality-structured-status.fungi","sporeModalityStructuredStatusCore",[true],"modality_structured"],
  ["spore-secret-kind-status.fungi","sporeSecretKindStatusCore",[true,true],"secret_kind"],
  ["spore-manifest-kind-status.fungi","sporeManifestKindStatusCore",[true,true,true],"manifest_kind"],
  ["spore-json-codec-status.fungi","sporeJsonCodecStatusCore",[true,true],"json_codec"],
  ["spore-schema-version-status.fungi","sporeSchemaVersionStatusCore",[true,true,true],"schema_v0"],
  ["spore-coordinate-domain-status.fungi","sporeCoordinateDomainStatusCore",[true,true,true],"coordinate_domain"],
  ["spore-manifest-coordinate-status.fungi","sporeManifestCoordinateStatusCore",[true,true,true,true],"manifest_coordinate"],
  ["spore-seal-magic-status.fungi","sporeSealMagicStatusCore",[true,true],"seal_magic"],
  ["spore-argon2-parameters-status.fungi","sporeArgon2ParametersStatusCore",[true,true,true,true],"argon2_parameters"],
  ["spore-section-epoch-status.fungi","sporeSectionEpochStatusCore",[true,true],"section_epoch"],
].map(([file,flow,args,expected])=>Object.freeze({file,flow,args,expected})));

async function api(){const load=async p=>import(pathToFileURL(join(SLIDE_ROOT,"src",p)).href);return {...await load("checked-fungi-package-compiler.mjs"),...await load("checked-fungi-package-file.mjs"),...await load("checked-fungi-package-publication-loader.mjs"),...await load("safe-value-envelope.mjs"),...await load("portable-veo.mjs")};}
function expectation(r){return {packageSetDigest:r.packageSetDigest,packageIdentity:r.packageIdentity,exportName:r.exportName,receiptDigest:r.receiptDigest,safeValueTypeId:r.safeValueTypeId,safeValueStateId:r.safeValueStateId,safeValueProvenanceDigest:r.safeValueProvenanceDigest};}

it("publishes and independently re-admits all 40 wave-14 source decisions through physical SLIDE/VOK",{skip:!AVAILABLE},async()=>{
  const slide=await api();const context=slide.portableVeoReferenceContext();const sources=CANDIDATES.map(c=>Uint8Array.from(readFileSync(join(ROOT,c.file))));
  const request=bytes=>({packages:[{identity:"@galerina/test",version:"1.0.0-beta.14",exports:CANDIDATES.map((c,i)=>({name:c.flow,sourceFlowName:c.flow,sourceBytes:bytes[i]})),dependencies:[],resources:[]}],context,gates:GATES});
  const compiled=slide.compileCheckedFungiPackageSet(request(sources));
  if(compiled.verdict!==1){const failures=[];for(let i=0;i<CANDIDATES.length;i++){const c=CANDIDATES[i];const one=slide.compileCheckedFungiPackageSet({packages:[{identity:"@galerina/test",version:"1.0.0-beta.14",exports:[{name:c.flow,sourceFlowName:c.flow,sourceBytes:sources[i]}],dependencies:[],resources:[]}],context,gates:GATES});if(one.verdict!==1)failures.push(c.flow+":"+JSON.stringify(one));}assert.fail("physical SLIDE compilation refused: "+failures.join(", "));}
  const changed=sources.map(source=>Uint8Array.from(source));changed[0][0]^=1;assert.equal(slide.compileCheckedFungiPackageSet(request(changed)).verdict,-1);
  const parent=await mkdtemp(join(tmpdir(),"galerina-wave-14-"));const out=join(parent,"published");
  try{const published=await slide.publishCheckedFungiPackageBuild({packageBuildHandle:compiled.packageBuildHandle,outputDirectory:out});assert.equal(published.verdict,1,JSON.stringify(published));const files=published.outputFiles.filter(n=>n.endsWith(".slide"));assert.equal(files.length,40);let last;
    for(const c of CANDIDATES){const prepared=await slide.prepareCheckedFungiPackagePublication({publicationDirectory:out,packageIdentity:"@galerina/test",exportName:c.flow,context,gates:GATES});assert.equal(prepared.verdict,1,c.flow);const receipt=slide.executeTypedCheckedFungiPackagePublication(prepared.packageExecutionHandle,c.args,undefined);assert.equal(receipt.status,"SUCCEEDED_PHYSICAL_REFERENCE_ONLY",c.flow);const verified=slide.verifyTypedCheckedFungiPackageReceipt(receipt,expectation(receipt));assert.equal(verified.verdict,1,c.flow);assert.equal(verified.value,c.expected,c.flow);assert.equal(verified.authorityReleased,false,c.flow);last=receipt;}
    assert.equal(slide.verifyTypedCheckedFungiPackageReceipt({...last,receiptDigest:"sha256:"+"0".repeat(64)},expectation(last)).verdict,-1);
    const path=join(out,files[0]);const bytes=await readFile(path);bytes[0]^=1;await writeFile(path,bytes);assert.equal((await slide.prepareCheckedFungiPackagePublication({publicationDirectory:out,packageIdentity:"@galerina/test",exportName:CANDIDATES[0].flow,context,gates:GATES})).verdict,-1);
  }finally{await rm(parent,{recursive:true,force:true});}
});
