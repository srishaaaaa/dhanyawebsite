"use client";
import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Scroll choreography for the homepage. Scrubbed (never pinned, native scrolling untouched), one shared timing language,
 * everything created inside a gsap.context so it is fully reverted on unmount. Skipped entirely for reduced motion.
 *  [data-hero-copy]   hero type drifts up and fades as the camera dollies through the arch
 *  [data-curtain]     silk curtain edge rises over the hero's lower edge
 *  [data-depth]       layered parallax at per-element rates
 *  [data-slide]       oversized words slide in opposite directions (typography transformation)
 *  [data-zoom]        images settle from 1.18x → 1x inside their masks
 */
export default function HomeMotion() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      const hero = document.querySelector<HTMLElement>("[data-hero]");
      if (hero) {
        gsap.to("[data-hero-copy]", { yPercent: -14, opacity: 0.0, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "70% top", scrub: true } });
        gsap.fromTo("[data-curtain]", { yPercent: 0 }, { yPercent: -70, ease: "none", scrollTrigger: { trigger: hero, start: "35% top", end: "bottom top", scrub: true } });
      }
      gsap.utils.toArray<HTMLElement>("[data-depth]").forEach((el) => {
        const d = parseFloat(el.dataset.depth || "0.1");
        gsap.fromTo(el, { yPercent: d * 30 }, { yPercent: d * -30, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 0.6 } });
      });
      gsap.utils.toArray<HTMLElement>("[data-slide]").forEach((el) => {
        const dir = el.dataset.slide === "r" ? 1 : -1;
        gsap.fromTo(el, { xPercent: dir * -6 }, { xPercent: dir * 6, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 0.8 } });
      });
      gsap.utils.toArray<HTMLElement>("[data-zoom]").forEach((el) => {
        gsap.fromTo(el, { scale: 1.18 }, { scale: 1, ease: "none", scrollTrigger: { trigger: el.parentElement ?? el, start: "top bottom", end: "center center", scrub: true } });
      });
    });
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    const t = setTimeout(refresh, 800); // late-loading images change section heights
    return () => { clearTimeout(t); window.removeEventListener("load", refresh); ctx.revert(); };
  }, []);
  return null;
}
