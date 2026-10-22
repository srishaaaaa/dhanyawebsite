"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { bulkUpdateProducts } from "@/app/admin/(panel)/products/actions";
import { Badge, btn } from "./ui";
import { formatINR } from "@/lib/money";

type Row = {
  id: string; name: string; sku: string; status: string; price: string; publishAt: string | null; category: string | null;
  isFeatured: boolean; isBestseller: boolean; isNewArrival: boolean; threshold: number; image: string | null; stock: number; variants: number;
};
const ACTIONS = [
  ["activate", "Publish"], ["draft", "Move to draft"], ["archive", "Archive"], ["feature", "Feature"], ["unfeature", "Unfeature"],
  ["new", "Mark new arrival"], ["unnew", "Unmark new arrival"], ["bestseller", "Mark bestseller"], ["unbestseller", "Unmark bestseller"],
] as const;

export default function ProductTable({ rows }: { rows: Row[] }) {
  const [sel, setSel] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const all = sel.length === rows.length && rows.length > 0;

  function run(action: (typeof ACTIONS)[number][0]) {
    start(async () => {
      const r = await bulkUpdateProducts(sel, action);
      setMsg(r.ok ? `Updated ${sel.length} product(s).` : r.error ?? "Couldn't update.");
      if (r.ok) { setSel([]); router.refresh(); }
    });
  }

  return (
    <div>
      <div className="mb-2 flex min-h-9 flex-wrap items-center gap-2 text-sm" aria-live="polite">
        {sel.length > 0 ? (
          <>
            <span>{sel.length} selected</span>
            <select disabled={pending} className="border border-charcoal/20 bg-white px-2 py-1.5" defaultValue="" onChange={(e) => { if (e.target.value) run(e.target.value as never); e.target.value = ""; }} aria-label="Bulk action">
              <option value="" disabled>Bulk action…</option>
              {ACTIONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            <button className={btn.ghost} onClick={() => setSel([])}>Clear</button>
          </>
        ) : msg && <span className="text-charcoal/70">{msg}</span>}
      </div>
      <div className="overflow-x-auto bg-white border border-charcoal/10">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-charcoal/60 border-b border-charcoal/10">
            <tr>
              <th className="p-3 w-8"><input type="checkbox" aria-label="Select all" checked={all} onChange={(e) => setSel(e.target.checked ? rows.map((r) => r.id) : [])} /></th>
              <th className="p-3">Product</th><th className="p-3">Status</th><th className="p-3">Stock</th><th className="p-3">Category</th><th className="p-3 text-right">Price (excl. GST)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const scheduled = r.status === "active" && r.publishAt && new Date(r.publishAt) > new Date();
              return (
                <tr key={r.id} className="border-t border-charcoal/10 hover:bg-ivory/60">
                  <td className="p-3"><input type="checkbox" aria-label={`Select ${r.name}`} checked={sel.includes(r.id)} onChange={(e) => setSel(e.target.checked ? [...sel, r.id] : sel.filter((x) => x !== r.id))} /></td>
                  <td className="p-3">
                    <Link href={`/admin/products/${r.id}`} className="flex items-center gap-3 group">
                      <span className="h-12 w-10 shrink-0 bg-rose/50 overflow-hidden">{r.image && <img src={r.image} alt="" className="h-full w-full object-cover" />}</span>
                      <span>
                        <span className="block group-hover:text-aubergine group-hover:underline">{r.name}</span>
                        <span className="block text-xs text-charcoal/50">{r.sku} · {r.variants} variant{r.variants === 1 ? "" : "s"}
                          {r.isNewArrival && " · New"}{r.isBestseller && " · Bestseller"}{r.isFeatured && " · Featured"}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="p-3">{scheduled ? <Badge tone="scheduled">Scheduled</Badge> : <Badge tone={r.status}>{r.status[0].toUpperCase() + r.status.slice(1)}</Badge>}</td>
                  <td className="p-3">{r.stock <= 0 ? <Badge tone="out">Out of stock</Badge> : r.stock <= r.threshold ? <Badge tone="low">{r.stock} left</Badge> : r.stock}</td>
                  <td className="p-3 text-charcoal/70">{r.category ?? "—"}</td>
                  <td className="p-3 text-right tabular-nums">{formatINR(r.price)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
