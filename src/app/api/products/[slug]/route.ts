import { NextResponse } from "next/server";
import { getProduct } from "@/lib/catalog/queries";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const p = await getProduct({ slug });
    if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({
      id: p.id, slug: p.slug, name: p.name, price: p.price, compareAtPrice: p.compareAtPrice, gstRate: p.gstRate,
      images: p.images.map((i) => ({ url: i.url, altText: i.altText, colorName: i.colorName })), variants: p.variants,
    }, { headers: { "cache-control": "public, s-maxage=15, stale-while-revalidate=60" } });
  } catch {
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }
}
