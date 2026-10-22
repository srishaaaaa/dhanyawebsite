import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Minimal Razorpay REST client (no SDK). Secrets come only from server env vars.
const API = "https://api.razorpay.com/v1";

export function razorpayConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}
export function razorpayMode() {
  const k = process.env.RAZORPAY_KEY_ID ?? "";
  return k.startsWith("rzp_live_") ? "live" : k.startsWith("rzp_test_") ? "test" : "unknown";
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const res = await fetch(`${API}${path}`, {
    ...init, cache: "no-store",
    headers: { authorization: `Basic ${auth}`, "content-type": "application/json", ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(15_000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Razorpay ${res.status}: ${body?.error?.description ?? "request failed"}`);
  return body as T;
}

export type RzpOrder = { id: string; amount: number; currency: string; receipt: string; status: string };
export type RzpPayment = { id: string; order_id: string; amount: number; status: "created" | "authorized" | "captured" | "refunded" | "failed"; method: string; captured: boolean };
export type RzpRefund = { id: string; payment_id: string; amount: number; status: string };

export const createOrder = (amountPaise: number, receipt: string, notes: Record<string, string>) =>
  call<RzpOrder>("/orders", { method: "POST", body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt, notes, payment_capture: 1 }) });

export const fetchPayment = (paymentId: string) => call<RzpPayment>(`/payments/${encodeURIComponent(paymentId)}`);

export const refundPayment = (paymentId: string, amountPaise: number, notes: Record<string, string>) =>
  call<RzpRefund>(`/payments/${encodeURIComponent(paymentId)}/refund`, { method: "POST", body: JSON.stringify({ amount: amountPaise, notes, speed: "normal" }) });

function safeEqualHex(a: string, b: string) {
  const x = Buffer.from(a, "utf8"), y = Buffer.from(b, "utf8");
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Checkout success signature: HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string) {
  if (!process.env.RAZORPAY_KEY_SECRET) return false;
  const expected = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqualHex(expected, signature);
}

/** Webhook signature: HMAC_SHA256(raw body, webhook secret). */
export function verifyWebhookSignature(rawBody: string, signature: string | null) {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET || !signature) return false;
  const expected = createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}
