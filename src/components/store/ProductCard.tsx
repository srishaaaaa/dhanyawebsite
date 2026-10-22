"use client";
import Link from "next/link";
import { useState } from "react";
import Img from "./Img";
import Price from "./Price";
import WishButton from "./WishButton";
import QuickView from "./QuickView";
import { withGst } from "@/lib/money";
import { ShoppingBag } from "lucide-react";

export type Card = {
  id: string; slug: string; name: string; price: string; compareAtPrice: string | null; gstRate: string;
  isNewArrival: boolean; isBestseller: boolean; images: { url: string; alt: string | null }[];
  colors: { name: string; hex: string | null }[]; sizes: string[]; available: number;
};

export default function ProductCard({ p, sizes = "(min-width:1024px) 25vw, 50vw", priority = false, layout = "grid" }: { p: Card; sizes?: string; priority?: boolean; layout?: "grid" | "list" }) {
  const [quick, setQuick] = useState(false);
  const price = withGst(p.price, p.gstRate);
  const compare = p.compareAtPrice ? withGst(p.compareAtPrice, p.gstRate) : null;
  const [a, b] = p.images;
  const sold = p.available <= 0;
  const off = compare && Number(compare) > Number(price) ? Math.round((1 - Number(price) / Number(compare)) * 100) : 0;
  return (
    <article className={`group relative ${layout === "list" ? "grid grid-cols-[140px_1fr] gap-5 sm:grid-cols-[200px_1fr]" : ""}`}>
      <div className="relative overflow-hidden">
      <Link href={`/products/${p.slug}`} data-cursor="VIEW" className="relative block aspect-[3/4] overflow-hidden bg-rose/40">
        <Img src={a?.url} alt={a?.alt ?? p.name} sizes={sizes} priority={priority} width={800}
          className="absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-700 ease-out group-hover:scale-[1.03]" />
        {b && <Img src={b.url} alt="" sizes={sizes} width={800}
          className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-700 group-hover:opacity-100" />}
        <span className="absolute left-3 top-3 flex flex-col gap-1">
          {sold ? <Tag>Sold out</Tag> : <>{p.isNewArrival && <Tag>New</Tag>}{p.isBestseller && <Tag>Bestseller</Tag>}{off > 0 && <Tag gold>{off}% off</Tag>}</>}
        </span>
      </Link>
        {!sold && layout === "grid" && (
          <button type="button" onClick={() => setQuick(true)} aria-label={`Quick add ${p.name} to bag`}
            className="absolute inset-x-0 bottom-0 hidden translate-y-full items-center justify-center gap-2 bg-aubergine/95 py-3.5 text-[11px] tracking-[0.24em] text-ivory transition-transform duration-500 focus-visible:translate-y-0 group-hover:translate-y-0 lg:flex">
            <ShoppingBag size={14} strokeWidth={1.4} />QUICK ADD
          </button>
        )}
      </div>
      <WishButton productId={p.id} name={p.name} className="absolute right-3 top-3 rounded-full bg-ivory/85 p-2 text-charcoal backdrop-blur transition-colors hover:bg-ivory" />
      <div className={layout === "list" ? "py-2" : "pt-3"}>
        <h3 className="font-serif text-lg leading-snug"><Link href={`/products/${p.slug}`} className="hover:text-burgundy">{p.name}</Link></h3>
        <Price price={price} compareAt={compare} className="mt-1" />
        {p.colors.length > 1 && (
          <ul className="mt-2 flex gap-1.5" aria-label={`${p.colors.length} colours`}>
            {p.colors.slice(0, 6).map((c) => <li key={c.name} title={c.name} className="h-3 w-3 rounded-full border border-charcoal/20" style={{ background: c.hex ?? "#ddd" }} />)}
          </ul>
        )}
        {p.sizes.length > 0 && <p className="mt-2 text-[11px] tracking-wide text-charcoal/55">{p.sizes.slice(0, 6).join(" · ")}</p>}
        {!sold && (
          <button type="button" onClick={() => setQuick(true)} aria-label={`Quick add ${p.name} to bag`}
            className={`mt-3 inline-flex w-full items-center justify-center gap-2 border border-aubergine/70 py-2.5 text-[11px] tracking-[0.2em] text-aubergine transition-colors hover:bg-aubergine hover:text-ivory ${layout === "grid" ? "lg:hidden" : ""}`}>
            <ShoppingBag size={14} strokeWidth={1.4} />ADD TO BAG
          </button>
        )}
      </div>
      {quick && <QuickView slug={p.slug} onClose={() => setQuick(false)} />}
    </article>
  );
}

function Tag({ children, gold }: { children: React.ReactNode; gold?: boolean }) {
  return <span className={`px-2 py-0.5 text-[11px] tracking-wide text-aubergine ${gold ? "bg-gold" : "bg-ivory/90"}`}>{children}</span>;
}
