/**
 * Generate a compact unique ID.
 *
 * Uses timestamp prefix + random suffix for sortability and uniqueness.
 * Sufficient for single-user application IDs.
 */
export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `${timestamp}${random}`;
}
