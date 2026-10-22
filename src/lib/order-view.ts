import "server-only";
import { asc, eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { orders, orderItems, orderStatusHistory, reviews, payments, refunds } from "@/db/schema";

export async function loadOrder(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [o] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!o) return null;
  const [items, history, reviewed, pays] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, id)).orderBy(asc(orderItems.id)),
    db.select().from(orderStatusHistory).where(eq(orderStatusHistory.orderId, id)).orderBy(asc(orderStatusHistory.createdAt)),
    db.select({ itemId: reviews.orderItemId }).from(reviews).innerJoin(orderItems, eq(orderItems.id, reviews.orderItemId)).where(eq(orderItems.orderId, id)),
    db.select().from(payments).where(eq(payments.orderId, id)).orderBy(desc(payments.createdAt)),
  ]);
  const refundRows = pays.length ? await db.select().from(refunds).where(eq(refunds.paymentId, pays[0].id)) : [];
  return { ...o, items, history, reviewedItemIds: new Set(reviewed.map((r) => r.itemId)), payments: pays, refunds: refundRows };
}
export type OrderFull = NonNullable<Awaited<ReturnType<typeof loadOrder>>>;
export type Addr = { fullName: string; phone: string; line1: string; line2?: string; city: string; state: string; pincode: string };
