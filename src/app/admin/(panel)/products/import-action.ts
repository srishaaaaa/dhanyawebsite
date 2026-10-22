"use server";
import { revalidatePath } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { db } from "@/db";
import { products, productVariants, productImages, categories, inventoryMovements } from "@/db/schema";
import { requireSection } from "@/lib/authz";
import { audit } from "@/lib/audit";
import { parseCsv } from "@/lib/csv";
import { slugify, SLUG_RE } from "@/lib/slug";
import { setStockSql } from "@/lib/catalog/inventory";
import { friendlyDbError } from "@/lib/db-errors";
import { notifyBackInStock } from "@/lib/stock-alerts";
import type { ImportResult } from "@/components/admin/CsvImport";

type Stmt = BatchItem<"pg">;
const SKU_RE = /^[A-Za-z0-9._-]{1,64}$/;

export async function importProductsCsv(_: ImportResult, fd: FormData): Promise<ImportResult> {
  const me = await requireSection("products");
  const file = fd.get("file");
  const dryRun = fd.get("dryRun") === "on";
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Choose a CSV file." };
  if (file.size > 2_000_000) return { ok: false, message: "File is larger than 2 MB. Split it into smaller files." };
  const rows = parseCsv(await file.text());
  if (rows.length === 0) return { ok: false, message: "The file has no data rows." };
  if (rows.length > 3000) return { ok: false, message: "Import up to 3,000 rows at a time." };
  if (!("sku" in rows[0]) || !("name" in rows[0])) return { ok: false, message: "Missing required columns: sku, name." };

  const errors: string[] = [];
  const cats = await db.select({ id: categories.id, slug: categories.slug }).from(categories);
  const catBySlug = new Map(cats.map((c) => [c.slug, c.id]));

  // Group rows by product SKU.
  const groups = new Map<string, { line: number; r: Record<string, string> }[]>();
  rows.forEach((r, i) => {
    const sku = r.sku?.toUpperCase();
    if (!sku || !SKU_RE.test(sku)) { errors.push(`Row ${i + 2}: invalid or missing sku.`); return; }
    groups.set(sku, [...(groups.get(sku) ?? []), { line: i + 2, r }]);
  });

  const existing = groups.size ? await db.select({ id: products.id, sku: products.sku }).from(products).where(inArray(products.sku, [...groups.keys()])) : [];
  const idBySku = new Map(existing.map((p) => [p.sku.toUpperCase(), p.id]));
  const allVariantSkus = rows.map((r) => r.variant_sku?.toUpperCase()).filter(Boolean) as string[];
  const existingVars = allVariantSkus.length ? await db.select({ id: productVariants.id, sku: productVariants.sku, productId: productVariants.productId })
    .from(productVariants).where(inArray(productVariants.sku, allVariantSkus)) : [];
  const varBySku = new Map(existingVars.map((v) => [v.sku.toUpperCase(), v]));
  const imgRows = existing.length ? await db.selectDistinct({ productId: productImages.productId }).from(productImages)
    .where(inArray(productImages.productId, existing.map((e) => e.id))) : [];
  const hasImages = new Set(imgRows.map((r) => r.productId));

  let created = 0, updated = 0, variantsTouched = 0;
  const plans: { sku: string; stmts: Stmt[] }[] = [];

  for (const [sku, lines] of groups) {
    const head = lines[0].r; const ln = lines[0].line;
    const price = Number(head.price);
    if (!head.name || head.name.length < 2) { errors.push(`Row ${ln}: name is required.`); continue; }
    if (!Number.isFinite(price) || price < 0) { errors.push(`Row ${ln}: price must be a number.`); continue; }
    const compare = head.compare_at_price ? Number(head.compare_at_price) : null;
    if (compare !== null && (!Number.isFinite(compare) || compare <= price)) { errors.push(`Row ${ln}: compare_at_price must be higher than price.`); continue; }
    const gst = head.gst_rate ? Number(head.gst_rate) : 0;
    if (!Number.isFinite(gst) || gst < 0 || gst > 28) { errors.push(`Row ${ln}: gst_rate must be 0–28.`); continue; }
    const slug = head.slug ? head.slug : slugify(head.name);
    if (!SLUG_RE.test(slug)) { errors.push(`Row ${ln}: slug "${slug}" is invalid.`); continue; }
    let status = (["draft", "active", "archived"].includes(head.status) ? head.status : "draft") as "draft" | "active" | "archived";
    const categoryId = head.category_slug ? catBySlug.get(head.category_slug) ?? null : null;
    if (head.category_slug && !categoryId) errors.push(`Row ${ln}: category "${head.category_slug}" not found — left blank.`);
    const id = idBySku.get(sku) ?? crypto.randomUUID();
    if (status === "active" && !hasImages.has(id)) { status = "draft"; errors.push(`Row ${ln}: ${sku} has no images, imported as draft.`); }

    const data = {
      name: head.name.slice(0, 160), slug, price: price.toFixed(2), compareAtPrice: compare?.toFixed(2) ?? null, gstRate: gst.toFixed(2),
      hsnCode: /^\d{4,8}$/.test(head.hsn_code ?? "") ? head.hsn_code : null, status, categoryId,
      tags: (head.tags ?? "").split("|").map((t) => t.trim()).filter(Boolean).slice(0, 40),
      ...(head.description ? { description: head.description.slice(0, 20000) } : {}),
    };
    const stmts: Stmt[] = [];
    if (idBySku.has(sku)) { stmts.push(db.update(products).set({ ...data, updatedAt: new Date() }).where(eq(products.id, id))); updated++; }
    else { stmts.push(db.insert(products).values({ id, sku, ...data })); created++; }

    let bad = false;
    for (const { r, line } of lines) {
      const vsku = r.variant_sku?.toUpperCase();
      if (!vsku) continue;
      if (!SKU_RE.test(vsku)) { errors.push(`Row ${line}: invalid variant_sku.`); bad = true; break; }
      const stock = r.stock === "" || r.stock === undefined ? null : Number(r.stock);
      if (stock !== null && (!Number.isInteger(stock) || stock < 0)) { errors.push(`Row ${line}: stock must be a whole number ≥ 0.`); bad = true; break; }
      const def = { size: r.size || null, color: r.color || null, colorHex: /^#[0-9a-f]{6}$/i.test(r.color_hex ?? "") ? r.color_hex : null };
      const ev = varBySku.get(vsku);
      if (ev && ev.productId !== id) { errors.push(`Row ${line}: variant_sku ${vsku} belongs to another product.`); bad = true; break; }
      if (ev) {
        stmts.push(db.update(productVariants).set({ ...def, isActive: true, updatedAt: new Date() }).where(eq(productVariants.id, ev.id)));
        if (stock !== null) stmts.push(db.execute(setStockSql(ev.id, stock, "correction", "CSV import", me.id)));
      } else {
        const vid = crypto.randomUUID();
        stmts.push(db.insert(productVariants).values({ id: vid, productId: id, sku: vsku, ...def, stock: stock ?? 0 }));
        if (stock) stmts.push(db.insert(inventoryMovements).values({ variantId: vid, delta: stock, reason: "restock", note: "CSV import", actorId: me.id }));
      }
      variantsTouched++;
    }
    if (bad) { if (idBySku.has(sku)) updated--; else created--; continue; }
    plans.push({ sku, stmts });
  }

  if (dryRun) {
    return { ok: errors.length === 0, message: `Check complete: ${created} new and ${updated} existing product(s), ${variantsTouched} variant row(s). Nothing was saved — untick “Check only” to import.`, errors };
  }
  let failed = 0;
  for (const p of plans) {
    try { await db.batch(p.stmts as [Stmt, ...Stmt[]]); }
    catch (e) { failed++; errors.push(`${p.sku}: ${friendlyDbError(e) ?? "couldn't be saved."}`); }
  }
  await audit(me.id, "product.import", "product", null, { created, updated, failed });
  await notifyBackInStock();
  revalidatePath("/", "layout");
  return { ok: failed === 0, message: `Imported ${plans.length - failed} product(s) (${created} new, ${updated} updated)${failed ? `; ${failed} failed` : ""}.`, errors };
}
