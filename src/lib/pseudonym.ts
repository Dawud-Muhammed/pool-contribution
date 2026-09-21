import { createHash } from "crypto";

/**
 * Generates a non-reversible pseudonymous handle for a contributor.
 * Per PRD §11: never reveals name, phone, or receipt reference.
 */
export function generatePseudonym(userIdOrSeed: string): string {
  const hash = createHash("sha256").update(userIdOrSeed).digest("hex");
  const shortCode = hash.substring(0, 6).toUpperCase();
  return `Contributor #${shortCode}`;
}
