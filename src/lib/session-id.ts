import "server-only";
import { cookies } from "next/headers";

// Anonymous shopper id for cart & wishlist. httpOnly so scripts can't read it.
export const SID_COOKIE = "db_sid";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function readSid() {
  const v = (await cookies()).get(SID_COOKIE)?.value;
  return v && UUID.test(v) ? v : null;
}

/** Only call from a Route Handler or Server Action (cookies are writable there). */
export async function ensureSid() {
  const existing = await readSid();
  if (existing) return existing;
  const sid = crypto.randomUUID();
  (await cookies()).set(SID_COOKIE, sid, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 90,
  });
  return sid;
}
