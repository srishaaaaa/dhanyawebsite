"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import Img from "./Img";
import VariantPicker, { type PickerProduct } from "./VariantPicker";

export default function QuickView({ slug, onClose }: { slug: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [p, setP] = useState<PickerProduct | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    ref.current?.showModal();
    fetch(`/api/products/${encodeURIComponent(slug)}`).then((r) => (r.ok ? r.json() : Promise.reject())).then(setP).catch(() => setErr(true));
  }, [slug]);
  return (
    <dialog ref={ref} onClose={onClose} onClick={(e) => e.target === ref.current && ref.current?.close()}
      className="modal-in m-auto w-[min(94vw,880px)] max-h-[90vh] bg-ivory p-0 text-charcoal backdrop:bg-plum/70"
      aria-label="Quick view">
      <button onClick={() => ref.current?.close()} className="absolute right-3 top-3 z-10 p-2" aria-label="Close quick view"><X size={20} /></button>
      {err ? <p className="p-10 text-center">This product couldn&apos;t be loaded. <Link className="underline" href={`/products/${slug}`}>Open the product page</Link>.</p>
        : !p ? <div className="grid gap-6 p-6 md:grid-cols-2"><div className="skeleton aspect-[3/4]" /><div className="space-y-3"><div className="skeleton h-8 w-3/4" /><div className="skeleton h-5 w-1/3" /><div className="skeleton h-24" /></div></div>
        : (
          <div className="grid md:grid-cols-2">
            <Img src={p.images[0]?.url} alt={p.images[0]?.altText ?? p.name} sizes="(min-width:768px) 440px, 94vw" width={900} className="aspect-[3/4] w-full object-cover" />
            <div className="p-6 md:p-8">
              <p className="kicker mb-4">Quick view</p>
              <h2 className="font-serif text-4xl font-light leading-tight pr-8">{p.name}</h2>
              <VariantPicker product={p} compact onAdded={() => ref.current?.close()} />
              <Link href={`/products/${p.slug}`} className="mt-6 inline-block text-sm underline underline-offset-4">View full details</Link>
            </div>
          </div>
        )}
    </dialog>
  );
}
