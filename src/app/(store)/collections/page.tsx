import type { Metadata } from "next";
import Link from "next/link";
import { getVisibleCollections } from "@/lib/catalog/queries";
import { ListingHeader } from "@/components/store/Listing";
import Img from "@/components/store/Img";

export const revalidate = 60;
export const metadata: Metadata = { title: "Collections", description: "Curated edits from DHANYA BOUTIQUE.", alternates: { canonical: "/collections" } };

export default async function CollectionsIndex() {
  const cols = await getVisibleCollections();
  return (
    <>
      <ListingHeader title="Collections" intro="Each edit is a point of view — explore the one that feels like you." crumbs={[{ label: "Home", href: "/" }, { label: "Collections" }]} />
      <div className="container-x pb-24">
        {cols.length === 0 ? <p className="py-20 text-center font-serif text-2xl">Our first collections are being curated. <Link href="/shop" className="underline">Browse all pieces</Link>.</p> : (
          <ul className="grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
            {cols.map((c, i) => (
              <li key={c.id} className={i % 3 === 1 ? "lg:mt-24" : ""}>
                <Link href={`/collections/${c.slug}`} className="group block">
                  <div className="aspect-[3/4] overflow-hidden bg-rose/40" data-reveal="mask">
                    <Img src={c.imageUrl} alt={c.title} sizes="(min-width:1024px) 33vw, 100vw" className="h-full w-full object-cover transition-transform duration-[1.4s] group-hover:scale-[1.04]" />
                  </div>
                  <h2 className="mt-5 font-serif text-3xl group-hover:text-burgundy">{c.title}</h2>
                  {c.description && <p className="mt-2 text-sm text-charcoal/65">{c.description}</p>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
