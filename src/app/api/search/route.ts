import { NextResponse, type NextRequest } from "next/server";
import { searchSuggestions } from "@/lib/catalog/queries";
import { withGst } from "@/lib/money";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 80);
  try {
    const rows = await searchSuggestions(q);
    return NextResponse.json({ results: rows.map((r) => ({ slug: r.slug, name: r.name, image: r.image, price: withGst(r.price, r.gstRate) })) },
      { headers: { "cache-control": "public, s-maxage=30, stale-while-revalidate=120" } });
  } catch {
    return NextResponse.json({ results: [] }, { status: 503 });
  }
}
