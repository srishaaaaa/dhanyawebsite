"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { saveCoupon, deleteCoupon } from "@/app/admin/(panel)/discounts/actions";
import { Card, Field, inputCls, btn, Badge, Empty } from "./ui";
import { formatINR } from "@/lib/money";

type Row = { id: string; code: string; description: string; type: "percentage" | "fixed"; value: string; minOrderValue: string; maxDiscount: string; usageLimit: string;
  perCustomerLimit: string; productIds: string[]; collectionIds: string[]; startsAt: string; expiresAt: string; isActive: boolean; usedCount: number; redeemed: number; expired: boolean };
type Opt = { id: string; label: string };
const blank = (): Row => ({ id: "", code: "", description: "", type: "percentage", value: "", minOrderValue: "", maxDiscount: "", usageLimit: "", perCustomerLimit: "1", productIds: [], collectionIds: [], startsAt: "", expiresAt: "", isActive: true, usedCount: 0, redeemed: 0, expired: false });

export default function CouponManager({ rows, products, collections, canDelete }: { rows: Row[]; products: Opt[]; collections: Opt[]; canDelete: boolean }) {
  const [e, setE] = useState<Row | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const set = (k: keyof Row, v: unknown) => setE((s) => (s ? { ...s, [k]: v } : s));

  function save() {
    if (!e) return;
    start(async () => {
      const r = await saveCoupon({ ...e, id: e.id || null });
      if (r.ok) { setE(null); setErrs({}); setMsg("Saved."); router.refresh(); } else { setErrs(r.fields ?? {}); setMsg(r.error); }
    });
  }
  const summary = (r: Row) => `${r.type === "percentage" ? `${r.value}% off` : `${formatINR(r.value)} off`}${r.minOrderValue ? ` over ${formatINR(r.minOrderValue)}` : ""}${r.maxDiscount ? `, max ${formatINR(r.maxDiscount)}` : ""}${r.productIds.length || r.collectionIds.length ? " · selected items" : ""}`;

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[1fr_440px]">
      <div>
        {msg && <p role="status" className="mb-3 text-sm">{msg}</p>}
        {rows.length === 0 ? <Empty title="No discount codes yet" body="Create a code for a festive sale, a first-order welcome or a collection launch." /> : (
          <div className="overflow-x-auto border border-charcoal/10 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-charcoal/10 text-left text-xs text-charcoal/60"><tr><th className="p-3">Code</th><th className="p-3">Offer</th><th className="p-3">Used</th><th className="p-3">Status</th><th /></tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={r.id} className="border-t border-charcoal/10">
                  <td className="p-3 font-mono">{r.code}<span className="block font-sans text-xs text-charcoal/50">{r.description}</span></td>
                  <td className="p-3">{summary(r)}</td>
                  <td className="p-3">{r.usedCount}{r.usageLimit ? ` / ${r.usageLimit}` : ""}<span className="block text-xs text-charcoal/50">{formatINR(r.redeemed)} given</span></td>
                  <td className="p-3">{!r.isActive ? <Badge tone="muted">Off</Badge> : r.expired ? <Badge tone="muted">Expired</Badge> : r.startsAt && new Date(r.startsAt) > new Date() ? <Badge tone="scheduled">Scheduled</Badge> : <Badge tone="ok">Active</Badge>}</td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <button className={btn.ghost} onClick={() => { setE({ ...r }); setErrs({}); }}>Edit</button>
                    {canDelete && <button className="ml-3 text-xs text-burgundy underline" onClick={() => { if (confirm(`Delete ${r.code}?`)) start(async () => { const x = await deleteCoupon(r.id); setMsg(x.message); router.refresh(); }); }}>Delete</button>}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
      <Card title={e ? (e.id ? `Edit ${e.code}` : "New discount code") : "Create a code"}>
        {!e ? <button className={btn.primary} onClick={() => setE(blank())}><Plus size={15} />New code</button> : (
          <form className="space-y-4" onSubmit={(ev) => { ev.preventDefault(); save(); }}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Code" error={errs.code}><input className={`${inputCls} uppercase`} value={e.code} onChange={(x) => set("code", x.target.value.toUpperCase())} /></Field>
              <Field label="Type"><select className={inputCls} value={e.type} onChange={(x) => set("type", x.target.value)}><option value="percentage">Percentage</option><option value="fixed">Fixed amount (₹)</option></select></Field>
              <Field label={e.type === "percentage" ? "Percent off" : "Amount off (₹)"} error={errs.value}><input inputMode="decimal" className={inputCls} value={e.value} onChange={(x) => set("value", x.target.value)} /></Field>
              <Field label="Max discount (₹)" error={errs.maxDiscount} hint="Optional cap"><input inputMode="decimal" className={inputCls} value={e.maxDiscount} onChange={(x) => set("maxDiscount", x.target.value)} /></Field>
              <Field label="Minimum order (₹)" error={errs.minOrderValue}><input inputMode="decimal" className={inputCls} value={e.minOrderValue} onChange={(x) => set("minOrderValue", x.target.value)} /></Field>
              <Field label="Total uses" error={errs.usageLimit} hint="Blank = unlimited"><input inputMode="numeric" className={inputCls} value={e.usageLimit} onChange={(x) => set("usageLimit", x.target.value)} /></Field>
              <Field label="Uses per customer" error={errs.perCustomerLimit}><input inputMode="numeric" className={inputCls} value={e.perCustomerLimit} onChange={(x) => set("perCustomerLimit", x.target.value)} /></Field>
              <div />
              <Field label="Starts (IST)" error={errs.startsAt}><input type="datetime-local" className={inputCls} value={e.startsAt} onChange={(x) => set("startsAt", x.target.value)} /></Field>
              <Field label="Expires (IST)" error={errs.expiresAt}><input type="datetime-local" className={inputCls} value={e.expiresAt} onChange={(x) => set("expiresAt", x.target.value)} /></Field>
            </div>
            <Field label="Internal description"><input className={inputCls} value={e.description} onChange={(x) => set("description", x.target.value)} /></Field>
            <Picker label="Only these collections (optional)" opts={collections} value={e.collectionIds} onChange={(v) => set("collectionIds", v)} />
            <Picker label="Only these products (optional)" opts={products} value={e.productIds} onChange={(v) => set("productIds", v)} />
            <p className="text-xs text-charcoal/55">With no products or collections chosen, the code applies to the whole bag. Discounts come off GST-inclusive prices, so customers save exactly the advertised amount.</p>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={e.isActive} onChange={(x) => set("isActive", x.target.checked)} />Active</label>
            <div className="flex gap-2"><button disabled={pending} className={btn.primary}>{pending ? "Saving…" : "Save code"}</button><button type="button" className={btn.secondary} onClick={() => setE(null)}>Cancel</button></div>
          </form>
        )}
      </Card>
    </div>
  );
}

function Picker({ label, opts, value, onChange }: { label: string; opts: Opt[]; value: string[]; onChange: (v: string[]) => void }) {
  const [q, setQ] = useState("");
  if (!opts.length) return null;
  const shown = opts.filter((o) => !q || o.label.toLowerCase().includes(q.toLowerCase())).slice(0, 50);
  return (
    <fieldset className="text-sm"><legend className="mb-1 text-charcoal/80">{label}{value.length ? ` · ${value.length} chosen` : ""}</legend>
      {opts.length > 8 && <input className={`${inputCls} mb-2`} placeholder="Filter…" value={q} onChange={(e) => setQ(e.target.value)} />}
      <div className="max-h-36 space-y-1 overflow-y-auto border border-charcoal/10 p-2">
        {shown.map((o) => <label key={o.id} className="flex items-center gap-2"><input type="checkbox" checked={value.includes(o.id)} onChange={(e) => onChange(e.target.checked ? [...value, o.id] : value.filter((x) => x !== o.id))} /><span className="truncate">{o.label}</span></label>)}
      </div>
    </fieldset>
  );
}
