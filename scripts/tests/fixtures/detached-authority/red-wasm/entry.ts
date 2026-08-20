declare function runWasmStandaloneBuild(): Uint8Array;
declare function emitWat(): string;
declare function assembleWasm(wat: string): Uint8Array;
declare function runWasmRuntime(bytes: Uint8Array): Uint8Array;
declare const cachedLegacyRuntime: { execute(bytes: Uint8Array): Uint8Array };

export const legacyExecution = runWasmStandaloneBuild();
export const wat = emitWat();
export const assembled = assembleWasm(wat);
export const runtimeResult = runWasmRuntime(assembled);
export const cachedResult = cachedLegacyRuntime.execute(assembled);
