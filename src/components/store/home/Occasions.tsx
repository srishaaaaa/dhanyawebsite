"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import Img from "../Img";

type Occ = { id: string; name: string; slug: string; imageUrl: string | null; description: string | null };

/** Discover your style: a dark gallery index. Each line is a real category; on desktop its photograph follows the cursor. */
export default function Occasions({ title, items }: { title: string; items: Occ[] }) {
  const [active, setActive] = useState<Occ | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLDivElement>(null);
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="occ-h" className="stage grain overflow-hidden py-28 sm:py-40">
      <div className="container-x">
        <p className="kicker mb-6" data-reveal>Discover your style</p>
        <h2 id="occ-h" className="display mb-16 text-[clamp(3rem,7.5vw,8rem)]" data-reveal>{title}</h2>
        <div ref={box} className="relative"
          onPointerMove={(e) => {
            if (e.pointerType !== "mouse" || !img.current || !box.current) return;
            const r = box.current.getBoundingClientRect();
            img.current.style.transform = `translate3d(${e.clientX - r.left - 150}px, ${e.clientY - r.top - 200}px, 0) rotate(${((e.clientX - r.left) / r.width - 0.5) * 6}deg)`;
          }}
          onPointerLeave={() => setActive(null)}>
          <ul className="border-t border-ivory/15" data-stagger>
            {items.map((o, i) => (
              <li key={o.id} className="border-b border-ivory/15">
                <Link href={`/category/${o.slug}`} onPointerEnter={() => setActive(o)} onFocus={() => setActive(o)} onBlur={() => setActive(null)}
                  className="group flex items-baseline gap-6 py-7 sm:py-9">
                  <span aria-hidden className="w-10 text-[11px] tracking-[0.3em] text-gold">{String(i + 1).padStart(2, "0")}</span>
                  <span className="flex-1 font-serif text-4xl font-light transition-[color,transform] duration-700 [transition-timing-function:var(--ease-silk)] group-hover:translate-x-6 group-hover:text-gold sm:text-6xl lg:text-8xl">{o.name}</span>
                  {o.description && <span className="hidden max-w-xs text-right text-sm text-ivory/55 md:block">{o.description}</span>}
                  <span aria-hidden className="hidden text-2xl text-gold opacity-0 transition-opacity duration-500 group-hover:opacity-100 sm:block">→</span>
                </Link>
              </li>
            ))}
          </ul>
          <div ref={img} aria-hidden className={`frame pointer-events-none absolute left-0 top-0 z-10 hidden h-[400px] w-[300px] overflow-hidden transition-opacity duration-300 lg:block ${active?.imageUrl ? "opacity-100" : "opacity-0"}`}
            style={{ transition: "opacity .3s, transform .55s cubic-bezier(.2,.7,.2,1)" }}>
            {active?.imageUrl && <Img src={active.imageUrl} alt="" width={640} sizes="300px" className="h-full w-full object-cover" />}
          </div>
        </div>
      </div>
    </section>
  );
}
