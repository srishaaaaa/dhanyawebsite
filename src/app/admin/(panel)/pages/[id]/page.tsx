import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pages } from "@/db/schema";
import { requireSection, hasRole } from "@/lib/authz";
import { CORE_PAGES } from "@/lib/pages";
import PageEditor from "@/components/admin/PageEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit page" };
const toIst = (d: Date | null) => (d ? new Date(d.getTime() + 330 * 60_000).toISOString().slice(0, 16) : "");

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireSection("pages");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [p] = await db.select().from(pages).where(eq(pages.id, id)).limit(1);
  if (!p) notFound();
  return <PageEditor initial={{ id: p.id, title: p.title, slug: p.slug, body: p.body, seoTitle: p.seoTitle ?? "", seoDescription: p.seoDescription ?? "", status: p.status, publishAt: toIst(p.publishAt) }}
    core={Boolean(CORE_PAGES[p.slug])} canDelete={hasRole(me.role, "admin") && !CORE_PAGES[p.slug]} />;
}
