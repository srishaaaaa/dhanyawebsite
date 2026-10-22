import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { carts, cartItems, productVariants, products } from "@/db/schema";
import { isPublished } from "@/lib/catalog/queries";
import { round2 } from "@/lib/money";
import { getSettings } from "@/lib/settings";

export const MAX_PER_LINE = 10;

export type CartLine = {
  id: string; variantId: string; productId: string; slug: string; name: string; size: string | null; color: string | null;
  image: string | null; unitPrice: number; compareAt: number | null; quantity: number; available: number; purchasable: boolean; lineTotal: number;
};
export type CartView = { lines: CartLine[]; count: number; subtotal: number; shippingEstimate: number | null; freeShippingThreshold: number | null; issues: string[] };

/**
 * Resolves the shopper's cart. Signed-in shoppers own one cart across devices; a guest cart from this browser
 * is claimed (or merged into the account cart) the first time they're seen signed in.
 */
export async function cartIdFor(sid: string | null, uid: string | null, create: boolean): Promise<string | null> {
  const [guest] = sid ? await db.select({ id: carts.id, userId: carts.userId }).from(carts).where(eq(carts.sessionId, sid)).limit(1) : [];
  if (uid) {
    const [mine] = await db.select({ id: carts.id }).from(carts).where(eq(carts.userId, uid)).orderBy(carts.createdAt).limit(1);
    if (guest && !guest.userId) {
      if (!mine) {
        await db.update(carts).set({ userId: uid, updatedAt: new Date() }).where(eq(carts.id, guest.id));
        return guest.id;
      }
      await db.batch([
        db.execute(sql`INSERT INTO cart_items (cart_id, variant_id, quantity)
          SELECT ${mine.id}::uuid, variant_id, quantity FROM cart_items WHERE cart_id = ${guest.id}::uuid
          ON CONFLICT (cart_id, variant_id) DO UPDATE SET quantity = least(greatest(cart_items.quantity, excluded.quantity), ${MAX_PER_LINE}::int)`),
        db.delete(carts).where(eq(carts.id, guest.id)),
      ]);
      return mine.id;
    }
    if (mine) return mine.id;
    if (!create) return null;
    const [c] = await db.insert(carts).values({ userId: uid }).returning({ id: carts.id });
    return c.id;
  }
  if (guest || !create || !sid) return guest?.id ?? null;
  await db.insert(carts).values({ sessionId: sid }).onConflictDoNothing();
  const [again] = await db.select({ id: carts.id }).from(carts).where(eq(carts.sessionId, sid)).limit(1);
  return again.id;
}

/** Prices and stock always come from the database — never from the browser. */
export async function getCart(sid: string | null, uid: string | null = null): Promise<CartView> {
  const empty: CartView = { lines: [], count: 0, subtotal: 0, shippingEstimate: null, freeShippingThreshold: null, issues: [] };
  if (!sid && !uid) return empty;
  const cartId = await cartIdFor(sid, uid, false);
  if (!cartId) return empty;
  const rows = await db.select({
    id: cartItems.id, variantId: cartItems.variantId, quantity: cartItems.quantity, productId: products.id, slug: products.slug, name: products.name,
    size: productVariants.size, color: productVariants.color, price: sql<string>`coalesce(${productVariants.priceOverride}, ${products.price})`,
    compareAt: products.compareAtPrice, gst: products.gstRate, variantActive: productVariants.isActive,
    available: sql<number>`greatest(${productVariants.stock} - ${productVariants.reserved}, 0)::int`,
    published: sql<boolean>`${isPublished()}`,
    image: sql<string | null>`coalesce(
      (select url from product_images i where i.product_id = ${products.id} and lower(i.color_name) = lower(${productVariants.color}) order by sort_order limit 1),
      (select url from product_images i where i.product_id = ${products.id} order by sort_order limit 1))`,
  }).from(cartItems)
    .innerJoin(productVariants, eq(productVariants.id, cartItems.variantId))
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(eq(cartItems.cartId, cartId)).orderBy(cartItems.id);

  const issues: string[] = [];
  const lines: CartLine[] = rows.map((r) => {
    const gst = 1 + Number(r.gst) / 100;
    const unit = round2(Number(r.price) * gst);
    const purchasable = r.published && r.variantActive && r.available >= r.quantity;
    if (!r.published || !r.variantActive) issues.push(`${r.name} is no longer available.`);
    else if (r.available === 0) issues.push(`${r.name}${r.size ? ` (${r.size})` : ""} is out of stock.`);
    else if (r.available < r.quantity) issues.push(`Only ${r.available} of ${r.name}${r.size ? ` (${r.size})` : ""} left — please reduce the quantity.`);
    return {
      id: r.id, variantId: r.variantId, productId: r.productId, slug: r.slug, name: r.name, size: r.size, color: r.color, image: r.image,
      unitPrice: unit, compareAt: r.compareAt ? round2(Number(r.compareAt) * gst) : null, quantity: r.quantity,
      available: r.available, purchasable, lineTotal: round2(unit * r.quantity),
    };
  });
  const subtotal = round2(lines.filter((l) => l.purchasable).reduce((a, l) => a + l.lineTotal, 0));
  const { shipping } = await getSettings();
  const free = shipping.freeShippingThreshold;
  const shippingEstimate = lines.length === 0 ? null : free !== null && subtotal >= free ? 0 : Number(shipping.flatFee) || 0;
  return { lines, count: lines.reduce((a, l) => a + l.quantity, 0), subtotal, shippingEstimate, freeShippingThreshold: free, issues };
}

export class CartError extends Error {}

export async function addToCart(sid: string, uid: string | null, variantId: string, qty: number) {
  const [v] = await db.select({
    available: sql<number>`greatest(${productVariants.stock} - ${productVariants.reserved}, 0)::int`,
    ok: sql<boolean>`${productVariants.isActive} and ${isPublished()}`,
  }).from(productVariants).innerJoin(products, eq(products.id, productVariants.productId))
    .where(eq(productVariants.id, variantId)).limit(1);
  if (!v || !v.ok) throw new CartError("This item isn't available any more.");
  const cartId = (await cartIdFor(sid, uid, true))!;
  const [existing] = await db.select({ q: cartItems.quantity }).from(cartItems)
    .where(and(eq(cartItems.cartId, cartId), eq(cartItems.variantId, variantId))).limit(1);
  const want = (existing?.q ?? 0) + qty;
  if (v.available <= 0) throw new CartError("Sorry, this size is sold out.");
  if (want > v.available) throw new CartError(`Only ${v.available} left in this size${existing ? " — you already have " + existing.q + " in your bag" : ""}.`);
  if (want > MAX_PER_LINE) throw new CartError(`You can add up to ${MAX_PER_LINE} of one item.`);
  await db.insert(cartItems).values({ cartId, variantId, quantity: want })
    .onConflictDoUpdate({ target: [cartItems.cartId, cartItems.variantId], set: { quantity: want } });
  await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cartId));
}

export async function setLineQuantity(sid: string, uid: string | null, itemId: string, qty: number) {
  const cartId = await cartIdFor(sid, uid, false);
  if (!cartId) throw new CartError("Your bag is empty.");
  if (qty <= 0) { await db.delete(cartItems).where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId))); return; }
  const [row] = await db.select({ available: sql<number>`greatest(${productVariants.stock} - ${productVariants.reserved}, 0)::int` })
    .from(cartItems).innerJoin(productVariants, eq(productVariants.id, cartItems.variantId))
    .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId))).limit(1);
  if (!row) throw new CartError("That item isn't in your bag.");
  if (qty > row.available) throw new CartError(`Only ${row.available} available.`);
  if (qty > MAX_PER_LINE) throw new CartError(`You can add up to ${MAX_PER_LINE} of one item.`);
  await db.update(cartItems).set({ quantity: qty }).where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)));
}

export async function clearCart(cartId: string) {
  await db.delete(cartItems).where(eq(cartItems.cartId, cartId));
}
