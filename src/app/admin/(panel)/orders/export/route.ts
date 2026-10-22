import { NextResponse, type NextRequest } from "next/server";
import { desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { getStaff } from "@/lib/authz";
import { toCsv } from "@/lib/csv";
import { audit } from "@/lib/audit";
import { orderWhere } from "../filters";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const me = await getStaff("staff", "orders");
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sp = Object.fromEntries(req.nextUrl.searchParams);
  const rows = await db.select({
    order_number: orders.orderNumber, created_at: orders.createdAt, status: orders.status, payment_status: orders.paymentStatus, payment_method: orders.paymentMethod,
    customer: sql<string>`${orders.shippingAddress}->>'fullName'`, email: orders.email, phone: orders.phone,
    state: sql<string>`${orders.shippingAddress}->>'state'`, pincode: sql<string>`${orders.shippingAddress}->>'pincode'`,
    items: sql<number>`(select coalesce(sum(quantity),0) from order_items oi where oi.order_id = ${orders.id})::int`,
    subtotal: orders.subtotal, discount: orders.discountTotal, shipping: orders.shippingTotal, cgst: orders.cgstTotal, sgst: orders.sgstTotal, igst: orders.igstTotal,
    total: orders.grandTotal, coupon: orders.couponCode, invoice: orders.invoiceNumber, carrier: orders.carrier, tracking: orders.trackingNumber,
  }).from(orders).where(orderWhere(sp)).orderBy(desc(orders.createdAt)).limit(20000);
  await audit(me.id, "order.export", "order", null, { rows: rows.length });
  const body = toCsv(Object.keys(rows[0] ?? { order_number: 1 }), rows);
  return new NextResponse(body, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="dhanya-orders-${new Date().toISOString().slice(0, 10)}.csv"`, "cache-control": "no-store" } });
}
