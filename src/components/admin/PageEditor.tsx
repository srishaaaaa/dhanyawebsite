"use client";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { savePage, deletePage } from "@/app/admin/(panel)/pages/actions";
import { renderMarkdown } from "@/lib/markdown";
import { slugify } from "@/lib/slug";
import { Card, Field, inputCls, btn } from "./ui";

type P = { id: string; title: string; slug: string; body: string; seoTitle: string; seoDescription: string; status: "draft" | "published"; publishAt: string };

export default function PageEditor({ initial, core, canDelete }: { initial: P; core: boolean; canDelete: boolean }) {
  const [p, setP] = useState<P>(initial);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [pending, start] = useTransition();
  const router = useRouter();
  const html = useMemo(() => renderMarkdown(p.body), [p.body]);
  const set = <K extends keyof P>(k: K, v: P[K]) => setP((s) => ({ ...s, [k]: v }));
  const save = (status?: P["status"]) => start(async () => {
    const r = await savePage({ ...p, id: p.id || null, status: status ?? p.status });
    setErrs(r.fields ?? {}); setMsg({ ok: r.ok, text: r.message });
    if (r.ok) { if (status) set("status", status); if (!p.id && r.id) router.replace(`/admin/pages/${r.id}`); else router.refresh(); }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/pages" className={btn.ghost}>← Pages</Link>
        <h1 className="font-serif text-3xl text-aubergine">{p.title || "New page"}</h1>
        <div className="ml-auto flex gap-2">
          {p.id && <a href={`/${p.slug}`} target="_blank" className={btn.secondary}>View</a>}
          <button disabled={pending} onClick={() => save()} className={btn.secondary}>Save</button>
          {p.status !== "published" && <button disabled={pending} onClick={() => save("published")} className={btn.primary}>Publish</button>}
        </div>
      </div>
      {msg && <p role="status" className={`text-sm ${msg.ok ? "text-emerald-800" : "text-burgundy"}`}>{msg.text}</p>}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" error={errs.title}><input className={inputCls} value={p.title} onChange={(e) => setP((s) => ({ ...s, title: e.target.value, slug: s.id || core ? s.slug : slugify(e.target.value) }))} /></Field>
            <Field label="Address" error={errs.slug} hint={core ? "Core page — address is fixed" : `/${p.slug || "…"}`}><input className={inputCls} disabled={core} value={p.slug} onChange={(e) => set("slug", slugify(e.target.value))} /></Field>
          </div>
          <div className="mt-4 flex gap-1 text-sm" role="tablist">
            {(["write", "preview"] as const).map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`px-3 py-1.5 capitalize ${tab === t ? "border-b-2 border-aubergine" : "text-charcoal/60"}`}>{t}</button>)}
          </div>
          {tab === "write"
            ? <textarea aria-label="Page content" rows={24} className={`${inputCls} font-mono text-[13px] leading-relaxed`} value={p.body} onChange={(e) => set("body", e.target.value)} placeholder={"## Heading\n\nA paragraph with **bold** and a [link](/shop).\n\n- A list item"} />
            : <div className="prose-dhanya mt-3 min-h-64 border border-charcoal/10 bg-ivory/40 p-6" dangerouslySetInnerHTML={{ __html: html || "<p><em>Nothing to preview yet.</em></p>" }} />}
        </Card>
        <div className="space-y-6">
          <Card title="Publishing">
            <div className="space-y-3">
              <Field label="Status"><select className={inputCls} value={p.status} onChange={(e) => set("status", e.target.value as P["status"])}><option value="draft">Draft</option><option value="published">Published</option></select></Field>
              <Field label="Publish on (IST, optional)" hint="A published page stays hidden until then"><input type="datetime-local" className={inputCls} value={p.publishAt} onChange={(e) => set("publishAt", e.target.value)} /></Field>
            </div>
          </Card>
          <Card title="Search engines">
            <div className="space-y-3">
              <Field label={`SEO title (${p.seoTitle.length}/70)`}><input maxLength={70} className={inputCls} value={p.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} /></Field>
              <Field label={`Meta description (${p.seoDescription.length}/170)`}><textarea rows={3} maxLength={170} className={inputCls} value={p.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} /></Field>
            </div>
          </Card>
          {canDelete && p.id && <button className={btn.danger} onClick={() => { if (confirm("Delete this page?")) start(async () => { const r = await deletePage(p.id); if (r.ok) router.push("/admin/pages"); else setMsg({ ok: false, text: r.message }); }); }}>Delete page</button>}
        </div>
      </div>
    </div>
  );
}
