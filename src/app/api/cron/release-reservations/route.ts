import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/db";
import { releaseExpiredSql } from "@/lib/orders-sql";
import { notifyBackInStock } from "@/lib/stock-alerts";

export const dynamic = "force-dynamic";

/** Cancels unpaid online orders past their hold and returns their stock. Run by Vercel Cron (see vercel.json). */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const got = req.headers.get("authorization") ?? "";
  const want = `Bearer ${secret}`;
  if (!secret || got.length !== want.length || !timingSafeEqual(Buffer.from(got), Buffer.from(want))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const res = await db.execute<{ cancelled: number }>(releaseExpiredSql());
  const alerts = await notifyBackInStock(); // released stock may satisfy waiting shoppers
  return NextResponse.json({ ok: true, cancelled: res.rows[0]?.cancelled ?? 0, backInStockEmails: alerts });
}
