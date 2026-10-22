import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { auth } from "@/auth";
import { readSid } from "@/lib/session-id";
import { cartIdFor, clearCart } from "@/lib/cart";
import { markPaid } from "@/lib/checkout";
import { fetchPayment, verifyPaymentSignature } from "@/lib/razorpay";

export const dynamic = "force-dynamic";
const body = z.object({
  razorpay_order_id: z.string().min(5).max(64), razorpay_payment_id: z.string().min(5).max(64), razorpay_signature: z.string().min(10).max(256),
});

/**
 * Called by the browser after Razorpay Checkout succeeds. The browser's word is never trusted on its own:
 * the HMAC signature is verified with the secret key and the payment is re-fetched from Razorpay.
 */
export async function POST(req: NextRequest) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid payment response." }, { status: 400 });
  const { razorpay_order_id: rzpOrder, razorpay_payment_id: rzpPay, razorpay_signature: sig } = parsed.data;
  if (!verifyPaymentSignature(rzpOrder, rzpPay, sig)) return NextResponse.json({ ok: false, error: "We couldn't verify this payment. If money was debited, it will be refunded automatically or confirmed shortly." }, { status: 400 });

  const [pay] = await db.select({ orderId: payments.orderId }).from(payments).where(eq(payments.providerOrderId, rzpOrder)).limit(1);
  if (!pay) return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });

  let payment;
  try { payment = await fetchPayment(rzpPay); }
  catch (e) { console.error(e); return NextResponse.json({ ok: true, pending: true, orderId: pay.orderId }); } // webhook will confirm
  if (payment.order_id !== rzpOrder || !["captured", "authorized"].includes(payment.status)) {
    return NextResponse.json({ ok: true, pending: true, orderId: pay.orderId });
  }
  const r = await markPaid({ providerOrderId: rzpOrder, providerPaymentId: rzpPay, method: payment.method, amountPaise: payment.amount });
  if (!r.ok) return NextResponse.json({ ok: false, error: "Payment received but needs a manual check — our team has been notified." }, { status: 409 });

  const [sid, session] = await Promise.all([readSid(), auth().catch(() => null)]);
  const cartId = await cartIdFor(sid, session?.user?.id ?? null, false).catch(() => null);
  if (cartId) await clearCart(cartId).catch(() => {});
  return NextResponse.json({ ok: true, orderId: r.orderId });
}
