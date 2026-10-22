"use client";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowDown, ArrowUp, Eye, GripVertical, ImagePlus, Plus, Trash2, Wand2 } from "lucide-react";
import { saveProduct, duplicateProduct, deleteProduct } from "@/app/admin/(panel)/products/actions";
import { uploadFile } from "./upload";
import { Card, Field, inputCls, btn } from "./ui";
import { slugify } from "@/lib/slug";
import { withGst, formatINR } from "@/lib/money";

export type VariantDraft = { id?: string | null; sku: string; size: string; color: string; colorHex: string; priceOverride: string; stock: number; isActive: boolean; reserved?: number };
export type ImageDraft = { id?: string | null; url: string; altText: string; colorName: string };
export type ProductDraft = {
  id?: string | null; name: string; slug: string; sku: string; description: string; designer: string;
  categoryId: string; collectionIds: string[]; productType: string; price: string; compareAtPrice: string; gstRate: string;
  hsnCode: string; material: string; careInstructions: string; fitInfo: string; sizeGuide: string; weightGrams: string;
  tags: string; videoUrl: string; model3dUrl: string; seoTitle: string; seoDescription: string;
  isFeatured: boolean; isBestseller: boolean; isNewArrival: boolean; lowStockThreshold: string;
  status: "draft" | "active" | "archived"; publishAt: string; relatedProductIds: string[];
  images: ImageDraft[]; variants: VariantDraft[];
};

export const EMPTY_PRODUCT: ProductDraft = {
  name: "", slug: "", sku: "", description: "", designer: "", categoryId: "", collectionIds: [], productType: "",
  price: "", compareAtPrice: "", gstRate: "5", hsnCode: "", material: "", careInstructions: "", fitInfo: "", sizeGuide: "",
  weightGrams: "", tags: "", videoUrl: "", model3dUrl: "", seoTitle: "", seoDescription: "", isFeatured: false,
  isBestseller: false, isNewArrival: true, lowStockThreshold: "3", status: "draft", publishAt: "", relatedProductIds: [],
  images: [], variants: [],
};

type Opt = { id: string; label: string };
type Props = { initial: ProductDraft; categories: Opt[]; collections: Opt[]; products: Opt[]; canDelete: boolean; notice?: string | null };

const GST_RATES = ["0", "5", "12", "18", "28"];

export default function ProductForm({ initial, categories, collections, products, canDelete, notice }: Props) {
  const router = useRouter();
  const [p, setP] = useState<ProductDraft>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<{ tone: "ok" | "err"; text: string } | null>(notice ? { tone: "ok", text: notice } : null);
  const [pending, start] = useTransition();
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.id));
  const set = <K extends keyof ProductDraft>(k: K, v: ProductDraft[K]) => setP((s) => ({ ...s, [k]: v }));
  const err = (k: string) => errors[k];

  function submit(status?: ProductDraft["status"]) {
    const draft = status ? { ...p, status } : p;
    setBanner(null);
    start(async () => {
      const payload = {
        ...draft,
        tags: draft.tags.split(",").map((t) => t.trim()).filter(Boolean),
        publishAt: draft.publishAt ? new Date(draft.publishAt).toISOString() : "",
        variants: draft.variants.map(({ reserved: _r, ...v }) => v),
      };
      const res = await saveProduct(payload);
      if (res.ok) {
        // Reload from the server so new variant/image ids are in state before the next save.
        router.replace(`/admin/products/${res.id}?saved=${Date.now()}`);
        router.refresh();
      } else {
        setErrors(res.fields ?? {});
        setBanner({ tone: "err", text: res.error });
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  const customerPrice = p.price && !Number.isNaN(Number(p.price)) ? withGst(p.price, p.gstRate || 0) : null;

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-6" noValidate>
      <div className="sticky top-0 z-10 -mx-6 -mt-6 mb-2 flex flex-wrap items-center gap-3 border-b border-charcoal/10 bg-ivory/95 px-6 py-3 backdrop-blur">
        <Link href="/admin/products" className={btn.ghost}>← Products</Link>
        <h1 className="font-serif text-2xl text-aubergine truncate max-w-[40ch]">{p.name || "New product"}</h1>
        <div className="ml-auto flex flex-wrap gap-2">
          {p.id && <Link href={`/preview/products/${p.id}`} target="_blank" className={btn.secondary}><Eye size={15} />Preview</Link>}
          {p.id && (
            <button type="button" className={btn.secondary} disabled={pending} onClick={() => start(async () => {
              const r = await duplicateProduct(p.id!);
              if (r.ok) router.push(`/admin/products/${r.id}`); else setBanner({ tone: "err", text: r.error });
            })}>Duplicate</button>
          )}
          <button type="submit" disabled={pending} className={btn.secondary}>{pending ? "Saving…" : "Save"}</button>
          {p.status !== "active" && <button type="button" disabled={pending} onClick={() => submit("active")} className={btn.primary}>Save and publish</button>}
        </div>
      </div>

      {banner && (
        <div role={banner.tone === "err" ? "alert" : "status"} className={`border px-4 py-3 text-sm ${banner.tone === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-burgundy/30 bg-rose text-burgundy"}`}>
          {banner.text}
          {banner.tone === "err" && Object.keys(errors).length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-xs">{Object.entries(errors).slice(0, 6).map(([k, v]) => <li key={k}>{k.replace(/\.(\d+)\./, " #$1 ")}: {v}</li>)}</ul>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6 min-w-0">
          <Card title="Basics">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Product name" error={err("name")}>
                <input className={inputCls} value={p.name} onChange={(e) => {
                  const name = e.target.value;
                  setP((s) => ({ ...s, name, slug: slugTouched ? s.slug : slugify(name), seoTitle: s.seoTitle }));
                }} required />
              </Field>
              <Field label="URL slug" error={err("slug")} hint={`/products/${p.slug || "…"}`}>
                <input className={inputCls} value={p.slug} onChange={(e) => { setSlugTouched(true); set("slug", slugify(e.target.value)); }} />
              </Field>
              <Field label="Product SKU" error={err("sku")}>
                <input className={inputCls} value={p.sku} onChange={(e) => set("sku", e.target.value.toUpperCase())} />
              </Field>
              <Field label="Designer or label (optional)" error={err("designer")}>
                <input className={inputCls} value={p.designer} onChange={(e) => set("designer", e.target.value)} />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Description" error={err("description")} hint="Supports **bold**, *italic*, lists and [links](https://…).">
                <textarea rows={6} className={inputCls} value={p.description} onChange={(e) => set("description", e.target.value)} />
              </Field>
            </div>
          </Card>

          <ImagesCard images={p.images} onChange={(v) => set("images", v)} error={err("images")} productName={p.name} />

          <VariantsCard p={p} onChange={(v) => set("variants", v)} errors={errors} />

          <Card title="Fabric, fit and care">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Material and fabric" error={err("material")}><textarea rows={3} className={inputCls} value={p.material} onChange={(e) => set("material", e.target.value)} /></Field>
              <Field label="Care instructions" error={err("careInstructions")}><textarea rows={3} className={inputCls} value={p.careInstructions} onChange={(e) => set("careInstructions", e.target.value)} /></Field>
              <Field label="Fit" error={err("fitInfo")}><textarea rows={3} className={inputCls} value={p.fitInfo} onChange={(e) => set("fitInfo", e.target.value)} /></Field>
              <Field label="Size guide notes" error={err("sizeGuide")} hint="Shown in the size guide on this product."><textarea rows={3} className={inputCls} value={p.sizeGuide} onChange={(e) => set("sizeGuide", e.target.value)} /></Field>
              <Field label="Weight (grams)" error={err("weightGrams")}><input inputMode="numeric" className={inputCls} value={p.weightGrams} onChange={(e) => set("weightGrams", e.target.value.replace(/\D/g, ""))} /></Field>
            </div>
          </Card>

          <Card title="Video and 3D">
            <div className="grid gap-4 sm:grid-cols-2">
              <MediaUrl label="Product video (MP4/WebM)" value={p.videoUrl} onChange={(v) => set("videoUrl", v)} accept="video/*" error={err("videoUrl")} />
              <MediaUrl label="3D model (.glb)" value={p.model3dUrl} onChange={(v) => set("model3dUrl", v)} accept=".glb,model/gltf-binary" error={err("model3dUrl")} />
            </div>
          </Card>

          <Card title="Search engine listing">
            <div className="space-y-4">
              <Field label={`SEO title (${p.seoTitle.length}/70)`} error={err("seoTitle")} hint="Leave blank to use the product name.">
                <input maxLength={70} className={inputCls} value={p.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} />
              </Field>
              <Field label={`Meta description (${p.seoDescription.length}/170)`} error={err("seoDescription")}>
                <textarea maxLength={170} rows={2} className={inputCls} value={p.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} />
              </Field>
              <div className="border border-charcoal/10 bg-ivory/60 p-3 text-sm">
                <p className="text-[#1a0dab] truncate">{p.seoTitle || p.name || "Product title"} | DHANYA BOUTIQUE</p>
                <p className="text-emerald-800 text-xs">/products/{p.slug}</p>
                <p className="text-charcoal/70 text-xs line-clamp-2">{p.seoDescription || p.description.slice(0, 160) || "Description preview"}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Visibility">
            <div className="space-y-4">
              <Field label="Status" error={err("status")}>
                <select className={inputCls} value={p.status} onChange={(e) => set("status", e.target.value as ProductDraft["status"])}>
                  <option value="draft">Draft — hidden</option>
                  <option value="active">Active — on the storefront</option>
                  <option value="archived">Archived — hidden, kept for orders</option>
                </select>
              </Field>
              <Field label="Publish on (optional)" error={err("publishAt")} hint="Active products stay hidden until this time (IST).">
                <input type="datetime-local" className={inputCls} value={p.publishAt} onChange={(e) => set("publishAt", e.target.value)} />
              </Field>
              <fieldset className="space-y-2 text-sm">
                <legend className="text-charcoal/80 mb-1">Highlight</legend>
                {([["isNewArrival", "New arrival"], ["isBestseller", "Bestseller (manual pick)"], ["isFeatured", "Featured on homepage"]] as const).map(([k, l]) => (
                  <label key={k} className="flex items-center gap-2"><input type="checkbox" checked={p[k]} onChange={(e) => set(k, e.target.checked)} />{l}</label>
                ))}
              </fieldset>
            </div>
          </Card>

          <Card title="Pricing and tax">
            <div className="space-y-4">
              <Field label="Selling price, excl. GST (₹)" error={err("price")}>
                <input inputMode="decimal" className={inputCls} value={p.price} onChange={(e) => set("price", e.target.value)} />
              </Field>
              <Field label="Compare-at price, excl. GST (₹)" error={err("compareAtPrice")} hint="Shown struck through when higher than the selling price.">
                <input inputMode="decimal" className={inputCls} value={p.compareAtPrice} onChange={(e) => set("compareAtPrice", e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="GST rate" error={err("gstRate")}>
                  <select className={inputCls} value={p.gstRate} onChange={(e) => set("gstRate", e.target.value)}>
                    {GST_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
                  </select>
                </Field>
                <Field label="HSN code" error={err("hsnCode")}>
                  <input inputMode="numeric" className={inputCls} value={p.hsnCode} onChange={(e) => set("hsnCode", e.target.value.replace(/\D/g, ""))} />
                </Field>
              </div>
              {customerPrice !== null && <p className="text-sm text-charcoal/70">Customers pay <strong className="text-aubergine">{formatINR(customerPrice)}</strong> incl. GST.</p>}
              <p className="text-xs text-charcoal/50">Check the GST rate for each item with your accountant — apparel rates depend on fabric and price.</p>
            </div>
          </Card>

          <Card title="Organisation">
            <div className="space-y-4">
              <Field label="Category" error={err("categoryId")}>
                <select className={inputCls} value={p.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
                  <option value="">None</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </Field>
              <MultiCheck label="Collections" options={collections} value={p.collectionIds} onChange={(v) => set("collectionIds", v)} empty="No collections yet." />
              <Field label="Product type" error={err("productType")} hint="e.g. Kurta set, Saree, Co-ord"><input className={inputCls} value={p.productType} onChange={(e) => set("productType", e.target.value)} /></Field>
              <Field label="Tags" error={err("tags")} hint="Comma-separated. Used in search."><input className={inputCls} value={p.tags} onChange={(e) => set("tags", e.target.value)} /></Field>
              <Field label="Low-stock alert at" error={err("lowStockThreshold")}><input inputMode="numeric" className={inputCls} value={p.lowStockThreshold} onChange={(e) => set("lowStockThreshold", e.target.value.replace(/\D/g, ""))} /></Field>
            </div>
          </Card>

          <Card title="Related products">
            <MultiCheck label="Shown under “You may also like”" options={products.filter((o) => o.id !== p.id)} value={p.relatedProductIds}
              onChange={(v) => set("relatedProductIds", v.slice(0, 12))} empty="No other products yet." searchable />
            {err("relatedProductIds") && <p className="text-xs text-burgundy mt-1">{err("relatedProductIds")}</p>}
          </Card>

          {p.id && canDelete && (
            <Card title="Danger zone">
              <p className="text-sm text-charcoal/60 mb-3">Products that appear in past orders are archived instead of deleted, so order history stays intact.</p>
              <button type="button" className={btn.danger} disabled={pending} onClick={() => {
                if (!confirm(`Delete “${p.name}”? This can't be undone.`)) return;
                start(async () => {
                  const r = await deleteProduct(p.id!);
                  if (r.ok && !r.archived) router.push("/admin/products");
                  else setBanner({ tone: r.ok ? "ok" : "err", text: r.error ?? "Done." });
                  if (r.archived) set("status", "archived");
                });
              }}><Trash2 size={15} />Delete product</button>
            </Card>
          )}
        </div>
      </div>
    </form>
  );
}

function MediaUrl({ label, value, onChange, accept, error }: { label: string; value: string; onChange: (v: string) => void; accept: string; error?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [pct, setPct] = useState<number | null>(null);
  const [e, setE] = useState<string | null>(null);
  return (
    <div className="text-sm">
      <span className="text-charcoal/80">{label}</span>
      <div className="mt-1 flex gap-2">
        <input className={`${inputCls} mt-0`} placeholder="https://…" value={value} onChange={(ev) => onChange(ev.target.value)} />
        <button type="button" className={btn.secondary} onClick={() => ref.current?.click()}>Upload</button>
        <input ref={ref} type="file" hidden accept={accept} onChange={async (ev) => {
          const f = ev.target.files?.[0]; if (!f) return;
          setE(null); setPct(0);
          try { onChange(await uploadFile(f, setPct)); } catch (x) { setE((x as Error).message); } finally { setPct(null); ev.target.value = ""; }
        }} />
      </div>
      {pct !== null && <div className="mt-2 h-1 bg-charcoal/10"><div className="h-full bg-gold" style={{ width: `${pct}%` }} /></div>}
      {(e || error) && <p className="text-xs text-burgundy mt-1" role="alert">{e ?? error}</p>}
    </div>
  );
}

function MultiCheck({ label, options, value, onChange, empty, searchable }: { label: string; options: Opt[]; value: string[]; onChange: (v: string[]) => void; empty: string; searchable?: boolean }) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => options.filter((o) => !q || o.label.toLowerCase().includes(q.toLowerCase())).slice(0, 60), [options, q]);
  return (
    <fieldset className="text-sm">
      <legend className="text-charcoal/80 mb-1">{label}</legend>
      {options.length === 0 ? <p className="text-xs text-charcoal/50">{empty}</p> : (
        <>
          {searchable && <input className={`${inputCls} mb-2`} placeholder="Filter…" value={q} onChange={(e) => setQ(e.target.value)} />}
          <div className="max-h-48 overflow-y-auto space-y-1 border border-charcoal/10 p-2">
            {shown.map((o) => (
              <label key={o.id} className="flex items-center gap-2">
                <input type="checkbox" checked={value.includes(o.id)} onChange={(e) => onChange(e.target.checked ? [...value, o.id] : value.filter((x) => x !== o.id))} />
                <span className="truncate">{o.label}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </fieldset>
  );
}

function ImagesCard({ images, onChange, error, productName }: { images: ImageDraft[]; onChange: (v: ImageDraft[]) => void; error?: string; productName: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<{ name: string; pct: number; error?: string }[]>([]);
  const [url, setUrl] = useState("");
  const [drag, setDrag] = useState<number | null>(null);
  const latest = useRef(images); latest.current = images;

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files);
    setUploads(list.map((f) => ({ name: f.name, pct: 0 })));
    await Promise.all(list.map(async (f, i) => {
      try {
        const u = await uploadFile(f, (pct) => setUploads((s) => s.map((x, j) => (j === i ? { ...x, pct } : x))));
        onChange([...latest.current, { url: u, altText: productName, colorName: "" }]);
        setUploads((s) => s.map((x, j) => (j === i ? { ...x, pct: 100 } : x)));
      } catch (e) {
        setUploads((s) => s.map((x, j) => (j === i ? { ...x, error: (e as Error).message } : x)));
      }
    }));
    setUploads((s) => s.filter((x) => x.error));
    if (ref.current) ref.current.value = "";
  }
  const move = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    const next = [...images]; const [it] = next.splice(from, 1); next.splice(to, 0, it); onChange(next);
  };
  const patch = (i: number, v: Partial<ImageDraft>) => onChange(images.map((im, j) => (j === i ? { ...im, ...v } : im)));

  return (
    <Card title="Images">
      <p className="text-xs text-charcoal/50 -mt-2 mb-3">The first image is the main photo; the second appears on hover. Drag to reorder. Tag an image with a colour to show it when that colour is selected.</p>
      {images.length === 0 && <p className="text-sm text-charcoal/60 mb-3">No images yet.</p>}
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {images.map((im, i) => (
          <li key={im.id ?? im.url + i} draggable onDragStart={() => setDrag(i)} onDragOver={(e) => e.preventDefault()}
            onDrop={() => { if (drag !== null) move(drag, i); setDrag(null); }}
            className={`border bg-ivory/50 p-2 ${drag === i ? "border-gold" : "border-charcoal/10"}`}>
            <div className="relative aspect-[4/5] bg-rose/40 overflow-hidden">
              <img src={im.url} alt={im.altText} className="h-full w-full object-cover" onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0.2")} />
              {i === 0 && <span className="absolute left-1 top-1 bg-aubergine px-1.5 py-0.5 text-[10px] text-ivory">Main</span>}
            </div>
            <input aria-label="Alt text" placeholder="Alt text (describe the photo)" className={`${inputCls} text-xs`} value={im.altText} onChange={(e) => patch(i, { altText: e.target.value })} />
            <input aria-label="Colour" placeholder="Colour (optional)" className={`${inputCls} text-xs`} value={im.colorName} onChange={(e) => patch(i, { colorName: e.target.value })} />
            <div className="mt-2 flex items-center gap-1 text-charcoal/60">
              <GripVertical size={14} className="cursor-grab" aria-hidden />
              <button type="button" aria-label="Move earlier" onClick={() => move(i, i - 1)} className="p-1 hover:text-aubergine"><ArrowUp size={14} /></button>
              <button type="button" aria-label="Move later" onClick={() => move(i, i + 1)} className="p-1 hover:text-aubergine"><ArrowDown size={14} /></button>
              <button type="button" aria-label="Remove image" onClick={() => onChange(images.filter((_, j) => j !== i))} className="ml-auto p-1 hover:text-burgundy"><Trash2 size={14} /></button>
            </div>
          </li>
        ))}
      </ul>
      {uploads.length > 0 && (
        <ul className="mt-3 space-y-2 text-xs" aria-live="polite">
          {uploads.map((u, i) => (
            <li key={i}>{u.name} {u.error ? <span className="text-burgundy">— {u.error}</span> : `${u.pct}%`}
              {!u.error && <div className="h-1 bg-charcoal/10 mt-1"><div className="h-full bg-gold" style={{ width: `${u.pct}%` }} /></div>}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className={btn.secondary} onClick={() => ref.current?.click()}><ImagePlus size={15} />Upload images</button>
        <input ref={ref} type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" hidden onChange={(e) => addFiles(e.target.files)} />
        <div className="flex flex-1 min-w-[240px] gap-2">
          <input className={`${inputCls} mt-0`} placeholder="…or paste an image URL (https://)" value={url} onChange={(e) => setUrl(e.target.value)} />
          <button type="button" className={btn.secondary} onClick={() => { if (/^https:\/\//.test(url)) { onChange([...images, { url, altText: productName, colorName: "" }]); setUrl(""); } }}>Add</button>
        </div>
      </div>
      {error && <p role="alert" className="text-xs text-burgundy mt-2">{error}</p>}
    </Card>
  );
}

function VariantsCard({ p, onChange, errors }: { p: ProductDraft; onChange: (v: VariantDraft[]) => void; errors: Record<string, string> }) {
  const [sizes, setSizes] = useState("XS, S, M, L, XL");
  const [colors, setColors] = useState("");
  const v = p.variants;
  const patch = (i: number, x: Partial<VariantDraft>) => onChange(v.map((r, j) => (j === i ? { ...r, ...x } : r)));
  const code = (s: string) => s.replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase();

  function generate() {
    const sz = sizes.split(",").map((s) => s.trim()).filter(Boolean);
    const cl = colors.split(",").map((s) => s.trim()).filter(Boolean).map((c) => {
      const [name, hex] = c.split(":").map((x) => x.trim());
      return { name, hex: /^#[0-9a-f]{6}$/i.test(hex ?? "") ? hex : "" };
    });
    const base = p.sku || "SKU";
    const rows: VariantDraft[] = [];
    for (const s of sz.length ? sz : [""]) for (const c of cl.length ? cl : [{ name: "", hex: "" }]) {
      const existing = v.find((r) => r.size.toLowerCase() === s.toLowerCase() && r.color.toLowerCase() === c.name.toLowerCase());
      rows.push(existing ?? { sku: [base, code(s), code(c.name)].filter(Boolean).join("-"), size: s, color: c.name, colorHex: c.hex, priceOverride: "", stock: 0, isActive: true });
    }
    const extra = v.filter((r) => !rows.includes(r));
    if (extra.length && !confirm(`${extra.length} existing variant(s) aren't in the new size/colour list. Remove them? (They'll be hidden, not deleted.)`)) {
      onChange([...rows, ...extra]); return;
    }
    onChange(rows);
  }
  const total = v.reduce((a, r) => a + (r.isActive ? Number(r.stock) || 0 : 0), 0);

  return (
    <Card title="Sizes, colours and stock">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] items-end mb-4">
        <Field label="Sizes" hint="Comma-separated, e.g. S, M, L or Free size"><input className={inputCls} value={sizes} onChange={(e) => setSizes(e.target.value)} /></Field>
        <Field label="Colours" hint="e.g. Wine:#54162F, Ivory:#F8F3EB"><input className={inputCls} value={colors} onChange={(e) => setColors(e.target.value)} /></Field>
        <button type="button" className={btn.secondary} onClick={generate}><Wand2 size={15} />Generate</button>
      </div>
      {errors.variants && <p role="alert" className="text-xs text-burgundy mb-2">{errors.variants}</p>}
      {v.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="text-left text-xs text-charcoal/60">
              <tr><th className="p-1.5">Size</th><th className="p-1.5">Colour</th><th className="p-1.5">Swatch</th><th className="p-1.5">Variant SKU</th><th className="p-1.5">Price override</th><th className="p-1.5">Stock</th><th className="p-1.5">On sale</th><th /></tr>
            </thead>
            <tbody>
              {v.map((r, i) => (
                <tr key={r.id ?? i} className={`border-t border-charcoal/10 ${r.isActive ? "" : "opacity-50"}`}>
                  <td className="p-1.5"><input aria-label="Size" className={`${inputCls} mt-0 w-20`} value={r.size} onChange={(e) => patch(i, { size: e.target.value })} />{errors[`variants.${i}.size`] && <p className="text-[11px] text-burgundy">{errors[`variants.${i}.size`]}</p>}</td>
                  <td className="p-1.5"><input aria-label="Colour" className={`${inputCls} mt-0 w-28`} value={r.color} onChange={(e) => patch(i, { color: e.target.value })} /></td>
                  <td className="p-1.5"><input aria-label="Swatch colour" type="color" className="h-9 w-10 border border-charcoal/20" value={r.colorHex || "#ffffff"} onChange={(e) => patch(i, { colorHex: e.target.value })} /></td>
                  <td className="p-1.5"><input aria-label="Variant SKU" className={`${inputCls} mt-0 w-40`} value={r.sku} onChange={(e) => patch(i, { sku: e.target.value.toUpperCase() })} />{errors[`variants.${i}.sku`] && <p className="text-[11px] text-burgundy">{errors[`variants.${i}.sku`]}</p>}</td>
                  <td className="p-1.5"><input aria-label="Price override" inputMode="decimal" placeholder="—" className={`${inputCls} mt-0 w-24`} value={r.priceOverride} onChange={(e) => patch(i, { priceOverride: e.target.value })} /></td>
                  <td className="p-1.5">
                    <input aria-label="Stock" inputMode="numeric" className={`${inputCls} mt-0 w-20`} value={r.stock} onChange={(e) => patch(i, { stock: Number(e.target.value.replace(/\D/g, "") || 0) })} />
                    {!!r.reserved && <p className="text-[11px] text-charcoal/50">{r.reserved} reserved</p>}
                    {errors[`variants.${i}.stock`] && <p className="text-[11px] text-burgundy">{errors[`variants.${i}.stock`]}</p>}
                  </td>
                  <td className="p-1.5 text-center"><input aria-label="On sale" type="checkbox" checked={r.isActive} onChange={(e) => patch(i, { isActive: e.target.checked })} /></td>
                  <td className="p-1.5"><button type="button" aria-label="Remove variant" className="p-1 text-charcoal/50 hover:text-burgundy" onClick={() => onChange(v.filter((_, j) => j !== i))}><Trash2 size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-3 flex items-center justify-between text-sm">
        <button type="button" className={btn.ghost} onClick={() => onChange([...v, { sku: `${p.sku || "SKU"}-${v.length + 1}`, size: "", color: "", colorHex: "", priceOverride: "", stock: 0, isActive: true }])}><Plus size={14} />Add a variant</button>
        <span className="text-charcoal/60">{total} in stock across active variants</span>
      </div>
      <p className="text-xs text-charcoal/50 mt-2">Changing stock here is logged as a correction. For restocks and damaged items with a reason, use Inventory. Price override is excl. GST and replaces the product price for that variant.</p>
    </Card>
  );
}
