"use client";
import dynamic from "next/dynamic";
import { Component, useEffect, useState, type ReactNode } from "react";
import SilkCanvas from "./SilkCanvas";

const Hero3D = dynamic(() => import("./Hero3D"), { ssr: false, loading: () => <SilkCanvas className="absolute inset-0 h-full w-full" /> });

class Boundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e: unknown) { console.warn("3D hero unavailable, using fallback", e); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function webglOk() {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch { return false; }
}

/**
 * Chooses the hero visual for this device: WebGL silk on capable devices, the lightweight 2D canvas otherwise
 * (no WebGL, data saver, very low memory/CPU, or the 3D bundle failing to load).
 */
export default function SilkScene({ scene, color, accent }: { scene: "silk3d" | "silk"; color?: string; accent?: string }) {
  const [mode, setMode] = useState<"pending" | "3d" | "2d">("pending");
  const [lowPower, setLowPower] = useState(false);
  useEffect(() => {
    const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
    const weak = (nav.hardwareConcurrency ?? 8) <= 2 || (nav.deviceMemory ?? 8) <= 2 || Boolean(nav.connection?.saveData);
    setLowPower((nav.hardwareConcurrency ?? 8) <= 4 || window.innerWidth < 768);
    setMode(scene === "silk3d" && !weak && webglOk() ? "3d" : "2d");
  }, [scene]);
  const fallback = <SilkCanvas className="absolute inset-0 h-full w-full" palette={[accent ?? "#C8A66A", "#E8D5D5", color ?? "#54162F"]} />;
  if (mode !== "3d") return fallback;
  return <Boundary fallback={fallback}><Hero3D color={color} accent={accent} lowPower={lowPower} /></Boundary>;
}
