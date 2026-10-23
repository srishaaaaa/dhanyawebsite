"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

type Fly = { id: number; src: string; x: number; y: number; tx: number; ty: number };

/** A small product thumbnail glides from the Add-to-bag button into the bag icon. Purely decorative (aria-hidden). */
export default function FlyToCart() {
  const [flies, setFlies] = useState<Fly[]>([]);
  const reduce = useReducedMotion();
  useEffect(() => {
    let n = 0;
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ src: string; x: number; y: number }>).detail;
      const t = document.querySelector("[data-cart-target]")?.getBoundingClientRect();
      if (reduce || !t) return;
      const id = ++n;
      setFlies((f) => [...f, { id, src: d.src, x: d.x, y: d.y, tx: t.left + t.width / 2, ty: t.top + t.height / 2 }]);
      setTimeout(() => setFlies((f) => f.filter((x) => x.id !== id)), 1100);
    };
    window.addEventListener("dhanya:fly", on);
    return () => window.removeEventListener("dhanya:fly", on);
  }, [reduce]);
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[90]">
      <AnimatePresence>
        {flies.map((f) => (
          // eslint-disable-next-line @next/next/no-img-element
          <motion.img key={f.id} src={f.src} alt="" className="absolute h-16 w-12 -translate-x-1/2 -translate-y-1/2 border border-gold object-cover shadow-xl"
            initial={{ left: f.x, top: f.y, scale: 1, opacity: 1 }} animate={{ left: f.tx, top: f.ty, scale: 0.2, opacity: 0.6 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: [0.5, 0, 0.2, 1] }} />
        ))}
      </AnimatePresence>
    </div>
  );
}
