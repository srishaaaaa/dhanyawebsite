import type { Metadata } from "next";
import Listing, { ListingHeader, type SP } from "@/components/store/Listing";
import Banner from "@/components/store/home/Banner";
import { getActiveCampaigns } from "@/lib/campaigns";

export const metadata: Metadata = { title: "Shop all", description: "Every piece in the DHANYA BOUTIQUE collection.", alternates: { canonical: "/shop" } };

export default async function Shop({ searchParams }: { searchParams: Promise<SP> }) {
  const [sp, promos] = await Promise.all([searchParams, getActiveCampaigns("banner")]);
  return (
    <>
      {promos.slice(0, 1).map((p) => <Banner key={p.id} c={{ text: p.content.text, cta: p.content.href ? { label: p.content.ctaLabel || "Shop now", href: p.content.href } : undefined, tone: p.content.tone ?? "gold" }} />)}
      <ListingHeader title="Shop all" crumbs={[{ label: "Home", href: "/" }, { label: "Shop" }]} />
      <Listing base="/shop" sp={sp} scope={{}} />
    </>
  );
}
