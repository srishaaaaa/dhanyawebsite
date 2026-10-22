"use server";
import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { db } from "@/db";
import { categories, collections, products } from "@/db/schema";
import { requireSection } from "@/lib/authz";
import { audit } from "@/lib/audit";
import { categoryInput, collectionInput, fieldErrors } from "@/lib/catalog/validation";
import { friendlyDbError } from "@/lib/db-errors";

export type FormResult = { ok: true; id: string } | { ok: false; error: string; fields?: Record<string, string> };
const refresh = (p: string) => { revalidatePath("/", "layout"); revalidatePath(p); };

export async function saveCategory(raw: unknown): Promise<FormResult> {
  const me = await requireSection("categories");
  const parsed = categoryInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fields: fieldErrors(parsed.error) };
  const { id, ...data } = parsed.data;
  if (id && data.parentId) {
    // Block cycles: the new parent can't be a descendant of this category.
    const res = await db.execute<{ hit: boolean }>(sql`
      WITH RECURSIVE up AS (SELECT id, parent_id FROM categories WHERE id = ${data.parentId}
        UNION ALL SELECT c.id, c.parent_id FROM categories c JOIN up ON c.id = up.parent_id)
      SELECT EXISTS (SELECT 1 FROM up WHERE id = ${id}) AS hit`);
    if (res.rows[0]?.hit) return { ok: false, error: "That parent would create a loop.", fields: { parentId: "Choose a different parent" } };
  }
  try {
    const newId = id ?? crypto.randomUUID();
    if (id) await db.update(categories).set({ ...data, updatedAt: new Date() }).where(eq(categories.id, id));
    else await db.insert(categories).values({ id: newId, ...data });
    await audit(me.id, id ? "category.update" : "category.create", "category", newId, { name: data.name });
    refresh("/admin/categories");
    return { ok: true, id: newId };
  } catch (e) {
    return { ok: false, error: friendlyDbError(e) ?? "Couldn't save the category." };
  }
}

export async function deleteCategory(id: string): Promise<{ ok: boolean; error?: string }> {
  const me = await requireSection("categories", "admin");
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(products).where(and(eq(products.categoryId, id), sql`${products.status} <> 'archived'`));
  if (n > 0) return { ok: false, error: `${n} product(s) still use this category. Move them first, or hide the category instead.` };
  await db.update(categories).set({ parentId: null }).where(eq(categories.parentId, id));
  await db.delete(categories).where(eq(categories.id, id));
  await audit(me.id, "category.delete", "category", id);
  refresh("/admin/categories");
  return { ok: true };
}

export async function saveCollection(raw: unknown): Promise<FormResult> {
  const me = await requireSection("collections");
  const parsed = collectionInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fields: fieldErrors(parsed.error) };
  const { id, ...data } = parsed.data;
  try {
    const newId = id ?? crypto.randomUUID();
    if (id) await db.update(collections).set({ ...data, updatedAt: new Date() }).where(eq(collections.id, id));
    else await db.insert(collections).values({ id: newId, ...data });
    await audit(me.id, id ? "collection.update" : "collection.create", "collection", newId, { title: data.title });
    refresh("/admin/collections");
    return { ok: true, id: newId };
  } catch (e) {
    return { ok: false, error: friendlyDbError(e) ?? "Couldn't save the collection." };
  }
}

export async function deleteCollection(id: string): Promise<{ ok: boolean; error?: string }> {
  const me = await requireSection("collections", "admin");
  await db.delete(collections).where(eq(collections.id, id)); // product links cascade; products are untouched
  await audit(me.id, "collection.delete", "collection", id);
  refresh("/admin/collections");
  return { ok: true };
}

/** Persists a full ordering (ids in display order). */
export async function reorder(kind: "category" | "collection", ids: string[]): Promise<{ ok: boolean }> {
  const me = await requireSection(kind === "category" ? "categories" : "collections");
  if (!Array.isArray(ids) || ids.length > 500 || !ids.every((x) => /^[0-9a-f-]{36}$/i.test(x))) return { ok: false };
  if (ids.length) {
    const stmts: BatchItem<"pg">[] = ids.map((id, i) => kind === "category"
      ? db.update(categories).set({ sortOrder: i * 10, updatedAt: new Date() }).where(eq(categories.id, id))
      : db.update(collections).set({ sortOrder: i * 10, updatedAt: new Date() }).where(eq(collections.id, id)));
    await db.batch(stmts as [BatchItem<"pg">, ...BatchItem<"pg">[]]);
  }
  await audit(me.id, `${kind}.reorder`, kind, null, { count: ids.length });
  refresh(kind === "category" ? "/admin/categories" : "/admin/collections");
  return { ok: true };
}
