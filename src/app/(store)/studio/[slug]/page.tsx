import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProduct } from "@/lib/catalog/queries";
import StudioView from "@/components/store/studio/StudioView";

export const revalidate = 60;
type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const p = await getProduct({ slug: (await params).slug }).catch(() => null);
  return { title: p ? `${p.name} — 3D Studio` : "Studio", alternates: p ? { canonical: `/studio/${p.slug}` } : undefined };
}

export default async function StudioPage({ params }: P) {
  const p = await getProduct({ slug: (await params).slug });
  if (!p) notFound();
  return (
    <StudioView modelUrl={p.model3dUrl}
      product={{ id: p.id, slug: p.slug, name: p.name, price: p.price, compareAtPrice: p.compareAtPrice, gstRate: p.gstRate,
        images: p.images.map((i) => ({ url: i.url, altText: i.altText, colorName: i.colorName })), variants: p.variants }} />
  );
}
