import Link from "next/link";
import { Download } from "lucide-react";
import { requireSection } from "@/lib/authz";
import { RANGES, resolveRange, istDate } from "@/lib/date-range";
import { formatINR } from "@/lib/money";
import { Card, PageHeader, btn } from "@/components/admin/ui";
import { dailySales, productPerformance, byState, byMethod, topCustomers, couponPerformance, inventoryValue } from "./reports";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reports and analytics" };

export default async function Analytics({ searchParams }: { searchParams: Promise<{ r?: string; from?: string; to?: string }> }) {
  await requireSection("analytics", "admin");
  const sp = await searchParams;
  const { from, to, key } = resolveRange(sp);
  const [daily, products, states, methods, customers, coupons, inv] = await Promise.all([
    dailySales(from, to), productPerformance(from, to), byState(from, to), byMethod(from, to), topCustomers(from, to), couponPerformance(from, to), inventoryValue(),
  ]);
  const sum = (k: keyof (typeof daily)[number]) => daily.reduce((a, d) => a + Number(d[k]), 0);
  const q = new URLSearchParams({ r: key, ...(key === "custom" ? { from: istDate(from), to: istDate(to) } : {}) }).toString();
  const T = ({ head, children }: { head: string[]; children: React.ReactNode }) => (
    <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs text-charcoal/60"><tr>{head.map((h, i) => <th key={h} className={`pb-2 ${i > 0 ? "text-right" : ""}`}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>
  );
  const td = "py-1.5 text-right tabular-nums";

  return (
    <div className="space-y-6">
      <PageHeader title="Reports and analytics" description={`${istDate(from)} to ${istDate(to)} (India time). Sales count each order once; “placed” excludes unpaid online orders and cancellations. Net = gross − refunds issued in the period.`}
        actions={<><a href={`/admin/analytics/export?report=daily&${q}`} className={btn.secondary}><Download size={15} />Daily sales CSV</a><a href={`/admin/analytics/export?report=products&${q}`} className={btn.secondary}><Download size={15} />Products CSV</a></>} />
      <form className="flex flex-wrap items-center gap-2 text-sm">
        {Object.entries(RANGES).map(([r, l]) => <Link key={r} href={`/admin/analytics?r=${r}`} className={`border px-3 py-1.5 ${key === r ? "border-aubergine bg-aubergine text-ivory" : "border-charcoal/15 bg-white"}`}>{l}</Link>)}
        <input type="hidden" name="r" value="custom" />
        <input type="date" name="from" defaultValue={sp.from} aria-label="From" className="border border-charcoal/15 bg-white px-2 py-1" />
        <input type="date" name="to" defaultValue={sp.to} aria-label="To" className="border border-charcoal/15 bg-white px-2 py-1" />
        <button className="border border-charcoal/15 bg-white px-3 py-1.5">Apply</button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[["Gross sales", formatINR(sum("gross"))], ["Refunds", formatINR(sum("refunds"))], ["Net sales", formatINR(sum("net"))], ["Orders", String(sum("orders"))], ["Units sold", String(sum("units"))]].map(([l, v]) => (
          <div key={l} className="border border-charcoal/10 bg-white p-5"><p className="text-xs text-charcoal/60">{l}</p><p className="mt-2 font-serif text-3xl text-aubergine">{v}</p></div>
        ))}
      </div>

      <Card title="Daily sales">
        {daily.length === 0 ? <p className="text-sm text-charcoal/60">No sales in this period.</p> : (
          <T head={["Date", "Orders", "Units", "Gross", "Discounts", "Shipping", "GST", "Refunds", "Net"]}>
            {daily.map((d) => <tr key={d.day} className="border-t border-charcoal/10"><td className="py-1.5">{d.day}</td><td className={td}>{d.orders}</td><td className={td}>{d.units}</td><td className={td}>{formatINR(d.gross)}</td><td className={td}>{formatINR(d.discounts)}</td><td className={td}>{formatINR(d.shipping)}</td><td className={td}>{formatINR(d.gst)}</td><td className={td}>{formatINR(d.refunds)}</td><td className={td}>{formatINR(d.net)}</td></tr>)}
          </T>
        )}
      </Card>

      <Card title="Product performance">
        {products.length === 0 ? <p className="text-sm text-charcoal/60">No product sales in this period.</p> : (
          <T head={["Product", "Units", "Orders", "Revenue", "Returns", "In stock now"]}>
            {products.map((p, i) => <tr key={i} className="border-t border-charcoal/10"><td className="py-1.5">{p.product_id ? <Link className="hover:underline" href={`/admin/products/${p.product_id}`}>{p.name}</Link> : p.name}</td><td className={td}>{p.units ?? 0}</td><td className={td}>{p.orders}</td><td className={td}>{formatINR(p.revenue)}</td><td className={td}>{p.returned || "—"}</td><td className={td}>{p.available ?? "—"}</td></tr>)}
          </T>
        )}
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Sales by state">
          {states.length === 0 ? <p className="text-sm text-charcoal/60">No data.</p> : <T head={["State", "Orders", "Revenue"]}>{states.map((s) => <tr key={s.state} className="border-t border-charcoal/10"><td className="py-1.5">{s.state}</td><td className={td}>{s.orders}</td><td className={td}>{formatINR(s.revenue)}</td></tr>)}</T>}
        </Card>
        <Card title="Payment methods">
          {methods.length === 0 ? <p className="text-sm text-charcoal/60">No data.</p> : <T head={["Method", "Placed", "Revenue", "Cancelled"]}>{methods.map((m) => <tr key={m.method} className="border-t border-charcoal/10"><td className="py-1.5">{m.method === "cod" ? "Cash on delivery" : "Online (Razorpay)"}</td><td className={td}>{m.orders}</td><td className={td}>{formatINR(m.revenue)}</td><td className={td}>{m.cancelled}</td></tr>)}</T>}
        </Card>
        <Card title="Top customers">
          {customers.length === 0 ? <p className="text-sm text-charcoal/60">No data.</p> : <T head={["Customer", "Orders", "Spent"]}>{customers.map((c) => <tr key={c.email} className="border-t border-charcoal/10"><td className="py-1.5">{c.user_id ? <Link className="hover:underline" href={`/admin/customers/${c.user_id}`}>{c.name}</Link> : c.name}<span className="block text-xs text-charcoal/50">{c.email}</span></td><td className={td}>{c.orders}</td><td className={td}>{formatINR(c.spent)}</td></tr>)}</T>}
        </Card>
        <Card title="Discount codes">
          {coupons.length === 0 ? <p className="text-sm text-charcoal/60">No codes used in this period.</p> : <T head={["Code", "Uses", "Discount given", "Order revenue"]}>{coupons.map((c) => <tr key={c.code} className="border-t border-charcoal/10"><td className="py-1.5 font-mono">{c.code}</td><td className={td}>{c.uses}</td><td className={td}>{formatINR(c.discount)}</td><td className={td}>{formatINR(c.revenue)}</td></tr>)}</T>}
        </Card>
      </div>

      <Card title="Inventory on hand (now)">
        <p className="text-sm">{inv.units} units across {inv.skus} active variants ({inv.out} sold out). Retail value {formatINR(inv.retail_incl)} incl. GST ({formatINR(inv.retail_excl)} excl.). Cost price isn&apos;t recorded, so margin isn&apos;t shown.</p>
      </Card>
      <p className="text-xs text-charcoal/55">Visitor traffic and conversion rates aren&apos;t tracked by the store itself — connect an analytics tool (e.g. Google Analytics or Plausible) for those.</p>
    </div>
  );
}
