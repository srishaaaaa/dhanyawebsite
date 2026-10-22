import "server-only";
import { and, eq, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { pages } from "@/db/schema";

export const CORE_PAGES: Record<string, string> = {
  about: "Our story", contact: "Contact us", faq: "Frequently asked questions", "size-guide": "Size guide",
  "shipping-policy": "Shipping and delivery", returns: "Returns and exchanges", privacy: "Privacy policy", terms: "Terms and conditions",
};

export async function getPublishedPage(slug: string) {
  try {
    const [p] = await db.select().from(pages).where(and(
      eq(pages.slug, slug), eq(pages.status, "published"), or(isNull(pages.publishAt), lte(pages.publishAt, sql`now()`)),
    )).limit(1);
    return p ?? null;
  } catch (e) {
    console.error("page lookup failed", e);
    return null;
  }
}

export async function getPublishedSlugs() {
  try {
    return await db.select({ slug: pages.slug, updatedAt: pages.updatedAt }).from(pages)
      .where(and(eq(pages.status, "published"), or(isNull(pages.publishAt), lte(pages.publishAt, sql`now()`))));
  } catch { return []; }
}
