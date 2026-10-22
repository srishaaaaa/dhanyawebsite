import { NextResponse, type NextRequest } from "next/server";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { stockAlerts, productVariants } from "@/db/schema";

const body = z.object({ variantId: z.string().uuid(), email: z.string().trim().toLowerCase().email().max(254), company: z.string().optional() });

/** "Email me when it's back". One pending alert per email + variant; max 20 pending per email. */
export async function POST(req: NextRequest) {
  const p = body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (p.data.company) return NextResponse.json({ ok: true }); // honeypot
  const [v] = await db.select({ id: productVariants.id }).from(productVariants).where(eq(productVariants.id, p.data.variantId)).limit(1);
  if (!v) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(stockAlerts)
    .where(and(eq(stockAlerts.email, p.data.email), isNull(stockAlerts.notifiedAt), gt(stockAlerts.createdAt, sql`now() - interval '90 days'`)));
  if (n >= 20) return NextResponse.json({ error: "You already have several alerts waiting." }, { status: 429 });
  await db.insert(stockAlerts).values({ variantId: v.id, email: p.data.email }).onConflictDoNothing();
  return NextResponse.json({ ok: true });
}
