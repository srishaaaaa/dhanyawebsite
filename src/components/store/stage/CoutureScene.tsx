"use client";
import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export type Portal = { slug: string; title: string };
type Props = {
  image?: string; accent: string; wine: string; lowPower: boolean; active: boolean; reduced: boolean;
  progress: React.MutableRefObject<number>; portals: Portal[]; hovered: string | null;
  onHover: (slug: string | null) => void; onOpen: (slug: string) => void; onReady: () => void;
};

/** Arch outline (with optional hole) used for every gateway in the world: a jharokha silhouette. */
function archShape(w: number, h: number, frame?: number) {
  const hw = w / 2, rise = h - hw, s = new THREE.Shape();
  s.moveTo(-hw, 0); s.lineTo(hw, 0); s.lineTo(hw, rise); s.absarc(0, rise, hw, 0, Math.PI, false); s.lineTo(-hw, 0);
  if (frame) {
    const iw = hw - frame, h2 = new THREE.Path();
    h2.moveTo(-iw, frame); h2.lineTo(-iw, rise); h2.absarc(0, rise, iw, Math.PI, 0, true); h2.lineTo(iw, frame); h2.lineTo(-iw, frame);
    s.holes.push(h2);
  }
  return s;
}

/** Silk drape: a subdivided plane whose vertices ripple; the same fabric language is reused for chamber and passage. */
function Silk({ color, sheen, segs, position, size, speed = 1, rotation = [0, 0, 0] as [number, number, number], emissive = 0, reduced }: {
  color: string; sheen: string; segs: [number, number]; position: [number, number, number]; size: [number, number]; speed?: number;
  rotation?: [number, number, number]; emissive?: number; reduced: boolean;
}) {
  const geo = useMemo(() => new THREE.PlaneGeometry(size[0], size[1], segs[0], segs[1]), [size, segs]);
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array as Float32Array), [geo]);
  useEffect(() => () => geo.dispose(), [geo]);
  useFrame(({ clock, pointer }) => {
    const t = reduced ? 2 : clock.getElapsedTime() * 0.3 * speed;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3], y = base[i * 3 + 1];
      pos.setZ(i, Math.sin(x * 0.7 + t * 1.5 + pointer.x * 0.5) * 0.4 + Math.sin(y * 1.2 - t) * 0.2 + Math.cos((x + y) * 0.5 + t * 0.8) * 0.16 + Math.sin(x * 2.4 - t * 2) * 0.035);
    }
    pos.needsUpdate = true; geo.computeVertexNormals();
  });
  return (
    <mesh geometry={geo} position={position} rotation={rotation}>
      <meshPhysicalMaterial color={color} roughness={0.42} metalness={0.05} sheen={1} sheenRoughness={0.25} sheenColor={sheen}
        clearcoat={0.25} clearcoatRoughness={0.4} side={THREE.DoubleSide} emissive={color} emissiveIntensity={emissive} />
    </mesh>
  );
}

/** A gold gateway. Optionally filled with the campaign image; hover/focus lifts it and warms its light. */
function Gateway({ w, h, position, rotY = 0, image, fill, accent, lit, onOver, onOut, onClick, onTexture, interactive, fade }: {
  w: number; h: number; position: [number, number, number]; rotY?: number; image?: string; fill: string; accent: string; lit: boolean;
  onOver?: () => void; onOut?: () => void; onClick?: () => void; onTexture?: () => void; interactive?: boolean; fade?: React.MutableRefObject<number>;
}) {
  const group = useRef<THREE.Group>(null);
  const frameMat = useRef<THREE.MeshStandardMaterial>(null);
  const fillMat = useRef<THREE.MeshBasicMaterial>(null);
  const frame = Math.max(0.1, w * 0.045);
  const frameGeo = useMemo(() => new THREE.ExtrudeGeometry(archShape(w, h, frame), { depth: w * 0.07, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.02, bevelSegments: 2, curveSegments: 28 }), [w, h, frame]);
  const fillGeo = useMemo(() => {
    const iw = w / 2 - frame, rise = h - w / 2, g = new THREE.ShapeGeometry(archShape(iw * 2, h - frame - 0.001), 28);
    const p = g.attributes.position, uv = g.attributes.uv; void rise;
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + iw) / (iw * 2), p.getY(i) / (h - frame));
    g.translate(0, frame, 0); return g;
  }, [w, h, frame]);
  const tex = useRef<THREE.Texture | null>(null);

  useEffect(() => {
    if (!image) { onTexture?.(); return; }
    let dead = false;
    const loader = new THREE.TextureLoader(); loader.setCrossOrigin("anonymous");
    loader.load(image, (t) => {
      if (dead) { t.dispose(); return; }
      t.colorSpace = THREE.SRGBColorSpace;
      // cover-fit the photo inside the arch opening
      const target = (w - frame * 2) / (h - frame), a = t.image.width / t.image.height;
      if (a > target) { t.repeat.set(target / a, 1); t.offset.set((1 - target / a) / 2, 0); } else { t.repeat.set(1, a / target); t.offset.set(0, (1 - a / target) / 2); }
      tex.current = t;
      if (fillMat.current) { fillMat.current.map = t; fillMat.current.color.set("#ffffff"); fillMat.current.needsUpdate = true; }
      onTexture?.();
    }, undefined, () => { if (!dead) onTexture?.(); });
    return () => { dead = true; tex.current?.dispose(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image]);
  useEffect(() => () => { frameGeo.dispose(); fillGeo.dispose(); }, [frameGeo, fillGeo]);

  useFrame(({ clock }, dt) => {
    const g = group.current; if (!g) return;
    const target = lit ? 1.05 : 1, k = 1 - Math.pow(0.001, dt);
    g.scale.x += (target - g.scale.x) * k; g.scale.y = g.scale.x; g.scale.z = g.scale.x;
    if (interactive) g.position.y = position[1] + Math.sin(clock.elapsedTime * 0.6 + position[0]) * 0.06 + (lit ? 0.08 : 0);
    if (frameMat.current) frameMat.current.emissiveIntensity += ((lit ? 0.55 : 0.05) - frameMat.current.emissiveIntensity) * k;
    if (fillMat.current && fade) { fillMat.current.opacity = 1 - THREE.MathUtils.smoothstep(fade.current, 0.62, 0.85); fillMat.current.depthWrite = fillMat.current.opacity > 0.98; }
    else if (fillMat.current && !image) fillMat.current.opacity += ((lit ? 0.9 : 0.55) - fillMat.current.opacity) * k;
  });

  return (
    <group ref={group} position={position} rotation={[0, rotY, 0]}
      onPointerOver={interactive ? (e) => { e.stopPropagation(); onOver?.(); document.body.style.cursor = "pointer"; } : undefined}
      onPointerOut={interactive ? () => { onOut?.(); document.body.style.cursor = ""; } : undefined}
      onClick={interactive ? (e) => { e.stopPropagation(); onClick?.(); } : undefined}>
      <mesh geometry={frameGeo} position={[0, 0, -w * 0.035]}>
        <meshStandardMaterial ref={frameMat} color={accent} metalness={0.92} roughness={0.28} emissive={accent} emissiveIntensity={0.05} />
      </mesh>
      <mesh geometry={fillGeo} position={[0, 0, -0.02]}>
        <meshBasicMaterial ref={fillMat} color={fill} transparent opacity={image ? 1 : 0.55} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Particles({ count, color, reduced }: { count: number; color: string; reduced: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry(), p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) { p[i * 3] = (Math.random() - 0.5) * 16; p[i * 3 + 1] = (Math.random() - 0.5) * 9; p[i * 3 + 2] = Math.random() * -8 + 3; }
    g.setAttribute("position", new THREE.BufferAttribute(p, 3)); return g;
  }, [count]);
  useEffect(() => () => geo.dispose(), [geo]);
  useFrame(({ clock }) => { if (ref.current && !reduced) { ref.current.rotation.y = clock.elapsedTime * 0.015; ref.current.position.y = Math.sin(clock.elapsedTime * 0.2) * 0.15; } });
  return <points ref={ref} geometry={geo}><pointsMaterial color={color} size={0.035} sizeAttenuation transparent opacity={0.7} depthWrite={false} /></points>;
}

/** Scroll-linked camera: chamber (p=0) → dolly through the main arch → the passage beyond (p=1), with eased pointer parallax. */
function Rig({ progress, reduced }: { progress: React.MutableRefObject<number>; reduced: boolean }) {
  const { camera } = useThree();
  const look = useRef(new THREE.Vector3(0, 0, -2));
  useFrame(({ pointer }, dt) => {
    const p = reduced ? 0 : THREE.MathUtils.smoothstep(progress.current, 0, 1);
    const k = 1 - Math.pow(0.002, dt);
    const tx = THREE.MathUtils.lerp(0.4, 2.3, p) + pointer.x * 0.45;
    const ty = THREE.MathUtils.lerp(0.1, 0.2, p) + pointer.y * 0.25;
    const tz = THREE.MathUtils.lerp(7, -4.6, p);
    camera.position.x += (tx - camera.position.x) * k; camera.position.y += (ty - camera.position.y) * k; camera.position.z += (tz - camera.position.z) * k;
    look.current.set(THREE.MathUtils.lerp(0.8, 2.3, p), 0, -6);
    camera.lookAt(look.current);
  });
  return null;
}

function Lights({ accent, reduced }: { accent: string; reduced: boolean }) {
  const moving = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => { if (moving.current && !reduced) { const t = clock.elapsedTime * 0.4; moving.current.position.set(Math.sin(t) * 5, Math.cos(t * 0.7) * 2.5, 2.5); } });
  return (<>
    <ambientLight intensity={0.4} />
    <directionalLight position={[4, 5, 3]} intensity={1.3} color={accent} />
    <pointLight position={[-4, -2, 3]} intensity={16} color="#E8D5D5" />
    <pointLight ref={moving} position={[0, 0, 2.5]} intensity={22} color={accent} />
  </>);
}

function Ready({ onReady }: { onReady: () => void }) { useEffect(() => { onReady(); }, [onReady]); return null; }

export default function CoutureScene({ image, accent, wine, lowPower, active, reduced, progress, portals, hovered, onHover, onOpen, onReady }: Props) {
  const segs: [number, number] = lowPower ? [70, 40] : [130, 74];
  const slots: [number, number, number][] = [[-3.1, -1.9, 1.2], [-0.2, -2.3, 2.4], [4.9, -2.1, 1.6]];
  const list = portals.slice(0, lowPower ? 2 : 3);
  const done = useRef({ tex: false, scene: false });
  const fire = () => { if (done.current.tex && done.current.scene) onReady(); };
  return (
    <Canvas dpr={lowPower ? 1 : [1, 1.6]} camera={{ position: [0.4, 0.1, 7], fov: 42 }} gl={{ antialias: !lowPower, alpha: true, powerPreference: "high-performance" }}
      frameloop={reduced ? "demand" : active ? "always" : "never"} onPointerMissed={() => onHover(null)}>
      <Ready onReady={() => { done.current.scene = true; fire(); }} />
      <Lights accent={accent} reduced={reduced} />
      <Rig progress={progress} reduced={reduced} />
      {/* Scene 1 — silk chamber */}
      <Silk color={wine} sheen={accent} segs={segs} position={[-4.8, 0.2, -3.2]} size={[10, 9]} reduced={reduced} />
      <Silk color={wine} sheen={accent} segs={[Math.round(segs[0] / 2), Math.round(segs[1] / 2)]} position={[7.2, 0.2, -3.2]} size={[6, 9]} speed={0.9} reduced={reduced} />
      <Silk color="#30042E" sheen="#E8D5D5" segs={[Math.round(segs[0] / 2), Math.round(segs[1] / 2)]} position={[-4.8, 1, -1.4]} size={[3.2, 8]} speed={0.8} rotation={[0, 0.5, 0.12]} reduced={reduced} />
      {/* Scene 2 — the passage beyond the arch: a lighter silk chamber seen only once the camera moves through */}
      <Silk color="#E8D5D5" sheen="#ffffff" segs={[Math.round(segs[0] / 2), Math.round(segs[1] / 2)]} position={[2.3, 0.4, -9]} size={[14, 9]} speed={0.6} emissive={0.55} reduced={reduced} />
      <Gateway fade={progress} w={3.6} h={6.1} position={[2.3, -3, -3.2]} image={image} fill={wine} accent={accent} lit={false} onTexture={() => { done.current.tex = true; fire(); }} />
      {list.map((p, i) => (
        <Gateway key={p.slug} interactive w={1.15} h={1.95} position={slots[i]} rotY={i === 0 ? 0.35 : i === 1 ? 0 : -0.3} fill="#54162F" accent={accent}
          lit={hovered === p.slug} onOver={() => onHover(p.slug)} onOut={() => onHover(null)} onClick={() => onOpen(p.slug)} />
      ))}
      <Particles count={lowPower ? 120 : 300} color={accent} reduced={reduced} />
    </Canvas>
  );
}
