import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";

// Every report counts each order once from the orders table (never from payment events), so retried
// webhooks can't inflate figures. "Placed" = confirmed or later (excludes unpaid online orders and cancellations).
const PLACED = sql`o.status not in ('pending_payment','cancelled')`;
const between = (from: Date, to: Date, col = sql`o.created_at`) => sql`${col} between ${from.toISOString()}::timestamptz and ${to.toISOString()}::timestamptz`;

export async function dailySales(from: Date, to: Date) {
  const r = await db.execute<{ day: string; orders: number; units: number; gross: string; discounts: string; shipping: string; gst: string; refunds: string; net: string }>(sql`
    with d as (
      select to_char(o.created_at at time zone 'Asia/Kolkata', 'YYYY-MM-DD') as day, count(*)::int as orders,
        sum((select sum(quantity) from order_items oi where oi.order_id = o.id))::int as units,
        sum(o.grand_total) as gross, sum(o.discount_total) as discounts, sum(o.shipping_total + o.shipping_tax) as shipping,
        sum(o.cgst_total + o.sgst_total + o.igst_total) as gst
      from orders o where ${between(from, to)} and ${PLACED} group by 1),
    r as (
      select to_char(rf.created_at at time zone 'Asia/Kolkata', 'YYYY-MM-DD') as day, sum(rf.amount) as refunds
      from refunds rf where ${between(from, to, sql`rf.created_at`)} group by 1)
    select coalesce(d.day, r.day) as day, coalesce(d.orders, 0) as orders, coalesce(d.units, 0) as units, coalesce(d.gross, 0) as gross,
      coalesce(d.discounts, 0) as discounts, coalesce(d.shipping, 0) as shipping, coalesce(d.gst, 0) as gst, coalesce(r.refunds, 0) as refunds,
      coalesce(d.gross, 0) - coalesce(r.refunds, 0) as net
    from d full join r on r.day = d.day order by 1`);
  return r.rows;
}

export async function productPerformance(from: Date, to: Date) {
  const r = await db.execute<{ product_id: string | null; name: string; units: number; revenue: string; orders: number; returned: number; available: number | null }>(sql`
    select oi.product_id, max(oi.product_name) as name, sum(oi.quantity) filter (where ${PLACED})::int as units,
      coalesce(sum(oi.line_total) filter (where ${PLACED}), 0) as revenue, count(distinct o.id) filter (where ${PLACED})::int as orders,
      count(distinct o.id) filter (where o.status in ('returned','return_requested'))::int as returned,
      (select sum(greatest(v.stock - v.reserved, 0)) from product_variants v where v.product_id = oi.product_id and v.is_active)::int as available
    from order_items oi join orders o on o.id = oi.order_id
    where ${between(from, to)} group by oi.product_id order by revenue desc limit 200`);
  return r.rows;
}

export async function byState(from: Date, to: Date) {
  return (await db.execute<{ state: string; orders: number; revenue: string }>(sql`
    select o.shipping_address->>'state' as state, count(*)::int as orders, sum(o.grand_total) as revenue
    from orders o where ${between(from, to)} and ${PLACED} group by 1 order by 3 desc limit 15`)).rows;
}

export async function byMethod(from: Date, to: Date) {
  return (await db.execute<{ method: string; orders: number; revenue: string; cancelled: number }>(sql`
    select o.payment_method as method, count(*) filter (where ${PLACED})::int as orders, coalesce(sum(o.grand_total) filter (where ${PLACED}), 0) as revenue,
      count(*) filter (where o.status = 'cancelled')::int as cancelled
    from orders o where ${between(from, to)} group by 1 order by 3 desc`)).rows;
}

export async function topCustomers(from: Date, to: Date) {
  return (await db.execute<{ email: string; name: string; orders: number; spent: string; user_id: string | null }>(sql`
    select lower(o.email) as email, max(o.shipping_address->>'fullName') as name, count(*)::int as orders, sum(o.grand_total) as spent, max(o.user_id) as user_id
    from orders o where ${between(from, to)} and ${PLACED} group by 1 order by 4 desc limit 15`)).rows;
}

export async function couponPerformance(from: Date, to: Date) {
  return (await db.execute<{ code: string; uses: number; discount: string; revenue: string }>(sql`
    select c.code, count(*)::int as uses, sum(cr.amount) as discount, sum(o.grand_total) as revenue
    from coupon_redemptions cr join coupons c on c.id = cr.coupon_id join orders o on o.id = cr.order_id
    where ${between(from, to)} and ${PLACED} group by 1 order by 2 desc`)).rows;
}

export async function inventoryValue() {
  const [r] = (await db.execute<{ units: number; retail_excl: string; retail_incl: string; skus: number; out: number }>(sql`
    select coalesce(sum(v.stock), 0)::int as units,
      coalesce(sum(v.stock * coalesce(v.price_override, p.price)), 0) as retail_excl,
      coalesce(sum(v.stock * coalesce(v.price_override, p.price) * (1 + p.gst_rate / 100)), 0) as retail_incl,
      count(*)::int as skus, count(*) filter (where v.stock - v.reserved <= 0)::int as out
    from product_variants v join products p on p.id = v.product_id where v.is_active and p.status <> 'archived'`)).rows;
  return r;
}
