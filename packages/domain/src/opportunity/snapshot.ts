/**
 * Computes a deterministic content hash of description text.
 * Used to verify if a new capture has identical content or requires a new snapshot.
 */
export async function computeContentHash(text: string): Promise<string> {
  const normalized = text.trim().replace(/\s+/g, " ");

  if (typeof crypto !== "undefined" && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(normalized);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // Fallback simple 32-bit hash if subtle crypto is unavailable in the environment
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash << 5) - hash + normalized.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}
