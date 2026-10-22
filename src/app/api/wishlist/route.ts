import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { products } from "@/db/schema";
import { auth } from "@/auth";
import { ensureSid, readSid } from "@/lib/session-id";
import { toggleWishlist, wishlistIds } from "@/lib/wishlist";

export const dynamic = "force-dynamic";
const body = z.object({ productId: z.string().uuid() });
const json = (d: unknown, s = 200) => NextResponse.json(d, { status: s, headers: { "cache-control": "no-store" } });
const uidOf = async () => (await auth().catch(() => null))?.user?.id ?? null;

export async function GET() {
  try { return json({ ids: await wishlistIds(await readSid(), await uidOf()) }); } catch { return json({ ids: [] }); }
}

/** Toggles a product in the wishlist. */
export async function POST(req: NextRequest) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid request." }, 400);
  const [sid, uid] = await Promise.all([ensureSid(), uidOf()]);
  const { productId } = parsed.data;
  const [p] = await db.select({ id: products.id }).from(products).where(eq(products.id, productId)).limit(1);
  if (!p) return json({ error: "Product not found." }, 404);
  const ids = await wishlistIds(sid, uid);
  if (!ids.includes(productId) && ids.length >= 200) return json({ error: "Your wishlist is full (200 items)." }, 409);
  const saved = await toggleWishlist(sid, uid, productId);
  return json({ ids: await wishlistIds(sid, uid), saved });
}
