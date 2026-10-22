"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * WebGL silk: a finely subdivided plane whose vertices ripple like draped fabric, lit with a sheen
 * material, plus drifting champagne particles. Loaded only on capable devices (see SilkScene).
 */
function Silk({ color, sheen, segments }: { color: string; sheen: string; segments: [number, number] }) {
  const mesh = useRef<THREE.Mesh>(null);
  const geo = useMemo(() => new THREE.PlaneGeometry(11, 6, segments[0], segments[1]), [segments]);
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array as Float32Array), [geo]);
  useEffect(() => () => geo.dispose(), [geo]);

  useFrame(({ clock, pointer }) => {
    const t = clock.getElapsedTime() * 0.32;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3], y = base[i * 3 + 1];
      const z = Math.sin(x * 0.75 + t * 1.6 + pointer.x * 0.5) * 0.42
        + Math.sin(y * 1.3 - t * 1.05) * 0.22
        + Math.cos((x + y) * 0.55 + t * 0.9) * 0.18
        + Math.sin(x * 2.6 - t * 2.2) * 0.04;
      pos.setZ(i, z);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    if (mesh.current) {
      mesh.current.rotation.x = -0.62 + pointer.y * 0.06;
      mesh.current.rotation.z = 0.22 + pointer.x * 0.05;
    }
  });

  return (
    <mesh ref={mesh} geometry={geo} position={[1.6, -0.4, -0.5]}>
      <meshPhysicalMaterial color={color} roughness={0.42} metalness={0.05} sheen={1} sheenRoughness={0.25} sheenColor={sheen}
        clearcoat={0.25} clearcoatRoughness={0.4} side={THREE.DoubleSide} />
    </mesh>
  );
}

function Particles({ count, color }: { count: number; color: string }) {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) { p[i * 3] = (Math.random() - 0.5) * 14; p[i * 3 + 1] = (Math.random() - 0.5) * 8; p[i * 3 + 2] = (Math.random() - 0.5) * 4; }
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    return g;
  }, [count]);
  useEffect(() => () => geo.dispose(), [geo]);
  useFrame(({ clock }) => { if (ref.current) { ref.current.rotation.y = clock.getElapsedTime() * 0.02; ref.current.position.y = Math.sin(clock.getElapsedTime() * 0.2) * 0.15; } });
  return <points ref={ref} geometry={geo}><pointsMaterial color={color} size={0.035} sizeAttenuation transparent opacity={0.75} depthWrite={false} /></points>;
}

export default function Hero3D({ color = "#54162F", accent = "#C8A66A", lowPower = false }: { color?: string; accent?: string; lowPower?: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(true);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting && !document.hidden), { threshold: 0 });
    if (wrap.current) io.observe(wrap.current);
    const vis = () => setActive(!document.hidden && (wrap.current?.getBoundingClientRect().bottom ?? 1) > 0);
    document.addEventListener("visibilitychange", vis);
    return () => { io.disconnect(); document.removeEventListener("visibilitychange", vis); };
  }, []);
  return (
    <div ref={wrap} aria-hidden className="absolute inset-0">
      <Canvas dpr={lowPower ? 1 : [1, 1.6]} camera={{ position: [0, 0, 6], fov: 42 }} gl={{ antialias: !lowPower, alpha: true, powerPreference: "high-performance" }}
        frameloop={reduced ? "demand" : active ? "always" : "never"}>
        <ambientLight intensity={0.35} />
        <directionalLight position={[4, 5, 3]} intensity={1.4} color={accent} />
        <pointLight position={[-4, -2, 3]} intensity={18} color="#E8D5D5" />
        <Silk color={color} sheen={accent} segments={lowPower ? [80, 46] : [150, 84]} />
        <Particles count={lowPower ? 140 : 320} color={accent} />
      </Canvas>
    </div>
  );
}
