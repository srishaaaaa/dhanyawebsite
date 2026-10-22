import { asc, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { requireSection, hasRole } from "@/lib/authz";
import { PageHeader } from "@/components/admin/ui";
import TaxonomyManager from "@/components/admin/TaxonomyManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const me = await requireSection("categories");
  const rows = await db.select({
    id: categories.id, name: categories.name, slug: categories.slug, description: categories.description, imageUrl: categories.imageUrl,
    sortOrder: categories.sortOrder, isVisible: categories.isVisible, parentId: categories.parentId, isOccasion: categories.isOccasion,
    productCount: sql<number>`(select count(*) from products p where p.category_id = ${categories.id} and p.status <> 'archived')::int`,
  }).from(categories).orderBy(asc(categories.sortOrder), asc(categories.name));
  return (
    <div>
      <PageHeader title="Categories" description="Categories organise the shop and power navigation. Mark a category as an occasion to feature it under “Shop by occasion”." />
      <TaxonomyManager kind="category" canDelete={hasRole(me.role, "admin")}
        rows={rows.map((r) => ({ ...r, description: r.description ?? "", imageUrl: r.imageUrl ?? "", parentId: r.parentId ?? "" }))} />
    </div>
  );
}
