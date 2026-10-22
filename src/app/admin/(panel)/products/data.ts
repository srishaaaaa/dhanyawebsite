import "server-only";
import { asc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { categories, collections, products, productVariants, productImages, productCollections } from "@/db/schema";
import type { ProductDraft } from "@/components/admin/ProductForm";

/** "2026-10-21T18:30" in IST for <input type="datetime-local"> */
export function toIstInput(d: Date | null) {
  if (!d) return "";
  const ist = new Date(d.getTime() + 330 * 60_000);
  return ist.toISOString().slice(0, 16);
}

export async function formOptions() {
  const [cats, cols, prods] = await Promise.all([
    db.select({ id: categories.id, label: categories.name }).from(categories).orderBy(asc(categories.sortOrder), asc(categories.name)),
    db.select({ id: collections.id, label: collections.title }).from(collections).orderBy(asc(collections.sortOrder), asc(collections.title)),
    db.select({ id: products.id, label: products.name }).from(products).where(ne(products.status, "archived")).orderBy(asc(products.name)).limit(1000),
  ]);
  return { categories: cats, collections: cols, products: prods };
}

export async function loadProductDraft(id: string): Promise<(ProductDraft & { version: string }) | null> {
  const [p] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!p) return null;
  const [vars, imgs, cols] = await Promise.all([
    db.select().from(productVariants).where(eq(productVariants.productId, id)).orderBy(asc(productVariants.createdAt)),
    db.select().from(productImages).where(eq(productImages.productId, id)).orderBy(asc(productImages.sortOrder)),
    db.select({ id: productCollections.collectionId }).from(productCollections).where(eq(productCollections.productId, id)),
  ]);
  const s = (v: string | number | null | undefined) => (v === null || v === undefined ? "" : String(v));
  return {
    version: p.updatedAt.toISOString(), id: p.id, name: p.name, slug: p.slug, sku: p.sku, description: s(p.description), designer: s(p.designer),
    categoryId: s(p.categoryId), collectionIds: cols.map((c) => c.id), productType: s(p.productType),
    price: s(p.price), compareAtPrice: s(p.compareAtPrice), gstRate: String(Number(p.gstRate)), hsnCode: s(p.hsnCode),
    material: s(p.material), careInstructions: s(p.careInstructions), fitInfo: s(p.fitInfo), sizeGuide: s(p.sizeGuide),
    weightGrams: s(p.weightGrams), tags: p.tags.join(", "), videoUrl: s(p.videoUrl), model3dUrl: s(p.model3dUrl),
    seoTitle: s(p.seoTitle), seoDescription: s(p.seoDescription), isFeatured: p.isFeatured, isBestseller: p.isBestseller,
    isNewArrival: p.isNewArrival, lowStockThreshold: String(p.lowStockThreshold), status: p.status, publishAt: toIstInput(p.publishAt),
    relatedProductIds: p.relatedProductIds,
    images: imgs.map((i) => ({ id: i.id, url: i.url, altText: s(i.altText), colorName: s(i.colorName) })),
    variants: vars.map((v) => ({ id: v.id, sku: v.sku, size: s(v.size), color: s(v.color), colorHex: s(v.colorHex),
      priceOverride: s(v.priceOverride), stock: v.stock, isActive: v.isActive, reserved: v.reserved })),
  };
}
