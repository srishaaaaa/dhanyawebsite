import Link from "next/link";
import { and, desc, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { users, userRoles, contactMessages } from "@/db/schema";
import { requireSection } from "@/lib/authz";
import { PageHeader, Empty, Pagination, qs, btn, inputCls, Badge } from "@/components/admin/ui";
import { formatINR } from "@/lib/money";
import MarkRead from "@/components/admin/MarkRead";

export const dynamic = "force-dynamic";
export const metadata = { title: "Customers" };
const PER = 40;

export default async function Customers({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; tab?: string }> }) {
  await requireSection("customers");
  const sp = await searchParams;
  const tab = sp.tab === "messages" ? "messages" : "customers";
  const page = Math.max(1, Number(sp.page) || 1);
  const tabs = (
    <div className="mb-5 flex gap-2">
      {[["customers", "Customers"], ["messages", "Contact messages"]].map(([k, l]) => (
        <Link key={k} href={`/admin/customers?tab=${k}`} className={`border px-3 py-1.5 text-sm ${tab === k ? "border-aubergine bg-aubergine text-ivory" : "border-charcoal/15 bg-white"}`}>{l}</Link>
      ))}
    </div>
  );

  if (tab === "messages") {
    const msgs = await db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt)).limit(PER).offset((page - 1) * PER);
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(contactMessages);
    return (
      <div>
        <PageHeader title="Customers" description="Messages sent through the contact form." />{tabs}
        {msgs.length === 0 ? <Empty title="No messages yet" /> : (
          <ul className="space-y-3">{msgs.map((m) => (
            <li key={m.id} className={`border bg-white p-4 text-sm ${m.isRead ? "border-charcoal/10" : "border-gold"}`}>
              <div className="flex flex-wrap justify-between gap-2"><p><strong>{m.name}</strong> · <a className="underline" href={`mailto:${m.email}?subject=${encodeURIComponent("Re: your message to DHANYA BOUTIQUE")}`}>{m.email}</a></p>
                <p className="text-xs text-charcoal/55">{m.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}</p></div>
              <p className="mt-2 whitespace-pre-line">{m.message}</p>
              {!m.isRead && <MarkRead id={m.id} />}
            </li>
          ))}</ul>
        )}
        <Pagination page={page} pages={Math.ceil(n / PER)} href={(p) => `/admin/customers${qs({ tab: "messages" }, { page: p })}`} />
      </div>
    );
  }

  const where = and(
    sql`not exists (select 1 from ${userRoles} r where r.user_id = ${users.id} and r.role <> 'customer')`,
    sp.q ? or(ilike(users.email, `%${sp.q}%`), ilike(users.name, `%${sp.q}%`), ilike(users.phone, `%${sp.q}%`)) : undefined,
  );
  const [rows, [{ n }]] = await Promise.all([
    db.select({ id: users.id, name: users.name, email: users.email, phone: users.phone, joined: users.createdAt,
      orders: sql<number>`(select count(*) from orders o where o.user_id = ${users.id} and o.status <> 'cancelled')::int`,
      spent: sql<string>`(select coalesce(sum(grand_total),0) from orders o where o.user_id = ${users.id} and o.payment_status = 'paid')`,
      last: sql<Date | null>`(select max(created_at) from orders o where o.user_id = ${users.id})` })
      .from(users).where(where).orderBy(desc(users.createdAt)).limit(PER).offset((page - 1) * PER),
    db.select({ n: sql<number>`count(*)::int` }).from(users).where(where),
  ]);
  const [{ guests }] = await db.select({ guests: sql<number>`count(distinct lower(email))::int` }).from(sql`orders`).where(sql`user_id is null`);
  return (
    <div>
      <PageHeader title="Customers" description={`${n} registered · ${guests} guest checkout email${guests === 1 ? "" : "s"}`} />{tabs}
      <form className="mb-4 flex gap-2" role="search"><input type="hidden" name="tab" value="customers" /><input name="q" defaultValue={sp.q} placeholder="Name, email or phone" className={`${inputCls} mt-0 max-w-sm`} aria-label="Search customers" /><button className={btn.secondary}>Search</button></form>
      {rows.length === 0 ? <Empty title="No customers yet" body="Shoppers who create an account appear here." /> : (
        <div className="overflow-x-auto border border-charcoal/10 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-charcoal/10 text-left text-xs text-charcoal/60"><tr><th className="p-3">Customer</th><th className="p-3">Phone</th><th className="p-3 text-right">Orders</th><th className="p-3 text-right">Paid total</th><th className="p-3">Last order</th><th className="p-3">Joined</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id} className="border-t border-charcoal/10">
                <td className="p-3"><Link href={`/admin/customers/${r.id}`} className="hover:underline">{r.name ?? "—"}</Link><span className="block text-xs text-charcoal/55">{r.email}</span></td>
                <td className="p-3">{r.phone ?? "—"}</td><td className="p-3 text-right">{r.orders}{r.orders > 1 && <> <Badge tone="ok">Returning</Badge></>}</td>
                <td className="p-3 text-right tabular-nums">{formatINR(r.spent)}</td>
                <td className="p-3">{r.last ? new Date(r.last).toLocaleDateString("en-IN") : "—"}</td><td className="p-3">{r.joined.toLocaleDateString("en-IN")}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <Pagination page={page} pages={Math.ceil(n / PER)} href={(p) => `/admin/customers${qs({ q: sp.q }, { page: p })}`} />
    </div>
  );
}
