"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import SilkCanvas from "../SilkCanvas";
import type { Portal } from "./CoutureScene";

const CoutureScene = dynamic(() => import("./CoutureScene"), { ssr: false });

class Boundary extends Component<{ onFail: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e: unknown) { console.warn("3D scene unavailable, using flat hero", e); this.props.onFail(); }
  render() { return this.state.failed ? null : this.props.children; }
}

function webglOk() {
  try { const c = document.createElement("canvas"); return Boolean(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; }
}

/**
 * Hero stage: one WebGL canvas (silk chamber → gateway → passage) driven by hero scroll progress.
 * Falls back to the 2D silk + HTML image arch when WebGL is missing, the device is small/weak, data-saver is on,
 * the 3D chunk fails, or the visitor chooses the flat view. The hero's HTML visual is hidden only once 3D is actually painted.
 */
export default function CoutureStage({ image, accent = "#C8A66A", wine = "#54162F", portals }: { image?: string; accent?: string; wine?: string; portals: Portal[] }) {
  const router = useRouter();
  const wrap = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  const [mode, setMode] = useState<"pending" | "3d" | "flat">("pending");
  const [low, setLow] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [active, setActive] = useState(true);
  const [ready, setReady] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
    const weak = (nav.hardwareConcurrency ?? 8) <= 2 || (nav.deviceMemory ?? 8) <= 2 || Boolean(nav.connection?.saveData);
    let chosenFlat = false;
    try { chosenFlat = localStorage.getItem("db_flat") === "1"; } catch {}
    setLow((nav.hardwareConcurrency ?? 8) <= 4);
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setMode(!chosenFlat && !weak && window.innerWidth >= 768 && webglOk() ? "3d" : "flat");
  }, []);

  useEffect(() => {
    const hero = wrap.current?.closest<HTMLElement>("[data-hero]");
    if (!hero) return;
    const on = () => { const r = hero.getBoundingClientRect(); progress.current = Math.min(1, Math.max(0, -r.top / (r.height * 0.95))); };
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting && !document.hidden), { threshold: 0 });
    io.observe(hero);
    const vis = () => setActive(!document.hidden && hero.getBoundingClientRect().bottom > 0);
    on(); window.addEventListener("scroll", on, { passive: true }); document.addEventListener("visibilitychange", vis);
    return () => { io.disconnect(); window.removeEventListener("scroll", on); document.removeEventListener("visibilitychange", vis); };
  }, []);

  // Tell the hero (server markup) whether the 3D arch has replaced its HTML image arch.
  useEffect(() => {
    const hero = wrap.current?.closest<HTMLElement>("[data-hero]");
    if (!hero) return;
    if (mode === "3d" && ready) hero.dataset.stage = "ready"; else delete hero.dataset.stage;
    return () => { delete hero.dataset.stage; };
  }, [mode, ready]);

  const fail = useCallback(() => setMode("flat"), []);
  const open = useCallback((slug: string) => router.push(`/collections/${slug}`), [router]);
  const toggle = () => {
    const next = mode === "3d" ? "flat" : "3d";
    try { localStorage.setItem("db_flat", next === "flat" ? "1" : "0"); } catch {}
    setReady(false); setMode(next);
  };

  return (
    <>
      <div ref={wrap} aria-hidden className="absolute inset-0 -z-10">
        {(mode !== "3d" || !ready) && <SilkCanvas className="absolute inset-0 h-full w-full opacity-70" palette={[accent, "#E8D5D5", wine]} />}
        {mode === "3d" && (
          <div className={`absolute inset-0 transition-opacity duration-1000 ${ready ? "opacity-100" : "opacity-0"}`}>
            <Boundary onFail={fail}>
              <CoutureScene image={image} accent={accent} wine={wine} lowPower={low} active={active} reduced={reduced} progress={progress}
                portals={portals} hovered={hovered} onHover={setHovered} onOpen={open} onReady={() => setReady(true)} />
            </Boundary>
          </div>
        )}
      </div>
      <div className="absolute inset-x-0 bottom-6 z-20 flex items-end justify-between gap-6 px-5 sm:px-10">
        {portals.length > 0 ? (
          <nav aria-label="Step into a collection" className="hidden flex-wrap items-center gap-x-6 gap-y-2 text-[11px] tracking-[0.22em] text-ivory/75 lg:flex">
            <span className="text-gold">STEP INTO</span>
            {portals.slice(0, 3).map((p) => (
              <Link key={p.slug} href={`/collections/${p.slug}`} onMouseEnter={() => setHovered(p.slug)} onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(p.slug)} onBlur={() => setHovered(null)}
                className={`nav-link uppercase transition-colors ${hovered === p.slug ? "text-gold" : "hover:text-ivory"}`}>{p.title}</Link>
            ))}
          </nav>
        ) : <span />}
        <div className="flex items-center gap-6 text-[11px] tracking-[0.22em] text-ivory/60">
          {mode !== "pending" && webglCapable(mode) && (
            <button type="button" onClick={toggle} aria-pressed={mode === "flat"} className="hover:text-ivory">{mode === "3d" ? "FLAT VIEW" : "3D VIEW"}</button>
          )}
          <a href="#after-hero" className="hidden hover:text-ivory lg:block">SCROLL</a>
        </div>
      </div>
    </>
  );
}

// The toggle only makes sense where 3D could run at all (checked lazily on the client).
function webglCapable(mode: string) { return mode === "3d" || (typeof window !== "undefined" && window.innerWidth >= 768 && webglOk()); }
