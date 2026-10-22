import type { Metadata } from "next";
import Listing, { ListingHeader, type SP } from "@/components/store/Listing";
import SearchBox from "@/components/store/SearchBox";

export const metadata: Metadata = { title: "Search", robots: { index: false } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";
  return (
    <>
      <ListingHeader title={q ? `“${q}”` : "Search"} crumbs={[{ label: "Home", href: "/" }, { label: "Search" }]} />
      <div className="container-x mb-8"><SearchBox initial={q} /></div>
      {q ? <Listing base="/search" sp={sp} scope={{}} /> : <p className="container-x pb-24 text-charcoal/60">Search by name, fabric, colour, occasion or SKU.</p>}
    </>
  );
}
