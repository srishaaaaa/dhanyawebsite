import Link from "next/link";
import { desc, sql } from "drizzle-orm";
import { Download } from "lucide-react";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { requireSection } from "@/lib/authz";
import { PageHeader, Empty, Pagination, qs, btn, inputCls, Badge } from "@/components/admin/ui";
import { formatINR } from "@/lib/money";
import { ORDER_STATUSES, STATUS_LABEL, releaseExpiredSql, type OrderStatus } from "@/lib/orders-sql";
import { orderWhere, type OrderFilters } from "./filters";

export const dynamic = "force-dynamic";
export const metadata = { title: "Orders" };
const PER = 30;
const PAY_TONE: Record<string, string> = { paid: "ok", pending: "draft", failed: "out", refunded: "muted", partially_refunded: "low" };
const STATUS_TONE: Record<string, string> = { pending_payment: "draft", confirmed: "scheduled", processing: "scheduled", packed: "scheduled", shipped: "active", out_for_delivery: "active", delivered: "ok", cancelled: "muted", return_requested: "low", returned: "muted", refunded: "muted" };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<OrderFilters> }) {
  await requireSection("orders");
  const sp = await searchParams;
  await db.execute(releaseExpiredSql()).catch(() => {}); // keep stock holds honest
  const page = Math.max(1, Number(sp.page) || 1);
  const where = orderWhere(sp);
  const [rows, [{ n }]] = await Promise.all([
    db.select({ id: orders.id, num: orders.orderNumber, at: orders.createdAt, email: orders.email, name: sql<string>`${orders.shippingAddress}->>'fullName'`,
      status: orders.status, pay: orders.paymentStatus, method: orders.paymentMethod, total: orders.grandTotal,
      items: sql<number>`(select coalesce(sum(quantity),0) from order_items oi where oi.order_id = ${orders.id})::int` })
      .from(orders).where(where).orderBy(desc(orders.createdAt)).limit(PER).offset((page - 1) * PER),
    db.select({ n: sql<number>`count(*)::int` }).from(orders).where(where),
  ]);
  const base = { q: sp.q, status: sp.status, pay: sp.pay, method: sp.method, from: sp.from, to: sp.to };
  return (
    <div>
      <PageHeader title="Orders" description={`${n} order${n === 1 ? "" : "s"}`} actions={<a href={`/admin/orders/export${qs(base)}`} className={btn.secondary}><Download size={15} />Export CSV</a>} />
      <form className="mb-4 grid gap-2 md:grid-cols-[1fr_170px_150px_130px_140px_140px_auto]" role="search">
        <input name="q" defaultValue={sp.q} placeholder="Order no., name, email or phone" aria-label="Search orders" className={`${inputCls} mt-0`} />
        <select name="status" defaultValue={sp.status ?? ""} aria-label="Status" className={`${inputCls} mt-0`}>
          <option value="">All statuses</option><option value="open">Awaiting fulfilment</option>{ORDER_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <select name="pay" defaultValue={sp.pay ?? ""} aria-label="Payment" className={`${inputCls} mt-0`}>
          <option value="">Any payment</option>{["paid", "pending", "failed", "refunded", "partially_refunded"].map((p) => <option key={p} value={p}>{p.replace("_", " ")}</option>)}
        </select>
        <select name="method" defaultValue={sp.method ?? ""} aria-label="Method" className={`${inputCls} mt-0`}><option value="">Any method</option><option value="razorpay">Online</option><option value="cod">COD</option></select>
        <input type="date" name="from" defaultValue={sp.from} aria-label="From date" className={`${inputCls} mt-0`} />
        <input type="date" name="to" defaultValue={sp.to} aria-label="To date" className={`${inputCls} mt-0`} />
        <button className={btn.secondary}>Apply</button>
      </form>
      {rows.length === 0 ? <Empty title={n === 0 && !sp.q && !sp.status ? "No orders yet" : "No orders match"} body={n === 0 && !sp.q ? "Orders appear here as soon as customers check out." : "Try different filters."} /> : (
        <div className="overflow-x-auto bg-white border border-charcoal/10">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-charcoal/60 border-b border-charcoal/10"><tr><th className="p-3">Order</th><th className="p-3">Date</th><th className="p-3">Customer</th><th className="p-3">Status</th><th className="p-3">Payment</th><th className="p-3 text-right">Total</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-charcoal/10 hover:bg-ivory/60">
                  <td className="p-3"><Link href={`/admin/orders/${r.id}`} className="font-medium hover:underline">{r.num}</Link><span className="block text-xs text-charcoal/50">{r.items} item{r.items === 1 ? "" : "s"}</span></td>
                  <td className="p-3 whitespace-nowrap">{r.at.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}</td>
                  <td className="p-3">{r.name}<span className="block text-xs text-charcoal/50">{r.email}</span></td>
                  <td className="p-3"><Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status as OrderStatus]}</Badge></td>
                  <td className="p-3"><Badge tone={PAY_TONE[r.pay]}>{r.pay.replace("_", " ")}</Badge> <span className="text-xs text-charcoal/50">{r.method === "cod" ? "COD" : "Online"}</span></td>
                  <td className="p-3 text-right tabular-nums">{formatINR(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} pages={Math.ceil(n / PER)} href={(p) => `/admin/orders${qs(base, { page: p })}`} />
    </div>
  );
}
