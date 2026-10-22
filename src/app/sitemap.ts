import type { MetadataRoute } from "next";
import { db } from "@/db";
import { products, collections, categories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isPublished } from "@/lib/catalog/queries";
import { getPublishedSlugs } from "@/lib/pages";

export const revalidate = 3600;
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const fixed = ["", "/shop", "/collections"].map((p) => ({ url: `${SITE}${p}`, changeFrequency: "daily" as const, priority: p ? 0.8 : 1 }));
  try {
    const [prods, cols, cats, pgs] = await Promise.all([
      db.select({ slug: products.slug, updatedAt: products.updatedAt }).from(products).where(isPublished()),
      db.select({ slug: collections.slug, updatedAt: collections.updatedAt }).from(collections).where(eq(collections.isVisible, true)),
      db.select({ slug: categories.slug, updatedAt: categories.updatedAt }).from(categories).where(eq(categories.isVisible, true)),
      getPublishedSlugs(),
    ]);
    return [
      ...fixed,
      ...prods.map((p) => ({ url: `${SITE}/products/${p.slug}`, lastModified: p.updatedAt, priority: 0.7 })),
      ...cols.map((c) => ({ url: `${SITE}/collections/${c.slug}`, lastModified: c.updatedAt, priority: 0.6 })),
      ...cats.map((c) => ({ url: `${SITE}/category/${c.slug}`, lastModified: c.updatedAt, priority: 0.6 })),
      ...pgs.map((p) => ({ url: `${SITE}/${p.slug}`, lastModified: p.updatedAt, priority: 0.3 })),
    ];
  } catch { return fixed; }
}
