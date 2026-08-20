export interface DetachedArtifactReference {
  readonly digest: string;
  readonly locator: string;
}

export type DetachedResult =
  | { readonly kind: "gir"; readonly bytes: Uint8Array; readonly reference: DetachedArtifactReference }
  | { readonly kind: "refusal"; readonly reason: "EMPTY_SNAPSHOT" };

export function acceptDetachedSnapshot(
  snapshot: Uint8Array,
  artifactReference: DetachedArtifactReference,
): DetachedResult {
  if (snapshot.byteLength === 0) {
    return { kind: "refusal", reason: "EMPTY_SNAPSHOT" };
  }

  return {
    kind: "gir",
    bytes: snapshot.slice(),
    reference: artifactReference,
  };
}
