"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import ProductCard, { type Card } from "../ProductCard";

/** Horizontal, swipeable/draggable product runway with a progress line; arrow keys scroll it when focused. */
export default function ProductRail({ title, intro, products, href }: { title: string; intro?: string; products: Card[]; href: string }) {
  const rail = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const [p, setP] = useState(0);
  useEffect(() => {
    const el = rail.current; if (!el) return;
    const on = () => setP(el.scrollWidth > el.clientWidth ? el.scrollLeft / (el.scrollWidth - el.clientWidth) : 0);
    on(); el.addEventListener("scroll", on, { passive: true });
    return () => el.removeEventListener("scroll", on);
  }, [products.length]);
  if (products.length === 0) return null;
  const by = (dir: number) => rail.current?.scrollBy({ left: dir * rail.current.clientWidth * 0.8, behavior: "smooth" });

  return (
    <section aria-labelledby={`rail-${title}`} className="overflow-hidden py-24 sm:py-32">
      <div className="container-x mb-14 flex flex-wrap items-end justify-between gap-8">
        <div>
          <p className="kicker mb-6" data-reveal>The runway</p>
          <h2 id={`rail-${title}`} className="display text-[clamp(2.8rem,6vw,6.5rem)] text-aubergine" data-reveal>{title}</h2>
          {intro && <p className="mt-4 max-w-md text-charcoal/65" data-reveal>{intro}</p>}
        </div>
        <div className="flex items-center gap-3">
          <Link href={href} className="nav-link mr-5 text-[11px] uppercase tracking-[0.26em]">View all</Link>
          <button onClick={() => by(-1)} aria-label="Scroll left" className="rounded-full border border-charcoal/25 p-3.5 transition-colors hover:border-gold hover:bg-gold/15"><ArrowLeft size={16} strokeWidth={1.3} /></button>
          <button onClick={() => by(1)} aria-label="Scroll right" className="rounded-full border border-charcoal/25 p-3.5 transition-colors hover:border-gold hover:bg-gold/15"><ArrowRight size={16} strokeWidth={1.3} /></button>
        </div>
      </div>
      <div ref={rail} tabIndex={0} role="region" aria-label={`${title} — scroll horizontally`}
        onKeyDown={(e) => { if (e.key === "ArrowRight") { e.preventDefault(); by(0.5); } if (e.key === "ArrowLeft") { e.preventDefault(); by(-0.5); } }}
        className="rail flex cursor-grab gap-7 overflow-x-auto scroll-pl-5 px-5 pb-4 active:cursor-grabbing sm:scroll-pl-10 sm:px-10 lg:scroll-pl-14 lg:px-14"
        onPointerDown={(e) => { if (e.pointerType !== "mouse") return; drag.current = { x: e.clientX, left: rail.current!.scrollLeft, moved: false }; }}
        onPointerMove={(e) => { const d = drag.current; if (!d) return; const dx = e.clientX - d.x; if (Math.abs(dx) > 4) d.moved = true; rail.current!.scrollLeft = d.left - dx; }}
        onPointerUp={() => { setTimeout(() => (drag.current = null), 0); }}
        onPointerLeave={() => (drag.current = null)}
        onClickCapture={(e) => { if (drag.current?.moved) { e.preventDefault(); e.stopPropagation(); } }}>
        {products.map((pr, i) => (
          <div key={pr.id} className={`w-[72vw] shrink-0 sm:w-[42vw] lg:w-[23vw] xl:w-[19vw] ${i % 2 ? "lg:mt-12" : ""}`}>
            <ProductCard p={pr} sizes="(min-width:1024px) 23vw, 72vw" priority={i < 2} />
          </div>
        ))}
      </div>
      <div className="container-x mt-8"><div aria-hidden className="h-px bg-charcoal/15"><div className="h-full origin-left bg-gold transition-transform duration-300" style={{ transform: `scaleX(${Math.max(0.08, p)})` }} /></div></div>
    </section>
  );
}
