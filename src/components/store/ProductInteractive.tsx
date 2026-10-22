"use client";
import { useEffect, useRef, useState } from "react";
import Gallery from "./Gallery";
import VariantPicker, { type PickerProduct } from "./VariantPicker";
import { trackViewed } from "./RecentlyViewed";

export default function ProductInteractive({ product, video, model, header, sizeGuide, below }: {
  product: PickerProduct; video?: string | null; model?: string | null; header: React.ReactNode; sizeGuide?: string | null; below: React.ReactNode;
}) {
  const firstColor = product.variants.find((v) => v.color && v.available > 0)?.color ?? product.variants.find((v) => v.color)?.color ?? null;
  const [color, setColor] = useState<string | null>(firstColor);
  const guide = useRef<HTMLDialogElement>(null);
  useEffect(() => trackViewed(product.id), [product.id]);
  return (
    <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
      <Gallery name={product.name} images={product.images} video={video} model={model} color={color} />
      <div className="min-w-0">
        {header}
        <div className="mt-8">
          <VariantPicker product={product} onColor={setColor}>
            <button type="button" onClick={() => guide.current?.showModal()} className="text-xs underline underline-offset-4">Size guide</button>
          </VariantPicker>
        </div>
        {below}
      </div>
      <dialog ref={guide} onClick={(e) => e.target === guide.current && guide.current?.close()} aria-label="Size guide"
        className="modal-in m-auto w-[min(94vw,640px)] max-h-[85vh] bg-ivory p-8 text-charcoal backdrop:bg-aubergine/50">
        <div className="flex items-start justify-between gap-4"><h2 className="font-serif text-3xl">Size guide</h2><button onClick={() => guide.current?.close()} className="text-sm underline">Close</button></div>
        <p className="mt-4 whitespace-pre-line text-sm leading-relaxed">{sizeGuide || "Measurements for this piece follow our standard sizing."}</p>
        <p className="mt-4 text-xs text-charcoal/60">See the <a href="/size-guide" className="underline">full size guide</a> for body measurements and how to measure.</p>
      </dialog>
    </div>
  );
}
