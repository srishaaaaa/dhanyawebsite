"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Play } from "lucide-react";
import Img from "./Img";
import { imgUrl } from "@/lib/image";

type Im = { url: string; altText: string | null; colorName: string | null };
type Media = { kind: "image"; url: string; alt: string } | { kind: "video"; url: string; alt: string };

export default function Gallery({ name, images, video, model, color }: { name: string; images: Im[]; video?: string | null; model?: string | null; color: string | null }) {
  const media: Media[] = useMemo(() => {
    // Images tagged with the selected colour come first.
    const tagged = color ? images.filter((i) => i.colorName?.toLowerCase() === color.toLowerCase()) : [];
    const rest = images.filter((i) => !tagged.includes(i));
    const list: Media[] = [...tagged, ...rest].map((i) => ({ kind: "image", url: i.url, alt: i.altText || name }));
    if (video) list.splice(Math.min(1, list.length), 0, { kind: "video", url: video, alt: `${name} — video` });
    return list;
  }, [images, video, color, name]);
  const [i, setI] = useState(0);
  useEffect(() => setI(0), [color]);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [show3d, setShow3d] = useState(false);
  const cur = media[i];

  return (
    <div className="lg:sticky lg:top-24 grid gap-3 lg:grid-cols-[76px_1fr]">
      <ul className="order-2 flex gap-2 overflow-x-auto lg:order-1 lg:flex-col" aria-label="Product images">
        {media.map((m, j) => (
          <li key={m.url + j}>
            <button onClick={() => setI(j)} aria-label={`Show ${m.kind} ${j + 1}`} aria-current={j === i}
              className={`relative block h-24 w-[72px] shrink-0 overflow-hidden border ${j === i ? "border-aubergine" : "border-transparent opacity-70 hover:opacity-100"}`}>
              {m.kind === "image" ? <Img src={m.url} alt="" width={160} sizes="72px" className="h-full w-full object-cover" />
                : <span className="grid h-full w-full place-items-center bg-aubergine text-ivory"><Play size={18} /></span>}
            </button>
          </li>
        ))}
        {model && <li><button onClick={() => setShow3d(true)} className="grid h-24 w-[72px] place-items-center border border-charcoal/20 text-xs hover:border-aubergine"><Box size={18} /><span>3D</span></button></li>}
      </ul>
      <div className="order-1 lg:order-2 relative aspect-[3/4] overflow-hidden bg-rose/40"
        onPointerMove={(e) => { if (e.pointerType !== "mouse" || cur?.kind !== "image") return; const r = e.currentTarget.getBoundingClientRect(); setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }); }}
        onPointerLeave={() => setZoom(null)}>
        {!cur ? <Img src={null} alt={name} className="h-full w-full" />
          : cur.kind === "video" ? <video key={cur.url} src={cur.url} controls playsInline autoPlay muted loop className="h-full w-full object-cover" aria-label={cur.alt} />
          : <>
            <Img key={cur.url} src={cur.url} alt={cur.alt} priority sizes="(min-width:1024px) 55vw, 100vw" width={1400} className="h-full w-full object-cover animate-[fade_.5s_ease]" />
            {zoom && <div aria-hidden className="absolute inset-0 hidden lg:block" style={{ backgroundImage: `url(${imgUrl(cur.url, 2200)})`, backgroundSize: "220%", backgroundPosition: `${zoom.x}% ${zoom.y}%` }} />}
          </>}
        {media.length > 1 && <p className="absolute bottom-3 right-3 bg-ivory/85 px-2 py-0.5 text-xs tabular-nums">{i + 1} / {media.length}</p>}
      </div>
      {show3d && model && <ModelDialog src={model} name={name} onClose={() => setShow3d(false)} />}
    </div>
  );
}

function ModelDialog({ src, name, onClose }: { src: string; name: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    ref.current?.showModal();
    if (customElements.get("model-viewer")) { setState("ready"); return; }
    const s = document.createElement("script");
    s.type = "module"; s.src = "https://unpkg.com/@google/model-viewer@3.5.0/dist/model-viewer.min.js";
    s.onload = () => setState("ready"); s.onerror = () => setState("error");
    document.head.appendChild(s);
  }, []);
  return (
    <dialog ref={ref} onClose={onClose} className="modal-in m-auto h-[80vh] w-[min(94vw,900px)] bg-ivory p-0 backdrop:bg-aubergine/60" aria-label={`${name} in 3D`}>
      <button onClick={() => ref.current?.close()} className="absolute right-4 top-3 z-10 text-sm underline">Close</button>
      {state === "error" ? <p className="p-10 text-center">The 3D view couldn&apos;t load on this device. The photos show every detail.</p>
        : state === "loading" ? <div className="skeleton h-full w-full" />
        : <model-viewer src={src} alt={`${name}, 3D model`} camera-controls auto-rotate shadow-intensity="1" style={{ width: "100%", height: "100%" }} />}
    </dialog>
  );
}
