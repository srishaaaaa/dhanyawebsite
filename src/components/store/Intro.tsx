"use client";
import { useEffect, useState } from "react";
import SilkField from "./silk/SilkField";

/**
 * Cinematic entrance: aubergine room, light sweep, silk drifting through, wordmark resolving, then a curtain lift.
 * ~2.4s total, skippable (button, Esc or any key), shown once per 14 days per browser, never for reduced motion.
 * Pure canvas/CSS so it works without WebGL, and it never blocks navigation (the page is rendered underneath).
 */
export default function Intro() {
  const [show, setShow] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const close = () => { setLeaving(true); setTimeout(() => setShow(false), 900); };

  useEffect(() => {
    let recent = false;
    try {
      const at = Number(localStorage.getItem("db_intro_at") || 0);
      recent = Date.now() - at < 14 * 864e5;
      localStorage.setItem("db_intro_at", String(Date.now()));
    } catch {}
    if (recent || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setShow(true);
    const a = setTimeout(() => setLeaving(true), 2400);
    const b = setTimeout(() => setShow(false), 3300);
    const k = () => close();
    window.addEventListener("keydown", k);
    return () => { clearTimeout(a); clearTimeout(b); window.removeEventListener("keydown", k); };
  }, []);

  if (!show) return null;
  return (
    <div role="presentation" className={`fixed inset-0 z-[90] overflow-hidden bg-plum text-ivory transition-[clip-path] duration-[900ms] ease-[cubic-bezier(.7,0,.2,1)] ${leaving ? "[clip-path:inset(0_0_100%_0)]" : "[clip-path:inset(0)]"}`}>
      <div className="intro-silk absolute inset-0"><SilkField tone="plum" /></div>
      <div aria-hidden className="intro-light absolute inset-0" />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p aria-hidden className="intro-word font-serif text-5xl font-light pl-[0.35em] sm:text-8xl">DHANYA</p>
        <p aria-hidden className="intro-sub mt-5 font-serif text-lg italic text-gold sm:text-2xl">boutique</p>
        <div aria-hidden className="mt-10 h-px w-44 bg-ivory/15"><div className="intro-bar h-full bg-gold" /></div>
      </div>
      <button onClick={close} className="absolute bottom-8 right-8 text-xs tracking-[0.2em] text-ivory/60 hover:text-ivory">SKIP</button>
    </div>
  );
}
