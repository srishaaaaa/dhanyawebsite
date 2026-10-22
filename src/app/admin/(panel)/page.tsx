import Link from "next/link";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { requireStaff, canAccessSection } from "@/lib/authz";
import { formatINR } from "@/lib/money";
import { STATUS_LABEL, type OrderStatus } from "@/lib/orders-sql";
import { Card, Badge } from "@/components/admin/ui";
import { RANGES, resolveRange } from "@/lib/date-range";

export const dynamic = "force-dynamic";

// "Placed" = confirmed or later, i.e. not awaiting online payment and not cancelled. Each order is counted once,
// so retried payment webhooks can't inflate figures.
const PLACED = sql`o.status not in ('pending_payment','cancelled')`;

export default async function Overview({ searchParams }: { searchParams: Promise<{ r?: string; from?: string; to?: string }> }) {
  const me = await requireStaff();
  if (!canAccessSection(me, "orders")) {
    return (
      <div className="space-y-4">
        <h1 className="font-serif text-4xl text-aubergine">Welcome{me.name ? `, ${me.name.split(" ")[0]}` : ""}</h1>
        <p className="text-sm text-charcoal/60">Sales figures are visible to team members with access to Orders. Use the menu to open the sections you manage.</p>
      </div>
    );
  }
  const sp = await searchParams;
  const { from, to, key } = resolveRange(sp);
  const inRange = sql`o.created_at between ${from.toISOString()}::timestamptz and ${to.toISOString()}::timestamptz`;

  const [[k], daily, top, cats, payBreak, coupons, recent, low, [cust]] = await Promise.all([
    db.execute<{ orders: number; gross: string; collected: string; tax: string; refunds: string; awaiting: number; aov: string }>(sql`
      select count(*) filter (where ${PLACED})::int as orders,
        coalesce(sum(o.grand_total) filter (where ${PLACED}), 0) as gross,
        coalesce(sum(o.grand_total) filter (where ${PLACED} and o.payment_status in ('paid','partially_refunded','refunded')), 0) as collected,
        coalesce(sum(o.cgst_total + o.sgst_total + o.igst_total) filter (where ${PLACED}), 0) as tax,
        (select coalesce(sum(r.amount), 0) from refunds r where r.created_at between ${from.toISOString()}::timestamptz and ${to.toISOString()}::timestamptz) as refunds,
        (select count(*) from orders x where x.status in ('confirmed','processing','packed'))::int as awaiting,
        coalesce(avg(o.grand_total) filter (where ${PLACED}), 0) as aov
      from orders o where ${inRange}`).then((r) => r.rows),
    db.execute<{ day: string; total: string; n: number }>(sql`
      select to_char(o.created_at at time zone 'Asia/Kolkata', 'YYYY-MM-DD') as day, sum(o.grand_total) as total, count(*)::int as n
      from orders o where ${inRange} and ${PLACED} group by 1 order by 1`).then((r) => r.rows),
    db.execute<{ name: string; product_id: string | null; qty: number; revenue: string }>(sql`
      select oi.product_name as name, oi.product_id, sum(oi.quantity)::int as qty, sum(oi.line_total) as revenue
      from order_items oi join orders o on o.id = oi.order_id where ${inRange} and ${PLACED}
      group by 1, 2 order by revenue desc limit 6`).then((r) => r.rows),
    db.execute<{ name: string; revenue: string }>(sql`
      select coalesce(c.name, 'Uncategorised') as name, sum(oi.line_total) as revenue
      from order_items oi join orders o on o.id = oi.order_id left join products p on p.id = oi.product_id left join categories c on c.id = p.category_id
      where ${inRange} and ${PLACED} group by 1 order by 2 desc limit 6`).then((r) => r.rows),
    db.execute<{ status: string; n: number }>(sql`select o.payment_status as status, count(*)::int as n from orders o where ${inRange} group by 1 order by 2 desc`).then((r) => r.rows),
    db.execute<{ code: string; uses: number; amount: string }>(sql`
      select c.code, count(*)::int as uses, sum(cr.amount) as amount from coupon_redemptions cr join coupons c on c.id = cr.coupon_id
      where cr.created_at between ${from.toISOString()}::timestamptz and ${to.toISOString()}::timestamptz group by 1 order by 2 desc limit 5`).then((r) => r.rows),
    db.execute<{ id: string; order_number: string; name: string; status: string; grand_total: string; created_at: string }>(sql`
      select o.id, o.order_number, o.shipping_address->>'fullName' as name, o.status, o.grand_total, o.created_at from orders o order by o.created_at desc limit 8`).then((r) => r.rows),
    db.execute<{ id: string; name: string; sku: string; available: number }>(sql`
      select p.id, p.name, v.sku, (v.stock - v.reserved)::int as available from product_variants v join products p on p.id = v.product_id
      where v.is_active and p.status = 'active' and v.stock - v.reserved <= p.low_stock_threshold order by available asc limit 8`).then((r) => r.rows),
    db.execute<{ customers: number; buyers: number; returning: number }>(sql`
      select (select count(*) from users u where not exists (select 1 from user_roles r where r.user_id = u.id and r.role <> 'customer'))::int as customers,
        count(*)::int as buyers, count(*) filter (where n > 1)::int as returning
      from (select lower(email) e, count(*) n from orders o where ${PLACED} group by 1) t`).then((r) => r.rows),
  ]);

  const gross = Number(k.gross), refunds = Number(k.refunds), net = gross - refunds;
  const max = Math.max(1, ...daily.map((d) => Number(d.total)));
  const catMax = Math.max(1, ...cats.map((c) => Number(c.revenue)));
  const stat = (label: string, value: string, hint?: string) => (
    <div className="border border-charcoal/10 bg-white p-5"><p className="text-xs text-charcoal/60">{label}</p><p className="mt-2 font-serif text-3xl text-aubergine">{value}</p>{hint && <p className="mt-1 text-xs text-charcoal/50">{hint}</p>}</div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="font-serif text-4xl text-aubergine">Overview</h1><p className="text-sm text-charcoal/60">Live figures from orders in the database, India time.</p></div>
        <form className="flex flex-wrap items-center gap-2 text-sm">
          {Object.entries(RANGES).map(([r, l]) => <Link key={r} href={`/admin?r=${r}`} className={`border px-3 py-1.5 ${key === r ? "border-aubergine bg-aubergine text-ivory" : "border-charcoal/15 bg-white"}`}>{l}</Link>)}
          <input type="hidden" name="r" value="custom" />
          <input type="date" name="from" defaultValue={sp.from} aria-label="From" className="border border-charcoal/15 bg-white px-2 py-1" />
          <input type="date" name="to" defaultValue={sp.to} aria-label="To" className="border border-charcoal/15 bg-white px-2 py-1" />
          <button className="border border-charcoal/15 bg-white px-3 py-1.5">Apply</button>
        </form>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stat("Gross sales", formatINR(gross), "Placed orders incl. GST & shipping; excludes cancelled and unpaid online")}
        {stat("Net sales", formatINR(net), `Gross minus ${formatINR(refunds)} refunded in this period`)}
        {stat("Orders", String(k.orders), `Average ${formatINR(Number(k.aov))}`)}
        {stat("Awaiting fulfilment", String(k.awaiting), "Confirmed, processing or packed (all time)")}
        {stat("Collected", formatINR(Number(k.collected)), "Paid online or COD collected")}
        {stat("GST collected", formatINR(Number(k.tax)))}
        {stat("Customers", String(cust.customers), "Registered accounts")}
        {stat("Returning buyers", cust.buyers ? `${Math.round((cust.returning / cust.buyers) * 100)}%` : "—", `${cust.returning} of ${cust.buyers} buyers (by email, all time)`)}
      </div>

      <Card title="Revenue over time">
        {daily.length === 0 ? <p className="text-sm text-charcoal/60">No placed orders in this period.</p> : (
          <div className="flex h-48 items-end gap-1" role="img" aria-label="Daily gross sales">
            {daily.map((d) => (
              <div key={d.day} className="group relative flex-1" style={{ height: `${(Number(d.total) / max) * 100}%` }}>
                <div className="h-full min-h-[2px] bg-aubergine/80 group-hover:bg-burgundy" />
                <span className="pointer-events-none absolute -top-10 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap bg-charcoal px-2 py-1 text-[11px] text-ivory group-hover:block">{d.day}: {formatINR(d.total)} · {d.n} orders</span>
              </div>
            ))}
          </div>
        )}
        {daily.length > 0 && <p className="mt-2 flex justify-between text-xs text-charcoal/50"><span>{daily[0].day}</span><span>{daily[daily.length - 1].day}</span></p>}
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Top products">
          {top.length === 0 ? <p className="text-sm text-charcoal/60">No sales yet.</p> : <ol className="space-y-2 text-sm">{top.map((t, i) => <li key={i} className="flex justify-between gap-3"><span className="truncate">{t.product_id ? <Link href={`/admin/products/${t.product_id}`} className="hover:underline">{t.name}</Link> : t.name} <span className="text-charcoal/50">× {t.qty}</span></span><span className="tabular-nums">{formatINR(t.revenue)}</span></li>)}</ol>}
        </Card>
        <Card title="Sales by category">
          {cats.length === 0 ? <p className="text-sm text-charcoal/60">No sales yet.</p> : <ul className="space-y-2 text-sm">{cats.map((c) => <li key={c.name}><div className="flex justify-between"><span>{c.name}</span><span className="tabular-nums">{formatINR(c.revenue)}</span></div><div className="mt-1 h-1 bg-charcoal/10"><div className="h-full bg-gold" style={{ width: `${(Number(c.revenue) / catMax) * 100}%` }} /></div></li>)}</ul>}
        </Card>
        <Card title="Payments and coupons">
          <ul className="space-y-1 text-sm">{payBreak.map((p) => <li key={p.status} className="flex justify-between"><span className="capitalize">{p.status.replace("_", " ")}</span><span>{p.n}</span></li>)}</ul>
          {payBreak.length === 0 && <p className="text-sm text-charcoal/60">No orders in this period.</p>}
          {coupons.length > 0 && <><p className="mt-4 text-xs text-charcoal/60">Coupon use</p><ul className="mt-1 space-y-1 text-sm">{coupons.map((c) => <li key={c.code} className="flex justify-between"><span className="font-mono">{c.code} × {c.uses}</span><span>−{formatINR(c.amount)}</span></li>)}</ul></>}
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Recent orders">
          {recent.length === 0 ? <p className="text-sm text-charcoal/60">No orders yet — they&apos;ll appear here as soon as customers check out.</p> : (
            <table className="w-full text-sm"><tbody>{recent.map((o) => (
              <tr key={o.id} className="border-t border-charcoal/10"><td className="py-2"><Link href={`/admin/orders/${o.id}`} className="underline">{o.order_number}</Link></td><td>{o.name}</td><td><Badge tone="muted">{STATUS_LABEL[o.status as OrderStatus]}</Badge></td><td className="text-right tabular-nums">{formatINR(o.grand_total)}</td></tr>
            ))}</tbody></table>
          )}
        </Card>
        <Card title="Low stock">
          {low.length === 0 ? <p className="text-sm text-charcoal/60">All active variants are above their alert level.</p> : (
            <ul className="space-y-1 text-sm">{low.map((l) => <li key={l.sku} className="flex justify-between"><Link href={`/admin/products/${l.id}`} className="truncate hover:underline">{l.name} <span className="text-charcoal/50">{l.sku}</span></Link><Badge tone={l.available <= 0 ? "out" : "low"}>{l.available <= 0 ? "Out" : `${l.available} left`}</Badge></li>)}</ul>
          )}
          <Link href="/admin/inventory?level=low" className="mt-3 inline-block text-xs underline">Open inventory</Link>
        </Card>
      </div>
    </div>
  );
}
