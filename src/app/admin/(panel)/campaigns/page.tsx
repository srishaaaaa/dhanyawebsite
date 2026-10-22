import { asc, desc } from "drizzle-orm";
import { db } from "@/db";
import { campaigns } from "@/db/schema";
import { requireSection } from "@/lib/authz";
import { PageHeader } from "@/components/admin/ui";
import CampaignManager from "@/components/admin/CampaignManager";
import type { CampaignContent } from "@/lib/campaigns";

export const dynamic = "force-dynamic";
export const metadata = { title: "Campaigns and banners" };
const toIst = (d: Date | null) => (d ? new Date(d.getTime() + 330 * 60_000).toISOString().slice(0, 16) : "");

export default async function CampaignsPage() {
  await requireSection("campaigns");
  const rows = await db.select().from(campaigns).orderBy(asc(campaigns.sortOrder), desc(campaigns.createdAt));
  return (
    <div>
      <PageHeader title="Campaigns and banners" description="Announcements run in the bar above the header (several rotate). Banners appear under the homepage hero and at the top of the shop. Both follow their schedule automatically. For full-width editorial campaigns, use the Homepage builder." />
      <CampaignManager rows={rows.map((r) => {
        const c = r.content as CampaignContent;
        const now = Date.now();
        const live = r.status === "published" && (!r.startsAt || r.startsAt.getTime() <= now) && (!r.endsAt || r.endsAt.getTime() > now);
        return { id: r.id, title: r.title, kind: r.kind as "announcement" | "banner", text: c.text ?? "", href: c.href ?? "", ctaLabel: c.ctaLabel ?? "", tone: c.tone ?? "aubergine",
          startsAt: toIst(r.startsAt), endsAt: toIst(r.endsAt), status: r.status, live, ended: Boolean(r.endsAt && r.endsAt.getTime() <= now) };
      })} />
    </div>
  );
}
