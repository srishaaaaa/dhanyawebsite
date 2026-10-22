"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import VariantPicker, { type PickerProduct } from "../VariantPicker";
import Img from "../Img";
import { VIEWS, LIGHTS, type LightName, type Orbit } from "./StudioScene";

const StudioScene = dynamic(() => import("./StudioScene"), { ssr: false });
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
function webglOk() { try { const c = document.createElement("canvas"); return Boolean(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; } }

/**
 * 3D studio. Real data only: colours/sizes/price/stock/cart come from the product via VariantPicker.
 * Stage shows the product's uploaded GLB if it has one; otherwise a clearly labelled silk-drape COLOUR preview in the chosen variant colour.
 * Without WebGL the stage becomes the product's real photo gallery.
 */
export default function StudioView({ product, modelUrl }: { product: PickerProduct; modelUrl?: string | null }) {
  const firstColor = product.variants.find((v) => v.color && v.available > 0) ?? product.variants.find((v) => v.color) ?? null;
  const [colorName, setColorName] = useState<string | null>(firstColor?.color ?? null);
  const hex = product.variants.find((v) => v.color === colorName)?.colorHex ?? firstColor?.colorHex ?? "#54162F";
  const [light, setLight] = useState<LightName>("atelier");
  const [view, setView] = useState<"front" | "back" | "detail" | "free">("front");
  const [mode, setMode] = useState<"pending" | "3d" | "flat">("pending");
  const [useModel, setUseModel] = useState(Boolean(modelUrl));
  const [low, setLow] = useState(false), [reduced, setReduced] = useState(false), [active, setActive] = useState(true);
  const target = useRef<Orbit>({ ...VIEWS.front });
  const stage = useRef<HTMLDivElement>(null);
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef(0);

  useEffect(() => {
    const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
    setLow((nav.hardwareConcurrency ?? 8) <= 4 || window.innerWidth < 768);
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setMode(webglOk() && !nav.connection?.saveData ? "3d" : "flat");
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting && !document.hidden), { threshold: 0 });
    if (stage.current) io.observe(stage.current);
    return () => io.disconnect();
  }, []);

  const go = (v: "front" | "back" | "detail") => { target.current = { ...VIEWS[v] }; setView(v); };
  const reset = () => go("front");
  const zoom = (d: number) => { target.current.dist = clamp(target.current.dist + d, 3, 12); setView("free"); };
  const onDown = (e: React.PointerEvent) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); };
  const onMove = (e: React.PointerEvent) => {
    const p = pts.current.get(e.pointerId); if (!p) return;
    const t = target.current;
    if (pts.current.size === 2) {
      pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const [a, b] = [...pts.current.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch.current) t.dist = clamp(t.dist - (d - pinch.current) * 0.02, 3, 12);
      pinch.current = d; setView("free"); return;
    }
    t.theta -= (e.clientX - p.x) * 0.008; t.phi = clamp(t.phi - (e.clientY - p.y) * 0.004, 1.1, 1.8);
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); setView("free");
  };
  const onUp = (e: React.PointerEvent) => { pts.current.delete(e.pointerId); pinch.current = 0; };
  const onKey = (e: React.KeyboardEvent) => {
    const t = target.current;
    if (e.key === "ArrowLeft") t.theta -= 0.25; else if (e.key === "ArrowRight") t.theta += 0.25;
    else if (e.key === "+" || e.key === "=") zoom(-0.8); else if (e.key === "-") zoom(0.8); else if (e.key === "0") reset(); else return;
    e.preventDefault(); setView("free");
  };
  useEffect(() => { // wheel zoom only while the pointer is over the stage (non-passive so the page doesn't scroll)
    const el = stage.current; if (!el) return;
    const w = (e: WheelEvent) => { e.preventDefault(); target.current.dist = clamp(target.current.dist + e.deltaY * 0.004, 3, 12); setView("free"); };
    el.addEventListener("wheel", w, { passive: false }); return () => el.removeEventListener("wheel", w);
  }, [mode]);
  const modelFail = useCallback(() => setUseModel(false), []);
  const noop = useCallback(() => {}, []);

  const btn = (on: boolean) => `px-4 py-2 text-[11px] tracking-[0.2em] border transition-colors ${on ? "border-gold bg-gold text-aubergine" : "border-ivory/30 text-ivory/80 hover:border-gold"}`;
  return (
    <section aria-label={`3D studio: ${product.name}`} className="grid min-h-[calc(100svh-72px)] lg:grid-cols-[1.4fr_0.6fr]">
      <div className="relative min-h-[62svh] text-ivory" style={{ background: LIGHTS[light].bg, transition: "background .8s" }}>
        <div ref={stage} tabIndex={0} role="application" aria-label="3D view. Drag to rotate, scroll or pinch to zoom, arrow keys rotate, 0 resets."
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onKeyDown={onKey}
          className="absolute inset-0 cursor-grab touch-none outline-offset-[-4px] active:cursor-grabbing">
          {mode === "3d" && <StudioScene target={target} color={hex} light={light} modelUrl={useModel ? modelUrl : null} low={low} reduced={reduced} active={active} onModelError={modelFail} onReady={noop} />}
          {mode === "flat" && (
            <div className="flex h-full items-center justify-center p-8">
              <Img src={product.images.find((i) => i.colorName === colorName)?.url ?? product.images[0]?.url} alt={product.name} sizes="60vw" className="max-h-full w-auto object-contain" />
            </div>
          )}
        </div>
        <Link href={`/products/${product.slug}`} className="absolute left-5 top-5 z-10 text-[11px] tracking-[0.24em] text-ivory/80 hover:text-gold">← BACK TO PRODUCT</Link>
        {mode === "3d" && (
          <>
            <p className="pointer-events-none absolute left-5 top-12 z-10 max-w-xs text-xs leading-relaxed text-ivory/60">
              {useModel && modelUrl ? "Interactive 3D model of this piece." : "Colour and drape preview in your chosen shade. This is a fabric sample, not a model of the garment; see the photographs for the exact piece."}
            </p>
            <div className="absolute inset-x-0 bottom-5 z-10 flex flex-wrap items-center justify-center gap-2 px-4">
              {(["front", "back", "detail"] as const).map((v) => <button key={v} type="button" aria-pressed={view === v} onClick={() => go(v)} className={btn(view === v)}>{v.toUpperCase()}</button>)}
              <span className="mx-1 hidden h-5 w-px bg-ivory/20 sm:block" />
              <button type="button" onClick={() => zoom(-1)} aria-label="Zoom in" className="grid h-9 w-9 place-items-center border border-ivory/30 hover:border-gold"><Plus size={15} /></button>
              <button type="button" onClick={() => zoom(1)} aria-label="Zoom out" className="grid h-9 w-9 place-items-center border border-ivory/30 hover:border-gold"><Minus size={15} /></button>
              <button type="button" onClick={reset} aria-label="Reset view" className="grid h-9 w-9 place-items-center border border-ivory/30 hover:border-gold"><RotateCcw size={15} /></button>
            </div>
          </>
        )}
      </div>

      <aside className="bg-ivory px-6 py-10 text-charcoal sm:px-10 lg:max-h-[calc(100svh-72px)] lg:overflow-y-auto">
        <p className="text-[11px] tracking-[0.3em] text-gold">THE STUDIO</p>
        <h1 className="mt-3 font-serif text-4xl font-light leading-tight text-aubergine">{product.name}</h1>
        {mode === "3d" && (
          <fieldset className="mt-8">
            <legend className="text-[11px] tracking-[0.24em] text-charcoal/60">LIGHTING</legend>
            <div className="mt-3 flex flex-wrap gap-2" role="radiogroup">
              {(Object.keys(LIGHTS) as LightName[]).map((k) => (
                <button key={k} type="button" role="radio" aria-checked={light === k} onClick={() => setLight(k)}
                  className={`border px-4 py-2 text-xs tracking-wide transition-colors ${light === k ? "border-aubergine bg-aubergine text-ivory" : "border-charcoal/25 hover:border-aubergine"}`}>{LIGHTS[k].label}</button>
              ))}
            </div>
          </fieldset>
        )}
        <div className="mt-8 border-t border-charcoal/10 pt-8">
          <VariantPicker product={product} onColor={setColorName} />
        </div>
        <p className="mt-8 text-xs text-charcoal/55">Prices, sizes and stock are the live store values; Add to bag uses the same secure cart as the product page.</p>
      </aside>
    </section>
  );
}
