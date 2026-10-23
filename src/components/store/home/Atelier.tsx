"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import Img from "../Img";
import Price from "../Price";
import { withGst } from "@/lib/money";
import type { Card } from "../ProductCard";

export type Room = { slug: string; name: string; products: Card[] };

// Three display plinths at different depths. Positions are layout only — each holds a real product.
const PLINTH = [
  { left: "6%", top: "14%", w: "38%", z: 60, rot: -3 },
  { left: "40%", top: "4%", w: "34%", z: 20, rot: 2 },
  { left: "62%", top: "30%", w: "32%", z: 90, rot: -1.5 },
];

/**
 * The DHANYA Atelier — a digital showroom. Pick a room (a category); its pieces float at different depths and
 * shift with the pointer (CSS 3D, no heavy WebGL). Each piece carries a hotspot that opens its real details.
 * Falls back to a flat grid on touch/reduced motion — nothing depends on the depth effect.
 */
export default function Atelier({ rooms }: { rooms: Room[] }) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0), my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 70, damping: 18 }), sy = useSpring(my, { stiffness: 70, damping: 18 });
  const rotY = useTransform(sx, [-1, 1], [-7, 7]), rotX = useTransform(sy, [-1, 1], [5, -5]);
  const lightX = useTransform(sx, [-1, 1], ["25%", "75%"]);
  const glow = useTransform(lightX, (x) => `radial-gradient(45% 55% at ${x} 35%, rgb(var(--c-gold) / .22), transparent 70%)`);
  if (!rooms.length) return null;
  const room = rooms[Math.min(active, rooms.length - 1)];

  const onMove = (e: React.PointerEvent) => {
    if (reduce || e.pointerType !== "mouse" || !stage.current) return;
    const r = stage.current.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width) * 2 - 1); my.set(((e.clientY - r.top) / r.height) * 2 - 1);
  };
  const reset = () => { mx.set(0); my.set(0); };

  return (
    <section aria-labelledby="atelier-h" className="stage grain relative isolate overflow-hidden py-24 sm:py-32">
      <motion.div aria-hidden className="pointer-events-none absolute inset-0 -z-10" style={{ background: glow }} />
      <div className="container-x">
        <p className="kicker mb-6" data-reveal>The showroom</p>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h2 id="atelier-h" className="display text-[clamp(2.8rem,6vw,6.5rem)]" data-reveal>The DHANYA <span className="editorial-italic metal-text">Atelier</span></h2>
          <p className="max-w-sm text-ivory/70" data-reveal>Step between rooms. Tap a gold point to see a piece up close.</p>
        </div>

        <div className="mt-14 grid gap-10 lg:grid-cols-[220px_1fr]">
          {/* Floating room navigation */}
          <div role="tablist" aria-label="Atelier rooms" className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:gap-1 lg:overflow-visible">
            {rooms.map((r, i) => (
              <button key={r.slug} role="tab" aria-selected={i === active} onClick={() => { setActive(i); setOpen(null); }}
                className={`group relative shrink-0 border-b px-1 py-3 text-left font-serif text-xl transition-colors lg:text-2xl ${i === active ? "border-gold text-gold" : "border-ivory/15 text-ivory/60 hover:text-ivory"}`}>
                <span className="mr-3 text-[10px] tracking-[0.3em] text-ivory/40">{String(i + 1).padStart(2, "0")}</span>{r.name}
                {i === active && <motion.span layoutId="atelier-ind" className="absolute -bottom-px left-0 h-px w-full bg-gold" />}
              </button>
            ))}
            <Link href={`/category/${room.slug}`} className="mt-4 hidden text-[11px] uppercase tracking-[0.3em] text-ivory/70 underline-offset-8 hover:text-gold hover:underline lg:block">Enter the full room →</Link>
          </div>

          {/* Stage */}
          <div ref={stage} onPointerMove={onMove} onPointerLeave={reset} className="relative" style={{ perspective: 1400 }}>
            {/* Mobile / reduced motion: a flat, scrollable row of the same pieces */}
            <div className="flex snap-x gap-4 overflow-x-auto lg:hidden [&>*]:snap-start">
              {room.products.map((p) => <FlatPiece key={p.id} p={p} />)}
            </div>

            <motion.div className="relative hidden aspect-[16/10] lg:block" style={reduce ? undefined : { rotateX: rotX, rotateY: rotY, transformStyle: "preserve-3d" }}>
              <div aria-hidden className="absolute inset-x-[4%] bottom-[2%] h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
              <div aria-hidden className="absolute inset-x-[8%] bottom-0 h-16 rounded-[50%] bg-black/40 blur-2xl" />
              <AnimatePresence mode="wait">
                <motion.div key={room.slug} className="absolute inset-0" style={{ transformStyle: "preserve-3d" }}
                  initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}>
                  {room.products.slice(0, 3).map((p, i) => {
                    const pl = PLINTH[i];
                    const hot = open === p.id;
                    return (
                      <motion.div key={p.id} className="absolute" style={{ left: pl.left, top: pl.top, width: pl.w, translateZ: pl.z, rotate: pl.rot }}
                        animate={reduce ? undefined : { y: [0, -8, 0] }} transition={{ duration: 7 + i * 1.3, repeat: Infinity, ease: "easeInOut" }}>
                        <div className="frame relative aspect-[3/4] overflow-hidden border border-gold/40 bg-plum shadow-[0_50px_80px_-30px_rgba(0,0,0,.8)]">
                          {p.images[0] && <Img src={p.images[0].url} alt={p.images[0].alt ?? p.name} sizes="30vw" width={800} className="h-full w-full object-cover" />}
                          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-plum/50 via-transparent to-transparent" />
                        </div>
                        <button onClick={() => setOpen(hot ? null : p.id)} aria-expanded={hot} aria-label={`${hot ? "Hide" : "Show"} details for ${p.name}`}
                          className="absolute left-1/2 top-[46%] z-10 -translate-x-1/2">
                          <span className="relative flex h-9 w-9 items-center justify-center">
                            <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-gold/40 motion-reduce:hidden" />
                            <span className="relative h-3.5 w-3.5 rounded-full border-2 border-plum bg-gold shadow" />
                          </span>
                        </button>
                        <AnimatePresence>
                          {hot && (
                            <motion.div initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }}
                              className="absolute -bottom-3 left-3 right-3 z-20 translate-y-full bg-ivory p-4 text-charcoal shadow-2xl sm:translate-y-0 sm:-translate-y-0" style={{ bottom: "6%" }}>
                              <Details p={p} />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Details({ p }: { p: Card }) {
  const price = withGst(p.price, p.gstRate);
  const compare = p.compareAtPrice ? withGst(p.compareAtPrice, p.gstRate) : null;
  return (
    <div>
      <p className="font-serif text-lg leading-tight">{p.name}</p>
      <Price price={price} compareAt={compare} className="mt-1 text-sm" />
      {p.colors.length > 0 && <p className="mt-1 text-xs text-charcoal/60">{p.colors.slice(0, 3).map((c) => c.name).join(" · ")}</p>}
      <Link href={`/products/${p.slug}`} className="mt-3 inline-block border-b border-gold pb-0.5 text-[11px] uppercase tracking-[0.25em] text-aubergine hover:text-gold">View piece →</Link>
    </div>
  );
}

function FlatPiece({ p }: { p: Card }) {
  return (
    <Link href={`/products/${p.slug}`} className="block w-[70%] shrink-0 sm:w-[45%]">
      <div className="frame aspect-[3/4] overflow-hidden border border-gold/40">
        {p.images[0] && <Img src={p.images[0].url} alt={p.images[0].alt ?? p.name} sizes="70vw" width={700} className="h-full w-full object-cover" />}
      </div>
      <p className="mt-3 font-serif text-lg">{p.name}</p>
      <Price price={withGst(p.price, p.gstRate)} compareAt={p.compareAtPrice ? withGst(p.compareAtPrice, p.gstRate) : null} className="text-sm text-ivory/80" />
    </Link>
  );
}
