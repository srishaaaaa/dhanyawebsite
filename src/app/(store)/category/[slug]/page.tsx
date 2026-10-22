import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategory } from "@/lib/catalog/queries";
import Listing, { ListingHeader, type SP } from "@/components/store/Listing";

type P = { params: Promise<{ slug: string }>; searchParams: Promise<SP> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const c = await getCategory((await params).slug).catch(() => null);
  if (!c) return { title: "Category not found" };
  return { title: c.name, description: c.description ?? undefined, alternates: { canonical: `/category/${c.slug}` } };
}

export default async function CategoryPage({ params, searchParams }: P) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const c = await getCategory(slug);
  if (!c) notFound();
  return (
    <>
      <ListingHeader title={c.name} intro={c.description} crumbs={[{ label: "Home", href: "/" }, { label: "Shop", href: "/shop" }, { label: c.name }]} />
      <Listing base={`/category/${slug}`} sp={sp} scope={{ category: slug }} />
    </>
  );
}
