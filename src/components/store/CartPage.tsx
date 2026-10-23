"use client";
import Link from "next/link";
import { useStore } from "./StoreProviders";
import { CartLines, FreeShippingNote } from "./CartDrawer";
import { formatINR } from "@/lib/money";

export default function CartPageClient() {
  const { cart } = useStore();
  const empty = cart && cart.lines.length === 0;
  const blocked = cart?.lines.some((l) => !l.purchasable);
  return (
    <div className={`grid gap-12 ${empty ? "" : "lg:grid-cols-[1fr_380px]"}`}>
      <div className="flex min-h-[40vh] flex-col"><CartLines large /></div>
      {cart && !empty && (
        <aside aria-labelledby="sum-h" className="frame h-fit border border-gold/30 bg-white p-8 shadow-[0_40px_80px_-50px_rgb(var(--c-aubergine)/.5)] lg:sticky lg:top-28">
          <h2 id="sum-h" className="mb-6 font-serif text-3xl font-light">Order summary</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between"><dt>Subtotal (incl. GST)</dt><dd className="tabular-nums">{formatINR(cart.subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Estimated shipping</dt><dd className="tabular-nums">{cart.shippingEstimate === 0 ? "Free" : cart.shippingEstimate === null ? "—" : formatINR(cart.shippingEstimate)}</dd></div>
            <div className="flex justify-between border-t border-charcoal/10 pt-3 text-base"><dt>Estimated total</dt><dd className="tabular-nums">{formatINR(cart.subtotal + (cart.shippingEstimate ?? 0))}</dd></div>
          </dl>
          <div className="mt-5"><FreeShippingNote /></div>
          <p className="mt-5 text-xs text-charcoal/55">Coupon codes and the final tax breakdown are applied at checkout. Prices are confirmed against current stock before payment.</p>
          {blocked && <p role="alert" className="mt-4 text-sm text-burgundy">Update the highlighted items to continue.</p>}
          <Link href="/checkout" aria-disabled={blocked} className={`btn-primary mt-6 w-full ${blocked ? "pointer-events-none opacity-50" : ""}`}>CHECKOUT</Link>
          <Link href="/shop" className="mt-4 block text-center text-sm underline underline-offset-4">Continue shopping</Link>
        </aside>
      )}
    </div>
  );
}
