import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders, orderItems } from "@/db/schema";
import { sendEmail, layout, esc } from "@/lib/email";
import { formatINR } from "@/lib/money";
import { STATUS_LABEL, type OrderStatus } from "@/lib/orders-sql";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
export const orderLink = (o: { id: string; accessToken: string | null }) => `${SITE}/orders/${o.id}${o.accessToken ? `?t=${o.accessToken}` : ""}`;

export async function sendOrderConfirmation(orderId: string) {
  const [o] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!o) return false;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId)).orderBy(asc(orderItems.id));
  const rows = items.map((i) => `<tr><td style="padding:6px 0">${esc(i.productName)}${i.size ? ` · ${esc(i.size)}` : ""}${i.color ? ` · ${esc(i.color)}` : ""} × ${i.quantity}</td><td align="right">${formatINR(i.lineTotal)}</td></tr>`).join("");
  const html = layout(`Thank you — order ${o.orderNumber} is confirmed`, `
    <p>We've received your order${o.paymentMethod === "cod" ? " (cash on delivery)" : " and your payment"}. We'll email you again when it ships.</p>
    <table width="100%" style="border-top:1px solid #eee;margin-top:12px">${rows}
    <tr><td style="padding-top:10px;border-top:1px solid #eee"><strong>Total</strong></td><td align="right" style="padding-top:10px;border-top:1px solid #eee"><strong>${formatINR(o.grandTotal)}</strong></td></tr></table>
    <p style="margin-top:20px"><a href="${orderLink(o)}" style="background:#30042E;color:#F8F3EB;padding:12px 20px;text-decoration:none;display:inline-block">View your order</a></p>`);
  return sendEmail(o.email, `Order ${o.orderNumber} confirmed — DHANYA BOUTIQUE`, html);
}

export async function sendStatusUpdate(orderId: string, status: OrderStatus) {
  const [o] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!o) return false;
  const tracking = o.carrier || o.trackingNumber ? `<p>${o.carrier ? `Carrier: <strong>${esc(o.carrier)}</strong><br/>` : ""}${o.trackingNumber ? `Tracking number: <strong>${esc(o.trackingNumber)}</strong>` : ""}</p>` : "";
  const html = layout(`Your order is ${STATUS_LABEL[status].toLowerCase()}`, `<p>Order <strong>${o.orderNumber}</strong> is now <strong>${STATUS_LABEL[status]}</strong>.</p>${tracking}
    <p><a href="${orderLink(o)}">Track your order</a></p>`);
  return sendEmail(o.email, `Order ${o.orderNumber}: ${STATUS_LABEL[status]}`, html);
}
