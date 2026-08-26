declare module "node:util/types" {
  export function isProxy(value: unknown): boolean;
}

declare module "node:vm" {
  export function runInNewContext(
    code: string,
    contextObject?: object,
    options?: { readonly timeout?: number },
  ): unknown;
}
