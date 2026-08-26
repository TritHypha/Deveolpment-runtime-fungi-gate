/**
 * galerina-ext-secrets-vault — VaultClient
 *
 * Minimal HashiCorp Vault KV v2 HTTP client using Node.js built-ins only
 * (no external dependencies).  Supports:
 *   - HTTPS for production instances
 *   - HTTP for dev-mode (VAULT_DEV_ROOT_TOKEN_ID present → 127.0.0.1:8200)
 */
import * as https from "node:https";
import * as http from "node:http";
import type { IncomingMessage } from "node:http";

const HARD_MAX_RESPONSE_BYTES = 1024 * 1024;
const HARD_TIMEOUT_MS = 10_000;

export interface VaultClientOptions {
  readonly allowInsecureLoopback?: boolean;
  readonly maxResponseBytes?: number;
  readonly timeoutMs?: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function makeRequest(
  url: string,
  token: string,
  method: "GET" | "LIST",
  maxResponseBytes: number,
  timeoutMs: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const isHttps = parsed.protocol === "https:";
    const transport: typeof https = isHttps
      ? (https as typeof https)
      : (http as unknown as typeof https);

    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: method === "LIST" ? "LIST" : "GET",
      headers: {
        "X-Vault-Token": token,
        "Content-Type": "application/json",
      },
    };

    let settled = false;
    const rejectOnce = (error: Error): void => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    const req = transport.request(options, (res: IncomingMessage) => {
      const chunks: Buffer[] = [];
      let totalBytes = 0;
      res.on("data", (chunk: Buffer | string) => {
        const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        totalBytes += bytes.length;
        if (totalBytes > maxResponseBytes) {
          const error = new Error(`Vault response exceeds the hard ${maxResponseBytes}-byte limit`);
          rejectOnce(error);
          res.destroy(error);
          return;
        }
        chunks.push(bytes);
      });
      res.on("error", (error: Error) => rejectOnce(error));
      res.on("aborted", () => rejectOnce(new Error("Vault response aborted before completion")));
      res.on("end", () => {
        if (settled) return;
        const body = Buffer.concat(chunks);
        const status = res.statusCode ?? 0;
        if (status < 200 || status >= 300) {
          rejectOnce(new Error(`Vault HTTP ${status} for ${method}; response body withheld`));
          return;
        }
        settled = true;
        resolve(body);
      });
    });

    const wallTimer = setTimeout(() => {
      req.destroy(new Error(`Vault request exceeded the hard ${timeoutMs}ms deadline`));
    }, timeoutMs);
    req.on("close", () => clearTimeout(wallTimer));
    req.on("error", (error: Error) => rejectOnce(error));
    req.end();
  });
}

// ---------------------------------------------------------------------------
// KV v2 response shapes (internal — not exported)
// ---------------------------------------------------------------------------

interface KvV2Response {
  data?: {
    data?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  };
}

interface KvListResponse {
  data?: { keys?: string[] };
}

const VAULT_SEGMENT = /^[A-Za-z0-9_~-][A-Za-z0-9._~-]*$/;

function encodeVaultSegment(value: string, label: string): string {
  if (value === "." || value === ".." || !VAULT_SEGMENT.test(value)) {
    throw new Error(`VaultClient: invalid ${label} segment`);
  }
  return encodeURIComponent(value);
}

function encodeVaultMount(mountPoint: string): string {
  if (mountPoint.includes("/")) {
    throw new Error("VaultClient: mount point must be one namespace segment");
  }
  return encodeVaultSegment(mountPoint, "mount");
}

function encodeVaultPath(path: string): string {
  const cleanPath = path.replace(/^\//, "").replace(/^data\//, "");
  if (cleanPath.length === 0) {
    throw new Error("VaultClient: secret path must be non-empty");
  }
  return cleanPath
    .split("/")
    .map((segment) => encodeVaultSegment(segment, "path"))
    .join("/");
}

// ---------------------------------------------------------------------------
// Public client
// ---------------------------------------------------------------------------

export class VaultClient {
  private readonly address: string;
  private readonly token: string;
  private readonly maxResponseBytes: number;
  private readonly timeoutMs: number;

  constructor(address: string, token: string, options: VaultClientOptions = {}) {
    const parsed = new URL(address);
    const hostname = parsed.hostname.toLowerCase();
    const loopback = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]" || hostname === "::1";
    if (parsed.username !== "" || parsed.password !== "") {
      throw new Error("VaultClient: credentials in the address are forbidden");
    }
    if (parsed.protocol === "http:") {
      if (options.allowInsecureLoopback !== true || !loopback) {
        throw new Error("VaultClient: plaintext transport requires explicit canonical-loopback development authority");
      }
    } else if (parsed.protocol !== "https:") {
      throw new Error("VaultClient: HTTPS is required for Vault transport");
    }
    if (token.length === 0) throw new Error("VaultClient: token must be non-empty");
    const maxResponseBytes = options.maxResponseBytes ?? HARD_MAX_RESPONSE_BYTES;
    const timeoutMs = options.timeoutMs ?? HARD_TIMEOUT_MS;
    if (!Number.isSafeInteger(maxResponseBytes) || maxResponseBytes <= 0 || maxResponseBytes > HARD_MAX_RESPONSE_BYTES) {
      throw new Error(`VaultClient: maxResponseBytes must be within 1..${HARD_MAX_RESPONSE_BYTES}`);
    }
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > HARD_TIMEOUT_MS) {
      throw new Error(`VaultClient: timeoutMs must be within 1..${HARD_TIMEOUT_MS}`);
    }
    this.address = address.replace(/\/$/, ""); // strip trailing slash
    this.token = token;
    this.maxResponseBytes = maxResponseBytes;
    this.timeoutMs = timeoutMs;
  }

  /**
   * Read a KV v2 secret at `path` under `mountPoint`.
   *
   * The KV v2 API lives at `<mountPoint>/data/<path>`.
   * Returns the full `data.data` object serialised as a UTF-8 JSON Buffer.
   * Callers decide which field(s) to extract.
   */
  async readSecret(path: string, mountPoint = "secret"): Promise<Buffer> {
    const cleanPath = encodeVaultPath(path);
    const cleanMount = encodeVaultMount(mountPoint);
    const url = `${this.address}/v1/${cleanMount}/data/${cleanPath}`;
    const raw = await makeRequest(url, this.token, "GET", this.maxResponseBytes, this.timeoutMs);
    const parsed: KvV2Response = JSON.parse(raw.toString("utf8")) as KvV2Response;

    if (!parsed.data?.data) {
      throw new Error(
        `Vault KV v2: no data.data in response for path "${path}" (mount: ${mountPoint})`
      );
    }

    return Buffer.from(JSON.stringify(parsed.data.data), "utf8");
  }

  /**
   * List secrets under a mountPoint path.
   * Returns an array of key names relative to the path.
   */
  async listSecrets(mountPoint = "secret"): Promise<string[]> {
    const cleanMount = encodeVaultMount(mountPoint);
    const url = `${this.address}/v1/${cleanMount}/metadata/`;
    const raw = await makeRequest(url, this.token, "LIST", this.maxResponseBytes, this.timeoutMs);
    const parsed: KvListResponse = JSON.parse(raw.toString("utf8")) as KvListResponse;
    return parsed.data?.keys ?? [];
  }

  /**
   * Factory: build a VaultClient from environment variables.
   * If VAULT_DEV_ROOT_TOKEN_ID is set, uses http://127.0.0.1:8200 (dev mode).
   * Otherwise uses VAULT_ADDR + VAULT_TOKEN.
   */
  static fromEnv(): VaultClient {
    const devToken = process.env["VAULT_DEV_ROOT_TOKEN_ID"];
    if (devToken) {
      const addr =
        process.env["VAULT_ADDR"] ?? "http://127.0.0.1:8200";
      return new VaultClient(addr, devToken, { allowInsecureLoopback: true });
    }
    const addr = process.env["VAULT_ADDR"];
    const token = process.env["VAULT_TOKEN"];
    if (!addr || !token) {
      throw new Error(
        "VaultClient.fromEnv: VAULT_ADDR and VAULT_TOKEN must be set " +
          "(or VAULT_DEV_ROOT_TOKEN_ID for dev mode)"
      );
    }
    return new VaultClient(addr, token);
  }
}
