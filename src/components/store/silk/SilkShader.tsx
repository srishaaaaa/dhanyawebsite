"use client";
import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

export type SilkTone = "plum" | "ivory" | "gold";
export const TONES: Record<SilkTone, { deep: string; mid: string; light: string; accent: string }> = {
  plum: { deep: "#140413", mid: "#54162F", light: "#8a2f57", accent: "#C8A66A" },
  ivory: { deep: "#E8D5D5", mid: "#F8F3EB", light: "#ffffff", accent: "#C8A66A" },
  gold: { deep: "#54162F", mid: "#9c7a3d", light: "#e9d29a", accent: "#fff3d1" },
};

const vert = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

// Silk in the fragment shader: a domain-warped height field lit by finite-difference normals (soft diffuse,
// anisotropic-looking specular ridges and a rim sheen). No geometry to update on the CPU, so it is cheap on phones.
const frag = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime, uScroll, uAspect, uDetail;
uniform vec2 uPointer;
uniform vec3 uDeep, uMid, uLight, uAccent;

float field(vec2 p){
  float t = uTime * 0.12;
  float h = 0.0, a = 0.5;
  for(int i = 0; i < 4; i++){
    if(float(i) >= uDetail) break;
    p += 0.42 * vec2(sin(p.y * 1.9 + t * 1.3 + float(i) * 1.7), cos(p.x * 1.5 - t + float(i) * 2.3));
    h += a * sin(p.x * 2.6 + p.y * 1.1 + t * 1.6);
    p *= 1.55; a *= 0.5;
  }
  return h;
}

void main(){
  vec2 uv = vUv;
  vec2 p = vec2(uv.x * uAspect, uv.y) * 1.35 + vec2(uScroll * 0.8, uScroll * 0.35);
  p += uPointer * 0.18;
  float e = 0.012;
  float h = field(p);
  float hx = field(p + vec2(e, 0.0)) - h;
  float hy = field(p + vec2(0.0, e)) - h;
  vec3 n = normalize(vec3(-hx / e * 0.16, -hy / e * 0.16, 1.0));
  vec3 L = normalize(vec3(0.55 + uPointer.x * 0.4, 0.6 + uPointer.y * 0.3, 0.7));
  float diff = clamp(dot(n, L) * 0.5 + 0.5, 0.0, 1.0);
  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
  float spec = pow(max(dot(n, H), 0.0), 46.0);
  float sheen = pow(1.0 - n.z, 1.6);
  vec3 col = mix(uDeep, uMid, smoothstep(0.05, 0.6, diff));
  col = mix(col, uLight, smoothstep(0.55, 1.0, diff) * 0.7);
  col += uAccent * spec * 0.55 + uAccent * sheen * 0.28;
  float vig = smoothstep(1.25, 0.25, length((uv - 0.5) * vec2(1.0, 1.25)));
  col *= mix(0.55, 1.0, vig);
  gl_FragColor = vec4(col, 1.0);
}`;

function Plane({ tone, reduced, low, scrollEl }: { tone: SilkTone; reduced: boolean; low: boolean; scrollEl: React.RefObject<HTMLElement | null> }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => {
    const t = TONES[tone];
    return {
      uTime: { value: 0 }, uScroll: { value: 0 }, uAspect: { value: 1 }, uDetail: { value: low ? 2 : 4 }, uPointer: { value: new THREE.Vector2() },
      uDeep: { value: new THREE.Color(t.deep) }, uMid: { value: new THREE.Color(t.mid) }, uLight: { value: new THREE.Color(t.light) }, uAccent: { value: new THREE.Color(t.accent) },
    };
  }, [tone, low]);
  const target = useRef(new THREE.Vector2());
  useFrame(({ clock, pointer, size }, dt) => {
    const m = mat.current; if (!m) return;
    m.uniforms.uTime.value = reduced ? 8 : clock.elapsedTime;
    m.uniforms.uAspect.value = size.width / size.height;
    target.current.set(reduced ? 0 : pointer.x, reduced ? 0 : pointer.y);
    m.uniforms.uPointer.value.lerp(target.current, 1 - Math.pow(0.01, dt));
    const el = scrollEl.current;
    if (el && !reduced) { const r = el.getBoundingClientRect(); m.uniforms.uScroll.value = (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight; }
  });
  const geo = useMemo(() => new THREE.PlaneGeometry(2, 2), []);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} frustumCulled={false}>
      <shaderMaterial ref={mat} vertexShader={vert} fragmentShader={frag} uniforms={uniforms} depthTest={false} depthWrite={false} />
    </mesh>
  );
}

/** The canvas itself. Loaded lazily by <SilkField>, which decides when it is allowed to run. */
export default function SilkShader({ tone, reduced, low, scrollEl, active }: { tone: SilkTone; reduced: boolean; low: boolean; scrollEl: React.RefObject<HTMLElement | null>; active: boolean }) {
  return (
    <Canvas dpr={low ? 1 : [1, 1.5]} gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }} frameloop={reduced ? "demand" : active ? "always" : "never"}
      camera={{ position: [0, 0, 1] }} style={{ position: "absolute", inset: 0 }}>
      <Plane tone={tone} reduced={reduced} low={low} scrollEl={scrollEl} />
    </Canvas>
  );
}
