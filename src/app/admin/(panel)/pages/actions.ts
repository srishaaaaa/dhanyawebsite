"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { pages } from "@/db/schema";
import { requireSection } from "@/lib/authz";
import { audit } from "@/lib/audit";
import { CORE_PAGES } from "@/lib/pages";
import { SLUG_RE } from "@/lib/slug";

const RESERVED = ["admin", "api", "shop", "collections", "category", "products", "search", "wishlist", "cart", "checkout", "account", "orders", "order-success", "preview", "print", "contact", "sitemap.xml", "robots.txt"];
const input = z.object({
  id: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(2, "Add a title").max(120),
  slug: z.string().trim().min(2).max(80).regex(SLUG_RE, "Lowercase letters, numbers and hyphens"),
  body: z.string().max(100_000),
  seoTitle: z.string().trim().max(70).optional().nullable(), seoDescription: z.string().trim().max(170).optional().nullable(),
  status: z.enum(["draft", "published"]),
  publishAt: z.union([z.literal(""), z.null(), z.undefined(), z.string()]).transform((v) => (v ? new Date(`${v}:00+05:30`) : null)),
});

export async function savePage(raw: unknown) {
  const me = await requireSection("pages");
  const p = input.safeParse(raw);
  if (!p.success) return { ok: false as const, message: "Please fix the highlighted fields.", fields: Object.fromEntries(p.error.issues.map((i) => [i.path.join("."), i.message])) };
  const { id, ...d } = p.data;
  if (RESERVED.includes(d.slug) && d.slug !== "contact") return { ok: false as const, message: "That address is used by the store.", fields: { slug: "Reserved — choose another" } };
  if (id) {
    const [cur] = await db.select({ slug: pages.slug }).from(pages).where(eq(pages.id, id)).limit(1);
    if (cur && CORE_PAGES[cur.slug] && cur.slug !== d.slug) return { ok: false as const, message: "Core pages keep their address so footer links keep working.", fields: { slug: "Can't change for this page" } };
  }
  const row = { ...d, seoTitle: d.seoTitle || null, seoDescription: d.seoDescription || null, updatedAt: new Date() };
  try {
    if (id) await db.update(pages).set(row).where(eq(pages.id, id));
    else { const [n] = await db.insert(pages).values(row).returning({ id: pages.id }); await audit(me.id, "page.create", "page", n.id, { slug: d.slug }); revalidatePath(`/${d.slug}`); return { ok: true as const, message: "Page created.", id: n.id }; }
  } catch {
    return { ok: false as const, message: "Another page already uses this address.", fields: { slug: "Already in use" } };
  }
  await audit(me.id, "page.update", "page", id, { slug: d.slug, status: d.status });
  revalidatePath(`/${d.slug}`);
  revalidatePath("/sitemap.xml");
  return { ok: true as const, message: d.status === "published" ? "Published." : "Saved as draft.", id };
}

export async function deletePage(id: string) {
  const me = await requireSection("pages", "admin");
  const [cur] = await db.select({ slug: pages.slug }).from(pages).where(eq(pages.id, id)).limit(1);
  if (!cur) return { ok: false, message: "Not found." };
  if (CORE_PAGES[cur.slug]) return { ok: false, message: "Core pages can't be deleted — set them to draft instead." };
  await db.delete(pages).where(eq(pages.id, id));
  await audit(me.id, "page.delete", "page", id, { slug: cur.slug });
  revalidatePath(`/${cur.slug}`);
  return { ok: true, message: "Deleted." };
}
