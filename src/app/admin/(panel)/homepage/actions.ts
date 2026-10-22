"use server";
import { revalidatePath } from "next/cache";
import { eq, notInArray } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { z } from "zod";
import { db } from "@/db";
import { homepageSections, storeSettings } from "@/db/schema";
import { requireSection } from "@/lib/authz";
import { audit } from "@/lib/audit";
import { SECTION_SCHEMAS, validateSection, type DraftSection, type SectionType } from "@/lib/homepage-schema";
import { getDraft } from "@/lib/homepage";

type Stmt = BatchItem<"pg">;
const draftShape = z.array(z.object({
  id: z.string().uuid(), type: z.enum(Object.keys(SECTION_SCHEMAS) as [SectionType, ...SectionType[]]), content: z.record(z.unknown()),
  isVisible: z.boolean(), publishAt: z.string().datetime().nullable(), unpublishAt: z.string().datetime().nullable(),
})).max(30);

function errorsFor(sections: DraftSection[]) {
  const out: Record<string, Record<string, string>> = {};
  for (const s of sections) {
    const v = validateSection(s.type, s.content);
    if (!v.ok) out[s.id] = v.errors;
    if (s.publishAt && s.unpublishAt && Date.parse(s.unpublishAt) <= Date.parse(s.publishAt)) out[s.id] = { ...(out[s.id] ?? {}), unpublishAt: "Must be after the start" };
  }
  return out;
}

export async function saveDraft(raw: unknown) {
  const me = await requireSection("homepage");
  const p = draftShape.safeParse(raw);
  if (!p.success) return { ok: false, message: "The draft couldn't be read. Reload and try again.", errors: {} };
  const value = { sections: p.data, by: me.id };
  await db.insert(storeSettings).values({ key: "homepage_draft", value }).onConflictDoUpdate({ target: storeSettings.key, set: { value, updatedAt: new Date() } });
  return { ok: true, message: "Draft saved.", errors: errorsFor(p.data as DraftSection[]), savedAt: new Date().toISOString() };
}

export async function publishHomepage() {
  const me = await requireSection("homepage");
  const { sections, hasDraft } = await getDraft();
  if (!hasDraft) return { ok: false, message: "There are no unpublished changes.", errors: {} };
  const errors = errorsFor(sections);
  if (Object.keys(errors).length) return { ok: false, message: "Some sections need attention before publishing.", errors };
  const stmts: Stmt[] = [];
  const ids = sections.map((s) => s.id);
  stmts.push(ids.length ? db.delete(homepageSections).where(notInArray(homepageSections.id, ids)) : db.delete(homepageSections));
  sections.forEach((s, i) => {
    const content = validateSection(s.type, s.content);
    const row = {
      type: s.type, content: content.ok ? content.content : s.content, sortOrder: i * 10, isVisible: s.isVisible, status: "published" as const,
      publishAt: s.publishAt ? new Date(s.publishAt) : null, unpublishAt: s.unpublishAt ? new Date(s.unpublishAt) : null, updatedAt: new Date(),
    };
    stmts.push(db.insert(homepageSections).values({ id: s.id, ...row }).onConflictDoUpdate({ target: homepageSections.id, set: row }));
  });
  stmts.push(db.delete(storeSettings).where(eq(storeSettings.key, "homepage_draft")));
  await db.batch(stmts as [Stmt, ...Stmt[]]); // all-or-nothing
  await audit(me.id, "homepage.publish", "homepage", null, { sections: sections.length });
  revalidatePath("/");
  revalidatePath("/admin/homepage");
  return { ok: true, message: "Published. The homepage is live with your changes.", errors: {} };
}

export async function discardDraft() {
  const me = await requireSection("homepage");
  await db.delete(storeSettings).where(eq(storeSettings.key, "homepage_draft"));
  await audit(me.id, "homepage.discard_draft", "homepage", null);
  revalidatePath("/admin/homepage");
  return { ok: true, message: "Draft discarded — showing the live homepage." };
}

