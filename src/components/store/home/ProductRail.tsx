"use client";
import Link from "next/link";
import { useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import ProductCard, { type Card } from "../ProductCard";

/** Horizontal, swipeable/draggable product showcase. */
export default function ProductRail({ title, intro, products, href }: { title: string; intro?: string; products: Card[]; href: string }) {
  const rail = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  if (products.length === 0) return null;
  const by = (dir: number) => rail.current?.scrollBy({ left: dir * rail.current.clientWidth * 0.8, behavior: "smooth" });

  return (
    <section aria-labelledby={`rail-${title}`} className="py-20 sm:py-28">
      <div className="container-x mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h2 id={`rail-${title}`} className="display text-5xl sm:text-6xl" data-reveal>{title}</h2>
          {intro && <p className="mt-3 text-charcoal/65">{intro}</p>}
        </div>
        <div className="flex items-center gap-3">
          <Link href={href} className="nav-link mr-4 text-xs tracking-[0.2em]">VIEW ALL</Link>
          <button onClick={() => by(-1)} aria-label="Scroll left" className="rounded-full border border-charcoal/25 p-3 hover:border-aubergine"><ArrowLeft size={16} strokeWidth={1.4} /></button>
          <button onClick={() => by(1)} aria-label="Scroll right" className="rounded-full border border-charcoal/25 p-3 hover:border-aubergine"><ArrowRight size={16} strokeWidth={1.4} /></button>
        </div>
      </div>
      <div ref={rail} tabIndex={0} aria-label={`${title} — scroll horizontally`}
        className="rail flex gap-5 overflow-x-auto scroll-pl-5 px-5 pb-2 sm:scroll-pl-10 sm:px-10 cursor-grab active:cursor-grabbing"
        onPointerDown={(e) => { if (e.pointerType !== "mouse") return; drag.current = { x: e.clientX, left: rail.current!.scrollLeft, moved: false }; }}
        onPointerMove={(e) => { const d = drag.current; if (!d) return; const dx = e.clientX - d.x; if (Math.abs(dx) > 4) d.moved = true; rail.current!.scrollLeft = d.left - dx; }}
        onPointerUp={() => { setTimeout(() => (drag.current = null), 0); }}
        onPointerLeave={() => (drag.current = null)}
        onClickCapture={(e) => { if (drag.current?.moved) { e.preventDefault(); e.stopPropagation(); } }}>
        {products.map((p, i) => (
          <div key={p.id} className="w-[72vw] shrink-0 sm:w-[42vw] lg:w-[23vw] xl:w-[19vw]">
            <ProductCard p={p} sizes="(min-width:1024px) 23vw, 72vw" priority={i < 2} />
          </div>
        ))}
      </div>
    </section>
  );
}
