import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { wishlistItems } from "@/db/schema";

/** Moves this browser's guest wishlist into the signed-in account (once). */
async function claim(sid: string | null, uid: string) {
  if (!sid) return;
  await db.batch([
    db.execute(sql`INSERT INTO wishlist_items (user_id, product_id, created_at)
      SELECT ${uid}::text, product_id, created_at FROM wishlist_items WHERE session_id = ${sid}::text ON CONFLICT DO NOTHING`),
    db.delete(wishlistItems).where(eq(wishlistItems.sessionId, sid)),
  ]);
}

const owner = (sid: string | null, uid: string | null) => (uid ? eq(wishlistItems.userId, uid) : eq(wishlistItems.sessionId, sid ?? "-"));

export async function wishlistIds(sid: string | null, uid: string | null) {
  if (uid) await claim(sid, uid);
  if (!sid && !uid) return [];
  const rows = await db.select({ id: wishlistItems.productId }).from(wishlistItems).where(owner(sid, uid)).orderBy(sql`${wishlistItems.createdAt} desc`);
  return rows.map((r) => r.id);
}

export async function toggleWishlist(sid: string, uid: string | null, productId: string) {
  const where = and(owner(sid, uid), eq(wishlistItems.productId, productId));
  const [exists] = await db.select({ id: wishlistItems.productId }).from(wishlistItems).where(where).limit(1);
  if (exists) { await db.delete(wishlistItems).where(where); return false; }
  await db.insert(wishlistItems).values(uid ? { userId: uid, productId } : { sessionId: sid, productId }).onConflictDoNothing();
  return true;
}
