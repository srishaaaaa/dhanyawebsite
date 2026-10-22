"use client";
import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { uploadFile } from "./upload";
import { inputCls } from "./ui";

/** Single media URL: paste a URL or upload a file. */
export default function MediaField({ name, label, value, onChange, accept = "image/*", error }: {
  name?: string; label: string; value: string; onChange: (v: string) => void; accept?: string; error?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [pct, setPct] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  async function pick(f?: File) {
    if (!f) return;
    setErr(null); setPct(0);
    try { onChange(await uploadFile(f, setPct, "content")); }
    catch (e) { setErr((e as Error).message); }
    finally { setPct(null); if (ref.current) ref.current.value = ""; }
  }
  const isImg = value && !/\.(mp4|webm|mov|glb|gltf)(\?|$)/i.test(value);
  return (
    <div className="text-sm">
      <span className="text-charcoal/80">{label}</span>
      <div className="mt-1 flex gap-2">
        <input name={name} value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://…" className={`${inputCls} mt-0`} />
        <button type="button" onClick={() => ref.current?.click()} className="border border-charcoal/20 px-3 hover:border-aubergine" aria-label={`Upload ${label}`}>
          <Upload size={15} />
        </button>
        {value && <button type="button" onClick={() => onChange("")} className="px-2 text-charcoal/50 hover:text-burgundy" aria-label="Clear"><X size={15} /></button>}
        <input ref={ref} type="file" accept={accept} hidden onChange={(e) => pick(e.target.files?.[0])} />
      </div>
      {pct !== null && <div className="mt-2 h-1 bg-charcoal/10"><div className="h-full bg-gold transition-all" style={{ width: `${pct}%` }} /></div>}
      {(err || error) && <p role="alert" className="text-xs text-burgundy mt-1">{err ?? error}</p>}
      {isImg && <img src={value} alt="" className="mt-2 h-24 w-auto object-cover border border-charcoal/10" />}
    </div>
  );
}
