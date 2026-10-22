import { asc, ne } from "drizzle-orm";
import { db } from "@/db";
import { products, collections } from "@/db/schema";
import { requireSection } from "@/lib/authz";
import { getDraft, getPublishedDraftShape } from "@/lib/homepage";
import HomepageBuilder from "@/components/admin/HomepageBuilder";

export const dynamic = "force-dynamic";
export const metadata = { title: "Homepage builder" };

export default async function HomepagePage() {
  await requireSection("homepage");
  const [draft, live, prods, cols] = await Promise.all([
    getDraft(), getPublishedDraftShape(),
    db.select({ id: products.id, label: products.name }).from(products).where(ne(products.status, "archived")).orderBy(asc(products.name)),
    db.select({ id: collections.id, label: collections.title }).from(collections).orderBy(asc(collections.sortOrder)),
  ]);
  return <HomepageBuilder initial={draft.sections} live={JSON.stringify(live)} hasDraft={draft.hasDraft} savedAt={draft.savedAt} products={prods} collections={cols} />;
}
