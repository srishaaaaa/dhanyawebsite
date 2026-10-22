import { sql, type SQL } from "drizzle-orm";

// Order lifecycle as single atomic SQL statements (data-modifying CTEs).
// Each one is idempotent: it only acts if the order is still in the expected state,
// so retried webhooks, double clicks or concurrent requests can't double-count stock or payments.

export const ORDER_STATUSES = [
  "pending_payment", "confirmed", "processing", "packed", "shipped", "out_for_delivery", "delivered",
  "cancelled", "return_requested", "returned", "refunded",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

const list = (xs: readonly string[]) => sql.join(xs.map((x) => sql`${x}`), sql`, `);

/** Indian financial year label for invoice numbers, e.g. "2026-27". */
export function financialYear(d = new Date()) {
  const ist = new Date(d.getTime() + 330 * 60_000);
  const y = ist.getUTCFullYear(), m = ist.getUTCMonth() + 1;
  const start = m >= 4 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

/** Holds stock for a pending order. Fails (check constraint reserved_valid) if not enough is available. */
export function reserveSql(variantId: string, qty: number) {
  return sql`UPDATE product_variants SET reserved = reserved + ${qty}::int, updated_at = now() WHERE id = ${variantId}::uuid AND is_active`;
}

/**
 * pending_payment → confirmed. Converts reservations into sales, assigns an invoice number, writes history.
 * `paid` marks payment as received (online payments); COD stays "pending" until delivery.
 */
export function confirmOrderSql(orderId: string, opts: { paid: boolean; note: string; invoicePrefix: string; actorId?: string | null }) {
  return sql`
    WITH o AS (
      UPDATE orders SET status = 'confirmed',
        payment_status = CASE WHEN ${opts.paid}::boolean THEN 'paid'::payment_status ELSE payment_status END,
        reserved_until = NULL, updated_at = now(),
        invoice_number = coalesce(invoice_number, ${opts.invoicePrefix}::text || lpad(nextval('invoice_seq')::text, 5, '0')),
        invoice_issued_at = coalesce(invoice_issued_at, now())
      WHERE id = ${orderId}::uuid AND status = 'pending_payment'
      RETURNING id
    ),
    items AS (
      SELECT oi.variant_id, sum(oi.quantity)::int AS q FROM order_items oi
      WHERE oi.order_id IN (SELECT id FROM o) AND oi.variant_id IS NOT NULL GROUP BY oi.variant_id
    ),
    v AS (
      UPDATE product_variants pv SET stock = pv.stock - items.q, reserved = pv.reserved - items.q, updated_at = now()
      FROM items WHERE pv.id = items.variant_id RETURNING pv.id
    ),
    m AS (
      INSERT INTO inventory_movements (variant_id, delta, reason, order_id, actor_id)
      SELECT variant_id, -q, 'sale', ${orderId}::uuid, ${opts.actorId ?? null}::text FROM items RETURNING 1
    ),
    h AS (
      INSERT INTO order_status_history (order_id, from_status, to_status, note, actor_id)
      SELECT id, 'pending_payment', 'confirmed', ${opts.note}::text, ${opts.actorId ?? null}::text FROM o RETURNING 1
    )
    SELECT (SELECT count(*) FROM o)::int AS updated, (SELECT count(*) FROM v)::int AS variants`;
}

/**
 * Cancels unpaid pending orders and releases their reservations + coupon uses.
 * `where` selects which orders (one id, or all expired online orders).
 */
function releaseSql(where: SQL, note: string, actorId: string | null) {
  return sql`
    WITH o AS (
      UPDATE orders SET status = 'cancelled', reserved_until = NULL, updated_at = now()
      WHERE ${where} AND status = 'pending_payment' AND payment_status <> 'paid'
      RETURNING id
    ),
    items AS (
      SELECT oi.variant_id, sum(oi.quantity)::int AS q FROM order_items oi
      WHERE oi.order_id IN (SELECT id FROM o) AND oi.variant_id IS NOT NULL GROUP BY oi.variant_id
    ),
    v AS (
      UPDATE product_variants pv SET reserved = greatest(pv.reserved - items.q, 0), updated_at = now()
      FROM items WHERE pv.id = items.variant_id RETURNING 1
    ),
    h AS (
      INSERT INTO order_status_history (order_id, from_status, to_status, note, actor_id)
      SELECT id, 'pending_payment', 'cancelled', ${note}::text, ${actorId}::text FROM o RETURNING 1
    ),
    cr AS (SELECT coupon_id, count(*)::int AS n FROM coupon_redemptions WHERE order_id IN (SELECT id FROM o) GROUP BY coupon_id),
    c AS (UPDATE coupons SET used_count = greatest(used_count - cr.n, 0) FROM cr WHERE coupons.id = cr.coupon_id RETURNING 1),
    d AS (DELETE FROM coupon_redemptions WHERE order_id IN (SELECT id FROM o) RETURNING 1)
    SELECT (SELECT count(*) FROM o)::int AS cancelled`;
}

export const releasePendingOrderSql = (orderId: string, note: string, actorId: string | null) =>
  releaseSql(sql`id = ${orderId}::uuid`, note, actorId);

export const releaseExpiredSql = () =>
  releaseSql(sql`payment_method = 'razorpay' AND reserved_until IS NOT NULL AND reserved_until < now()`, "Payment not completed in time — stock released", null);

/**
 * Moves an order whose stock was already deducted (confirmed onwards) to cancelled/returned,
 * putting the items back into stock. Only acts when the current status is one of `from`.
 */
export function restockSql(orderId: string, to: "cancelled" | "returned", from: OrderStatus[], note: string, actorId: string | null) {
  return sql`
    WITH old AS (SELECT id, status FROM orders WHERE id = ${orderId}::uuid FOR UPDATE),
    o AS (
      UPDATE orders SET status = ${to}::order_status, updated_at = now()
      FROM old WHERE orders.id = old.id AND old.status::text IN (${list(from)})
      RETURNING orders.id, old.status AS prev
    ),
    items AS (
      SELECT oi.variant_id, sum(oi.quantity)::int AS q FROM order_items oi
      WHERE oi.order_id IN (SELECT id FROM o) AND oi.variant_id IS NOT NULL GROUP BY oi.variant_id
    ),
    v AS (
      UPDATE product_variants pv SET stock = pv.stock + items.q, updated_at = now()
      FROM items WHERE pv.id = items.variant_id RETURNING 1
    ),
    m AS (
      INSERT INTO inventory_movements (variant_id, delta, reason, order_id, note, actor_id)
      SELECT variant_id, q, 'return', ${orderId}::uuid, ${note}::text, ${actorId}::text FROM items RETURNING 1
    ),
    h AS (
      INSERT INTO order_status_history (order_id, from_status, to_status, note, actor_id)
      SELECT id, prev, ${to}::order_status, ${note}::text, ${actorId}::text FROM o RETURNING 1
    )
    SELECT (SELECT count(*) FROM o)::int AS updated`;
}

/** Plain status change (no stock effect), guarded by the allowed previous statuses. */
export function transitionSql(orderId: string, to: OrderStatus, from: OrderStatus[], note: string | null, actorId: string | null, extra?: { paymentPaid?: boolean }) {
  return sql`
    WITH old AS (SELECT id, status FROM orders WHERE id = ${orderId}::uuid FOR UPDATE),
    o AS (
      UPDATE orders SET status = ${to}::order_status, updated_at = now(),
        payment_status = CASE WHEN ${extra?.paymentPaid ?? false}::boolean THEN 'paid'::payment_status ELSE payment_status END
      FROM old WHERE orders.id = old.id AND old.status::text IN (${list(from)})
      RETURNING orders.id, old.status AS prev
    ),
    h AS (
      INSERT INTO order_status_history (order_id, from_status, to_status, note, actor_id)
      SELECT id, prev, ${to}::order_status, ${note}::text, ${actorId}::text FROM o RETURNING 1
    )
    SELECT (SELECT count(*) FROM o)::int AS updated`;
}

/** Which manual status changes staff may make from each status (stock-affecting ones are handled separately). */
export const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ["cancelled"],
  confirmed: ["processing", "packed", "shipped", "cancelled"],
  processing: ["packed", "shipped", "cancelled"],
  packed: ["shipped", "cancelled"],
  shipped: ["out_for_delivery", "delivered"],
  out_for_delivery: ["delivered"],
  delivered: ["return_requested", "returned"],
  return_requested: ["returned", "delivered"],
  returned: ["refunded"],
  cancelled: ["refunded"],
  refunded: [],
};

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Awaiting payment", confirmed: "Confirmed", processing: "Processing", packed: "Packed", shipped: "Shipped",
  out_for_delivery: "Out for delivery", delivered: "Delivered", cancelled: "Cancelled", return_requested: "Return requested",
  returned: "Returned", refunded: "Refunded",
};
