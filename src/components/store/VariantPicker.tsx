"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { useStore } from "./StoreProviders";
import Price from "./Price";
import WishButton from "./WishButton";
import NotifyMe from "./NotifyMe";
import { withGst } from "@/lib/money";

export type PickerVariant = { id: string; size: string | null; color: string | null; colorHex: string | null; priceOverride: string | null; available: number };
export type PickerProduct = {
  id: string; slug: string; name: string; price: string; compareAtPrice: string | null; gstRate: string;
  images: { url: string; altText: string | null; colorName: string | null }[]; variants: PickerVariant[];
};

export default function VariantPicker({ product: p, compact = false, onColor, onAdded, children }: {
  product: PickerProduct; compact?: boolean; onColor?: (c: string | null) => void; onAdded?: () => void; children?: React.ReactNode;
}) {
  const { add, busy } = useStore();
  const router = useRouter();
  const colors = useMemo(() => {
    const m = new Map<string, { name: string; hex: string | null; available: number }>();
    for (const v of p.variants) if (v.color) {
      const k = v.color.toLowerCase(); const c = m.get(k);
      m.set(k, { name: v.color, hex: c?.hex ?? v.colorHex, available: (c?.available ?? 0) + v.available });
    }
    return [...m.values()];
  }, [p.variants]);
  const firstInStockColor = colors.find((c) => c.available > 0) ?? colors[0];
  const [color, setColor] = useState<string | null>(firstInStockColor?.name ?? null);
  const sizesForColor = p.variants.filter((v) => !color || v.color?.toLowerCase() === color.toLowerCase());
  const hasSizes = sizesForColor.some((v) => v.size);
  const [size, setSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [prompt, setPrompt] = useState(false);

  const variant = hasSizes
    ? sizesForColor.find((v) => v.size === size) ?? null
    : sizesForColor[0] ?? null;
  const unit = withGst(variant?.priceOverride ?? p.price, p.gstRate);
  const compare = p.compareAtPrice ? withGst(p.compareAtPrice, p.gstRate) : null;
  const allSold = p.variants.every((v) => v.available <= 0);
  const maxQty = Math.min(variant?.available ?? 0, 10);

  async function go(buyNow: boolean) {
    if (!variant) { setPrompt(true); return; }
    const ok = await add(variant.id, qty);
    if (ok) { onAdded?.(); if (buyNow) router.push("/cart"); }
  }

  return (
    <div className={compact ? "mt-3 space-y-5" : "space-y-6"}>
      <div>
        <Price price={unit} compareAt={compare} size="lg" />
        <p className="text-xs text-charcoal/55 mt-1">Inclusive of all taxes</p>
      </div>

      {colors.length > 0 && (
        <fieldset>
          <legend className="text-sm mb-2">Colour: <span className="text-charcoal/70">{color}</span></legend>
          <div className="flex flex-wrap gap-2.5" role="radiogroup">
            {colors.map((c) => {
              const on = c.name === color;
              return (
                <button key={c.name} type="button" role="radio" aria-checked={on} aria-label={`${c.name}${c.available ? "" : " (sold out)"}`} title={c.name}
                  onClick={() => { setColor(c.name); setSize(null); onColor?.(c.name); }}
                  className={`relative h-9 w-9 rounded-full border transition ${on ? "ring-1 ring-offset-2 ring-aubergine border-aubergine" : "border-charcoal/25 hover:border-aubergine"} ${c.available ? "" : "opacity-40"}`}
                  style={{ background: c.hex ?? "#e8e2da" }} />
              );
            })}
          </div>
        </fieldset>
      )}

      {hasSizes && (
        <fieldset>
          <div className="flex items-baseline justify-between mb-2">
            <legend className="text-sm">Size{size ? `: ${size}` : ""}</legend>
            {children /* size guide trigger */}
          </div>
          <div className="flex flex-wrap gap-2" role="radiogroup">
            {sizesForColor.filter((v) => v.size).map((v) => {
              const on = v.size === size; const out = v.available <= 0;
              return (
                <button key={v.id} type="button" role="radio" aria-checked={on} aria-label={`${v.size}${out ? " sold out" : ""}`}
                  onClick={() => { setSize(v.size); setQty(1); setPrompt(false); }}
                  className={`min-w-12 border px-3 py-2 text-sm transition ${on ? "border-aubergine bg-aubergine text-ivory" : "border-charcoal/25 hover:border-aubergine"} ${out && !on ? "text-charcoal/35 line-through" : ""}`}>
                  {v.size}
                </button>
              );
            })}
          </div>
          {prompt && <p role="alert" className="mt-2 text-sm text-burgundy">Choose a size to continue.</p>}
        </fieldset>
      )}

      <p className="text-sm min-h-5" aria-live="polite">
        {allSold ? <span className="text-burgundy">Sold out</span>
          : variant ? (variant.available <= 0 ? <span className="text-burgundy">This option is sold out</span>
            : variant.available <= 3 ? <span className="text-burgundy">Only {variant.available} left</span>
              : <span className="text-emerald-800">In stock</span>)
          : hasSizes ? <span className="text-charcoal/60">Select a size to see availability</span> : null}
      </p>

      {!compact && (() => {
        const out = variant && variant.available <= 0 ? variant : !hasSizes && allSold ? sizesForColor[0] ?? null : null;
        return out ? <NotifyMe key={out.id} variantId={out.id} label={[p.name, out.size, out.color].filter(Boolean).join(", ")} /> : null;
      })()}

      <div className="flex flex-wrap items-stretch gap-3">
        <div className="flex items-center border border-charcoal/25" aria-label="Quantity">
          <button type="button" className="px-3 py-3 disabled:opacity-30" aria-label="Decrease quantity" disabled={qty <= 1} onClick={() => setQty((q) => q - 1)}><Minus size={14} /></button>
          <span className="w-8 text-center tabular-nums" aria-live="polite">{qty}</span>
          <button type="button" className="px-3 py-3 disabled:opacity-30" aria-label="Increase quantity" disabled={!variant || qty >= maxQty} onClick={() => setQty((q) => q + 1)}><Plus size={14} /></button>
        </div>
        <button type="button" disabled={busy || allSold || (variant !== null && variant.available <= 0)} onClick={() => go(false)}
          className="btn-primary flex-1 min-w-40">{busy ? "Adding…" : allSold ? "Sold out" : "Add to bag"}</button>
      </div>
      {!compact && !allSold && (
        <div className="flex flex-wrap items-center gap-5">
          <button type="button" disabled={busy || (variant !== null && variant.available <= 0)} onClick={() => go(true)} className="btn-outline flex-1">Buy now</button>
          <WishButton productId={p.id} name={p.name} label />
        </div>
      )}
    </div>
  );
}
