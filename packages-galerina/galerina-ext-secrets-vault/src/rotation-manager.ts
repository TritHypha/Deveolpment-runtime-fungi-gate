/**
 * galerina-ext-secrets-vault — SecretsRotationManager
 *
 * Implements the dual-token validation window described in the design doc:
 *
 *   Stage new value → quiesce (50 ms drain window) → atomic swap → zero-wipe old slot
 *
 * The guest is never restarted; in-flight reads using the old value complete
 * safely within the quiesce window before the swap happens.
 */
import type { SecretCredential, SecretHandle, SecretHandleStatus, RotationPolicy } from "./types.js";
import type { VaultClient } from "./vault-client.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Quiesce wait: allow in-flight reads to drain before the atomic swap. */
const QUIESCE_MS = 50;

// ---------------------------------------------------------------------------
// Public class
// ---------------------------------------------------------------------------

export class SecretsRotationManager {
  /** credential-id → live handle */
  private readonly handles: Map<string, SecretHandle> = new Map();
  /** At most one live rotation lease per credential. Concurrent requests refuse. */
  private readonly rotations: Map<string, Promise<void>> = new Map();

  /**
   * Load a credential from Vault and store it as the active handle.
   * If a handle for this id already exists it is replaced (fresh load).
   */
  async load(
    credential: SecretCredential,
    vaultClient: VaultClient
  ): Promise<void> {
    const raw = await vaultClient.readSecret(
      credential.path,
      credential.mountPoint ?? "secret"
    );
    const existing = this.handles.get(credential.id);
    const version = existing !== undefined ? existing.version + 1 : 1;

    // Zero-wipe the old active value if we're replacing
    if (existing !== undefined) {
      existing.activeValue.fill(0);
      if (existing.stagingValue !== null) {
        existing.stagingValue.fill(0);
      }
    }

    this.handles.set(credential.id, {
      id: credential.id,
      activeValue: raw,
      stagingValue: null,
      version,
    });
  }

  /**
   * Dual-token rotation:
   *   1. Fetch new secret from Vault → store in stagingValue
   *   2. Quiesce: wait QUIESCE_MS for in-flight reads to complete
   *   3. Atomic swap: activeValue ← stagingValue
   *   4. Zero-wipe the old active buffer
   *   5. Clear stagingValue
   */
  async rotate(
    credentialId: string,
    vaultClient: VaultClient,
    credential?: SecretCredential
  ): Promise<void> {
    const current = this.rotations.get(credentialId);
    if (current !== undefined) {
      await current;
      return;
    }

    const operation = this.rotateOnce(credentialId, vaultClient, credential);
    this.rotations.set(credentialId, operation);
    try {
      await operation;
    } finally {
      if (this.rotations.get(credentialId) === operation) {
        this.rotations.delete(credentialId);
      }
    }
  }

  private async rotateOnce(
    credentialId: string,
    vaultClient: VaultClient,
    credential?: SecretCredential
  ): Promise<void> {
    const handle = this.handles.get(credentialId);
    if (handle === undefined) {
      throw new Error(
        `SecretsRotationManager.rotate: unknown credential "${credentialId}"`
      );
    }

    // Keep the candidate operation-local until the owned commit point.
    const path = credential?.path ?? credentialId;
    const mountPoint = credential?.mountPoint ?? "secret";
    const newValue = await vaultClient.readSecret(path, mountPoint);
    let committed = false;
    try {
      await new Promise<void>((res) => setTimeout(res, QUIESCE_MS));
      if (this.handles.get(credentialId) !== handle) {
        throw new Error(
          `SecretsRotationManager.rotate: credential "${credentialId}" changed during rotation`
        );
      }

      const oldActive = handle.activeValue;
      handle.activeValue = newValue;
      handle.stagingValue = null;
      (handle as unknown as { version: number }).version += 1;
      committed = true;
      oldActive.fill(0);
    } finally {
      if (!committed) newValue.fill(0);
    }
  }

  /**
   * Run a synchronous callback with one transient owned copy of the active value.
   * The copy is wiped before return; the only method result is non-secret presence.
   */
  useActive(credentialId: string, callback: (value: Buffer) => void): boolean {
    const handle = this.handles.get(credentialId);
    // Fail closed: a faulted (quarantined) credential is never served.
    if (handle === undefined || handle.faulted === true) return false;
    const value = Buffer.from(handle.activeValue);
    try {
      const result: unknown = callback(value);
      if (
        typeof result === "object" &&
        result !== null &&
        "then" in result &&
        typeof (result as { readonly then?: unknown }).then === "function"
      ) {
        throw new Error("SecretsRotationManager.useActive callback must be synchronous");
      }
      return true;
    } finally {
      value.fill(0);
    }
  }

  /** Return an immutable, redacted status view with no secret buffers. */
  getHandle(credentialId: string): SecretHandleStatus | undefined {
    const handle = this.handles.get(credentialId);
    if (handle === undefined) return undefined;
    return Object.freeze({
      id: handle.id,
      version: handle.version,
      faulted: handle.faulted === true,
    });
  }

  /**
   * Return all credential ids currently loaded.
   */
  listIds(): string[] {
    return Array.from(this.handles.keys());
  }

  /**
   * Zero-wipe and remove a credential handle. After eviction `useActive` returns
   * false, so any downstream read fails closed — a stale key is never served.
   */
  private evict(credentialId: string): void {
    const h = this.handles.get(credentialId);
    if (h === undefined) return;
    h.activeValue.fill(0);
    if (h.stagingValue !== null) h.stagingValue.fill(0);
    this.handles.delete(credentialId);
  }

  /**
   * Rotate a credential and, if the rotation FAILS, apply the contract's
   * `on_rotation_fault` policy — so a stale key is never silently retained
   * (zero-trust: we cannot trust a stale key). Never throws; returns true if
   * rotated, false if a fault was handled.
   *   - "halt"       → evict the credential (zero-wipe + remove); useActive fails closed.
   *   - "quarantine" → wipe the active value + mark faulted; useActive fails closed,
   *                    handle retained for inspection.
   *   - "log"        → log and keep serving the previous value (explicit opt-in,
   *                    NOT fail-closed — for dev/non-sensitive credentials only).
   */
  async rotateOrFault(
    credential: SecretCredential,
    vaultClient: VaultClient,
    onRotationFault: RotationPolicy["onRotationFault"] = "halt"
  ): Promise<boolean> {
    try {
      await this.rotate(credential.id, vaultClient, credential);
      const h = this.handles.get(credential.id);
      if (h !== undefined) h.faulted = false;
      return true;
    } catch (err: unknown) {
      const base = `[galerina-ext-secrets-vault] rotation fault for "${credential.id}" (policy=${onRotationFault}): ${String(err)}`;
      if (onRotationFault === "halt") {
        console.error(`${base} → HALT (credential evicted, fail-closed)`);
        this.evict(credential.id);
      } else if (onRotationFault === "quarantine") {
        console.error(`${base} → QUARANTINE (active value wiped, reads fail-closed)`);
        const h = this.handles.get(credential.id);
        if (h !== undefined) {
          h.activeValue.fill(0);
          if (h.stagingValue !== null) { h.stagingValue.fill(0); h.stagingValue = null; }
          h.faulted = true;
        }
      } else {
        console.error(`${base} → LOG (stale value retained — NOT fail-closed; opt-in only)`);
      }
      return false;
    }
  }

  /**
   * Start a background rotation sweep that rotates all credentials on a fixed
   * interval. On a rotation fault the `onRotationFault` policy is applied
   * (default **"halt"** — fail-closed by default). Returns the timer so the
   * caller can stop it.
   */
  startRotationSweep(
    credentials: SecretCredential[],
    vaultClient: VaultClient,
    intervalMs: number,
    onRotationFault: RotationPolicy["onRotationFault"] = "halt"
  ): NodeJS.Timeout {
    return setInterval(() => {
      for (const cred of credentials) {
        // rotateOrFault never throws — it applies the fault policy internally.
        void this.rotateOrFault(cred, vaultClient, onRotationFault);
      }
    }, intervalMs);
  }

  /**
   * Stop a running rotation sweep timer.
   */
  stopRotationSweep(timer: NodeJS.Timeout): void {
    clearInterval(timer);
  }

  /**
   * Zero-wipe all loaded handles and clear the map.
   * Should be called on shutdown.
   */
  dispose(): void {
    for (const handle of this.handles.values()) {
      handle.activeValue.fill(0);
      if (handle.stagingValue !== null) {
        handle.stagingValue.fill(0);
      }
    }
    this.handles.clear();
  }
}
