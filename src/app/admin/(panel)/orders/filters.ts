import "server-only";
import { and, eq, gte, lte, or, ilike, sql, type SQL } from "drizzle-orm";
import { orders } from "@/db/schema";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/orders-sql";

export type OrderFilters = { q?: string; status?: string; pay?: string; method?: string; from?: string; to?: string; page?: string };

export function orderWhere(sp: OrderFilters) {
  const w: SQL[] = [];
  if (sp.q) { const q = `%${sp.q.trim().replace(/[%_]/g, "\\$&")}%`; w.push(or(ilike(orders.orderNumber, q), ilike(orders.email, q), ilike(orders.phone, q), sql`${orders.shippingAddress}->>'fullName' ilike ${q}`)!); }
  if (sp.status && (ORDER_STATUSES as readonly string[]).includes(sp.status)) w.push(eq(orders.status, sp.status as OrderStatus));
  if (sp.status === "open") w.push(sql`${orders.status} in ('confirmed','processing','packed')`);
  if (sp.pay && ["pending", "paid", "failed", "refunded", "partially_refunded"].includes(sp.pay)) w.push(sql`${orders.paymentStatus} = ${sp.pay}`);
  if (sp.method === "cod" || sp.method === "razorpay") w.push(eq(orders.paymentMethod, sp.method));
  if (sp.from && /^\d{4}-\d{2}-\d{2}$/.test(sp.from)) w.push(gte(orders.createdAt, new Date(`${sp.from}T00:00:00+05:30`)));
  if (sp.to && /^\d{4}-\d{2}-\d{2}$/.test(sp.to)) w.push(lte(orders.createdAt, new Date(`${sp.to}T23:59:59.999+05:30`)));
  return w.length ? and(...w) : undefined;
}

