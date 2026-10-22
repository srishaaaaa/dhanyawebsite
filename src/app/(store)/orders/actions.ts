"use server";
import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { orders, orderItems, orderStatusHistory, reviews } from "@/db/schema";
import { auth } from "@/auth";
import { canViewOrder } from "@/lib/order-access";
import { releasePendingOrderSql, restockSql, transitionSql } from "@/lib/orders-sql";
import { getSettings } from "@/lib/settings";

type R = { ok: boolean; message: string };
async function access(orderId: string, token: string | null) {
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return null;
  const [o] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  const uid = (await auth().catch(() => null))?.user?.id ?? null;
  if (!o || !(await canViewOrder(o, { uid, token }))) return null;
  return { o, uid };
}

export async function cancelOrder(orderId: string, token: string | null): Promise<R> {
  const a = await access(orderId, token);
  if (!a) return { ok: false, message: "Order not found." };
  const { o, uid } = a;
  let n = 0;
  if (o.status === "pending_payment" && o.paymentStatus !== "paid") {
    const r = await db.execute<{ cancelled: number }>(releasePendingOrderSql(o.id, "Cancelled by customer", uid));
    n = r.rows[0]?.cancelled ?? 0;
  } else if (["confirmed", "processing"].includes(o.status) && o.paymentStatus !== "paid") {
    const r = await db.execute<{ updated: number }>(restockSql(o.id, "cancelled", ["confirmed", "processing"], "Cancelled by customer", uid));
    n = r.rows[0]?.updated ?? 0;
  } else {
    return { ok: false, message: "This order can't be cancelled online any more. Please contact us and we'll help." };
  }
  revalidatePath(`/orders/${orderId}`);
  return n ? { ok: true, message: "Your order has been cancelled." } : { ok: false, message: "This order has already moved on and couldn't be cancelled. Please contact us." };
}

export async function requestReturn(orderId: string, token: string | null, reason: string): Promise<R> {
  const a = await access(orderId, token);
  if (!a) return { ok: false, message: "Order not found." };
  const why = reason.trim().slice(0, 500);
  if (why.length < 5) return { ok: false, message: "Tell us briefly why you'd like to return it." };
  if (a.o.status !== "delivered") return { ok: false, message: "Returns can be requested after delivery." };
  const { shipping } = await getSettings();
  const [d] = await db.select({ at: orderStatusHistory.createdAt }).from(orderStatusHistory)
    .where(and(eq(orderStatusHistory.orderId, orderId), eq(orderStatusHistory.toStatus, "delivered"))).orderBy(sql`${orderStatusHistory.createdAt} desc`).limit(1);
  const days = shipping.returnWindowDays ?? 7;
  if (d && Date.now() - d.at.getTime() > days * 86400_000) return { ok: false, message: `The ${days}-day return window for this order has closed. Please contact us if something is wrong.` };
  await db.batch([
    db.update(orders).set({ returnReason: why }).where(eq(orders.id, orderId)),
    db.execute(transitionSql(orderId, "return_requested", ["delivered"], `Return requested: ${why}`, a.uid)),
  ]);
  revalidatePath(`/orders/${orderId}`);
  return { ok: true, message: "Return requested. We'll email you pickup details within one working day." };
}

const reviewInput = z.object({
  rating: z.coerce.number().int().min(1, "Choose a rating").max(5),
  title: z.string().trim().max(120).optional(),
  body: z.string().trim().min(10, "Write at least a sentence").max(2000),
});
export async function submitReview(orderItemId: string, token: string | null, raw: unknown): Promise<R> {
  if (!/^[0-9a-f-]{36}$/i.test(orderItemId)) return { ok: false, message: "Not found." };
  const [item] = await db.select().from(orderItems).where(eq(orderItems.id, orderItemId)).limit(1);
  if (!item?.productId) return { ok: false, message: "This item can't be reviewed." };
  const a = await access(item.orderId, token);
  if (!a) return { ok: false, message: "Not found." };
  if (!["delivered", "return_requested", "returned"].includes(a.o.status)) return { ok: false, message: "You can review items once they're delivered." };
  const parsed = reviewInput.safeParse(raw);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  try {
    await db.insert(reviews).values({ productId: item.productId, userId: a.o.userId, orderItemId, rating: parsed.data.rating, title: parsed.data.title || null, body: parsed.data.body, status: "pending" });
  } catch {
    return { ok: false, message: "You've already reviewed this item." };
  }
  revalidatePath(`/orders/${item.orderId}`);
  return { ok: true, message: "Thank you! Your review will appear once it's checked." };
}
