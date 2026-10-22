"use client";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, GripVertical, Monitor, Plus, Smartphone, Tablet, Trash2, X } from "lucide-react";
import { saveDraft, publishHomepage, discardDraft } from "@/app/admin/(panel)/homepage/actions";
import { DEFAULTS, DEFAULT_ORDER, SECTION_LABEL, validateSection, type DraftSection, type SectionType } from "@/lib/homepage-schema";
import MediaField from "./MediaField";
import { Field, inputCls, btn, Badge } from "./ui";

type Opt = { id: string; label: string };
type Spec = { key: string; label: string; kind: "text" | "textarea" | "media" | "video" | "select" | "color" | "number" | "products" | "collections"; options?: [string, string][]; hint?: string };

const CTA = (k: string, l: string): Spec[] => [{ key: `${k}.label`, label: `${l} label`, kind: "text" }, { key: `${k}.href`, label: `${l} link`, kind: "text", hint: "e.g. /shop or /collections/festive-edit" }];
const FIELDS: Record<SectionType, Spec[]> = {
  hero: [
    { key: "heading", label: "Headline", kind: "text", hint: "A comma splits it into two lines" }, { key: "subheading", label: "Supporting text", kind: "textarea" },
    ...CTA("primaryCta", "Primary button"), ...CTA("secondaryCta", "Secondary button"),
    { key: "image", label: "Campaign image (desktop)", kind: "media" }, { key: "image2", label: "Second campaign image (smaller, overlaps the first)", kind: "media" }, { key: "mobileImage", label: "Campaign image (mobile, optional)", kind: "media" },
    { key: "imageAlt", label: "Image description (alt text)", kind: "text" }, { key: "video", label: "Campaign video (optional, replaces image)", kind: "video" },
    { key: "scene", label: "Background scene", kind: "select", options: [["silk3d", "3D silk (WebGL, falls back automatically)"], ["silk", "Silk threads (lightweight)"], ["none", "None"]] },
    { key: "bg", label: "Background colour", kind: "color" }, { key: "accent", label: "Accent colour", kind: "color" },
  ],
  banner: [{ key: "text", label: "Banner text", kind: "text" }, ...CTA("cta", "Link"), { key: "tone", label: "Colour", kind: "select", options: [["gold", "Champagne gold"], ["aubergine", "Aubergine"], ["rose", "Soft rose"]] }],
  collections: [{ key: "title", label: "Title", kind: "text" }, { key: "intro", label: "Intro", kind: "textarea" }, { key: "collectionIds", label: "Collections to feature (in order)", kind: "collections", hint: "Leave empty to show all visible collections in their Collections order" }],
  new_arrivals: [{ key: "title", label: "Title", kind: "text" }, { key: "intro", label: "Intro", kind: "text" }, { key: "limit", label: "How many", kind: "number" }, { key: "productIds", label: "Hand-pick products (optional)", kind: "products", hint: "Empty = latest products marked “New arrival”" }],
  favorites: [{ key: "title", label: "Title", kind: "text" }, { key: "intro", label: "Intro", kind: "text" }, { key: "limit", label: "How many", kind: "number" }, { key: "productIds", label: "Curated override (optional)", kind: "products", hint: "Empty = real bestsellers from paid orders, then manual bestseller picks" }],
  campaign: [
    { key: "kicker", label: "Small heading", kind: "text" }, { key: "heading", label: "Headline", kind: "text" }, { key: "body", label: "Text", kind: "textarea" },
    { key: "image", label: "Image", kind: "media" }, { key: "imageAlt", label: "Image description", kind: "text" }, ...CTA("cta", "Button"),
    { key: "imageSide", label: "Image side", kind: "select", options: [["left", "Left"], ["right", "Right"]] }, { key: "tone", label: "Tone", kind: "select", options: [["dark", "Dark"], ["light", "Light"]] },
    { key: "bg", label: "Background colour", kind: "color" },
  ],
  story: [{ key: "heading", label: "Headline", kind: "text" }, { key: "body", label: "Story", kind: "textarea" }, { key: "image", label: "Full-width image", kind: "media" }, { key: "imageAlt", label: "Image description", kind: "text" }, ...CTA("cta", "Button")],
  categories: [{ key: "title", label: "Title", kind: "text" }, { key: "intro", label: "Intro", kind: "text" }, { key: "showCollections", label: "Add a “Collections” tile", kind: "select", options: [["yes", "Yes"], ["no", "No"]] }],
  occasions: [{ key: "title", label: "Title", kind: "text" }],
  testimonials: [{ key: "title", label: "Title", kind: "text" }],
  newsletter: [{ key: "title", label: "Title", kind: "text" }, { key: "intro", label: "Intro", kind: "textarea" }],
};
const NOTES: Partial<Record<SectionType, string>> = {
  categories: "Shows every visible category with its image (Catalogue → Categories). Order and images are edited there.",
  occasions: "Shows categories marked “Show under Shop by occasion” (Catalogue → Categories).",
  testimonials: "Shows approved reviews you've featured (Reviews). Hidden automatically when there are none — reviews are never invented.",
};

const get = (o: Record<string, unknown>, path: string): unknown => path.split(".").reduce<unknown>((a, k) => (a && typeof a === "object" ? (a as Record<string, unknown>)[k] : undefined), o);
function setPath(o: Record<string, unknown>, path: string, v: unknown): Record<string, unknown> {
  const [k, ...rest] = path.split(".");
  if (!rest.length) return { ...o, [k]: v };
  return { ...o, [k]: setPath((o[k] as Record<string, unknown>) ?? {}, rest.join("."), v) };
}
const toLocal = (iso: string | null) => (iso ? new Date(Date.parse(iso) + 330 * 60_000).toISOString().slice(0, 16) : "");
const fromLocal = (v: string) => (v ? new Date(`${v}:00+05:30`).toISOString() : null);

export default function HomepageBuilder({ initial, live, hasDraft: hadDraft, savedAt, products, collections }: {
  initial: DraftSection[]; live: string; hasDraft: boolean; savedAt: string | null; products: Opt[]; collections: Opt[];
}) {
  const router = useRouter();
  const [sections, setSections] = useState<DraftSection[]>(initial);
  const [sel, setSel] = useState<string | null>(initial[0]?.id ?? null);
  const [dirty, setDirty] = useState(false);
  const [hasDraft, setHasDraft] = useState(hadDraft);
  const [saved, setSaved] = useState(savedAt);
  const [errors, setErrors] = useState<Record<string, Record<string, string>>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [preview, setPreview] = useState<null | 390 | 820 | 1280>(null);
  const [frameKey, setFrameKey] = useState(0);
  const [drag, setDrag] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const differsFromLive = useMemo(() => hasDraft && JSON.stringify(sections) !== live, [sections, live, hasDraft]);

  const update = (fn: (s: DraftSection[]) => DraftSection[]) => { setSections(fn); setDirty(true); };
  const save = useCallback(async (list: DraftSection[]) => {
    const r = await saveDraft(list);
    if (r.ok) { setDirty(false); setHasDraft(true); setSaved(r.savedAt ?? null); setErrors(r.errors); setFrameKey((k) => k + 1); }
    else setMsg({ ok: false, text: r.message });
  }, []);
  useEffect(() => { // autosave
    if (!dirty) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => save(sections), 1500);
    return () => clearTimeout(timer.current);
  }, [sections, dirty, save]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault(); };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const current = sections.find((s) => s.id === sel) ?? null;
  const patch = (id: string, fn: (s: DraftSection) => DraftSection) => update((list) => list.map((s) => (s.id === id ? fn(s) : s)));
  const move = (from: number, to: number) => { if (to < 0 || to >= sections.length) return; update((l) => { const n = [...l]; const [x] = n.splice(from, 1); n.splice(to, 0, x); return n; }); };
  const add = (type: SectionType) => {
    const s: DraftSection = { id: crypto.randomUUID(), type, content: structuredClone(DEFAULTS[type]) as Record<string, unknown>, isVisible: true, publishAt: null, unpublishAt: null };
    const at = current ? sections.findIndex((x) => x.id === current.id) + 1 : sections.length;
    update((l) => [...l.slice(0, at), s, ...l.slice(at)]); setSel(s.id);
  };
  const localErr = current ? (validateSection(current.type, current.content).ok ? {} : (validateSection(current.type, current.content) as { errors: Record<string, string> }).errors) : {};
  const errs = current ? { ...localErr, ...(errors[current.id] ?? {}) } : {};

  return (
    <div className="-m-6 flex min-h-[calc(100vh-56px)] flex-col">
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-charcoal/10 bg-ivory/95 px-6 py-3 backdrop-blur">
        <h1 className="font-serif text-2xl text-aubergine">Homepage</h1>
        <span className="text-xs text-charcoal/60" aria-live="polite">
          {dirty ? "Saving…" : hasDraft ? (differsFromLive ? `Draft saved ${saved ? new Date(saved).toLocaleTimeString("en-IN", { timeStyle: "short" }) : ""} · not live yet` : "Draft matches the live homepage") : "Showing the live homepage"}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex border border-charcoal/20 bg-white" role="group" aria-label="Preview size">
            {([[1280, Monitor, "Desktop"], [820, Tablet, "Tablet"], [390, Smartphone, "Mobile"]] as const).map(([w, Icon, l]) => (
              <button key={w} title={`Preview ${l}`} aria-pressed={preview === w} onClick={async () => { if (dirty) await save(sections); setPreview(preview === w ? null : w); setFrameKey((k) => k + 1); }}
                className={`p-2 ${preview === w ? "bg-aubergine text-ivory" : "hover:bg-ivory"}`}><Icon size={16} /></button>
            ))}
          </div>
          {hasDraft && <button className={btn.ghost} disabled={pending} onClick={() => { if (confirm("Discard all unpublished changes?")) start(async () => { const r = await discardDraft(); setMsg({ ok: r.ok, text: r.message }); router.refresh(); location.reload(); }); }}>Discard draft</button>}
          <button className={btn.primary} disabled={pending || dirty || !hasDraft} onClick={() => start(async () => {
            const r = await publishHomepage(); setErrors(r.errors); setMsg({ ok: r.ok, text: r.message });
            if (r.ok) { setHasDraft(false); router.refresh(); }
            else { const first = Object.keys(r.errors)[0]; if (first) setSel(first); }
          })}>{pending ? "Publishing…" : "Publish"}</button>
        </div>
      </div>
      {msg && <p role="status" className={`mx-6 mt-3 border px-3 py-2 text-sm ${msg.ok ? "border-emerald-200 bg-emerald-50" : "border-burgundy/30 bg-rose text-burgundy"}`}>{msg.text} <button onClick={() => setMsg(null)} aria-label="Dismiss" className="float-right"><X size={14} /></button></p>}

      <div className={`grid flex-1 gap-0 ${preview ? "xl:grid-cols-[300px_380px_1fr]" : "lg:grid-cols-[320px_1fr]"}`}>
        <aside className="border-r border-charcoal/10 bg-white p-4" aria-label="Sections">
          <ol className="space-y-1">
            {sections.map((s, i) => {
              const bad = errors[s.id] || !validateSection(s.type, s.content).ok;
              return (
                <li key={s.id} draggable onDragStart={() => setDrag(i)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (drag !== null) move(drag, i); setDrag(null); }}
                  className={`group flex items-center gap-1 border px-2 py-2 text-sm ${sel === s.id ? "border-aubergine bg-ivory" : "border-transparent hover:border-charcoal/15"} ${s.isVisible ? "" : "opacity-50"}`}>
                  <GripVertical size={14} className="shrink-0 cursor-grab text-charcoal/40" aria-hidden />
                  <button className="min-w-0 flex-1 truncate text-left" onClick={() => setSel(s.id)}>
                    {SECTION_LABEL[s.type]}<span className="block truncate text-xs text-charcoal/50">{String(s.content.heading ?? s.content.title ?? s.content.text ?? "")}</span>
                  </button>
                  {bad && <Badge tone="out">Fix</Badge>}
                  {(s.publishAt || s.unpublishAt) && <Badge tone="scheduled">Sched.</Badge>}
                  <div className="flex opacity-60 group-hover:opacity-100">
                    <button aria-label="Move up" onClick={() => move(i, i - 1)} className="p-1"><ArrowUp size={13} /></button>
                    <button aria-label="Move down" onClick={() => move(i, i + 1)} className="p-1"><ArrowDown size={13} /></button>
                    <button aria-label={s.isVisible ? "Hide" : "Show"} onClick={() => patch(s.id, (x) => ({ ...x, isVisible: !x.isVisible }))} className="p-1">{s.isVisible ? <Eye size={13} /> : <EyeOff size={13} />}</button>
                  </div>
                </li>
              );
            })}
          </ol>
          <label className="mt-4 block text-sm">
            <span className="flex items-center gap-1 text-charcoal/70"><Plus size={14} />Add a section</span>
            <select className={inputCls} value="" onChange={(e) => { if (e.target.value) add(e.target.value as SectionType); }}>
              <option value="">Choose…</option>{(Object.keys(SECTION_LABEL) as SectionType[]).map((t) => <option key={t} value={t}>{SECTION_LABEL[t]}</option>)}
            </select>
          </label>
          <button className={`${btn.ghost} mt-4 text-xs`} onClick={() => { if (confirm("Replace the draft with the default layout?")) { update(() => DEFAULT_ORDER.map((type) => ({ id: crypto.randomUUID(), type, content: structuredClone(DEFAULTS[type]) as Record<string, unknown>, isVisible: true, publishAt: null, unpublishAt: null }))); } }}>Start from the default layout</button>
        </aside>

        <section className="min-w-0 p-6" aria-label="Section editor">
          {!current ? <p className="text-sm text-charcoal/60">Select a section to edit it, or add a new one.</p> : (
            <div className="max-w-2xl space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-serif text-2xl text-aubergine">{SECTION_LABEL[current.type]}</h2>
                <div className="flex gap-2">
                  <button className={btn.ghost} onClick={() => { const c = { ...structuredClone(current), id: crypto.randomUUID() }; const i = sections.indexOf(current); update((l) => [...l.slice(0, i + 1), c, ...l.slice(i + 1)]); setSel(c.id); }}><Copy size={14} />Duplicate</button>
                  <button className="text-sm text-burgundy" onClick={() => { if (confirm("Remove this section?")) { update((l) => l.filter((x) => x.id !== current.id)); setSel(null); } }}><Trash2 size={14} className="inline" /> Remove</button>
                </div>
              </div>
              {NOTES[current.type] && <p className="text-xs text-charcoal/60">{NOTES[current.type]}</p>}
              {errs._ && <p className="text-sm text-burgundy">{errs._}</p>}
              {FIELDS[current.type].map((f) => (
                <FieldEditor key={`${current.id}-${f.key}`} spec={f} value={get(current.content, f.key)} error={errs[f.key]} products={products} collections={collections}
                  onChange={(v) => patch(current.id, (s) => ({ ...s, content: setPath(s.content, f.key, v) }))} />
              ))}
              <fieldset className="grid gap-3 border-t border-charcoal/10 pt-4 sm:grid-cols-2">
                <legend className="mb-2 text-sm text-charcoal/80">Schedule (IST, optional)</legend>
                <Field label="Show from"><input type="datetime-local" className={inputCls} value={toLocal(current.publishAt)} onChange={(e) => patch(current.id, (s) => ({ ...s, publishAt: fromLocal(e.target.value) }))} /></Field>
                <Field label="Hide after" error={errs.unpublishAt}><input type="datetime-local" className={inputCls} value={toLocal(current.unpublishAt)} onChange={(e) => patch(current.id, (s) => ({ ...s, unpublishAt: fromLocal(e.target.value) }))} /></Field>
                <p className="text-xs text-charcoal/50 sm:col-span-2">Scheduled sections switch on and off by themselves after you publish (within about a minute).</p>
              </fieldset>
            </div>
          )}
        </section>

        {preview && (
          <section className="hidden min-w-0 border-l border-charcoal/10 bg-charcoal/5 p-4 xl:block" aria-label="Preview">
            <div className="mx-auto h-[calc(100vh-140px)] overflow-hidden border border-charcoal/20 bg-white shadow-sm" style={{ width: Math.min(preview, 1280), maxWidth: "100%" }}>
              <iframe key={frameKey} title="Homepage draft preview" src="/preview/home" className="h-full w-full" style={preview === 1280 ? { width: 1280, height: "200%", transform: "scale(0.5)", transformOrigin: "0 0" } : undefined} />
            </div>
            <p className="mt-2 text-center text-xs text-charcoal/55">{preview === 1280 ? "Desktop (scaled to fit)" : preview === 820 ? "Tablet" : "Mobile"} · <a href="/preview/home" target="_blank" className="underline">Open full preview</a></p>
          </section>
        )}
      </div>
    </div>
  );
}

function FieldEditor({ spec, value, onChange, error, products, collections }: { spec: Spec; value: unknown; onChange: (v: unknown) => void; error?: string; products: Opt[]; collections: Opt[] }) {
  const s = value === undefined || value === null ? "" : String(value);
  switch (spec.kind) {
    case "media": return <MediaField label={spec.label} value={s} onChange={onChange} error={error} />;
    case "video": return <MediaField label={spec.label} value={s} onChange={onChange} error={error} accept="video/mp4,video/webm" />;
    case "textarea": return <Field label={spec.label} hint={spec.hint} error={error}><textarea rows={4} className={inputCls} value={s} onChange={(e) => onChange(e.target.value)} /></Field>;
    case "number": return <Field label={spec.label} hint={spec.hint} error={error}><input inputMode="numeric" className={inputCls} value={s} onChange={(e) => onChange(e.target.value.replace(/\D/g, "") ? Number(e.target.value.replace(/\D/g, "")) : undefined)} /></Field>;
    case "select": return <Field label={spec.label} hint={spec.hint} error={error}><select className={inputCls} value={s} onChange={(e) => onChange(e.target.value)}>{spec.options!.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>;
    case "color": return (
      <Field label={spec.label} hint="Leave blank for the brand default" error={error}>
        <div className="mt-1 flex items-center gap-2"><input type="color" value={s || "#30042E"} onChange={(e) => onChange(e.target.value)} className="h-9 w-12 border border-charcoal/20" aria-label={spec.label} />
          <input className={`${inputCls} mt-0 w-32`} value={s} placeholder="#30042E" onChange={(e) => onChange(e.target.value)} />{s && <button type="button" onClick={() => onChange("")} className="text-xs underline">Reset</button>}</div>
      </Field>
    );
    case "products": case "collections": return <OrderedPicker label={spec.label} hint={spec.hint} opts={spec.kind === "products" ? products : collections} value={(value as string[]) ?? []} onChange={onChange} />;
    default: return <Field label={spec.label} hint={spec.hint} error={error}><input className={inputCls} value={s} onChange={(e) => onChange(e.target.value)} /></Field>;
  }
}

function OrderedPicker({ label, hint, opts, value, onChange }: { label: string; hint?: string; opts: Opt[]; value: string[]; onChange: (v: string[]) => void }) {
  const [q, setQ] = useState("");
  const name = (id: string) => opts.find((o) => o.id === id)?.label ?? "(removed)";
  const results = q ? opts.filter((o) => !value.includes(o.id) && o.label.toLowerCase().includes(q.toLowerCase())).slice(0, 8) : [];
  const mv = (i: number, d: number) => { const j = i + d; if (j < 0 || j >= value.length) return; const n = [...value]; [n[i], n[j]] = [n[j], n[i]]; onChange(n); };
  return (
    <div className="text-sm">
      <p className="text-charcoal/80">{label}</p>
      {hint && <p className="text-xs text-charcoal/50">{hint}</p>}
      <ol className="mt-2 space-y-1">{value.map((id, i) => (
        <li key={id} className="flex items-center gap-2 border border-charcoal/10 bg-white px-2 py-1">
          <span className="w-5 text-xs text-charcoal/50">{i + 1}</span><span className="flex-1 truncate">{name(id)}</span>
          <button type="button" aria-label="Up" onClick={() => mv(i, -1)}><ArrowUp size={12} /></button><button type="button" aria-label="Down" onClick={() => mv(i, 1)}><ArrowDown size={12} /></button>
          <button type="button" aria-label="Remove" onClick={() => onChange(value.filter((x) => x !== id))}><X size={12} /></button>
        </li>
      ))}</ol>
      <input className={inputCls} placeholder="Search to add…" value={q} onChange={(e) => setQ(e.target.value)} />
      {results.length > 0 && <ul className="border border-t-0 border-charcoal/15 bg-white">{results.map((o) => <li key={o.id}><button type="button" className="block w-full px-3 py-1.5 text-left hover:bg-ivory" onClick={() => { onChange([...value, o.id]); setQ(""); }}>{o.label}</button></li>)}</ul>}
    </div>
  );
}
