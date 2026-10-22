import "server-only";
import { and, asc, eq, gt, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { campaigns } from "@/db/schema";

export type CampaignContent = { text: string; href?: string; ctaLabel?: string; tone?: "gold" | "aubergine" | "rose" };
export type ActiveCampaign = { id: string; kind: string; content: CampaignContent };

/** Published campaigns whose schedule covers now, in display order. Never throws. */
export async function getActiveCampaigns(kind?: "announcement" | "banner"): Promise<ActiveCampaign[]> {
  try {
    const rows = await db.select({ id: campaigns.id, kind: campaigns.kind, content: campaigns.content }).from(campaigns).where(and(
      eq(campaigns.status, "published"), kind ? eq(campaigns.kind, kind) : undefined,
      or(isNull(campaigns.startsAt), lte(campaigns.startsAt, sql`now()`)), or(isNull(campaigns.endsAt), gt(campaigns.endsAt, sql`now()`)),
    )).orderBy(asc(campaigns.sortOrder), asc(campaigns.createdAt));
    return rows.map((r) => ({ ...r, content: r.content as CampaignContent })).filter((r) => r.content?.text);
  } catch (e) {
    console.error("campaigns unavailable", e);
    return [];
  }
}
