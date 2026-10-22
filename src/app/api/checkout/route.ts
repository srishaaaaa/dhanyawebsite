import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { readSid } from "@/lib/session-id";
import { placeOrder } from "@/lib/checkout";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const [sid, session] = await Promise.all([readSid(), auth().catch(() => null)]);
  try {
    const res = await placeOrder(body, { sid, uid: session?.user?.id ?? null });
    return NextResponse.json(res, { status: res.ok ? 200 : 422, headers: { "cache-control": "no-store" } });
  } catch (e) {
    console.error("checkout error", e);
    return NextResponse.json({ ok: false, error: "We couldn't place your order. You haven't been charged — please try again." }, { status: 500 });
  }
}
