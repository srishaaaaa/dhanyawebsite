import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { addToCart, CartError, getCart, setLineQuantity } from "@/lib/cart";
import { ensureSid, readSid } from "@/lib/session-id";
import { auth } from "@/auth";

const uidOf = async () => (await auth().catch(() => null))?.user?.id ?? null;

export const dynamic = "force-dynamic";
const add = z.object({ variantId: z.string().uuid(), quantity: z.coerce.number().int().min(1).max(10).default(1) });
const upd = z.object({ itemId: z.string().uuid(), quantity: z.coerce.number().int().min(0).max(10) });

const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "cache-control": "no-store" } });

async function respond(fn: (sid: string, uid: string | null) => Promise<void>, body: unknown, schema: z.ZodTypeAny) {
  const parsed = schema.safeParse(body);
  if (!parsed.success) return json({ error: "Invalid request." }, 400);
  const [sid, uid] = await Promise.all([ensureSid(), uidOf()]);
  try { await fn(sid, uid); }
  catch (e) {
    if (e instanceof CartError) return json({ error: e.message, cart: await getCart(sid, uid) }, 409);
    console.error("cart error", e);
    return json({ error: "Something went wrong updating your bag. Please try again." }, 500);
  }
  return json({ cart: await getCart(sid, uid) });
}

export async function GET() {
  try { return json({ cart: await getCart(await readSid(), await uidOf()) }); }
  catch (e) { console.error(e); return json({ error: "Your bag couldn't be loaded." }, 503); }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  return respond((sid, uid) => { const b = add.parse(body); return addToCart(sid, uid, b.variantId, b.quantity); }, body, add);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  return respond((sid, uid) => { const b = upd.parse(body); return setLineQuantity(sid, uid, b.itemId, b.quantity); }, body, upd);
}
