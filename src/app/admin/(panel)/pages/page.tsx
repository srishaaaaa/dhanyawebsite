import Link from "next/link";
import { asc } from "drizzle-orm";
import { Plus } from "lucide-react";
import { db } from "@/db";
import { pages } from "@/db/schema";
import { requireSection } from "@/lib/authz";
import { CORE_PAGES } from "@/lib/pages";
import { PageHeader, Badge, btn } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Content and pages" };

export default async function PagesList() {
  await requireSection("pages");
  const rows = await db.select().from(pages).orderBy(asc(pages.slug));
  const missing = Object.keys(CORE_PAGES).filter((s) => !rows.some((r) => r.slug === s));
  return (
    <div>
      <PageHeader title="Content and pages" description="Policies, About and your own landing pages. Written in simple Markdown: ## headings, **bold**, lists and [links](/shop)."
        actions={<Link href="/admin/pages/new" className={btn.primary}><Plus size={15} />New page</Link>} />
      <div className="overflow-x-auto border border-charcoal/10 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-charcoal/10 text-left text-xs text-charcoal/60"><tr><th className="p-3">Page</th><th className="p-3">Address</th><th className="p-3">Status</th><th className="p-3">Updated</th></tr></thead>
          <tbody>
            {rows.map((r) => {
              const scheduled = r.status === "published" && r.publishAt && r.publishAt > new Date();
              return (
                <tr key={r.id} className="border-t border-charcoal/10">
                  <td className="p-3"><Link href={`/admin/pages/${r.id}`} className="hover:underline">{r.title}</Link>{CORE_PAGES[r.slug] && <span className="ml-2 text-xs text-charcoal/50">core</span>}{!r.body.trim() && <span className="ml-2 text-xs text-burgundy">empty</span>}</td>
                  <td className="p-3"><a href={`/${r.slug}`} target="_blank" className="text-charcoal/60 hover:underline">/{r.slug}</a></td>
                  <td className="p-3">{scheduled ? <Badge tone="scheduled">Scheduled</Badge> : <Badge tone={r.status === "published" ? "active" : "draft"}>{r.status}</Badge>}</td>
                  <td className="p-3">{r.updatedAt.toLocaleDateString("en-IN")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {missing.length > 0 && <p className="mt-4 text-sm text-charcoal/60">Not created yet: {missing.map((m) => `/${m}`).join(", ")} — run the seed or create them with these addresses.</p>}
    </div>
  );
}
