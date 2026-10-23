"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { LayoutGrid, List, SlidersHorizontal, X } from "lucide-react";
import { formatINR } from "@/lib/money";

type Facets = { sizes: string[]; colors: { name: string; hex: string | null }[]; minPrice: number; maxPrice: number };
const SORTS = [["newest", "Newest"], ["popular", "Most popular"], ["price-asc", "Price: low to high"], ["price-desc", "Price: high to low"], ["discount", "Biggest discount"]] as const;

export default function Filters({ facets, total }: { facets: Facets; total: number }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const dlg = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = dlg.current; if (!d) return; if (open && !d.open) d.showModal(); if (!open && d.open) d.close(); }, [open]);

  const list = (k: string) => (sp.get(k) ?? "").split(",").filter(Boolean);
  const push = (mut: (p: URLSearchParams) => void) => {
    const p = new URLSearchParams(sp.toString()); mut(p); p.delete("page");
    start(() => router.push(`${path}${p.toString() ? `?${p}` : ""}`, { scroll: false }));
  };
  const toggle = (k: string, v: string) => push((p) => {
    const cur = list(k); const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
    next.length ? p.set(k, next.join(",")) : p.delete(k);
  });
  const chips: { label: string; clear: () => void }[] = [
    ...list("size").map((s) => ({ label: `Size ${s}`, clear: () => toggle("size", s) })),
    ...list("color").map((c) => ({ label: c, clear: () => toggle("color", c) })),
    ...(sp.get("min") || sp.get("max") ? [{ label: `${sp.get("min") ? formatINR(sp.get("min")!) : "Any"} – ${sp.get("max") ? formatINR(sp.get("max")!) : "any"}`, clear: () => push((p) => { p.delete("min"); p.delete("max"); }) }] : []),
    ...(sp.get("stock") === "1" ? [{ label: "In stock", clear: () => push((p) => p.delete("stock")) }] : []),
  ];

  const panel = (
    <div className="space-y-8">
      {facets.sizes.length > 0 && (
        <fieldset><legend className="mb-3 text-sm">Size</legend>
          <div className="flex flex-wrap gap-2">{facets.sizes.map((s) => {
            const on = list("size").includes(s);
            return <button key={s} type="button" aria-pressed={on} onClick={() => toggle("size", s)} className={`min-w-11 border px-3 py-1.5 text-sm ${on ? "border-aubergine bg-aubergine text-ivory" : "border-charcoal/25 hover:border-aubergine"}`}>{s}</button>;
          })}</div>
        </fieldset>
      )}
      {facets.colors.length > 0 && (
        <fieldset><legend className="mb-3 text-sm">Colour</legend>
          <div className="flex flex-wrap gap-3">{facets.colors.map((c) => {
            const on = list("color").map((x) => x.toLowerCase()).includes(c.name.toLowerCase());
            return (
              <button key={c.name} type="button" aria-pressed={on} onClick={() => toggle("color", c.name)} className="flex items-center gap-2 text-sm">
                <span className={`h-5 w-5 rounded-full border ${on ? "ring-1 ring-offset-2 ring-aubergine" : "border-charcoal/25"}`} style={{ background: c.hex ?? "#e8e2da" }} />{c.name}
              </button>
            );
          })}</div>
        </fieldset>
      )}
      <PriceFilter key={`${sp.get("min")}-${sp.get("max")}`} min={facets.minPrice} max={facets.maxPrice}
        onApply={(a, b) => push((p) => { a ? p.set("min", String(a)) : p.delete("min"); b ? p.set("max", String(b)) : p.delete("max"); })}
        cur={[sp.get("min") ?? "", sp.get("max") ?? ""]} />
      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" checked={sp.get("stock") === "1"} onChange={(e) => push((p) => (e.target.checked ? p.set("stock", "1") : p.delete("stock")))} className="accent-aubergine" />
        In stock only
      </label>
    </div>
  );

  return (
    <div className="mb-10">
      <div className="sticky top-[76px] z-20 -mx-5 flex flex-wrap items-center gap-4 border-y border-gold/30 bg-ivory/90 px-5 py-4 backdrop-blur sm:-mx-10 sm:px-10 lg:-mx-14 lg:px-14">
        <button onClick={() => setOpen(true)} className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.26em] transition-colors hover:text-burgundy"><SlidersHorizontal size={16} strokeWidth={1.4} />Filter{chips.length ? ` (${chips.length})` : ""}</button>
        <p className="text-sm text-charcoal/60" aria-live="polite">{pending ? "Updating…" : `${total} piece${total === 1 ? "" : "s"}`}</p>
        <div className="ml-auto flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm"><span className="hidden sm:inline text-charcoal/60">Sort</span>
            <select value={sp.get("sort") ?? "newest"} onChange={(e) => push((p) => (e.target.value === "newest" ? p.delete("sort") : p.set("sort", e.target.value)))} className="bg-transparent py-1 outline-none">
              {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <div className="hidden sm:flex gap-1" role="group" aria-label="Layout">
            <button aria-label="Grid view" aria-pressed={sp.get("view") !== "list"} onClick={() => push((p) => p.delete("view"))} className={`p-1.5 ${sp.get("view") !== "list" ? "text-aubergine" : "text-charcoal/40"}`}><LayoutGrid size={16} /></button>
            <button aria-label="List view" aria-pressed={sp.get("view") === "list"} onClick={() => push((p) => p.set("view", "list"))} className={`p-1.5 ${sp.get("view") === "list" ? "text-aubergine" : "text-charcoal/40"}`}><List size={16} /></button>
          </div>
        </div>
      </div>
      {chips.length > 0 && (
        <ul className="mt-3 flex flex-wrap items-center gap-2" aria-label="Active filters">
          {chips.map((c) => <li key={c.label}><button onClick={c.clear} className="flex items-center gap-1.5 border border-charcoal/20 bg-white px-3 py-1 text-xs hover:border-burgundy">{c.label}<X size={12} aria-label="remove" /></button></li>)}
          <li><button onClick={() => push((p) => ["size", "color", "min", "max", "stock"].forEach((k) => p.delete(k)))} className="text-xs underline underline-offset-4">Clear all</button></li>
        </ul>
      )}
      <dialog ref={dlg} onClose={() => setOpen(false)} onClick={(e) => e.target === dlg.current && setOpen(false)} aria-label="Filters"
        className="drawer-in m-0 ml-auto h-dvh max-h-none w-[min(100vw,400px)] bg-ivory p-0 text-charcoal border-l border-gold/30 backdrop:bg-plum/60">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-charcoal/10 px-6 py-5">
            <h2 className="font-serif text-3xl font-light">Refine</h2>
            <button onClick={() => setOpen(false)} aria-label="Close filters"><X size={20} strokeWidth={1.4} /></button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-6">{panel}</div>
          <div className="border-t border-charcoal/10 p-5"><button onClick={() => setOpen(false)} className="btn-primary w-full">{pending ? "Updating…" : `Show ${total} piece${total === 1 ? "" : "s"}`}</button></div>
        </div>
      </dialog>
    </div>
  );
}

function PriceFilter({ min, max, cur, onApply }: { min: number; max: number; cur: [string, string]; onApply: (a: number | null, b: number | null) => void }) {
  const [a, setA] = useState(cur[0]); const [b, setB] = useState(cur[1]);
  if (max <= 0) return null;
  return (
    <fieldset>
      <legend className="mb-3 text-sm">Price (₹, incl. GST)</legend>
      <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); onApply(a ? Number(a) : null, b ? Number(b) : null); }}>
        <input inputMode="numeric" aria-label="Minimum price" placeholder={String(min)} value={a} onChange={(e) => setA(e.target.value.replace(/\D/g, ""))} className="w-24 border border-charcoal/25 bg-white px-2 py-1.5 text-sm" />
        <span aria-hidden>–</span>
        <input inputMode="numeric" aria-label="Maximum price" placeholder={String(max)} value={b} onChange={(e) => setB(e.target.value.replace(/\D/g, ""))} className="w-24 border border-charcoal/25 bg-white px-2 py-1.5 text-sm" />
        <button className="text-sm underline underline-offset-4">Apply</button>
      </form>
    </fieldset>
  );
}
