import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { z } from "zod";
import { db } from "@/db";
import {
  cartItems, productVariants, products, productCollections, coupons, couponRedemptions, orders, orderItems,
  orderStatusHistory, payments,
} from "@/db/schema";
import { isPublished } from "@/lib/catalog/queries";
import { cartIdFor } from "@/lib/cart";
import { getSettings } from "@/lib/settings";
import { quote, type CouponRule, type Quote } from "@/lib/pricing";
import { reserveSql, confirmOrderSql, releasePendingOrderSql, releaseExpiredSql, financialYear } from "@/lib/orders-sql";
import { createOrder, razorpayConfigured } from "@/lib/razorpay";
import { INDIAN_STATES, MOBILE_RE, PINCODE_RE, normaliseMobile } from "@/lib/india";
import { sendOrderConfirmation } from "@/lib/order-emails";
import { getBrand } from "@/lib/brand";

type Stmt = BatchItem<"pg">;
const RESERVE_MINUTES_SQL = sql.raw("30 minutes"); // unpaid online orders hold stock this long

export type CheckoutLine = {
  variantId: string; productId: string; collectionIds: string[]; name: string; sku: string; size: string | null; color: string | null;
  image: string | null; hsn: string | null; unitExcl: number; gstRate: number; quantity: number; available: number; ok: boolean;
};

export async function loadLines(cartId: string): Promise<CheckoutLine[]> {
  const rows = await db.select({
    variantId: productVariants.id, productId: products.id, name: products.name, sku: productVariants.sku, size: productVariants.size,
    color: productVariants.color, hsn: products.hsnCode, quantity: cartItems.quantity,
    unitExcl: sql<string>`coalesce(${productVariants.priceOverride}, ${products.price})`, gstRate: products.gstRate,
    available: sql<number>`greatest(${productVariants.stock} - ${productVariants.reserved}, 0)::int`,
    ok: sql<boolean>`${productVariants.isActive} and ${isPublished()}`,
    image: sql<string | null>`(select url from product_images i where i.product_id = ${products.id} order by (lower(i.color_name) = lower(${productVariants.color})) desc nulls last, sort_order limit 1)`,
  }).from(cartItems)
    .innerJoin(productVariants, eq(productVariants.id, cartItems.variantId))
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(eq(cartItems.cartId, cartId)).orderBy(cartItems.id);
  const pids = [...new Set(rows.map((r) => r.productId))];
  const cols = pids.length ? await db.select().from(productCollections).where(inArray(productCollections.productId, pids)) : [];
  return rows.map((r) => ({
    ...r, unitExcl: Number(r.unitExcl), gstRate: Number(r.gstRate),
    collectionIds: cols.filter((c) => c.productId === r.productId).map((c) => c.collectionId),
  }));
}

/** Looks up a coupon and checks dates, limits and per-customer use. Amount rules are applied in pricing.quote(). */
export async function findCoupon(code: string, who: { uid: string | null; email: string | null }) {
  const c = code.trim().toUpperCase();
  if (!c) return null;
  const [row] = await db.select().from(coupons).where(eq(sql`upper(${coupons.code})`, c)).limit(1);
  const now = Date.now();
  if (!row || !row.isActive) return { error: "That code isn't valid." } as const;
  if (row.startsAt && row.startsAt.getTime() > now) return { error: "That code isn't active yet." } as const;
  if (row.expiresAt && row.expiresAt.getTime() <= now) return { error: "That code has expired." } as const;
  if (row.usageLimit !== null && row.usedCount >= row.usageLimit) return { error: "That code has been fully redeemed." } as const;
  if (row.perCustomerLimit !== null && (who.uid || who.email)) {
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(couponRedemptions).where(and(
      eq(couponRedemptions.couponId, row.id),
      sql`(${who.uid ? sql`${couponRedemptions.userId} = ${who.uid}` : sql`false`} or lower(${couponRedemptions.email}) = lower(${who.email ?? ""}))`,
    ));
    if (n >= row.perCustomerLimit) return { error: "You've already used this code." } as const;
  }
  const rule: CouponRule = {
    code: row.code.toUpperCase(), type: row.type, value: Number(row.value), minOrderValue: row.minOrderValue ? Number(row.minOrderValue) : null,
    maxDiscount: row.maxDiscount ? Number(row.maxDiscount) : null, productIds: row.productIds, collectionIds: row.collectionIds,
  };
  return { id: row.id, rule } as const;
}

export type QuoteResult = {
  cartId: string | null; lines: CheckoutLine[]; quote: Quote; couponId: string | null; couponError: string | null; issues: string[];
  methods: { cod: boolean; online: boolean; express: boolean };
};

export async function buildQuote(ctx: { sid: string | null; uid: string | null }, opts: { couponCode?: string | null; state?: string | null; method?: "standard" | "express"; email?: string | null }): Promise<QuoteResult> {
  const settings = await getSettings();
  const cartId = await cartIdFor(ctx.sid, ctx.uid, false);
  const lines = cartId ? await loadLines(cartId) : [];
  const issues: string[] = [];
  for (const l of lines) {
    if (!l.ok) issues.push(`${l.name} is no longer available — please remove it.`);
    else if (l.available < l.quantity) issues.push(l.available === 0 ? `${l.name}${l.size ? ` (${l.size})` : ""} has sold out.` : `Only ${l.available} of ${l.name}${l.size ? ` (${l.size})` : ""} left.`);
  }
  let couponId: string | null = null, couponError: string | null = null, rule: CouponRule | null = null;
  if (opts.couponCode) {
    const found = await findCoupon(opts.couponCode, { uid: ctx.uid, email: opts.email ?? null });
    if (found && "error" in found) couponError = found.error ?? null;
    else if (found) { couponId = found.id; rule = found.rule; }
  }
  const q = quote(lines.map((l) => ({ key: l.variantId, productId: l.productId, collectionIds: l.collectionIds, unitExcl: l.unitExcl, gstRate: l.gstRate, quantity: l.quantity })), {
    coupon: rule, method: opts.method, shipping: settings.shipping,
    tax: { storeState: settings.tax.state ?? null, destinationState: opts.state ?? null },
  });
  if (q.coupon && !q.coupon.applied) { couponError = q.coupon.message; couponId = null; }
  const p = settings.payments;
  return {
    cartId, lines, quote: q, couponId, couponError, issues,
    methods: {
      online: razorpayConfigured() && p.onlineEnabled !== false,
      cod: Boolean(p.codEnabled) && (!p.codMaxOrder || q.grandTotal <= p.codMaxOrder),
      express: Boolean(settings.shipping.expressFee),
    },
  };
}

const address = z.object({
  fullName: z.string().trim().min(2, "Enter the full name").max(100),
  phone: z.string().trim().regex(MOBILE_RE, "Enter a valid 10-digit Indian mobile number").transform(normaliseMobile),
  line1: z.string().trim().min(3, "Enter the house / flat and street").max(200),
  line2: z.string().trim().max(200).optional().default(""),
  city: z.string().trim().min(2, "Enter the city").max(80),
  state: z.enum(INDIAN_STATES, { errorMap: () => ({ message: "Choose a state" }) }),
  pincode: z.string().trim().regex(PINCODE_RE, "Enter a valid 6-digit PIN code"),
});
export type Address = z.infer<typeof address>;

export const checkoutInput = z.object({
  idempotencyKey: z.string().uuid(),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(254),
  phone: z.string().trim().regex(MOBILE_RE, "Enter a valid 10-digit Indian mobile number").transform(normaliseMobile),
  shipping: address,
  billingSame: z.boolean().default(true),
  billing: address.optional(),
  method: z.enum(["standard", "express"]).default("standard"),
  payment: z.enum(["razorpay", "cod"]),
  couponCode: z.string().trim().max(40).optional().nullable(),
  note: z.string().trim().max(500).optional().nullable(),
  saveAddress: z.boolean().optional(),
}).refine((v) => v.billingSame || v.billing, { path: ["billing"], message: "Enter a billing address" });
export type CheckoutInput = z.input<typeof checkoutInput>;

export type RazorpayParams = { keyId: string; razorpayOrderId: string; amount: number; currency: "INR"; name: string; description: string; prefill: { name: string; email: string; contact: string } };
export type PlaceResult =
  | { ok: true; orderId: string; orderNumber: string; token: string; payment: RazorpayParams | null }
  | { ok: false; error: string; fields?: Record<string, string>; refresh?: boolean };

export function invoicePrefix(prefix?: string) {
  return `${(prefix || "DB").replace(/[^A-Za-z0-9-]/g, "")}/${financialYear()}/`;
}

async function existingOrderResult(key: string, email: string): Promise<PlaceResult | null> {
  const [o] = await db.select().from(orders).where(and(eq(orders.idempotencyKey, key), eq(orders.email, email))).limit(1);
  if (!o) return null;
  const payment = o.paymentMethod === "razorpay" && o.status === "pending_payment" ? await razorpayParamsFor(o.id) : null;
  return { ok: true, orderId: o.id, orderNumber: o.orderNumber, token: o.accessToken ?? "", payment };
}

export async function razorpayParamsFor(orderId: string): Promise<RazorpayParams | null> {
  const [o] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!o || o.status !== "pending_payment" || o.paymentMethod !== "razorpay") return null;
  if (o.reservedUntil && o.reservedUntil.getTime() < Date.now()) return null;
  const [p] = await db.select().from(payments).where(and(eq(payments.orderId, orderId), eq(payments.provider, "razorpay"))).orderBy(sql`${payments.createdAt} desc`).limit(1);
  if (!p?.providerOrderId) return null;
  const ship = o.shippingAddress as Address;
  const { store } = await getSettings();
  return {
    keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? process.env.RAZORPAY_KEY_ID ?? "", razorpayOrderId: p.providerOrderId,
    amount: Math.round(Number(o.grandTotal) * 100), currency: "INR", name: store.name, description: `Order ${o.orderNumber}`,
    prefill: { name: ship.fullName, email: o.email, contact: o.phone },
  };
}

export async function placeOrder(raw: unknown, ctx: { sid: string | null; uid: string | null }): Promise<PlaceResult> {
  const parsed = checkoutInput.safeParse(raw);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const i of parsed.error.issues) fields[i.path.join(".")] ??= i.message;
    return { ok: false, error: "Please check the highlighted details.", fields };
  }
  const input = parsed.data;
  const { maintenance } = await getBrand();
  if (maintenance.enabled) return { ok: false, error: "Checkout is paused while we update the boutique. Please try again shortly." };
  const again = await existingOrderResult(input.idempotencyKey, input.email);
  if (again) return again;

  // Housekeeping: free stock held by abandoned online payments, including this shopper's earlier attempts.
  await db.execute(releaseExpiredSql()).catch((e) => console.error("release expired failed", e));
  const stale = await db.select({ id: orders.id }).from(orders).where(and(
    eq(orders.email, input.email), eq(orders.status, "pending_payment"), eq(orders.paymentMethod, "razorpay"), sql`${orders.paymentStatus} <> 'paid'`,
  ));
  for (const s of stale) await db.execute(releasePendingOrderSql(s.id, "Replaced by a new checkout attempt", null)).catch(() => {});

  const settings = await getSettings();
  const q = await buildQuote(ctx, { couponCode: input.couponCode, state: input.shipping.state, method: input.method, email: input.email });
  if (!q.cartId || q.lines.length === 0) return { ok: false, error: "Your bag is empty.", refresh: true };
  if (q.issues.length) return { ok: false, error: q.issues.join(" "), refresh: true };
  if (input.couponCode && q.couponError) return { ok: false, error: q.couponError, fields: { couponCode: q.couponError } };
  if (input.payment === "razorpay" && !q.methods.online) return { ok: false, error: "Online payment isn't available right now. Please choose another method." };
  if (input.payment === "cod" && !q.methods.cod) return { ok: false, error: "Cash on delivery isn't available for this order." };
  if (input.method === "express" && !q.methods.express) return { ok: false, error: "Express delivery isn't available." };

  const t = q.quote;
  const orderId = randomUUID();
  const token = randomBytes(24).toString("base64url");
  const billing = input.billingSame ? input.shipping : input.billing!;
  const m = (n: number) => n.toFixed(2);
  const stmts: Stmt[] = [
    db.insert(orders).values({
      id: orderId, orderNumber: sql`'DB' || to_char(now() at time zone 'Asia/Kolkata', 'YYMM') || lpad(nextval('order_seq')::text, 5, '0')`,
      userId: ctx.uid, email: input.email, phone: input.phone, status: "pending_payment", paymentStatus: "pending", paymentMethod: input.payment,
      shippingAddress: input.shipping, billingAddress: billing, subtotal: m(t.subtotal), discountTotal: m(t.discount), shippingTotal: m(t.shipping),
      shippingTax: m(t.shippingTax), cgstTotal: m(t.cgst), sgstTotal: m(t.sgst), igstTotal: m(t.igst), grandTotal: m(t.grandTotal),
      couponCode: q.couponId ? t.coupon?.code ?? null : null, idempotencyKey: input.idempotencyKey, accessToken: token,
      reservedUntil: input.payment === "razorpay" ? sql`now() + interval '${RESERVE_MINUTES_SQL}'` : null,
      shippingMethod: input.method, customerNote: input.note || null,
    }),
    db.insert(orderItems).values(q.lines.map((l, i) => {
      const p = t.lines[i];
      return {
        orderId, variantId: l.variantId, productId: l.productId, productName: l.name, sku: l.sku, size: l.size, color: l.color, imageUrl: l.image,
        unitPrice: m(p.unitIncl), quantity: l.quantity, gstRate: m(l.gstRate), cgst: m(p.cgst), sgst: m(p.sgst), igst: m(p.igst),
        hsnCode: l.hsn, discount: m(p.discount), taxableValue: m(p.taxable), lineTotal: m(p.netIncl),
      };
    })),
    ...q.lines.map((l) => db.execute(reserveSql(l.variantId, l.quantity))),
    db.insert(orderStatusHistory).values({ orderId, toStatus: "pending_payment", note: "Order placed", actorId: ctx.uid }),
  ];
  if (q.couponId) {
    stmts.push(db.update(coupons).set({ usedCount: sql`${coupons.usedCount} + 1` }).where(eq(coupons.id, q.couponId)));
    stmts.push(db.insert(couponRedemptions).values({ couponId: q.couponId, orderId, userId: ctx.uid, email: input.email, amount: m(t.discount) }));
  }
  if (input.payment === "cod") {
    stmts.push(db.insert(payments).values({ orderId, provider: "cod", amount: m(t.grandTotal), status: "pending", method: "cod" }));
    stmts.push(db.execute(confirmOrderSql(orderId, { paid: false, note: "Cash on delivery order confirmed", invoicePrefix: invoicePrefix(settings.tax.invoicePrefix), actorId: ctx.uid })));
    stmts.push(db.delete(cartItems).where(eq(cartItems.cartId, q.cartId)));
  }

  try {
    await db.batch(stmts as [Stmt, ...Stmt[]]); // all-or-nothing
  } catch (e) {
    const msg = String((e as Error)?.message ?? "") + String((e as { constraint?: string })?.constraint ?? "");
    if (msg.includes("idempotency")) { const r = await existingOrderResult(input.idempotencyKey, input.email); if (r) return r; }
    if (msg.includes("reserved_valid") || msg.includes("stock_nonneg")) return { ok: false, error: "Some items sold out while you were checking out. Your bag has been updated.", refresh: true };
    if (msg.includes("coupon_usage_within_limit")) return { ok: false, error: "That code has just been fully redeemed.", fields: { couponCode: "No longer available" } };
    console.error("placeOrder failed", e);
    return { ok: false, error: "We couldn't place your order. You haven't been charged — please try again." };
  }

  const [o] = await db.select({ orderNumber: orders.orderNumber }).from(orders).where(eq(orders.id, orderId)).limit(1);

  if (input.payment === "razorpay") {
    try {
      const rzp = await createOrder(Math.round(t.grandTotal * 100), o.orderNumber, { order_id: orderId, order_number: o.orderNumber });
      await db.insert(payments).values({ orderId, provider: "razorpay", providerOrderId: rzp.id, amount: m(t.grandTotal), status: "pending" });
    } catch (e) {
      console.error("razorpay order failed", e);
      await db.execute(releasePendingOrderSql(orderId, "Payment gateway unavailable", null));
      return { ok: false, error: "The payment gateway didn't respond. You haven't been charged — please try again in a moment." };
    }
    return { ok: true, orderId, orderNumber: o.orderNumber, token, payment: await razorpayParamsFor(orderId) };
  }

  sendOrderConfirmation(orderId).catch(() => {});
  return { ok: true, orderId, orderNumber: o.orderNumber, token, payment: null };
}

/**
 * Records a verified online payment and confirms the order. Safe to call many times
 * (checkout callback, webhook retries): the order is only confirmed once.
 */
export async function markPaid(p: { providerOrderId: string; providerPaymentId: string; method?: string | null; amountPaise: number }) {
  const [pay] = await db.select().from(payments).where(eq(payments.providerOrderId, p.providerOrderId)).limit(1);
  if (!pay) return { ok: false as const, reason: "unknown_order" };
  const expected = Math.round(Number(pay.amount) * 100);
  if (p.amountPaise !== expected) {
    await db.update(orders).set({ internalNotes: sql`coalesce(${orders.internalNotes} || E'\n', '') || ${`Payment ${p.providerPaymentId} amount ${p.amountPaise / 100} did not match ${expected / 100} — check in Razorpay.`}` }).where(eq(orders.id, pay.orderId));
    return { ok: false as const, reason: "amount_mismatch" };
  }
  const settings = await getSettings();
  const res = await db.batch([
    db.update(payments).set({ status: "paid", providerPaymentId: p.providerPaymentId, method: p.method ?? null, updatedAt: new Date() }).where(eq(payments.id, pay.id)),
    db.execute(confirmOrderSql(pay.orderId, { paid: true, note: `Payment ${p.providerPaymentId} received`, invoicePrefix: invoicePrefix(settings.tax.invoicePrefix) })),
  ]);
  const updated = Number((res[1] as unknown as { rows: { updated: number }[] }).rows?.[0]?.updated ?? 0);
  if (updated === 1) {
    sendOrderConfirmation(pay.orderId).catch(() => {});
    return { ok: true as const, orderId: pay.orderId, confirmed: true };
  }
  const [o] = await db.select({ status: orders.status, paymentStatus: orders.paymentStatus }).from(orders).where(eq(orders.id, pay.orderId)).limit(1);
  if (o && o.status === "cancelled" && o.paymentStatus !== "paid") {
    // Paid after the hold expired: keep the money on record and flag it for staff (refund or re-confirm manually).
    await db.update(orders).set({ paymentStatus: "paid", updatedAt: new Date(),
      internalNotes: sql`coalesce(${orders.internalNotes} || E'\n', '') || ${"Payment received after the order was auto-cancelled. Refund it, or contact the customer."}` }).where(eq(orders.id, pay.orderId));
  }
  return { ok: true as const, orderId: pay.orderId, confirmed: false };
}
