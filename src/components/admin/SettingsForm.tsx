"use client";
import { useState, useTransition } from "react";
import { saveSettings } from "@/app/admin/(panel)/settings/actions";
import type { SettingKey } from "@/lib/settings";
import { Card, Field, inputCls, btn } from "./ui";

export type FieldDef = { name: string; label: string; type?: "text" | "number" | "textarea" | "checkbox" | "select" | "email" | "url"; options?: string[]; hint?: string; placeholder?: string };
export type Group = { title: string; fields: FieldDef[] };

export default function SettingsForm({ settingKey, groups, values }: { settingKey: SettingKey | "brand" | "maintenance"; groups: Group[]; values: Record<string, unknown> }) {
  const [v, setV] = useState<Record<string, unknown>>(values);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <form className="max-w-3xl space-y-6" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await saveSettings(settingKey, v); setErrs(r.fields ?? {}); setMsg({ ok: r.ok, text: r.message }); }); }}>
      {groups.map((g) => (
        <Card key={g.title} title={g.title}>
          <div className="grid gap-4 sm:grid-cols-2">
            {g.fields.map((f) => {
              const val = v[f.name];
              if (f.type === "checkbox") return <label key={f.name} className="flex items-start gap-2 text-sm sm:col-span-2"><input type="checkbox" className="mt-1" checked={Boolean(val)} onChange={(e) => setV({ ...v, [f.name]: e.target.checked })} /><span>{f.label}{f.hint && <span className="block text-xs text-charcoal/50">{f.hint}</span>}</span></label>;
              return (
                <div key={f.name} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
                  <Field label={f.label} hint={f.hint} error={errs[f.name]}>
                    {f.type === "textarea" ? <textarea rows={3} className={inputCls} value={String(val ?? "")} onChange={(e) => setV({ ...v, [f.name]: e.target.value })} />
                      : f.type === "select" ? <select className={inputCls} value={String(val ?? "")} onChange={(e) => setV({ ...v, [f.name]: e.target.value })}><option value="">—</option>{f.options!.map((o) => <option key={o}>{o}</option>)}</select>
                      : <input type={f.type === "number" ? "text" : f.type ?? "text"} inputMode={f.type === "number" ? "decimal" : undefined} placeholder={f.placeholder} className={inputCls} value={val === null || val === undefined ? "" : String(val)} onChange={(e) => setV({ ...v, [f.name]: e.target.value })} />}
                  </Field>
                </div>
              );
            })}
          </div>
        </Card>
      ))}
      <div className="flex items-center gap-4">
        <button disabled={pending} className={btn.primary}>{pending ? "Saving…" : "Save settings"}</button>
        {msg && <p role="status" className={`text-sm ${msg.ok ? "text-emerald-800" : "text-burgundy"}`}>{msg.text}</p>}
      </div>
    </form>
  );
}
