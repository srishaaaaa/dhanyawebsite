import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

export function hashPassword(pw: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${scryptSync(pw, salt, 64).toString("hex")}`;
}

export function verifyPassword(pw: string, stored: string | null | undefined) {
  // Always run a scrypt to keep timing similar for unknown users.
  const [scheme, salt, hex] = (stored ?? "scrypt$00$00").split("$");
  const derived = scryptSync(pw, salt ?? "00", 64);
  if (scheme !== "scrypt" || !hex) return false;
  const expected = Buffer.from(hex, "hex");
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}
