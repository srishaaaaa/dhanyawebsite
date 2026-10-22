import { and, desc, eq, ilike, sql } from "drizzle-orm";
import { Download } from "lucide-react";
import { db } from "@/db";
import { newsletterSubscribers } from "@/db/schema";
import { requireSection } from "@/lib/authz";
import { PageHeader, Empty, Pagination, qs, btn, inputCls, Card } from "@/components/admin/ui";
import SubscriberToggle from "@/components/admin/SubscriberToggle";

export const dynamic = "force-dynamic";
export const metadata = { title: "Newsletter" };
const PER = 50;

export default async function Newsletter({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; status?: string }> }) {
  await requireSection("newsletter");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where = and(sp.q ? ilike(newsletterSubscribers.email, `%${sp.q}%`) : undefined, sp.status === "unsubscribed" ? eq(newsletterSubscribers.isActive, false) : sp.status === "all" ? undefined : eq(newsletterSubscribers.isActive, true));
  const [rows, [{ n }], [stats]] = await Promise.all([
    db.select().from(newsletterSubscribers).where(where).orderBy(desc(newsletterSubscribers.consentAt)).limit(PER).offset((page - 1) * PER),
    db.select({ n: sql<number>`count(*)::int` }).from(newsletterSubscribers).where(where),
    db.select({ active: sql<number>`count(*) filter (where is_active)::int`, month: sql<number>`count(*) filter (where is_active and consent_at > now() - interval '30 days')::int`, out: sql<number>`count(*) filter (where not is_active)::int` }).from(newsletterSubscribers),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title="Newsletter" description="Everyone here ticked the consent box. Every email you send must include the unsubscribe link (shown below)." actions={<a href={`/admin/newsletter/export${qs({ status: sp.status })}`} className={btn.secondary}><Download size={15} />Export CSV</a>} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><p className="text-xs text-charcoal/60">Subscribed</p><p className="font-serif text-3xl">{stats.active}</p></Card>
        <Card><p className="text-xs text-charcoal/60">New in last 30 days</p><p className="font-serif text-3xl">{stats.month}</p></Card>
        <Card><p className="text-xs text-charcoal/60">Unsubscribed</p><p className="font-serif text-3xl">{stats.out}</p></Card>
      </div>
      <form className="flex flex-wrap gap-2" role="search">
        <input name="q" defaultValue={sp.q} placeholder="Search email" className={`${inputCls} mt-0 max-w-xs`} aria-label="Search subscribers" />
        <select name="status" defaultValue={sp.status ?? ""} className={`${inputCls} mt-0 w-44`} aria-label="Status"><option value="">Subscribed</option><option value="unsubscribed">Unsubscribed</option><option value="all">All</option></select>
        <button className={btn.secondary}>Apply</button>
      </form>
      {rows.length === 0 ? <Empty title="No subscribers here yet" body="Sign-ups from the footer and homepage appear here." /> : (
        <div className="overflow-x-auto border border-charcoal/10 bg-white">
          <table className="w-full text-sm"><thead className="border-b border-charcoal/10 text-left text-xs text-charcoal/60"><tr><th className="p-3">Email</th><th className="p-3">Consented</th><th className="p-3">Status</th><th /></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id} className="border-t border-charcoal/10"><td className="p-3">{r.email}</td><td className="p-3">{r.consentAt.toLocaleDateString("en-IN")}</td>
                <td className="p-3">{r.isActive ? "Subscribed" : `Unsubscribed${r.unsubscribedAt ? ` ${r.unsubscribedAt.toLocaleDateString("en-IN")}` : ""}`}</td>
                <td className="p-3 text-right"><SubscriberToggle id={r.id} active={r.isActive} /></td></tr>
            ))}</tbody></table>
        </div>
      )}
      <Pagination page={page} pages={Math.ceil(n / PER)} href={(p) => `/admin/newsletter${qs({ q: sp.q, status: sp.status }, { page: p })}`} />
      <p className="text-xs text-charcoal/55">Unsubscribe link format for your emails: <code className="bg-white px-1">{process.env.NEXT_PUBLIC_SITE_URL ?? ""}/newsletter/unsubscribe?e=…&s=…</code> — the CSV export includes a ready-made link for each subscriber.</p>
    </div>
  );
}
