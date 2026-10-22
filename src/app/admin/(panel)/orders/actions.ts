"use server";
import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { orders, payments, refunds } from "@/db/schema";
import { requireSection } from "@/lib/authz";
import { audit } from "@/lib/audit";
import { NEXT_STATUSES, ORDER_STATUSES, releasePendingOrderSql, restockSql, transitionSql, type OrderStatus } from "@/lib/orders-sql";
import { sendOrderConfirmation, sendStatusUpdate } from "@/lib/order-emails";
import { refundPayment, razorpayConfigured } from "@/lib/razorpay";
import { notifyBackInStock } from "@/lib/stock-alerts";

type R = { ok: boolean; message: string };
const refresh = (id: string) => { revalidatePath(`/admin/orders/${id}`); revalidatePath("/admin/orders"); revalidatePath(`/orders/${id}`); };
const NOTIFY: OrderStatus[] = ["shipped", "out_for_delivery", "delivered", "cancelled", "returned", "refunded"];

async function getOrder(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [o] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  return o ?? null;
}
const rowsN = (r: unknown, k: string) => Number((r as { rows: Record<string, number>[] }).rows?.[0]?.[k] ?? 0);

export async function updateStatus(orderId: string, to: string, note: string, opts: { notify: boolean; restock: boolean }): Promise<R> {
  const me = await requireSection("orders");
  const o = await getOrder(orderId);
  if (!o) return { ok: false, message: "Order not found." };
  if (!ORDER_STATUSES.includes(to as OrderStatus)) return { ok: false, message: "Unknown status." };
  const from = o.status as OrderStatus, target = to as OrderStatus;
  if (!NEXT_STATUSES[from].includes(target)) return { ok: false, message: `An order can't go from ${from} to ${target}.` };
  if (target === "refunded" && o.paymentStatus !== "refunded") {
    return { ok: false, message: "Record the full refund first (Refund section) — the order is marked refunded automatically." };
  }
  const n = note.trim().slice(0, 500) || null;
  let updated = 0;
  if (target === "cancelled" && from === "pending_payment") {
    updated = rowsN(await db.execute(releasePendingOrderSql(orderId, n ?? "Cancelled by staff", me.id)), "cancelled");
  } else if (target === "cancelled") {
    updated = rowsN(await db.execute(restockSql(orderId, "cancelled", ["confirmed", "processing", "packed"], n ?? "Cancelled by staff", me.id)), "updated");
  } else if (target === "returned" && opts.restock) {
    updated = rowsN(await db.execute(restockSql(orderId, "returned", ["delivered", "return_requested"], n ?? "Returned and restocked", me.id)), "updated");
  } else {
    const codDelivered = target === "delivered" && o.paymentMethod === "cod";
    const res = await db.execute(transitionSql(orderId, target, [from], n, me.id, { paymentPaid: codDelivered }));
    updated = rowsN(res, "updated");
    if (updated && codDelivered) await db.update(payments).set({ status: "paid", updatedAt: new Date() }).where(and(eq(payments.orderId, orderId), eq(payments.provider, "cod")));
  }
  if (!updated) return { ok: false, message: "The order changed in the meantime — reload and try again." };
  await audit(me.id, "order.status", "order", orderId, { from, to: target });
  if (target === "cancelled" || target === "returned") await notifyBackInStock();
  if (opts.notify && NOTIFY.includes(target)) await sendStatusUpdate(orderId, target).catch(() => {});
  refresh(orderId);
  return { ok: true, message: `Order marked ${target.replace(/_/g, " ")}.` };
}

const shipInput = z.object({ carrier: z.string().trim().max(80), trackingNumber: z.string().trim().max(80) });
export async function saveShipment(orderId: string, raw: unknown): Promise<R> {
  const me = await requireSection("orders");
  const p = shipInput.safeParse(raw);
  if (!p.success) return { ok: false, message: "Check the carrier and tracking number." };
  await db.update(orders).set({ carrier: p.data.carrier || null, trackingNumber: p.data.trackingNumber || null, updatedAt: new Date() }).where(eq(orders.id, orderId));
  await audit(me.id, "order.shipment", "order", orderId, p.data);
  refresh(orderId);
  return { ok: true, message: "Shipping details saved." };
}

export async function saveNotes(orderId: string, notes: string): Promise<R> {
  const me = await requireSection("orders");
  await db.update(orders).set({ internalNotes: notes.slice(0, 5000) || null, updatedAt: new Date() }).where(eq(orders.id, orderId));
  await audit(me.id, "order.notes", "order", orderId);
  refresh(orderId);
  return { ok: true, message: "Notes saved." };
}

export async function resendConfirmation(orderId: string): Promise<R> {
  const me = await requireSection("orders");
  const ok = await sendOrderConfirmation(orderId);
  await audit(me.id, "order.email_resent", "order", orderId);
  return ok ? { ok: true, message: "Confirmation email sent." } : { ok: false, message: "Email isn't configured, or sending failed." };
}

/** Marks a COD order's cash as collected (e.g. before the status reaches delivered). */
export async function markCodCollected(orderId: string): Promise<R> {
  const me = await requireSection("orders");
  const o = await getOrder(orderId);
  if (!o || o.paymentMethod !== "cod" || o.paymentStatus === "paid") return { ok: false, message: "Nothing to update." };
  await db.batch([
    db.update(orders).set({ paymentStatus: "paid", updatedAt: new Date() }).where(eq(orders.id, orderId)),
    db.update(payments).set({ status: "paid", updatedAt: new Date() }).where(and(eq(payments.orderId, orderId), eq(payments.provider, "cod"))),
  ]);
  await audit(me.id, "order.cod_collected", "order", orderId);
  refresh(orderId);
  return { ok: true, message: "Payment marked as collected." };
}

const refundInput = z.object({ amount: z.coerce.number().positive("Enter an amount").multipleOf(0.01), reason: z.string().trim().min(3, "Add a reason").max(300) });

/** Refunds through Razorpay (online orders) or records a manual refund (COD). Admins only. */
export async function refundOrder(orderId: string, raw: unknown): Promise<R> {
  const me = await requireSection("orders", "admin");
  const p = refundInput.safeParse(raw);
  if (!p.success) return { ok: false, message: p.error.issues[0].message };
  const o = await getOrder(orderId);
  if (!o) return { ok: false, message: "Order not found." };
  const [pay] = await db.select().from(payments).where(and(eq(payments.orderId, orderId), sql`${payments.status} in ('paid','partially_refunded')`)).limit(1);
  if (!pay) return { ok: false, message: "There's no received payment on this order to refund." };
  const [{ done }] = await db.select({ done: sql<string>`coalesce(sum(${refunds.amount}), 0)` }).from(refunds).where(eq(refunds.paymentId, pay.id));
  const remaining = Math.round((Number(pay.amount) - Number(done)) * 100) / 100;
  if (p.data.amount > remaining) return { ok: false, message: `You can refund at most ₹${remaining.toLocaleString("en-IN")}.` };

  let providerRefundId: string | null = null, status = "manual";
  if (pay.provider === "razorpay") {
    if (!razorpayConfigured() || !pay.providerPaymentId) return { ok: false, message: "Razorpay isn't configured, so this refund can't be sent." };
    try {
      const r = await refundPayment(pay.providerPaymentId, Math.round(p.data.amount * 100), { order: o.orderNumber, reason: p.data.reason });
      providerRefundId = r.id; status = r.status;
    } catch (e) {
      return { ok: false, message: `Razorpay declined the refund: ${(e as Error).message}` };
    }
  }
  const full = p.data.amount >= remaining - 0.005;
  await db.batch([
    db.insert(refunds).values({ paymentId: pay.id, providerRefundId, amount: p.data.amount.toFixed(2), reason: p.data.reason, status, actorId: me.id }),
    db.update(payments).set({ status: full ? "refunded" : "partially_refunded", updatedAt: new Date() }).where(eq(payments.id, pay.id)),
    db.update(orders).set({ paymentStatus: full ? "refunded" : "partially_refunded", updatedAt: new Date() }).where(eq(orders.id, orderId)),
  ]);
  if (full && ["cancelled", "returned"].includes(o.status)) await db.execute(transitionSql(orderId, "refunded", ["cancelled", "returned"], `Refunded ₹${p.data.amount}`, me.id));
  await audit(me.id, "order.refund", "order", orderId, { amount: p.data.amount, provider: pay.provider, providerRefundId });
  if (full) await sendStatusUpdate(orderId, "refunded").catch(() => {});
  refresh(orderId);
  return { ok: true, message: pay.provider === "razorpay" ? `Refund of ₹${p.data.amount} sent to Razorpay (${status}).` : `Manual refund of ₹${p.data.amount} recorded. Remember to transfer the money to the customer.` };
}

