"use server";
import { revalidatePath } from "next/cache";
import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { db } from "@/db";
import {
  products, productVariants, productImages, productCollections, orderItems, inventoryMovements,
} from "@/db/schema";
import { requireSection, requireStaff } from "@/lib/authz";
import { audit } from "@/lib/audit";
import { productInput, fieldErrors } from "@/lib/catalog/validation";
import { setStockSql } from "@/lib/catalog/inventory";
import { friendlyDbError } from "@/lib/db-errors";
import { notifyBackInStock } from "@/lib/stock-alerts";
import { cloudinaryConfigured, signUploadParams } from "@/lib/cloudinary";

export type SaveResult = { ok: true; id: string } | { ok: false; error: string; fields?: Record<string, string> };
type Stmt = BatchItem<"pg">;

function revalidateStore() {
  revalidatePath("/", "layout"); // storefront picks up changes without redeploying
}

export async function saveProduct(raw: unknown): Promise<SaveResult> {
  const me = await requireSection("products");
  const parsed = productInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fields: fieldErrors(parsed.error) };
  const p = parsed.data;
  const isNew = !p.id;
  const id = p.id ?? crypto.randomUUID();

  const existingVariants = isNew ? [] : await db.select({ id: productVariants.id, size: productVariants.size, color: productVariants.color })
    .from(productVariants).where(eq(productVariants.productId, id));
  if (!isNew) {
    const [found] = await db.select({ id: products.id }).from(products).where(eq(products.id, id)).limit(1);
    if (!found) return { ok: false, error: "This product no longer exists." };
  }
  const existingIds = new Set(existingVariants.map((v) => v.id));

  const row = {
    name: p.name, slug: p.slug, sku: p.sku, description: p.description, designer: p.designer,
    categoryId: p.categoryId, productType: p.productType,
    price: p.price.toFixed(2), compareAtPrice: p.compareAtPrice?.toFixed(2) ?? null, gstRate: p.gstRate.toFixed(2),
    hsnCode: p.hsnCode, material: p.material, careInstructions: p.careInstructions, fitInfo: p.fitInfo,
    sizeGuide: p.sizeGuide, weightGrams: p.weightGrams, tags: p.tags, videoUrl: p.videoUrl, model3dUrl: p.model3dUrl,
    seoTitle: p.seoTitle, seoDescription: p.seoDescription, isFeatured: p.isFeatured, isBestseller: p.isBestseller,
    isNewArrival: p.isNewArrival, lowStockThreshold: p.lowStockThreshold, status: p.status, publishAt: p.publishAt,
    relatedProductIds: p.relatedProductIds,
  };

  const stmts: Stmt[] = [];
  stmts.push(isNew
    ? db.insert(products).values({ id, ...row })
    : db.update(products).set({ ...row, updatedAt: new Date() }).where(eq(products.id, id)));

  // Collections
  stmts.push(db.delete(productCollections).where(eq(productCollections.productId, id)));
  if (p.collectionIds.length) {
    stmts.push(db.insert(productCollections).values(p.collectionIds.map((collectionId, i) => ({ productId: id, collectionId, sortOrder: i }))));
  }

  // Images: keep order as submitted; drop removed ones.
  const images = p.images.map((im, i) => ({ ...im, id: im.id ?? crypto.randomUUID(), sortOrder: i }));
  const keep = images.map((im) => im.id);
  stmts.push(keep.length
    ? db.delete(productImages).where(and(eq(productImages.productId, id), notInArray(productImages.id, keep)))
    : db.delete(productImages).where(eq(productImages.productId, id)));
  for (const im of images) {
    stmts.push(db.insert(productImages)
      .values({ id: im.id, productId: id, url: im.url, altText: im.altText ?? p.name, colorName: im.colorName, sortOrder: im.sortOrder })
      .onConflictDoUpdate({ target: productImages.id, set: { url: im.url, altText: im.altText ?? p.name, colorName: im.colorName, sortOrder: im.sortOrder } }));
  }

  // Variants: update existing, insert new, deactivate removed (never hard-delete: order history references them).
  const submittedIds = new Set<string>();
  const combo = (size: string | null, color: string | null) => `${size ?? ""}|${color ?? ""}`.toLowerCase();
  const submittedKnown = new Set(p.variants.map((v) => v.id).filter(Boolean));
  for (const raw of p.variants) {
    // Re-adding a previously removed size/colour revives the old variant instead of colliding with it.
    const revived = !raw.id || !existingIds.has(raw.id)
      ? existingVariants.find((e) => !submittedKnown.has(e.id) && !submittedIds.has(e.id) && combo(e.size, e.color) === combo(raw.size, raw.color))
      : undefined;
    const v = revived ? { ...raw, id: revived.id } : raw;
    const def = { sku: v.sku.toUpperCase(), size: v.size, color: v.color, colorHex: v.colorHex,
      priceOverride: v.priceOverride?.toFixed(2) ?? null, isActive: v.isActive };
    if (v.id && existingIds.has(v.id)) {
      submittedIds.add(v.id);
      stmts.push(db.update(productVariants).set({ ...def, updatedAt: new Date() }).where(eq(productVariants.id, v.id)));
      stmts.push(db.execute(setStockSql(v.id, v.stock, "correction", "Edited in product form", me.id)));
    } else {
      const vid = crypto.randomUUID();
      stmts.push(db.insert(productVariants).values({ id: vid, productId: id, ...def, stock: v.stock }));
      if (v.stock > 0) stmts.push(db.insert(inventoryMovements).values({ variantId: vid, delta: v.stock, reason: "restock", note: "Initial stock", actorId: me.id }));
    }
  }
  const removed = existingVariants.filter((v) => !submittedIds.has(v.id)).map((v) => v.id);
  if (removed.length) stmts.push(db.update(productVariants).set({ isActive: false, updatedAt: new Date() }).where(inArray(productVariants.id, removed)));

  try {
    await db.batch(stmts as [Stmt, ...Stmt[]]); // one transaction on Neon
  } catch (e) {
    const msg = friendlyDbError(e);
    if (!msg) console.error("saveProduct failed", e);
    return { ok: false, error: msg ?? "Couldn't save the product. Nothing was changed — please try again." };
  }

  await audit(me.id, isNew ? "product.create" : "product.update", "product", id, { name: p.name, status: p.status });
  await notifyBackInStock();
  revalidateStore();
  revalidatePath("/admin/products");
  return { ok: true, id };
}

export async function duplicateProduct(productId: string): Promise<SaveResult> {
  const me = await requireSection("products");
  const [src] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!src) return { ok: false, error: "Product not found." };
  const [vars, imgs, cols] = await Promise.all([
    db.select().from(productVariants).where(and(eq(productVariants.productId, productId), eq(productVariants.isActive, true))),
    db.select().from(productImages).where(eq(productImages.productId, productId)),
    db.select().from(productCollections).where(eq(productCollections.productId, productId)),
  ]);
  const id = crypto.randomUUID();
  const suffix = id.slice(0, 4).toUpperCase();
  const { id: _i, createdAt: _c, updatedAt: _u, ...rest } = src;
  const stmts: Stmt[] = [
    db.insert(products).values({ ...rest, id, name: `${src.name} (copy)`, slug: `${src.slug}-copy-${suffix.toLowerCase()}`.slice(0, 80),
      sku: `${src.sku}-C${suffix}`, status: "draft", publishAt: null }),
  ];
  if (imgs.length) stmts.push(db.insert(productImages).values(imgs.map(({ id: _x, ...im }) => ({ ...im, productId: id }))));
  if (cols.length) stmts.push(db.insert(productCollections).values(cols.map((c) => ({ ...c, productId: id }))));
  if (vars.length) stmts.push(db.insert(productVariants).values(vars.map(({ id: _x, createdAt: _a, updatedAt: _b, ...v }) => ({
    ...v, productId: id, sku: `${v.sku}-C${suffix}`, stock: 0, reserved: 0 }))));
  try { await db.batch(stmts as [Stmt, ...Stmt[]]); }
  catch (e) { return { ok: false, error: friendlyDbError(e) ?? "Couldn't duplicate the product." }; }
  await audit(me.id, "product.duplicate", "product", id, { from: productId });
  revalidatePath("/admin/products");
  return { ok: true, id };
}

/** Hard delete only when no order ever referenced the product; otherwise archive instead. */
export async function deleteProduct(productId: string): Promise<{ ok: boolean; error?: string; archived?: boolean }> {
  const me = await requireSection("products", "admin");
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(orderItems)
    .innerJoin(productVariants, eq(productVariants.id, orderItems.variantId))
    .where(eq(productVariants.productId, productId));
  if (n > 0) {
    await db.update(products).set({ status: "archived", updatedAt: new Date() }).where(eq(products.id, productId));
    await audit(me.id, "product.archive", "product", productId, { reason: "has orders" });
    revalidateStore();
    return { ok: true, archived: true, error: "This product appears in past orders, so it was archived instead of deleted." };
  }
  try {
    const vids = (await db.select({ id: productVariants.id }).from(productVariants).where(eq(productVariants.productId, productId))).map((v) => v.id);
    const stmts: Stmt[] = [];
    if (vids.length) stmts.push(db.delete(inventoryMovements).where(inArray(inventoryMovements.variantId, vids)));
    stmts.push(db.delete(productVariants).where(eq(productVariants.productId, productId)));
    stmts.push(db.delete(products).where(eq(products.id, productId)));
    await db.batch(stmts as [Stmt, ...Stmt[]]);
  } catch (e) {
    return { ok: false, error: friendlyDbError(e) ?? "Couldn't delete the product." };
  }
  await audit(me.id, "product.delete", "product", productId);
  revalidateStore();
  revalidatePath("/admin/products");
  return { ok: true };
}

const BULK = ["activate", "draft", "archive", "feature", "unfeature", "bestseller", "unbestseller", "new", "unnew"] as const;
export async function bulkUpdateProducts(ids: string[], action: (typeof BULK)[number]) {
  const me = await requireSection("products");
  if (!BULK.includes(action) || !Array.isArray(ids) || ids.length === 0 || ids.length > 500) return { ok: false, error: "Nothing to update." };
  if (!ids.every((x) => /^[0-9a-f-]{36}$/i.test(x))) return { ok: false, error: "Invalid selection." };
  const set: Partial<typeof products.$inferInsert> = { updatedAt: new Date() };
  if (action === "activate") set.status = "active";
  if (action === "draft") set.status = "draft";
  if (action === "archive") set.status = "archived";
  if (action === "feature" || action === "unfeature") set.isFeatured = action === "feature";
  if (action === "bestseller" || action === "unbestseller") set.isBestseller = action === "bestseller";
  if (action === "new" || action === "unnew") set.isNewArrival = action === "new";
  if (action === "activate") {
    // Publishing requires at least one image.
    const missing = await db.select({ id: products.id }).from(products)
      .where(and(inArray(products.id, ids), sql`not exists (select 1 from product_images i where i.product_id = ${products.id})`));
    if (missing.length) return { ok: false, error: `${missing.length} selected product(s) have no images and can't be published.` };
  }
  await db.update(products).set(set).where(inArray(products.id, ids));
  await audit(me.id, `product.bulk.${action}`, "product", null, { count: ids.length });
  revalidateStore();
  revalidatePath("/admin/products");
  return { ok: true };
}

/** Returns a short-lived signed payload for a direct browser → Cloudinary upload. */
export async function signUpload(kind: "product" | "content" = "product") {
  await requireStaff(); // any staff member may upload media (homepage, campaigns, catalogue)
  if (!cloudinaryConfigured()) return { ok: false as const, error: "Image uploads aren't configured. Add CLOUDINARY_* env vars, or paste an image URL." };
  const params = { folder: `dhanya/${kind}`, timestamp: Math.floor(Date.now() / 1000) };
  return { ok: true as const, ...signUploadParams(params) };
}
