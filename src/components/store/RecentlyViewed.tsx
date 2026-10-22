"use client";
import { useEffect, useState } from "react";
import ProductCard, { type Card } from "./ProductCard";

const KEY = "db_recent_products";
export function trackViewed(id: string) {
  try { const cur: string[] = JSON.parse(localStorage.getItem(KEY) ?? "[]"); localStorage.setItem(KEY, JSON.stringify([id, ...cur.filter((x) => x !== id)].slice(0, 12))); } catch {}
}

export default function RecentlyViewed({ exclude }: { exclude?: string }) {
  const [items, setItems] = useState<Card[]>([]);
  useEffect(() => {
    let ids: string[] = [];
    try { ids = (JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[]).filter((x) => x !== exclude).slice(0, 4); } catch {}
    if (!ids.length) return;
    fetch(`/api/cards?ids=${ids.join(",")}`).then((r) => r.json()).then((d) => setItems(d.cards ?? [])).catch(() => {});
  }, [exclude]);
  if (!items.length) return null;
  return (
    <section aria-labelledby="rv-h" className="container-x py-16">
      <h2 id="rv-h" className="font-serif text-3xl mb-8">Recently viewed</h2>
      <div className="grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">{items.map((p) => <ProductCard key={p.id} p={p} />)}</div>
    </section>
  );
}
