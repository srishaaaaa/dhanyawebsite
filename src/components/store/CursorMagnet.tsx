"use client";
import { useEffect, useRef } from "react";

/**
 * Desktop-only polish. Contextual cursor: any element with data-cursor="LABEL" shows that label in a gold lens
 * (the native cursor stays visible). Magnetic pull: elements with data-magnet drift a few px toward the pointer.
 * Inactive on touch / coarse pointers and under reduced motion.
 */
export default function CursorMagnet() {
  const ring = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!fine || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ring.current!; el.style.display = "flex";
    let x = 0, y = 0, tx = 0, ty = 0, raf = 0, magnet: HTMLElement | null = null;
    const loop = () => { x += (tx - x) * 0.22; y += (ty - y) * 0.22; el.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%)`; raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    const move = (e: PointerEvent) => {
      tx = e.clientX; ty = e.clientY;
      const t = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-cursor]");
      const label = t?.dataset.cursor ?? "";
      el.textContent = label; el.classList.toggle("has-label", Boolean(label));
      const m = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-magnet]") ?? null;
      if (magnet && magnet !== m) magnet.style.transform = "";
      magnet = m;
      if (m) { const r = m.getBoundingClientRect(); m.style.transform = `translate(${(e.clientX - (r.left + r.width / 2)) * 0.18}px,${(e.clientY - (r.top + r.height / 2)) * 0.18}px)`; m.style.transition = "transform .2s ease-out"; }
    };
    const leave = () => { el.classList.remove("has-label"); el.textContent = ""; if (magnet) magnet.style.transform = ""; };
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", leave);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("pointermove", move); document.removeEventListener("pointerleave", leave); };
  }, []);
  return <div ref={ring} aria-hidden className="db-cursor" style={{ display: "none" }} />;
}
