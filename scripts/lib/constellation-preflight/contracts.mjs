export const PREFLIGHT_SCHEMA = "galerina.constellation-preflight.v1";
export const PREFLIGHT_TOOL_VERSION = "1.0.0";
export const PREFLIGHT_PROFILE = "detached-scalar";
export const PREFLIGHT_OWNERS = Object.freeze(["galerina", "slide", "vok", "lyth"]);
export const PREFLIGHT_STATUSES = Object.freeze(["ALLOW", "HOLD", "REFUSED", "ERROR"]);

export class PreflightError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "PreflightError";
    this.code = code;
  }
}
