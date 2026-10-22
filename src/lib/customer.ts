import "server-only";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

/** The signed-in shopper (any account — staff can shop too), or null. Always read from the DB. */
export async function getCustomer() {
  const session = await auth().catch(() => null);
  const id = session?.user?.id;
  if (!id) return null;
  const [u] = await db.select({ id: users.id, name: users.name, email: users.email, phone: users.phone }).from(users).where(eq(users.id, id)).limit(1);
  return u ?? null;
}

export async function requireCustomer(next = "/account") {
  const u = await getCustomer();
  if (!u) redirect(`/account/login?next=${encodeURIComponent(next)}`);
  return u;
}

export function safeNext(next: string | null | undefined, fallback = "/account") {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/admin") ? next : fallback;
}
