"use client";
import { useEffect, useRef } from "react";

/**
 * Silk-like field of flowing threads with drifting champagne particles, drawn on a 2D canvas.
 * Light enough for low-end phones; pauses off-screen / in background tabs; static under reduced motion.
 * (The WebGL / React Three Fiber scene in Phase 6 can replace this; this stays as its fallback.)
 */
export default function SilkCanvas({ className = "", palette = ["#C8A66A", "#E8D5D5", "#54162F"] }: { className?: string; palette?: string[] }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
    const lowEnd = (nav.hardwareConcurrency ?? 8) <= 4 || nav.connection?.saveData || (nav.deviceMemory ?? 8) <= 2;
    const THREADS = lowEnd ? 22 : 42;
    const STEPS = lowEnd ? 48 : 80;
    let w = 0, h = 0, dpr = 1, raf = 0, visible = true, t = Math.random() * 100;
    const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
    const particles = Array.from({ length: lowEnd ? 26 : 60 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.4 + 0.3, s: Math.random() * 0.25 + 0.05, p: Math.random() * 6.28 }));

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, lowEnd ? 1 : 1.5);
      const r = canvas.getBoundingClientRect(); w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      mouse.x += (mouse.tx - mouse.x) * 0.04; mouse.y += (mouse.ty - mouse.y) * 0.04;
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, palette[2] + "00"); grad.addColorStop(0.45, palette[0]); grad.addColorStop(0.75, palette[1]); grad.addColorStop(1, palette[2] + "00");
      ctx.strokeStyle = grad;
      for (let i = 0; i < THREADS; i++) {
        const k = i / THREADS;
        ctx.globalAlpha = 0.08 + 0.5 * Math.sin(Math.PI * k) ** 2;
        ctx.lineWidth = 0.7 + Math.sin(Math.PI * k) * 0.9;
        ctx.beginPath();
        for (let s = 0; s <= STEPS; s++) {
          const u = s / STEPS;
          const x = u * w * 1.1 - w * 0.05;
          const fold = Math.sin(u * 3.1 + t * 0.35 + k * 1.8 + (mouse.x - 0.5) * 1.2) * h * 0.2;
          const ripple = Math.sin(u * 7.5 - t * 0.6 + k * 4) * h * 0.025 * (0.4 + k);
          const drape = Math.cos(u * 1.6 + t * 0.2 - k) * h * 0.08;
          const y = h * (0.18 + k * 0.6) + fold + ripple + drape + (mouse.y - 0.5) * 30 * k;
          s === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      for (const p of particles) {
        p.y -= p.s / 900; p.x += Math.sin(t * 0.5 + p.p) / 2500;
        if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); }
        const a = 0.35 + 0.35 * Math.sin(t * 1.3 + p.p);
        ctx.fillStyle = `rgba(200,166,106,${a})`;
        ctx.beginPath(); ctx.arc(p.x * w + (mouse.x - 0.5) * 18 * p.r, p.y * h, p.r, 0, 6.283); ctx.fill();
      }
    };

    const loop = () => { t += 0.008; draw(); raf = visible && !document.hidden ? requestAnimationFrame(loop) : 0; };
    const start = () => { if (!raf && !reduced) raf = requestAnimationFrame(loop); };

    resize(); draw();
    const ro = new ResizeObserver(() => { resize(); draw(); });
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); }, { threshold: 0 });
    io.observe(canvas);
    const onVis = () => !document.hidden && start();
    document.addEventListener("visibilitychange", onVis);
    const onMove = (e: PointerEvent) => { if (e.pointerType === "mouse") { mouse.tx = e.clientX / window.innerWidth; mouse.ty = e.clientY / window.innerHeight; } };
    window.addEventListener("pointermove", onMove, { passive: true });
    start();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); document.removeEventListener("visibilitychange", onVis); window.removeEventListener("pointermove", onMove); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [palette.join()]);

  return <canvas ref={ref} aria-hidden className={className} />;
}
