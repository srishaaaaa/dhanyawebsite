"use client";
import Link from "next/link";
import { useState } from "react";
import Img from "./Img";
import Price from "./Price";
import WishButton from "./WishButton";
import QuickView from "./QuickView";
import Tilt from "./Tilt";
import { withGst } from "@/lib/money";
import { ShoppingBag } from "lucide-react";

export type Card = {
  id: string; slug: string; name: string; price: string; compareAtPrice: string | null; gstRate: string;
  isNewArrival: boolean; isBestseller: boolean; images: { url: string; alt: string | null }[];
  colors: { name: string; hex: string | null }[]; sizes: string[]; available: number;
};

/**
 * Product card: the photograph sits in a gold-cornered mount that tilts toward the cursor (2.5D, desktop only),
 * the second image dissolves in on hover, and the price/name float slightly in front of the frame.
 */
export default function ProductCard({ p, sizes = "(min-width:1024px) 25vw, 50vw", priority = false, layout = "grid" }: { p: Card; sizes?: string; priority?: boolean; layout?: "grid" | "list" }) {
  const [quick, setQuick] = useState(false);
  const price = withGst(p.price, p.gstRate);
  const compare = p.compareAtPrice ? withGst(p.compareAtPrice, p.gstRate) : null;
  const [a, b] = p.images;
  const sold = p.available <= 0;
  const off = compare && Number(compare) > Number(price) ? Math.round((1 - Number(price) / Number(compare)) * 100) : 0;
  return (
    <article className={`group relative ${layout === "list" ? "grid grid-cols-[140px_1fr] gap-6 sm:grid-cols-[220px_1fr]" : ""}`}>
      <Tilt max={layout === "list" ? 0 : 6}>
        <div className="relative overflow-hidden">
          <Link href={`/products/${p.slug}`} data-cursor="VIEW" className="frame relative block aspect-[3/4] overflow-hidden bg-rose/40">
            <Img src={a?.url} alt={a?.alt ?? p.name} sizes={sizes} priority={priority} width={800}
              className="absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-[1.2s] ease-out group-hover:scale-[1.05]" />
            {b && <Img src={b.url} alt="" sizes={sizes} width={800}
              className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-700 group-hover:opacity-100" />}
            <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-plum/40 via-transparent to-transparent opacity-0 transition-opacity duration-700 group-hover:opacity-100" />
            <span className="absolute left-3 top-3 z-[3] flex flex-col items-start gap-1">
              {sold ? <Tag>Sold out</Tag> : <>{p.isNewArrival && <Tag>New</Tag>}{p.isBestseller && <Tag>Bestseller</Tag>}{off > 0 && <Tag gold>{off}% off</Tag>}</>}
            </span>
          </Link>
          {!sold && layout === "grid" && (
            <button type="button" onClick={() => setQuick(true)} aria-label={`Quick add ${p.name} to bag`}
              className="absolute inset-x-0 bottom-0 z-[4] hidden translate-y-full items-center justify-center gap-2 bg-plum/95 py-4 text-[11px] uppercase tracking-[0.28em] text-ivory backdrop-blur transition-transform duration-700 [transition-timing-function:var(--ease-curtain)] hover:text-gold focus-visible:translate-y-0 group-hover:translate-y-0 lg:flex">
              <ShoppingBag size={14} strokeWidth={1.3} />Quick add
            </button>
          )}
        </div>
      </Tilt>
      <WishButton productId={p.id} name={p.name} className="absolute right-3 top-3 z-[5] rounded-full bg-ivory/85 p-2 text-charcoal backdrop-blur transition-all duration-500 hover:scale-110 hover:bg-ivory" />
      <div className={layout === "list" ? "py-2" : "pt-4"}>
        <h3 className="font-serif text-[1.35rem] font-light leading-snug"><Link href={`/products/${p.slug}`} className="transition-colors hover:text-burgundy">{p.name}</Link></h3>
        <Price price={price} compareAt={compare} className="mt-1.5" />
        {p.colors.length > 1 && (
          <ul className="mt-3 flex gap-1.5" aria-label={`${p.colors.length} colours`}>
            {p.colors.slice(0, 6).map((c) => <li key={c.name} title={c.name} className="h-3 w-3 rounded-full border border-charcoal/20 transition-transform duration-300 hover:scale-125" style={{ background: c.hex ?? "#ddd" }} />)}
          </ul>
        )}
        {p.sizes.length > 0 && <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-charcoal/50">{p.sizes.slice(0, 6).join(" · ")}</p>}
        {!sold && (
          <button type="button" onClick={() => setQuick(true)} aria-label={`Quick add ${p.name} to bag`}
            className={`btn-outline mt-4 w-full py-3 ${layout === "grid" ? "lg:hidden" : ""}`}>
            <ShoppingBag size={14} strokeWidth={1.3} />Add to bag
          </button>
        )}
      </div>
      {quick && <QuickView slug={p.slug} onClose={() => setQuick(false)} />}
    </article>
  );
}

function Tag({ children, gold }: { children: React.ReactNode; gold?: boolean }) {
  return <span className={`px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-plum ${gold ? "bg-gold" : "bg-ivory/90"}`}>{children}</span>;
}
