import { NextResponse, type NextRequest } from "next/server";
import { getCardsByIds } from "@/lib/catalog/queries";

export async function GET(req: NextRequest) {
  const ids = (req.nextUrl.searchParams.get("ids") ?? "").split(",").filter((x) => /^[0-9a-f-]{36}$/i.test(x)).slice(0, 12);
  try { return NextResponse.json({ cards: await getCardsByIds(ids) }, { headers: { "cache-control": "public, s-maxage=30" } }); }
  catch { return NextResponse.json({ cards: [] }, { status: 503 }); }
}
