import { NextResponse, type NextRequest } from "next/server";
import { eq, and, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { webhookEvents, payments, refunds, orders } from "@/db/schema";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { markPaid } from "@/lib/checkout";

export const dynamic = "force-dynamic";

type Entity = { id: string; order_id?: string; payment_id?: string; amount: number; method?: string; status?: string };
type Event = { event: string; payload: { payment?: { entity: Entity }; refund?: { entity: Entity }; order?: { entity: Entity } } };

/**
 * Razorpay webhook. Signature is verified against the raw body; each event id is processed once
 * (recorded only after successful handling, so failures are retried by Razorpay). Handlers are idempotent too.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get("x-razorpay-signature"))) return NextResponse.json({ error: "bad signature" }, { status: 401 });
  const eventId = req.headers.get("x-razorpay-event-id");
  let evt: Event;
  try { evt = JSON.parse(raw); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  if (eventId) {
    const [seen] = await db.select({ id: webhookEvents.eventId }).from(webhookEvents).where(eq(webhookEvents.eventId, eventId)).limit(1);
    if (seen) return NextResponse.json({ ok: true, duplicate: true });
  }
  try {
    const pay = evt.payload.payment?.entity;
    switch (evt.event) {
      case "payment.captured":
      case "order.paid":
        if (pay?.order_id) await markPaid({ providerOrderId: pay.order_id, providerPaymentId: pay.id, method: pay.method ?? null, amountPaise: pay.amount });
        break;
      case "payment.failed":
        if (pay?.order_id) await db.update(payments).set({ status: "failed", providerPaymentId: pay.id, updatedAt: new Date() })
          .where(and(eq(payments.providerOrderId, pay.order_id), ne(payments.status, "paid")));
        break;
      case "refund.processed":
      case "refund.created": {
        const r = evt.payload.refund?.entity;
        if (!r?.payment_id) break;
        const [p] = await db.select().from(payments).where(eq(payments.providerPaymentId, r.payment_id)).limit(1);
        if (!p) break;
        await db.insert(refunds).values({ paymentId: p.id, providerRefundId: r.id, amount: (r.amount / 100).toFixed(2), status: r.status ?? "processed", reason: "Recorded from Razorpay" })
          .onConflictDoUpdate({ target: refunds.providerRefundId, set: { status: r.status ?? "processed" } });
        const [{ total }] = await db.select({ total: sql<string>`coalesce(sum(${refunds.amount}), 0)` }).from(refunds).where(eq(refunds.paymentId, p.id));
        const full = Number(total) >= Number(p.amount) - 0.005;
        await db.update(payments).set({ status: full ? "refunded" : "partially_refunded", updatedAt: new Date() }).where(eq(payments.id, p.id));
        await db.update(orders).set({ paymentStatus: full ? "refunded" : "partially_refunded", updatedAt: new Date() }).where(eq(orders.id, p.orderId));
        break;
      }
    }
    if (eventId) await db.insert(webhookEvents).values({ eventId, provider: "razorpay", type: evt.event }).onConflictDoNothing();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("webhook handling failed", evt.event, e);
    return NextResponse.json({ error: "processing failed" }, { status: 500 }); // Razorpay retries
  }
}
