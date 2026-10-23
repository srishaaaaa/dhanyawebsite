"use client";
import dynamic from "next/dynamic";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import type { SilkTone } from "./SilkShader";

const SilkShader = dynamic(() => import("./SilkShader"), { ssr: false });

class Boundary extends Component<{ onFail: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e: unknown) { console.warn("Silk shader unavailable, using gradient", e); this.props.onFail(); }
  render() { return this.state.failed ? null : this.props.children; }
}

const FALLBACK: Record<SilkTone, string> = {
  plum: "linear-gradient(115deg, #1B071A 0%, #54162F 38%, #30042E 62%, #1B071A 100%), radial-gradient(60% 80% at 70% 30%, rgb(200 166 106 / .18), transparent)",
  ivory: "linear-gradient(115deg, #E8D5D5 0%, #F8F3EB 40%, #fff 55%, #E8D5D5 100%)",
  gold: "linear-gradient(115deg, #54162F 0%, #9c7a3d 45%, #e9d29a 60%, #54162F 100%)",
};

function webglOk() {
  try { const c = document.createElement("canvas"); return Boolean(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; }
}

/**
 * A living-silk surface that fills its (relatively positioned) parent. It is a GPU shader, so it costs one draw call.
 * To stay within browser WebGL-context limits it only mounts while within ~1 screen of the viewport and unmounts after;
 * the CSS gradient underneath is what you see before it loads, on devices without WebGL, and when it fails.
 * Reduced-motion visitors get one still frame. Always decorative (aria-hidden, pointer-events none).
 */
export default function SilkField({ tone = "plum", className = "" }: { tone?: SilkTone; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [on, setOn] = useState(false);
  const [active, setActive] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [low, setLow] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
    const weak = (nav.hardwareConcurrency ?? 8) <= 2 || (nav.deviceMemory ?? 8) <= 2 || Boolean(nav.connection?.saveData);
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setLow(window.innerWidth < 768 || (nav.hardwareConcurrency ?? 8) <= 4);
    setOn(!weak && webglOk());
    const el = box.current; if (!el) return;
    const far = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin: "100% 0px" });
    const vis = new IntersectionObserver(([e]) => setActive(e.isIntersecting && !document.hidden), { threshold: 0 });
    far.observe(el); vis.observe(el);
    const onVis = () => setActive(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => { far.disconnect(); vis.disconnect(); document.removeEventListener("visibilitychange", onVis); };
  }, []);

  // Fade the canvas in one frame after it mounts so the gradient never pops.
  useEffect(() => {
    if (!(on && near)) { setReady(false); return; }
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, [on, near]);

  return (
    <div ref={box} aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} style={{ background: FALLBACK[tone] }}>
      {on && near && (
        <div className={`absolute inset-0 transition-opacity duration-1000 ${ready ? "opacity-100" : "opacity-0"}`}>
          <Boundary onFail={() => setOn(false)}>
            <SilkShader tone={tone} reduced={reduced} low={low} scrollEl={box} active={active} />
          </Boundary>
        </div>
      )}
    </div>
  );
}
