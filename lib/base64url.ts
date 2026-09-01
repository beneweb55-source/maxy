/**
 * Encode une chaîne de caractères en base64url de manière sécurisée et isomorphe.
 * Cela fonctionne aussi bien côté Node.js que côté navigateur (avec le polyfill Buffer).
 * Résout le problème "Unknown encoding: base64url" dans le navigateur.
 */
export function encodeBase64Url(str: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(str)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
  }
  const utf8Bytes = new TextEncoder().encode(str);
  const binString = Array.from(utf8Bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binString)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export function decodeBase64Url(str: string): string {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  if (typeof Buffer !== "undefined") {
    return Buffer.from(base64, "base64").toString("utf-8");
  }
  const binString = atob(base64);
  const bytes = new Uint8Array(binString.length);
  for (let i = 0; i < binString.length; i++) {
    bytes[i] = binString.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}
