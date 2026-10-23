"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { Minus, Plus, X } from "lucide-react";
import { useStore } from "./StoreProviders";
import Img from "./Img";
import { formatINR } from "@/lib/money";

export default function CartDrawer() {
  const { cart, cartOpen, setCartOpen } = useStore();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current; if (!d) return;
    if (cartOpen && !d.open) d.showModal();
    if (!cartOpen && d.open) d.close();
  }, [cartOpen]);

  return (
    <dialog ref={ref} onClose={() => setCartOpen(false)} onClick={(e) => e.target === ref.current && setCartOpen(false)} aria-label="Shopping bag"
      className="drawer-in m-0 ml-auto h-dvh max-h-none w-[min(100vw,460px)] border-l border-gold/30 bg-ivory p-0 text-charcoal backdrop:bg-plum/60">
      <div className="flex h-full flex-col">
        <div className="stage flex items-center justify-between px-6 py-6">
          <div><p className="kicker mb-2">Your selection</p><h2 className="font-serif text-3xl font-light leading-none">The bag{cart?.count ? <span className="ml-2 text-gold">({cart.count})</span> : ""}</h2></div>
          <button onClick={() => setCartOpen(false)} aria-label="Close bag" className="p-1 transition-transform duration-500 hover:rotate-90"><X size={22} strokeWidth={1.2} /></button>
        </div>
        <CartLines />
        {cart && cart.lines.length > 0 && (
          <div className="border-t border-charcoal/10 px-6 py-5 space-y-3">
            <FreeShippingNote />
            <div className="flex justify-between text-sm"><span>Subtotal (incl. GST)</span><span className="tabular-nums">{formatINR(cart.subtotal)}</span></div>
            <p className="text-xs text-charcoal/55">Shipping and offers are applied at checkout.</p>
            <Link href="/cart" onClick={() => setCartOpen(false)} className="btn-primary w-full">View bag and checkout</Link>
          </div>
        )}
      </div>
    </dialog>
  );
}

export function FreeShippingNote() {
  const { cart } = useStore();
  if (!cart || cart.freeShippingThreshold === null || cart.lines.length === 0) return null;
  const left = cart.freeShippingThreshold - cart.subtotal;
  const pct = Math.min(100, (cart.subtotal / cart.freeShippingThreshold) * 100);
  return (
    <div className="text-xs">
      <p>{left > 0 ? <>Add <strong>{formatINR(left)}</strong> more for free shipping.</> : "Your order ships free."}</p>
      <div className="mt-1.5 h-0.5 bg-charcoal/10"><div className="h-full bg-gold transition-[width] duration-500" style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

export function CartLines({ large = false }: { large?: boolean }) {
  const { cart, update, busy, setCartOpen } = useStore();
  if (!cart) return <div className="flex-1 p-6 space-y-4">{[0, 1].map((i) => <div key={i} className="skeleton h-28" />)}</div>;
  if (cart.lines.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
        <p className="font-serif text-4xl font-light">The bag is empty</p>
        <p className="text-sm text-charcoal/60 max-w-xs">Pieces you add will wait here while you browse.</p>
        <Link href="/shop" onClick={() => setCartOpen(false)} className="btn-outline mt-2">Explore the collection</Link>
      </div>
    );
  }
  return (
    <div className={`flex-1 overflow-y-auto ${large ? "" : "px-6"}`}>
      {cart.issues.length > 0 && <ul role="alert" className="my-4 space-y-1 border border-burgundy/30 bg-rose/60 p-3 text-sm text-burgundy">{cart.issues.map((i) => <li key={i}>{i}</li>)}</ul>}
      <ul className="divide-y divide-charcoal/10">
        {cart.lines.map((l) => (
          <li key={l.id} className={`toast-in flex gap-4 py-6 ${l.purchasable ? "" : "opacity-60"}`}>
            <Link href={`/products/${l.slug}`} onClick={() => setCartOpen(false)} className="shrink-0">
              <Img src={l.image} alt={l.name} width={240} sizes="96px" className={`${large ? "h-40 w-32" : "h-28 w-[84px]"} object-cover`} />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex justify-between gap-3">
                <Link href={`/products/${l.slug}`} onClick={() => setCartOpen(false)} className={`font-serif font-light ${large ? "text-2xl" : "text-xl"} leading-snug hover:text-burgundy`}>{l.name}</Link>
                <span className="text-sm tabular-nums whitespace-nowrap">{formatINR(l.lineTotal)}</span>
              </div>
              <p className="text-xs text-charcoal/60 mt-1">{[l.color, l.size && `Size ${l.size}`].filter(Boolean).join(" · ")}</p>
              <div className="mt-auto flex items-center justify-between pt-3">
                <div className="flex items-center border border-charcoal/20" aria-label={`Quantity for ${l.name}`}>
                  <button disabled={busy} onClick={() => update(l.id, l.quantity - 1)} aria-label="Decrease quantity" className="px-2.5 py-1.5"><Minus size={12} /></button>
                  <span className="w-6 text-center text-sm tabular-nums">{l.quantity}</span>
                  <button disabled={busy || l.quantity >= Math.min(l.available, 10)} onClick={() => update(l.id, l.quantity + 1)} aria-label="Increase quantity" className="px-2.5 py-1.5 disabled:opacity-30"><Plus size={12} /></button>
                </div>
                <button disabled={busy} onClick={() => update(l.id, 0)} className="text-xs text-charcoal/60 underline-offset-4 hover:underline">Remove</button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
