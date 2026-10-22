import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProduct } from "@/lib/catalog/queries";
import ProductView from "@/components/store/ProductView";

export const revalidate = 60;
type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const p = await getProduct({ slug: (await params).slug }).catch(() => null);
  if (!p) return { title: "Product not found" };
  const description = p.seoDescription ?? p.description?.replace(/[*#_[\]()]/g, "").slice(0, 160) ?? undefined;
  return {
    title: p.seoTitle ?? p.name, description, alternates: { canonical: `/products/${p.slug}` },
    openGraph: { title: p.seoTitle ?? p.name, description, type: "website", images: p.images.slice(0, 3).map((i) => ({ url: i.url, alt: i.altText ?? p.name })) },
  };
}

export default async function ProductPage({ params }: P) {
  const p = await getProduct({ slug: (await params).slug });
  if (!p) notFound();
  return <ProductView p={p} />;
}
