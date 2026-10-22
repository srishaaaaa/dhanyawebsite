"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import Img from "../Img";

type Occ = { id: string; name: string; slug: string; imageUrl: string | null; description: string | null };

/** Large serif list; on desktop the occasion's image follows the cursor. */
export default function Occasions({ title, items }: { title: string; items: Occ[] }) {
  const [active, setActive] = useState<Occ | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLDivElement>(null);
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="occ-h" className="container-x py-24 sm:py-32">
      <h2 id="occ-h" className="display text-5xl sm:text-7xl mb-12" data-reveal>{title}</h2>
      <div ref={box} className="relative"
        onPointerMove={(e) => {
          if (e.pointerType !== "mouse" || !img.current || !box.current) return;
          const r = box.current.getBoundingClientRect();
          img.current.style.transform = `translate3d(${e.clientX - r.left - 140}px, ${e.clientY - r.top - 180}px, 0)`;
        }}
        onPointerLeave={() => setActive(null)}>
        <ul className="border-t border-charcoal/15">
          {items.map((o) => (
            <li key={o.id} className="border-b border-charcoal/15">
              <Link href={`/category/${o.slug}`} onPointerEnter={() => setActive(o)} onFocus={() => setActive(o)}
                className="group flex items-baseline justify-between gap-6 py-6 sm:py-8">
                <span className="font-serif text-4xl sm:text-6xl lg:text-7xl font-light transition-[color,transform] duration-500 group-hover:translate-x-4 group-hover:text-burgundy">{o.name}</span>
                {o.description && <span className="hidden md:block max-w-xs text-right text-sm text-charcoal/60">{o.description}</span>}
              </Link>
            </li>
          ))}
        </ul>
        <div ref={img} aria-hidden className={`pointer-events-none absolute left-0 top-0 hidden h-[360px] w-[280px] overflow-hidden transition-opacity duration-300 lg:block ${active?.imageUrl ? "opacity-100" : "opacity-0"}`}
          style={{ transition: "opacity .3s, transform .45s cubic-bezier(.2,.7,.2,1)" }}>
          {active?.imageUrl && <Img src={active.imageUrl} alt="" width={640} sizes="280px" className="h-full w-full object-cover" />}
        </div>
      </div>
    </section>
  );
}
