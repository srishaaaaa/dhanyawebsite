import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { auth } from "@/auth";
import { razorpayParamsFor } from "@/lib/checkout";
import { canViewOrder } from "@/lib/order-access";

export const dynamic = "force-dynamic";
const body = z.object({ orderId: z.string().uuid(), token: z.string().max(100).optional().nullable() });

/** Payment parameters to retry an unpaid online order while its stock hold is still active. */
export async function POST(req: NextRequest) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const [o] = await db.select().from(orders).where(eq(orders.id, parsed.data.orderId)).limit(1);
  const session = await auth().catch(() => null);
  if (!o || !(await canViewOrder(o, { uid: session?.user?.id ?? null, token: parsed.data.token ?? null }))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const p = await razorpayParamsFor(o.id);
  if (!p) return NextResponse.json({ error: "This order can no longer be paid online. Please place it again." }, { status: 409 });
  return NextResponse.json({ payment: p });
}
