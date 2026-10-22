"use client";
import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { saveMenu } from "@/app/admin/(panel)/navigation/actions";
import { Card, inputCls, btn } from "./ui";

type Item = { label: string; href: string };
const SUGGEST = ["/shop", "/collections", "/about", "/contact", "/faq", "/size-guide", "/shipping-policy", "/returns", "/search"];

export default function MenuEditor({ location, title, initial }: { location: "header" | "footer"; title: string; initial: Item[] }) {
  const [items, setItems] = useState<Item[]>(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const upd = (i: number, k: keyof Item, v: string) => setItems(items.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const mv = (i: number, d: number) => { const j = i + d; if (j < 0 || j >= items.length) return; const n = [...items]; [n[i], n[j]] = [n[j], n[i]]; setItems(n); };
  return (
    <Card title={title}>
      <datalist id={`nav-${location}`}>{SUGGEST.map((s) => <option key={s} value={s} />)}</datalist>
      <ol className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-2">
            <input aria-label="Label" className={`${inputCls} mt-0`} value={it.label} placeholder="Label" onChange={(e) => upd(i, "label", e.target.value)} />
            <input aria-label="Link" className={`${inputCls} mt-0`} value={it.href} placeholder="/collections/festive-edit" list={`nav-${location}`} onChange={(e) => upd(i, "href", e.target.value)} />
            <button aria-label="Move up" onClick={() => mv(i, -1)}><ArrowUp size={14} /></button>
            <button aria-label="Move down" onClick={() => mv(i, 1)}><ArrowDown size={14} /></button>
            <button aria-label="Remove" onClick={() => setItems(items.filter((_, j) => j !== i))}><X size={14} /></button>
          </li>
        ))}
      </ol>
      {items.length === 0 && <p className="text-sm text-charcoal/60">No links — {location === "header" ? "the default menu is shown" : "only the standard footer links are shown"}.</p>}
      <div className="mt-4 flex items-center gap-3">
        {items.length < 10 && <button className={btn.ghost} onClick={() => setItems([...items, { label: "", href: "/" }])}><Plus size={14} />Add link</button>}
        <button disabled={pending} className={btn.primary} onClick={() => start(async () => { const r = await saveMenu(location, items); setMsg({ ok: r.ok, text: r.message }); })}>{pending ? "Saving…" : "Save menu"}</button>
        {msg && <span role="status" className={`text-sm ${msg.ok ? "text-emerald-800" : "text-burgundy"}`}>{msg.text}</span>}
      </div>
    </Card>
  );
}
