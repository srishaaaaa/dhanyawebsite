import "server-only";
import { timingSafeEqual } from "node:crypto";
import { getStaff } from "@/lib/authz";

/** Owner (signed in), holder of the order's secret link, or staff. */
export async function canViewOrder(o: { userId: string | null; accessToken: string | null }, who: { uid: string | null; token: string | null }) {
  if (who.uid && o.userId === who.uid) return true;
  if (who.token && o.accessToken) {
    const a = Buffer.from(who.token), b = Buffer.from(o.accessToken);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  return Boolean(await getStaff("staff", "orders"));
}
