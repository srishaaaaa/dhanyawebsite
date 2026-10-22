"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import { saveCampaign, deleteCampaign, reorderCampaigns } from "@/app/admin/(panel)/campaigns/actions";
import { Card, Field, inputCls, btn, Badge, Empty } from "./ui";

type Row = { id: string; title: string; kind: "announcement" | "banner"; text: string; href: string; ctaLabel: string; tone: string; startsAt: string; endsAt: string; status: "draft" | "published"; live: boolean; ended: boolean };
const blank = (): Row => ({ id: "", title: "", kind: "announcement", text: "", href: "", ctaLabel: "", tone: "aubergine", startsAt: "", endsAt: "", status: "draft", live: false, ended: false });
const TONE: Record<string, string> = { gold: "bg-gold text-aubergine", aubergine: "bg-aubergine text-ivory", rose: "bg-rose text-burgundy" };

export default function CampaignManager({ rows }: { rows: Row[] }) {
  const [e, setE] = useState<Row | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const set = (k: keyof Row, v: string) => setE((s) => (s ? { ...s, [k]: v } : s));
  const move = (i: number, d: number) => { const j = i + d; if (j < 0 || j >= rows.length) return; const ids = rows.map((r) => r.id); [ids[i], ids[j]] = [ids[j], ids[i]]; start(async () => { await reorderCampaigns(ids); router.refresh(); }); };

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[1fr_420px]">
      <div>
        {msg && <p role="status" className="mb-3 text-sm">{msg}</p>}
        {rows.length === 0 ? <Empty title="No campaigns yet" body="Announce a sale, free shipping or a new collection." /> : (
          <ul className="space-y-2">{rows.map((r, i) => (
            <li key={r.id} className="flex items-center gap-3 border border-charcoal/10 bg-white p-3 text-sm">
              <div className="flex flex-col"><button aria-label="Up" onClick={() => move(i, -1)}><ArrowUp size={13} /></button><button aria-label="Down" onClick={() => move(i, 1)}><ArrowDown size={13} /></button></div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{r.title} <span className="text-xs font-normal text-charcoal/50">{r.kind}</span></p>
                <p className={`mt-1 truncate px-2 py-1 text-xs ${TONE[r.tone]}`}>{r.text}</p>
                <p className="mt-1 text-xs text-charcoal/50">{r.startsAt ? `From ${r.startsAt.replace("T", " ")}` : "Starts immediately"}{r.endsAt ? ` · until ${r.endsAt.replace("T", " ")}` : ""}</p>
              </div>
              {r.live ? <Badge tone="ok">Live</Badge> : r.ended ? <Badge tone="muted">Ended</Badge> : r.status === "published" ? <Badge tone="scheduled">Scheduled</Badge> : <Badge tone="draft">Draft</Badge>}
              <button className={btn.ghost} onClick={() => { setE({ ...r }); setErrs({}); }}>Edit</button>
              <button className="text-xs text-burgundy underline" onClick={() => { if (confirm("Delete this campaign?")) start(async () => { await deleteCampaign(r.id); router.refresh(); }); }}>Delete</button>
            </li>
          ))}</ul>
        )}
      </div>
      <Card title={e ? (e.id ? "Edit campaign" : "New campaign") : "Create a campaign"}>
        {!e ? <button className={btn.primary} onClick={() => setE(blank())}><Plus size={15} />New campaign</button> : (
          <form className="space-y-4" onSubmit={(ev) => { ev.preventDefault(); start(async () => { const r = await saveCampaign({ ...e, id: e.id || null }); setErrs(r.fields ?? {}); setMsg(r.message); if (r.ok) { setE(null); router.refresh(); } }); }}>
            <Field label="Internal name" error={errs.title}><input className={inputCls} value={e.title} onChange={(x) => set("title", x.target.value)} placeholder="Diwali free shipping" /></Field>
            <Field label="Placement"><select className={inputCls} value={e.kind} onChange={(x) => set("kind", x.target.value)}><option value="announcement">Announcement bar</option><option value="banner">Banner (homepage + shop)</option></select></Field>
            <Field label="Message" error={errs.text}><input className={inputCls} maxLength={160} value={e.text} onChange={(x) => set("text", x.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Link (optional)" error={errs.href}><input className={inputCls} placeholder="/collections/festive-edit" value={e.href} onChange={(x) => set("href", x.target.value)} /></Field>
              <Field label="Link label"><input className={inputCls} placeholder="Shop now" value={e.ctaLabel} onChange={(x) => set("ctaLabel", x.target.value)} /></Field>
              <Field label="Starts (IST)"><input type="datetime-local" className={inputCls} value={e.startsAt} onChange={(x) => set("startsAt", x.target.value)} /></Field>
              <Field label="Ends (IST)" error={errs.endsAt}><input type="datetime-local" className={inputCls} value={e.endsAt} onChange={(x) => set("endsAt", x.target.value)} /></Field>
            </div>
            <Field label="Colour"><select className={inputCls} value={e.tone} onChange={(x) => set("tone", x.target.value)}><option value="aubergine">Aubergine</option><option value="gold">Champagne gold</option><option value="rose">Soft rose</option></select></Field>
            <p className={`px-3 py-2 text-center text-xs ${TONE[e.tone]}`}>{e.text || "Preview"}{e.ctaLabel && <u className="ml-3">{e.ctaLabel}</u>}</p>
            <Field label="Status"><select className={inputCls} value={e.status} onChange={(x) => set("status", x.target.value)}><option value="draft">Draft</option><option value="published">Published (runs on schedule)</option></select></Field>
            <div className="flex gap-2"><button disabled={pending} className={btn.primary}>{pending ? "Saving…" : "Save"}</button><button type="button" className={btn.secondary} onClick={() => setE(null)}>Cancel</button></div>
          </form>
        )}
      </Card>
    </div>
  );
}
