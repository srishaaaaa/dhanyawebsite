"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export type Announcement = { text: string; href?: string; ctaLabel?: string; tone?: "gold" | "aubergine" | "rose" };
const TONE = { gold: "bg-gold text-aubergine", aubergine: "bg-aubergine text-ivory/90", rose: "bg-rose text-burgundy" };

/** Rotates through active announcements every 5s (paused on hover/focus and with reduced motion). */
export default function AnnouncementBar({ items }: { items: Announcement[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (items.length < 2 || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((x) => (x + 1) % items.length), 5000);
    return () => clearInterval(t);
  }, [items.length, paused]);
  if (!items.length) return null;
  const a = items[i % items.length];
  return (
    <div className={`${TONE[a.tone ?? "aubergine"]} px-4 py-2 text-center text-xs tracking-wide transition-colors`} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)} aria-live="polite">
      <span key={i} className="toast-in inline-block">{a.text}{a.href && <Link href={a.href} className="ml-3 underline underline-offset-4">{a.ctaLabel || "Shop now"}</Link>}</span>
    </div>
  );
}
