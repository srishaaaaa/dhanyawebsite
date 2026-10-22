import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type pg from "pg";
import { connect, migrate, drop, run, url } from "./setup";
import { reserveSql, confirmOrderSql, releaseExpiredSql, releasePendingOrderSql, restockSql, transitionSql, financialYear } from "@/lib/orders-sql";
import { adjustStockSql, setStockSql } from "@/lib/catalog/inventory";

const P = "aaaaaaaa-0000-4000-8000-000000000001", V = "bbbbbbbb-0000-4000-8000-000000000001";
const O = (n: number) => `cccccccc-0000-4000-8000-00000000000${n}`;
const PREFIX = `DB/${financialYear()}/`;

describe.skipIf(!url)("order lifecycle (Postgres)", () => {
  let c: pg.Client;
  const q = async (s: string, p: unknown[] = []) => (await c.query(s, p)).rows;
  const stock = async () => (await q(`select stock, reserved from product_variants where id = $1`, [V]))[0];
  const order = (n: number, method: "razorpay" | "cod", qty: number, minutes = 30) => q(
    `insert into orders (id, order_number, email, phone, payment_method, shipping_address, billing_address, subtotal, grand_total, reserved_until)
     values ($1, 'T' || nextval('order_seq'), 'a@b.in', '9876543210', $2, '{}', '{}', 1050 * $3, 1050 * $3, now() + make_interval(mins => $4));
     `, [O(n), method, qty, minutes]).then(() => q(
    `insert into order_items (order_id, variant_id, product_name, sku, unit_price, quantity, gst_rate, line_total) values ($1, $2, 'P', 'P1-M', 1050, $3, 5, 1050 * $3)`, [O(n), V, qty]));

  beforeAll(async () => { c = await connect(); await migrate(c); });
  afterAll(async () => { await drop(c); await c.end(); });
  beforeEach(async () => {
    await q(`truncate products, orders, coupons, inventory_movements cascade`);
    await q(`insert into products (id, name, slug, sku, price, status) values ($1, 'P', 'p', 'P1', 1000, 'active')`, [P]);
    await q(`insert into product_variants (id, product_id, sku, size, stock) values ($1, $2, 'P1-M', 'M', 3)`, [V, P]);
  });

  it("reserves stock and refuses to oversell", async () => {
    await order(1, "razorpay", 2);
    await run(c, reserveSql(V, 2));
    expect(await stock()).toEqual({ stock: 3, reserved: 2 });
    await expect(run(c, reserveSql(V, 2))).rejects.toThrow(/reserved_valid/);
  });

  it("confirms a paid order exactly once and issues one invoice number", async () => {
    await order(1, "razorpay", 2); await run(c, reserveSql(V, 2));
    const a = await run<{ updated: number }>(c, confirmOrderSql(O(1), { paid: true, note: "paid", invoicePrefix: PREFIX }));
    const b = await run<{ updated: number }>(c, confirmOrderSql(O(1), { paid: true, note: "webhook retry", invoicePrefix: PREFIX }));
    expect([a[0].updated, b[0].updated]).toEqual([1, 0]);
    expect(await stock()).toEqual({ stock: 1, reserved: 0 });
    const [o] = await q(`select status, payment_status, invoice_number from orders where id = $1`, [O(1)]);
    expect(o.status).toBe("confirmed"); expect(o.payment_status).toBe("paid");
    expect(o.invoice_number.startsWith(PREFIX)).toBe(true);
    expect((await q(`select count(*)::int n from inventory_movements where order_id = $1`, [O(1)]))[0].n).toBe(1);
  });

  it("releases expired holds and returns coupon uses", async () => {
    await q(`insert into coupons (id, code, type, value, usage_limit, used_count) values ('dddddddd-0000-4000-8000-000000000001', 'ONE', 'fixed', 100, 1, 1)`);
    await order(1, "razorpay", 1, -5); await run(c, reserveSql(V, 1));
    await q(`insert into coupon_redemptions (coupon_id, order_id, email, amount) values ('dddddddd-0000-4000-8000-000000000001', $1, 'a@b.in', 100)`, [O(1)]);
    await expect(q(`update coupons set used_count = used_count + 1`)).rejects.toThrow(/coupon_usage_within_limit/);
    expect((await run<{ cancelled: number }>(c, releaseExpiredSql()))[0].cancelled).toBe(1);
    expect((await run<{ cancelled: number }>(c, releaseExpiredSql()))[0].cancelled).toBe(0);
    expect(await stock()).toEqual({ stock: 3, reserved: 0 });
    expect((await q(`select used_count from coupons`))[0].used_count).toBe(0);
  });

  it("restocks on cancellation after confirmation, once", async () => {
    await order(1, "cod", 2); await run(c, reserveSql(V, 2));
    await run(c, confirmOrderSql(O(1), { paid: false, note: "cod", invoicePrefix: PREFIX }));
    expect(await stock()).toEqual({ stock: 1, reserved: 0 });
    expect((await run<{ updated: number }>(c, restockSql(O(1), "cancelled", ["confirmed"], "cancel", null)))[0].updated).toBe(1);
    expect((await run<{ updated: number }>(c, restockSql(O(1), "cancelled", ["confirmed"], "again", null)))[0].updated).toBe(0);
    expect(await stock()).toEqual({ stock: 3, reserved: 0 });
  });

  it("guards status transitions and marks COD paid on delivery", async () => {
    await order(1, "cod", 1); await run(c, reserveSql(V, 1));
    await run(c, confirmOrderSql(O(1), { paid: false, note: "cod", invoicePrefix: PREFIX }));
    expect((await run<{ updated: number }>(c, transitionSql(O(1), "delivered", ["shipped"], null, null)))[0].updated).toBe(0);
    await run(c, transitionSql(O(1), "shipped", ["confirmed"], "AWB", null));
    await run(c, transitionSql(O(1), "delivered", ["shipped"], null, null, { paymentPaid: true }));
    expect((await q(`select status, payment_status from orders where id = $1`, [O(1)]))[0]).toEqual({ status: "delivered", payment_status: "paid" });
  });

  it("customer cancellation of an unpaid order releases its hold", async () => {
    await order(1, "razorpay", 2); await run(c, reserveSql(V, 2));
    expect((await run<{ cancelled: number }>(c, releasePendingOrderSql(O(1), "customer", null)))[0].cancelled).toBe(1);
    expect(await stock()).toEqual({ stock: 3, reserved: 0 });
  });

  it("logs inventory adjustments atomically and blocks going below reserved", async () => {
    await run(c, setStockSql(V, 10, "count", null, null));
    await run(c, adjustStockSql(V, -4, "damaged", "torn", null));
    expect(await stock()).toEqual({ stock: 6, reserved: 0 });
    expect((await q(`select string_agg(delta::text, ',' order by created_at) d from inventory_movements`))[0].d).toBe("7,-4");
    await run(c, reserveSql(V, 5));
    await expect(run(c, setStockSql(V, 2, "count", null, null))).rejects.toThrow(/reserved_valid/);
  });

  it("serialises concurrent reservations for the last units", async () => {
    const other = await connect();
    try {
      await q(`begin`); await run(c, reserveSql(V, 2));
      const racer = run(other, reserveSql(V, 2)).then(() => "ok", (e: Error) => e.message);
      await new Promise((r) => setTimeout(r, 200));
      await q(`commit`);
      expect(await racer).toMatch(/reserved_valid/);
      expect(await stock()).toEqual({ stock: 3, reserved: 2 });
    } finally { await other.end(); }
  });
});
