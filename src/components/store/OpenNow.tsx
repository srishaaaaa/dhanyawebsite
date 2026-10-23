"use client";
import { useEffect, useState } from "react";

const mins = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };

/** Live Open / Closed badge, computed in India time from the owner's opening hours (renders nothing until hours are set). */
export default function OpenNow({ from, to, className = "" }: { from?: string; to?: string; className?: string }) {
  const [open, setOpen] = useState<boolean | null>(null);
  useEffect(() => {
    if (!from || !to) return;
    const tick = () => {
      const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
      const now = mins(parts === "24:00" ? "00:00" : parts);
      const a = mins(from), b = mins(to);
      setOpen(a <= b ? now >= a && now < b : now >= a || now < b);
    };
    tick(); const t = setInterval(tick, 60_000);
    return () => clearInterval(t);
  }, [from, to]);
  if (open === null) return null;
  return (
    <span className={`inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] ${open ? "text-emerald-700" : "text-burgundy"} ${className}`}>
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${open ? "animate-pulse bg-emerald-600" : "bg-burgundy"}`} />{open ? "Open" : "Closed"}
    </span>
  );
}
