import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const sign = (email: string) => createHmac("sha256", process.env.AUTH_SECRET ?? "dev-secret").update(`unsub:${email.toLowerCase()}`).digest("base64url").slice(0, 32);

export const unsubscribeLink = (email: string) => `${SITE}/newsletter/unsubscribe?e=${encodeURIComponent(email)}&s=${sign(email)}`;
export function verifyUnsubscribe(email: string, sig: string) {
  const a = Buffer.from(sign(email)), b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}
