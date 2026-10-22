import { asc, sql } from "drizzle-orm";
import { db } from "@/db";
import { collections } from "@/db/schema";
import { requireSection, hasRole } from "@/lib/authz";
import { PageHeader } from "@/components/admin/ui";
import TaxonomyManager from "@/components/admin/TaxonomyManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Collections" };

export default async function CollectionsPage() {
  const me = await requireSection("collections");
  const rows = await db.select({
    id: collections.id, name: collections.title, slug: collections.slug, description: collections.description, imageUrl: collections.imageUrl,
    sortOrder: collections.sortOrder, isVisible: collections.isVisible, ctaLabel: collections.ctaLabel, ctaHref: collections.ctaHref,
    productCount: sql<number>`(select count(*) from product_collections pc join products p on p.id = pc.product_id where pc.collection_id = ${collections.id} and p.status <> 'archived')::int`,
  }).from(collections).orderBy(asc(collections.sortOrder), asc(collections.title));
  return (
    <div>
      <PageHeader title="Collections" description="Curated edits shown on the homepage in this order. Assign products to collections from each product's page." />
      <TaxonomyManager kind="collection" canDelete={hasRole(me.role, "admin")}
        rows={rows.map((r) => ({ ...r, description: r.description ?? "", imageUrl: r.imageUrl ?? "", ctaLabel: r.ctaLabel ?? "", ctaHref: r.ctaHref ?? "" }))} />
    </div>
  );
}
