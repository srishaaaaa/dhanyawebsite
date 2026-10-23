"use client";
import { useEffect } from "react";

/**
 * One observer for the whole page: adds .is-in to [data-reveal] elements as they enter the viewport.
 * Mask reveals are fully clipped until revealed and the browser reports clipped elements as not intersecting,
 * so for those the parent is observed and the class is applied to the child.
 */
export default function RevealObserver() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    document.documentElement.classList.add("js-reveal");
    const targets = new Map<Element, Element[]>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        for (const el of targets.get(e.target) ?? []) el.classList.add("is-in");
        targets.delete(e.target); io.unobserve(e.target);
      }
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.05 });
    const scan = () => document.querySelectorAll("[data-reveal]:not(.is-in), [data-stagger]:not(.is-in)").forEach((el) => {
      const kind = el.getAttribute("data-reveal"); const t = (kind === "mask" || kind === "mask-x") && el.parentElement ? el.parentElement : el;
      const list = targets.get(t);
      if (list) { if (!list.includes(el)) list.push(el); return; }
      targets.set(t, [el]); io.observe(t);
    });
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, []);
  return null;
}
