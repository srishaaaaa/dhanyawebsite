"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export type Orbit = { theta: number; phi: number; dist: number };
export type LightName = "atelier" | "candlelit" | "daylight";
export const VIEWS: Record<"front" | "back" | "detail", Orbit> = {
  front: { theta: 0, phi: 1.45, dist: 8.5 }, back: { theta: Math.PI, phi: 1.45, dist: 8.5 }, detail: { theta: 0.3, phi: 1.52, dist: 4 },
};
export const LIGHTS: Record<LightName, { label: string; key: string; keyI: number; fill: string; fillI: number; amb: number; bg: string }> = {
  atelier: { label: "Atelier", key: "#ffe9c2", keyI: 2.1, fill: "#E8D5D5", fillI: 14, amb: 0.45, bg: "radial-gradient(60% 60% at 50% 40%, #54162F, #1B071A 75%)" },
  candlelit: { label: "Candlelit", key: "#ffb45a", keyI: 1.5, fill: "#C8A66A", fillI: 10, amb: 0.22, bg: "radial-gradient(60% 60% at 50% 45%, #3a0d1f, #120511 80%)" },
  daylight: { label: "Daylight", key: "#ffffff", keyI: 2.6, fill: "#dfe8ff", fillI: 12, amb: 0.7, bg: "radial-gradient(60% 60% at 50% 40%, #6b3a5e, #30042E 80%)" },
};

/** Orbit camera damped toward `target` (set by drag / wheel / pinch / view buttons in StudioView). */
function Rig({ target, reduced }: { target: React.MutableRefObject<Orbit>; reduced: boolean }) {
  const { camera } = useThree();
  const cur = useRef<Orbit>({ ...target.current });
  useFrame((_, dt) => {
    const k = reduced ? 1 : 1 - Math.pow(0.0015, dt), t = target.current, c = cur.current;
    c.theta += (t.theta - c.theta) * k; c.phi += (t.phi - c.phi) * k; c.dist += (t.dist - c.dist) * k;
    camera.position.set(c.dist * Math.sin(c.phi) * Math.sin(c.theta), 0.2 + c.dist * Math.cos(c.phi) * 0.3 + 0.0, c.dist * Math.sin(c.phi) * Math.cos(c.theta));
    camera.lookAt(0, 0, 0);
  });
  return null;
}

/** Procedural silk drape swatch: pleats deepen toward the hem. A COLOUR/FABRIC PREVIEW, not a model of the product. */
function Drape({ color, low, reduced }: { color: string; low: boolean; reduced: boolean }) {
  const segs: [number, number] = low ? [50, 70] : [90, 120];
  const geo = useMemo(() => new THREE.PlaneGeometry(3, 4.4, segs[0], segs[1]), [segs]);
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array as Float32Array), [geo]);
  useEffect(() => () => geo.dispose(), [geo]);
  const fold = (t: number) => {
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3], y = base[i * 3 + 1], hang = (2.2 - y) / 4.4;
      pos.setZ(i, Math.sin(x * 5.2 + Math.sin(y * 0.8) * 0.6 + t) * 0.13 * (0.25 + hang * 0.9) + Math.sin(x * 2.1 - t * 0.6) * 0.05 * hang);
    }
    pos.needsUpdate = true; geo.computeVertexNormals();
  };
  useEffect(() => { if (reduced) fold(1); }); // eslint-disable-line react-hooks/exhaustive-deps
  useFrame(({ clock }) => { if (!reduced) fold(clock.elapsedTime * 0.35); });
  return (
    <group position={[0, 0.15, 0]}>
      <mesh geometry={geo}><meshPhysicalMaterial color={color} roughness={0.4} sheen={1} sheenRoughness={0.25} sheenColor="#C8A66A" clearcoat={0.2} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, 2.25, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.04, 0.04, 3.4, 20]} /><meshStandardMaterial color="#C8A66A" metalness={0.9} roughness={0.28} /></mesh>
    </group>
  );
}

/** The product's own GLB when the store has uploaded one; scaled/centred, never recoloured. */
function Model({ url, onError }: { url: string; onError: () => void }) {
  const [obj, setObj] = useState<THREE.Object3D | null>(null);
  useEffect(() => {
    let dead = false, loaded: THREE.Object3D | null = null;
    new GLTFLoader().load(url, (g) => {
      if (dead) return;
      const box = new THREE.Box3().setFromObject(g.scene), size = box.getSize(new THREE.Vector3());
      g.scene.scale.setScalar(4.2 / Math.max(size.y, 0.001));
      box.setFromObject(g.scene); g.scene.position.sub(box.getCenter(new THREE.Vector3()));
      loaded = g.scene; setObj(g.scene);
    }, undefined, () => { if (!dead) onError(); });
    return () => {
      dead = true;
      loaded?.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.geometry.dispose(); [m.material].flat().forEach((x) => x.dispose()); } });
    };
  }, [url, onError]);
  return obj ? <primitive object={obj} /> : null;
}

export default function StudioScene({ target, color, light, modelUrl, low, reduced, active, onModelError, onReady }: {
  target: React.MutableRefObject<Orbit>; color: string; light: LightName; modelUrl?: string | null; low: boolean; reduced: boolean; active: boolean;
  onModelError: () => void; onReady: () => void;
}) {
  const L = LIGHTS[light];
  useEffect(() => { onReady(); }, [onReady]);
  return (
    <Canvas dpr={low ? 1 : [1, 1.6]} camera={{ fov: 38, position: [0, 0.3, 8.5] }} gl={{ antialias: !low, alpha: true }} frameloop={reduced ? "demand" : active ? "always" : "never"}>
      <ambientLight intensity={L.amb} />
      <directionalLight position={[3, 5, 4]} intensity={L.keyI} color={L.key} />
      <pointLight position={[-4, 1, 3]} intensity={L.fillI} color={L.fill} />
      <Rig target={target} reduced={reduced} />
      {modelUrl ? <Model url={modelUrl} onError={onModelError} /> : <Drape color={color} low={low} reduced={reduced} />}
      <mesh position={[0, -2.45, 0]}><cylinderGeometry args={[1.9, 2.05, 0.12, 64]} /><meshStandardMaterial color="#1B071A" metalness={0.6} roughness={0.35} /></mesh>
      <mesh position={[0, -2.38, 0]}><torusGeometry args={[1.9, 0.015, 8, 96]} /><meshStandardMaterial color="#C8A66A" metalness={0.95} roughness={0.25} /></mesh>
    </Canvas>
  );
}
