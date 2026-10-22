import "server-only";
import { and, asc, eq, isNull, lte, gt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { homepageSections, storeSettings } from "@/db/schema";
import { DEFAULTS, DEFAULT_ORDER, SECTION_SCHEMAS, type DraftSection, type Section, type SectionType } from "@/lib/homepage-schema";

export * from "@/lib/homepage-schema";

const known = (t: string): t is SectionType => t in SECTION_SCHEMAS;
const withDefaults = (s: { id: string; type: SectionType; content: unknown }) =>
  ({ id: s.id, type: s.type, content: { ...DEFAULTS[s.type], ...(s.content as object) } }) as Section;

export function defaultLayout(): Section[] {
  return DEFAULT_ORDER.map((type) => ({ id: type, type, content: DEFAULTS[type] }) as Section);
}

/** Live homepage: published, visible, within schedule. Falls back to the default layout if nothing is published yet. */
export async function getHomepage(): Promise<Section[]> {
  try {
    const rows = await db.select().from(homepageSections).where(and(
      eq(homepageSections.status, "published"), eq(homepageSections.isVisible, true),
      or(isNull(homepageSections.publishAt), lte(homepageSections.publishAt, sql`now()`)),
      or(isNull(homepageSections.unpublishAt), gt(homepageSections.unpublishAt, sql`now()`)),
    )).orderBy(asc(homepageSections.sortOrder));
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(homepageSections);
    if (n > 0) return rows.filter((r) => known(r.type)).map((r) => withDefaults({ id: r.id, type: r.type as SectionType, content: r.content }));
  } catch (e) {
    console.error("homepage sections unavailable", e);
  }
  return defaultLayout();
}

/** All published rows (any visibility/schedule) in builder format. */
export async function getPublishedDraftShape(): Promise<DraftSection[]> {
  const rows = await db.select().from(homepageSections).orderBy(asc(homepageSections.sortOrder));
  if (!rows.length) return defaultLayout().map((s) => ({ id: crypto.randomUUID(), type: s.type, content: s.content as Record<string, unknown>, isVisible: true, publishAt: null, unpublishAt: null }));
  return rows.filter((r) => known(r.type)).map((r) => ({
    id: r.id, type: r.type as SectionType, content: { ...DEFAULTS[r.type as SectionType], ...(r.content as object) }, isVisible: r.isVisible,
    publishAt: r.publishAt?.toISOString() ?? null, unpublishAt: r.unpublishAt?.toISOString() ?? null,
  }));
}

/** The builder's working copy (unpublished edits), or the published layout if there's no draft. */
export async function getDraft(): Promise<{ sections: DraftSection[]; hasDraft: boolean; savedAt: string | null }> {
  const [row] = await db.select().from(storeSettings).where(eq(storeSettings.key, "homepage_draft")).limit(1);
  const v = row?.value as { sections?: DraftSection[] } | undefined;
  if (v?.sections) return { sections: v.sections.filter((s) => known(s.type)), hasDraft: true, savedAt: row!.updatedAt.toISOString() };
  return { sections: await getPublishedDraftShape(), hasDraft: false, savedAt: null };
}

/** Draft as it would render now (preview): visible + within schedule. */
export async function getDraftForPreview(): Promise<Section[]> {
  const { sections } = await getDraft();
  const now = Date.now();
  return sections.filter((s) => s.isVisible && (!s.publishAt || Date.parse(s.publishAt) <= now) && (!s.unpublishAt || Date.parse(s.unpublishAt) > now))
    .map((s) => withDefaults({ id: s.id, type: s.type, content: s.content }));
}
