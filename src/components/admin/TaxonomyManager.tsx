"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { saveCategory, saveCollection, deleteCategory, deleteCollection, reorder } from "@/app/admin/(panel)/catalog-actions";
import MediaField from "./MediaField";
import { Card, Field, inputCls, btn, Badge, Empty } from "./ui";
import { slugify } from "@/lib/slug";

export type TaxRow = {
  id: string; name: string; slug: string; description: string; imageUrl: string; sortOrder: number; isVisible: boolean; productCount: number;
  parentId?: string; isOccasion?: boolean; ctaLabel?: string; ctaHref?: string;
};
type Kind = "category" | "collection";
const blank = (): TaxRow => ({ id: "", name: "", slug: "", description: "", imageUrl: "", sortOrder: 0, isVisible: true, productCount: 0, parentId: "", isOccasion: false, ctaLabel: "", ctaHref: "" });

export default function TaxonomyManager({ kind, rows, canDelete }: { kind: Kind; rows: TaxRow[]; canDelete: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<TaxRow | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [order, setOrder] = useState(rows.map((r) => r.id));
  const [pending, start] = useTransition();
  useEffect(() => setOrder(rows.map((r) => r.id)), [rows]);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const sorted = order.map((id) => byId.get(id)).filter(Boolean) as TaxRow[];
  const noun = kind === "category" ? "category" : "collection";

  function save() {
    if (!editing) return;
    const e = editing;
    start(async () => {
      const res = kind === "category"
        ? await saveCategory({ id: e.id || null, name: e.name, slug: e.slug, description: e.description, imageUrl: e.imageUrl, parentId: e.parentId, isOccasion: !!e.isOccasion, sortOrder: e.sortOrder, isVisible: e.isVisible })
        : await saveCollection({ id: e.id || null, title: e.name, slug: e.slug, description: e.description, imageUrl: e.imageUrl, ctaLabel: e.ctaLabel, ctaHref: e.ctaHref, sortOrder: e.sortOrder, isVisible: e.isVisible });
      if (res.ok) { setEditing(null); setErrors({}); setMsg({ ok: true, text: "Saved." }); router.refresh(); }
      else { setErrors({ ...(res.fields ?? {}), ...(res.fields?.title ? { name: res.fields.title } : {}) }); setMsg({ ok: false, text: res.error }); }
    });
  }
  function move(i: number, d: number) {
    const j = i + d; if (j < 0 || j >= order.length) return;
    const next = [...order]; [next[i], next[j]] = [next[j], next[i]]; setOrder(next);
    start(async () => { await reorder(kind, next); router.refresh(); });
  }
  function remove(r: TaxRow) {
    if (!confirm(`Delete “${r.name}”?${kind === "collection" ? " Products stay in the catalogue." : ""}`)) return;
    start(async () => {
      const res = kind === "category" ? await deleteCategory(r.id) : await deleteCollection(r.id);
      setMsg({ ok: res.ok, text: res.ok ? "Deleted." : res.error ?? "Couldn't delete." });
      if (res.ok) router.refresh();
    });
  }
  const e = editing;
  const set = (k: keyof TaxRow, v: unknown) => setEditing((s) => (s ? { ...s, [k]: v } : s));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px] items-start">
      <div>
        {msg && <p role="status" className={`mb-3 text-sm ${msg.ok ? "text-emerald-800" : "text-burgundy"}`}>{msg.text}</p>}
        {sorted.length === 0 ? <Empty title={`No ${noun === "category" ? "categories" : "collections"} yet`} body={`Create your first ${noun} with the form.`} /> : (
          <ul className="bg-white border border-charcoal/10 divide-y divide-charcoal/10">
            {sorted.map((r, i) => (
              <li key={r.id} className="flex items-center gap-3 p-3">
                <div className="flex flex-col text-charcoal/50">
                  <button aria-label="Move up" disabled={pending || i === 0} onClick={() => move(i, -1)} className="hover:text-aubergine disabled:opacity-30"><ArrowUp size={14} /></button>
                  <button aria-label="Move down" disabled={pending || i === sorted.length - 1} onClick={() => move(i, 1)} className="hover:text-aubergine disabled:opacity-30"><ArrowDown size={14} /></button>
                </div>
                <span className="h-12 w-12 shrink-0 bg-rose/50 overflow-hidden">{r.imageUrl && <img src={r.imageUrl} alt="" className="h-full w-full object-cover" />}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate">{r.parentId && byId.get(r.parentId) ? <span className="text-charcoal/50">{byId.get(r.parentId)!.name} / </span> : null}{r.name}</p>
                  <p className="text-xs text-charcoal/50">/{kind === "category" ? "category" : "collections"}/{r.slug} · {r.productCount} product{r.productCount === 1 ? "" : "s"}</p>
                </div>
                {r.isOccasion && <Badge tone="scheduled">Occasion</Badge>}
                {!r.isVisible && <Badge tone="muted"><EyeOff size={11} className="inline" /> Hidden</Badge>}
                <button className={btn.ghost} onClick={() => { setEditing({ ...r }); setErrors({}); }} aria-label={`Edit ${r.name}`}><Pencil size={14} /></button>
                {canDelete && <button className="text-charcoal/50 hover:text-burgundy" onClick={() => remove(r)} aria-label={`Delete ${r.name}`}><Trash2 size={14} /></button>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <Card title={e ? (e.id ? `Edit ${noun}` : `New ${noun}`) : `Add a ${noun}`}>
        {!e ? (
          <button className={btn.primary} onClick={() => setEditing(blank())}><Plus size={15} />New {noun}</button>
        ) : (
          <form className="space-y-4" onSubmit={(ev) => { ev.preventDefault(); save(); }}>
            <Field label={kind === "category" ? "Name" : "Title"} error={errors.name}>
              <input className={inputCls} value={e.name} required onChange={(ev) => setEditing({ ...e, name: ev.target.value, slug: e.id ? e.slug : slugify(ev.target.value) })} />
            </Field>
            <Field label="Slug" error={errors.slug}><input className={inputCls} value={e.slug} onChange={(ev) => set("slug", slugify(ev.target.value))} /></Field>
            <Field label="Description" error={errors.description}><textarea rows={3} className={inputCls} value={e.description} onChange={(ev) => set("description", ev.target.value)} /></Field>
            <MediaField label="Image" value={e.imageUrl} onChange={(v) => set("imageUrl", v)} error={errors.imageUrl} />
            {kind === "category" ? (
              <>
                <Field label="Parent category" error={errors.parentId}>
                  <select className={inputCls} value={e.parentId} onChange={(ev) => set("parentId", ev.target.value)}>
                    <option value="">None (top level)</option>
                    {rows.filter((r) => r.id !== e.id).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </Field>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!e.isOccasion} onChange={(ev) => set("isOccasion", ev.target.checked)} />Show under “Shop by occasion”</label>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Button label" error={errors.ctaLabel}><input className={inputCls} placeholder="Explore" value={e.ctaLabel} onChange={(ev) => set("ctaLabel", ev.target.value)} /></Field>
                <Field label="Button link" error={errors.ctaHref} hint="Defaults to the collection page"><input className={inputCls} placeholder={`/collections/${e.slug}`} value={e.ctaHref} onChange={(ev) => set("ctaHref", ev.target.value)} /></Field>
              </div>
            )}
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={e.isVisible} onChange={(ev) => set("isVisible", ev.target.checked)} />Visible on the storefront</label>
            <div className="flex gap-2">
              <button disabled={pending} className={btn.primary}>{pending ? "Saving…" : "Save"}</button>
              <button type="button" className={btn.secondary} onClick={() => { setEditing(null); setErrors({}); }}>Cancel</button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
