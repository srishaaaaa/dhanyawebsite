"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { moderate } from "@/app/admin/(panel)/reviews/actions";
import { Badge, btn } from "./ui";

type Row = { id: string; rating: number; title: string | null; body: string | null; at: string; featured: boolean; verified: boolean; product: string; productId: string; author: string | null };

export default function ReviewModeration({ rows, status }: { rows: Row[]; status: string }) {
  const [sel, setSel] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const router = useRouter();
  const act = (ids: string[], a: Parameters<typeof moderate>[1]) => start(async () => { if (a === "delete" && !confirm("Delete permanently?")) return; await moderate(ids, a); setSel([]); router.refresh(); });
  return (
    <div>
      {sel.length > 0 && <div className="mb-3 flex gap-2 text-sm"><span>{sel.length} selected</span>
        {status !== "approved" && <button className={btn.secondary} disabled={pending} onClick={() => act(sel, "approve")}>Approve</button>}
        {status !== "rejected" && <button className={btn.secondary} disabled={pending} onClick={() => act(sel, "reject")}>Reject</button>}</div>}
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.id} className="flex gap-4 border border-charcoal/10 bg-white p-4 text-sm">
            <input type="checkbox" aria-label="Select review" checked={sel.includes(r.id)} onChange={(e) => setSel(e.target.checked ? [...sel, r.id] : sel.filter((x) => x !== r.id))} />
            <div className="flex-1">
              <p><span className="text-gold" aria-label={`${r.rating} stars`}>{"★".repeat(r.rating)}<span className="text-charcoal/20">{"★".repeat(5 - r.rating)}</span></span> <strong>{r.title}</strong> {r.verified && <Badge tone="ok">Verified buyer</Badge>} {r.featured && <Badge tone="scheduled">Featured</Badge>}</p>
              <p className="mt-1 whitespace-pre-line">{r.body}</p>
              <p className="mt-2 text-xs text-charcoal/55"><Link href={`/admin/products/${r.productId}`} className="underline">{r.product}</Link> · {r.author ?? "Guest"} · {new Date(r.at).toLocaleDateString("en-IN")}</p>
            </div>
            <div className="flex flex-col items-end gap-1 text-xs">
              {status !== "approved" && <button disabled={pending} onClick={() => act([r.id], "approve")} className="underline">Approve</button>}
              {status !== "rejected" && <button disabled={pending} onClick={() => act([r.id], "reject")} className="underline">Reject</button>}
              <button disabled={pending} onClick={() => act([r.id], r.featured ? "unfeature" : "feature")} className="underline">{r.featured ? "Unfeature" : "Feature on homepage"}</button>
              <button disabled={pending} onClick={() => act([r.id], "delete")} className="text-burgundy underline">Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
