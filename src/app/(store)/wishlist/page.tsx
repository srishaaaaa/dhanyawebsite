import type { Metadata } from "next";
import PageHero from "@/components/store/PageHero";
import Link from "next/link";
import { readSid } from "@/lib/session-id";
import { wishlistIds } from "@/lib/wishlist";
import { getCustomer } from "@/lib/customer";
import { getCardsByIds } from "@/lib/catalog/queries";
import ProductCard from "@/components/store/ProductCard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Wishlist", robots: { index: false } };

export default async function Wishlist() {
  const [sid, me] = await Promise.all([readSid(), getCustomer()]);
  const ids = await wishlistIds(sid, me?.id ?? null);
  const items = await getCardsByIds(ids);
  return (
    <>
    <PageHero compact kicker="Saved for later" title="Wishlist" />
    <div className="container-x py-14 pb-24">
      <p className="text-sm text-charcoal/60">{me ? "Saved to your account." : <>Saved on this device. <Link href="/account/login?next=/wishlist" className="underline">Sign in</Link> to keep it across devices.</>}</p>
      {items.length === 0 ? (
        <div className="py-20 text-center">
          <p className="font-serif text-5xl font-light text-aubergine">Nothing saved yet</p>
          <p className="mt-3 text-charcoal/60">Tap the heart on any piece to keep it here.</p>
          <Link href="/shop" className="btn-primary mt-8">Explore the collection</Link>
        </div>
      ) : (
        <ul className="mt-10 grid grid-cols-2 gap-x-5 gap-y-12 lg:grid-cols-4">{items.map((p) => <li key={p.id}><ProductCard p={p} /></li>)}</ul>
      )}
    </div>
    </>
  );
}
