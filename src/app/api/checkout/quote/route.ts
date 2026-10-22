import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { readSid } from "@/lib/session-id";
import { buildQuote } from "@/lib/checkout";

export const dynamic = "force-dynamic";
const q = z.object({ couponCode: z.string().max(40).optional().nullable(), state: z.string().max(60).optional().nullable(),
  method: z.enum(["standard", "express"]).optional(), email: z.string().max(254).optional().nullable() });

/** Live order summary for the checkout page. Everything is recalculated server-side. */
export async function POST(req: NextRequest) {
  const parsed = q.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const [sid, session] = await Promise.all([readSid(), auth().catch(() => null)]);
  try {
    const r = await buildQuote({ sid, uid: session?.user?.id ?? null }, parsed.data);
    return NextResponse.json({
      lines: r.lines.map((l, i) => ({ ...l, ...r.quote.lines[i] })), quote: r.quote, couponError: r.couponError, issues: r.issues, methods: r.methods,
    }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    console.error("quote error", e);
    return NextResponse.json({ error: "Couldn't calculate your total. Check your connection and try again." }, { status: 503 });
  }
}
