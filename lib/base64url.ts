/**
 * Encode une chaîne de caractères en base64url de manière sécurisée et isomorphe.
 * Cela fonctionne aussi bien côté Node.js que côté navigateur (avec le polyfill Buffer).
 * Résout le problème "Unknown encoding: base64url" dans le navigateur.
 */
export function encodeBase64Url(str: string): string {
  // On utilise le Buffer (qui est polyfillé dans le navigateur par Next.js/Webpack)
  // pour encoder en base64 classique (qui supporte bien l'UTF-8),
  // puis on remplace manuellement les caractères pour le rendre URL-safe.
  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}
