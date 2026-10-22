"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { z } from "zod";
import { db } from "@/db";
import { campaigns } from "@/db/schema";
import { requireSection } from "@/lib/authz";
import { audit } from "@/lib/audit";

const link = z.string().trim().max(300).refine((v) => v === "" || v.startsWith("/") || v.startsWith("https://"), "Use /path or https:// link");
const dt = z.union([z.literal(""), z.null(), z.undefined(), z.string()]).transform((v) => (v ? new Date(`${v}:00+05:30`) : null));
const input = z.object({
  id: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(2, "Name it so you can find it later").max(80),
  kind: z.enum(["announcement", "banner"]),
  text: z.string().trim().min(2, "Add the message").max(160), href: link.optional().default(""), ctaLabel: z.string().trim().max(30).optional().default(""),
  tone: z.enum(["gold", "aubergine", "rose"]).default("aubergine"),
  startsAt: dt, endsAt: dt, status: z.enum(["draft", "published"]),
}).refine((c) => !c.startsAt || !c.endsAt || c.endsAt > c.startsAt, { path: ["endsAt"], message: "Must be after the start" });

export async function saveCampaign(raw: unknown) {
  const me = await requireSection("campaigns");
  const p = input.safeParse(raw);
  if (!p.success) return { ok: false, message: "Please fix the highlighted fields.", fields: Object.fromEntries(p.error.issues.map((i) => [i.path.join("."), i.message])) };
  const { id, text, href, ctaLabel, tone, ...rest } = p.data;
  const row = { ...rest, content: { text, href: href || undefined, ctaLabel: ctaLabel || undefined, tone }, updatedAt: new Date() };
  if (id) await db.update(campaigns).set(row).where(eq(campaigns.id, id));
  else await db.insert(campaigns).values(row);
  await audit(me.id, id ? "campaign.update" : "campaign.create", "campaign", id ?? null, { title: rest.title, status: rest.status });
  revalidatePath("/", "layout");
  return { ok: true, message: rest.status === "published" ? "Saved and live within its schedule." : "Saved as draft." };
}

export async function deleteCampaign(id: string) {
  const me = await requireSection("campaigns");
  await db.delete(campaigns).where(eq(campaigns.id, id));
  await audit(me.id, "campaign.delete", "campaign", id);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function reorderCampaigns(ids: string[]) {
  await requireSection("campaigns");
  if (!ids.length || !ids.every((x) => /^[0-9a-f-]{36}$/i.test(x))) return { ok: false };
  const stmts: BatchItem<"pg">[] = ids.map((id, i) => db.update(campaigns).set({ sortOrder: i * 10 }).where(eq(campaigns.id, id)));
  await db.batch(stmts as [BatchItem<"pg">, ...BatchItem<"pg">[]]);
  revalidatePath("/", "layout");
  return { ok: true };
}
