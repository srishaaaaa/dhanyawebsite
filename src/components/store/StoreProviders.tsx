"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export type CartLine = {
  id: string; variantId: string; productId: string; slug: string; name: string; size: string | null; color: string | null;
  image: string | null; unitPrice: number; compareAt: number | null; quantity: number; available: number; purchasable: boolean; lineTotal: number;
};
export type Cart = { lines: CartLine[]; count: number; subtotal: number; shippingEstimate: number | null; freeShippingThreshold: number | null; issues: string[] };
type Toast = { id: number; text: string; tone: "ok" | "err" };

type Ctx = {
  cart: Cart | null; cartOpen: boolean; setCartOpen: (o: boolean) => void; busy: boolean;
  add: (variantId: string, quantity?: number) => Promise<boolean>;
  update: (itemId: string, quantity: number) => Promise<void>;
  wishlist: Set<string>; toggleWish: (productId: string, name?: string) => Promise<void>;
  toast: (text: string, tone?: "ok" | "err") => void;
};
const StoreCtx = createContext<Ctx | null>(null);
export const useStore = () => {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore must be used inside <StoreProviders>");
  return c;
};

export default function StoreProviders({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const n = useRef(0);

  const toast = useCallback((text: string, tone: "ok" | "err" = "ok") => {
    const id = ++n.current;
    setToasts((t) => [...t.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  useEffect(() => {
    fetch("/api/cart").then((r) => r.json()).then((d) => d.cart && setCart(d.cart)).catch(() => {});
    fetch("/api/wishlist").then((r) => r.json()).then((d) => setWishlist(new Set(d.ids ?? []))).catch(() => {});
  }, []);

  const call = useCallback(async (method: "POST" | "PATCH", body: unknown) => {
    setBusy(true);
    try {
      const r = await fetch("/api/cart", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (d.cart) setCart(d.cart);
      if (!r.ok) { toast(d.error ?? "Couldn't update your bag.", "err"); return false; }
      return true;
    } catch {
      toast("You appear to be offline. Check your connection and try again.", "err");
      return false;
    } finally { setBusy(false); }
  }, [toast]);

  const add = useCallback(async (variantId: string, quantity = 1) => {
    const ok = await call("POST", { variantId, quantity });
    if (ok) setCartOpen(true);
    return ok;
  }, [call]);
  const update = useCallback(async (itemId: string, quantity: number) => { await call("PATCH", { itemId, quantity }); }, [call]);

  const toggleWish = useCallback(async (productId: string, name?: string) => {
    const had = wishlist.has(productId);
    setWishlist((s) => { const x = new Set(s); had ? x.delete(productId) : x.add(productId); return x; }); // optimistic
    try {
      const r = await fetch("/api/wishlist", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ productId }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setWishlist(new Set(d.ids));
      toast(d.saved ? `${name ?? "Item"} saved to your wishlist.` : `Removed from your wishlist.`);
    } catch (e) {
      setWishlist((s) => { const x = new Set(s); had ? x.add(productId) : x.delete(productId); return x; });
      toast((e as Error).message || "Couldn't update your wishlist.", "err");
    }
  }, [wishlist, toast]);

  const value = useMemo(() => ({ cart, cartOpen, setCartOpen, busy, add, update, wishlist, toggleWish, toast }), [cart, cartOpen, busy, add, update, wishlist, toggleWish, toast]);
  return (
    <StoreCtx.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-5 left-1/2 z-[70] flex w-[min(92vw,420px)] -translate-x-1/2 flex-col gap-2">
        {toasts.map((t) => (
          <p key={t.id} role={t.tone === "err" ? "alert" : "status"}
            className={`toast-in pointer-events-auto px-4 py-3 text-sm shadow-lg ${t.tone === "err" ? "bg-burgundy text-ivory" : "bg-aubergine text-ivory"}`}>{t.text}</p>
        ))}
      </div>
    </StoreCtx.Provider>
  );
}
