"use client";
import { useState, useTransition } from "react";
import { saveSettings } from "@/app/admin/(panel)/settings/actions";
import MediaField from "./MediaField";
import { Card, Field, inputCls, btn } from "./ui";

type Colors = { aubergine: string; burgundy: string; ivory: string; gold: string; rose: string; charcoal: string };
type Brand = { logoUrl?: string; logoAlt?: string; faviconUrl?: string; colors: Colors; serif: string; sans: string };
const DEFAULTS: Colors = { aubergine: "#30042E", burgundy: "#54162F", ivory: "#F8F3EB", gold: "#C8A66A", rose: "#E8D5D5", charcoal: "#211D20" };
const ROLES: Record<keyof Colors, string> = { aubergine: "Deep backgrounds, buttons", burgundy: "Campaign panels, hovers", ivory: "Page background", gold: "Accents, highlights", rose: "Soft panels", charcoal: "Text" };

function lum(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
export function contrast(a: string, b: string) {
  if (!/^#[0-9a-f]{6}$/i.test(a) || !/^#[0-9a-f]{6}$/i.test(b)) return 0;
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

export default function BrandForm({ initial }: { initial: Brand }) {
  const [b, setB] = useState<Brand>(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const checks: [string, number][] = [
    ["Text on page background", contrast(b.colors.charcoal, b.colors.ivory)],
    ["Light text on deep background", contrast(b.colors.ivory, b.colors.aubergine)],
    ["Light text on campaign panels", contrast(b.colors.ivory, b.colors.burgundy)],
  ];
  const setColor = (k: keyof Colors, v: string) => setB({ ...b, colors: { ...b.colors, [k]: v } });

  return (
    <form className="max-w-3xl space-y-6" onSubmit={(e) => {
      e.preventDefault();
      const flat: Record<string, unknown> = { logoUrl: b.logoUrl ?? "", logoAlt: b.logoAlt ?? "", faviconUrl: b.faviconUrl ?? "", serif: b.serif, sans: b.sans };
      for (const [k, v] of Object.entries(b.colors)) flat[`colors.${k}`] = v;
      start(async () => { const r = await saveSettings("brand", flat); setErrs(r.fields ?? {}); setMsg({ ok: r.ok, text: r.message }); });
    }}>
      <Card title="Logo">
        <div className="grid gap-4 sm:grid-cols-2">
          <MediaField label="Logo for the header (SVG or transparent PNG)" value={b.logoUrl ?? ""} onChange={(v) => setB({ ...b, logoUrl: v })} error={errs.logoUrl} />
          <MediaField label="Favicon (square, 512×512)" value={b.faviconUrl ?? ""} onChange={(v) => setB({ ...b, faviconUrl: v })} error={errs.faviconUrl} />
          <Field label="Logo description (alt text)"><input className={inputCls} value={b.logoAlt ?? ""} onChange={(e) => setB({ ...b, logoAlt: e.target.value })} placeholder="DHANYA BOUTIQUE" /></Field>
        </div>
        <p className="mt-2 text-xs text-charcoal/55">Leave empty to use the built-in DHANYA wordmark and DB monogram.</p>
      </Card>
      <Card title="Colours">
        <div className="grid gap-4 sm:grid-cols-2">
          {(Object.keys(DEFAULTS) as (keyof Colors)[]).map((k) => (
            <Field key={k} label={`${k[0].toUpperCase()}${k.slice(1)} — ${ROLES[k]}`} error={errs[`colors.${k}`]}>
              <div className="mt-1 flex items-center gap-2">
                <input type="color" aria-label={k} value={b.colors[k]} onChange={(e) => setColor(k, e.target.value)} className="h-9 w-12 border border-charcoal/20" />
                <input className={`${inputCls} mt-0 w-28 font-mono`} value={b.colors[k]} onChange={(e) => setColor(k, e.target.value)} />
                {b.colors[k].toLowerCase() !== DEFAULTS[k].toLowerCase() && <button type="button" onClick={() => setColor(k, DEFAULTS[k])} className="text-xs underline">Reset</button>}
              </div>
            </Field>
          ))}
        </div>
        <ul className="mt-4 space-y-1 text-sm">
          {checks.map(([l, r]) => <li key={l} className={r >= 4.5 ? "text-emerald-800" : "text-burgundy"}>{r >= 4.5 ? "✓" : "⚠"} {l}: contrast {r.toFixed(1)}:1 {r < 4.5 && "— below the 4.5:1 needed for readable text"}</li>)}
        </ul>
        <div className="mt-4 flex overflow-hidden border border-charcoal/10 text-sm" aria-hidden>
          <div className="flex-1 p-4" style={{ background: b.colors.aubergine, color: b.colors.ivory }}><p className="font-serif text-xl">Elegance</p><p style={{ color: b.colors.gold }}>Accent</p></div>
          <div className="flex-1 p-4" style={{ background: b.colors.ivory, color: b.colors.charcoal }}><p className="font-serif text-xl">Shop all</p><p style={{ color: b.colors.burgundy }}>20% off</p></div>
          <div className="flex-1 p-4" style={{ background: b.colors.rose, color: b.colors.charcoal }}><p className="font-serif text-xl">Reviews</p></div>
        </div>
      </Card>
      <Card title="Typography">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Headlines"><select className={inputCls} value={b.serif} onChange={(e) => setB({ ...b, serif: e.target.value })}><option value="cormorant">Cormorant Garamond — light, couture</option><option value="playfair">Playfair Display — bolder, editorial</option></select></Field>
          <Field label="Body and interface"><select className={inputCls} value={b.sans} onChange={(e) => setB({ ...b, sans: e.target.value })}><option value="manrope">Manrope — warm, geometric</option><option value="inter">Inter — neutral, compact</option></select></Field>
        </div>
      </Card>
      <div className="flex items-center gap-4"><button disabled={pending} className={btn.primary}>{pending ? "Saving…" : "Save brand"}</button>{msg && <p role="status" className={`text-sm ${msg.ok ? "text-emerald-800" : "text-burgundy"}`}>{msg.text}</p>}</div>
    </form>
  );
}
