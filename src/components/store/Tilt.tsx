"use client";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * 2.5D depth wrapper. On fine pointers the child tilts toward the cursor inside a perspective box and a soft light
 * follows the pointer (CSS variables only, one rAF per move). Touch devices and reduced motion render it inert.
 * Children can opt into extra depth with `data-lift` (translateZ via CSS).
 */
export default function Tilt({ children, className = "", max = 7, as: Tag = "div" }: { children: ReactNode; className?: string; max?: number; as?: "div" | "li" | "article" }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        el.style.setProperty("--ry", `${((px - 0.5) * 2 * max).toFixed(2)}deg`);
        el.style.setProperty("--rx", `${((0.5 - py) * 2 * max).toFixed(2)}deg`);
        el.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
        el.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
      });
    };
    const leave = () => { cancelAnimationFrame(raf); el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg"); };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => { cancelAnimationFrame(raf); el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); };
  }, [max]);
  const T = Tag as "div";
  return <T ref={ref} className={`tilt ${className}`}><div className="tilt-inner">{children}</div></T>;
}
