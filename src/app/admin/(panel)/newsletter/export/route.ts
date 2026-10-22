import { NextResponse, type NextRequest } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { newsletterSubscribers } from "@/db/schema";
import { getStaff } from "@/lib/authz";
import { toCsv } from "@/lib/csv";
import { audit } from "@/lib/audit";
import { unsubscribeLink } from "@/lib/unsubscribe";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const me = await getStaff("staff", "newsletter");
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const status = req.nextUrl.searchParams.get("status");
  const rows = await db.select().from(newsletterSubscribers)
    .where(status === "all" ? undefined : eq(newsletterSubscribers.isActive, status !== "unsubscribed")).orderBy(desc(newsletterSubscribers.consentAt));
  await audit(me.id, "newsletter.export", "newsletter", null, { rows: rows.length });
  const body = toCsv(["email", "subscribed", "consent_at", "unsubscribe_link"], rows.map((r) => ({ email: r.email, subscribed: r.isActive ? "yes" : "no", consent_at: r.consentAt, unsubscribe_link: unsubscribeLink(r.email) })));
  return new NextResponse(body, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="dhanya-subscribers-${new Date().toISOString().slice(0, 10)}.csv"`, "cache-control": "no-store" } });
}
