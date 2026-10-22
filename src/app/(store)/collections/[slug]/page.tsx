import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCollection } from "@/lib/catalog/queries";
import Listing, { ListingHeader, type SP } from "@/components/store/Listing";

type P = { params: Promise<{ slug: string }>; searchParams: Promise<SP> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const c = await getCollection((await params).slug).catch(() => null);
  if (!c) return { title: "Collection not found" };
  return { title: c.title, description: c.description ?? undefined, alternates: { canonical: `/collections/${c.slug}` },
    openGraph: { title: c.title, description: c.description ?? undefined, images: c.imageUrl ? [c.imageUrl] : undefined } };
}

export default async function CollectionPage({ params, searchParams }: P) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const c = await getCollection(slug);
  if (!c) notFound();
  return (
    <>
      <ListingHeader title={c.title} intro={c.description} crumbs={[{ label: "Home", href: "/" }, { label: "Collections", href: "/collections" }, { label: c.title }]} />
      <Listing base={`/collections/${slug}`} sp={sp} scope={{ collection: slug }} />
    </>
  );
}
