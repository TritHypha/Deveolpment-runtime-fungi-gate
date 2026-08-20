declare const Tower: { execute(): Uint8Array };
declare const TriPipe: { execute(): Uint8Array };
declare const TriFuse: { execute(): Uint8Array };
declare const Hypha: { execute(): Uint8Array };

export const componentAuthority = Tower.execute();
export const triPipeAuthority = TriPipe.execute();
export const triFuseAuthority = TriFuse.execute();
export const hyphaAuthority = Hypha.execute();
