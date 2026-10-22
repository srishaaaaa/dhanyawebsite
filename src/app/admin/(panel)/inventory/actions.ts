"use server";
import { revalidatePath } from "next/cache";
import { inArray } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { db } from "@/db";
import { productVariants } from "@/db/schema";
import { requireSection } from "@/lib/authz";
import { audit } from "@/lib/audit";
import { stockAdjustInput, fieldErrors } from "@/lib/catalog/validation";
import { adjustStockSql, setStockSql } from "@/lib/catalog/inventory";
import { friendlyDbError } from "@/lib/db-errors";
import { parseCsv } from "@/lib/csv";
import { notifyBackInStock } from "@/lib/stock-alerts";
import type { ImportResult } from "@/components/admin/CsvImport";

export async function adjustStock(raw: unknown): Promise<{ ok: boolean; error?: string; fields?: Record<string, string> }> {
  const me = await requireSection("inventory");
  const parsed = stockAdjustInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Check the adjustment.", fields: fieldErrors(parsed.error) };
  const a = parsed.data;
  try {
    const q = a.mode === "set" ? setStockSql(a.variantId, a.amount, a.reason, a.note, me.id) : adjustStockSql(a.variantId, a.amount, a.reason, a.note, me.id);
    await db.execute(q);
  } catch (e) {
    return { ok: false, error: friendlyDbError(e) ?? "Couldn't update stock." };
  }
  await audit(me.id, "inventory.adjust", "variant", a.variantId, { mode: a.mode, amount: a.amount, reason: a.reason });
  await notifyBackInStock();
  revalidatePath("/", "layout");
  revalidatePath("/admin/inventory");
  return { ok: true };
}

export async function importStockCsv(_: ImportResult, fd: FormData): Promise<ImportResult> {
  const me = await requireSection("inventory");
  const file = fd.get("file");
  const dryRun = fd.get("dryRun") === "on";
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Choose a CSV file." };
  if (file.size > 1_000_000) return { ok: false, message: "File is larger than 1 MB." };
  const rows = parseCsv(await file.text());
  if (!rows.length || !("variant_sku" in rows[0]) || !("stock" in rows[0])) return { ok: false, message: "Needs columns: variant_sku, stock (optional: note)." };
  if (rows.length > 5000) return { ok: false, message: "Import up to 5,000 rows at a time." };
  const errors: string[] = [];
  const skus = rows.map((r) => r.variant_sku.toUpperCase()).filter(Boolean);
  const found = skus.length ? await db.select({ id: productVariants.id, sku: productVariants.sku, stock: productVariants.stock, reserved: productVariants.reserved })
    .from(productVariants).where(inArray(productVariants.sku, skus)) : [];
  const bySku = new Map(found.map((v) => [v.sku.toUpperCase(), v]));
  const stmts: BatchItem<"pg">[] = [];
  let changes = 0;
  rows.forEach((r, i) => {
    const v = bySku.get(r.variant_sku.toUpperCase());
    const n = Number(r.stock);
    if (!v) return errors.push(`Row ${i + 2}: variant ${r.variant_sku} not found.`);
    if (!Number.isInteger(n) || n < 0) return errors.push(`Row ${i + 2}: stock must be a whole number ≥ 0.`);
    if (n < v.reserved) return errors.push(`Row ${i + 2}: ${v.sku} has ${v.reserved} reserved; stock can't be lower.`);
    if (n !== v.stock) { changes++; stmts.push(db.execute(setStockSql(v.id, n, "count", r.note || "Stock count CSV", me.id))); }
  });
  if (dryRun) return { ok: errors.length === 0, message: `Check complete: ${changes} variant(s) would change. Nothing was saved.`, errors };
  if (errors.length) return { ok: false, message: "Fix these rows first — nothing was saved.", errors };
  if (stmts.length) {
    try { await db.batch(stmts as [BatchItem<"pg">, ...BatchItem<"pg">[]]); }
    catch (e) { return { ok: false, message: friendlyDbError(e) ?? "Import failed — nothing was saved." }; }
  }
  await audit(me.id, "inventory.import", "variant", null, { changes });
  await notifyBackInStock();
  revalidatePath("/", "layout");
  revalidatePath("/admin/inventory");
  return { ok: true, message: `Updated stock for ${changes} variant(s).` };
}
