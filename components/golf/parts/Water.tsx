"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshReflectorMaterial } from "@react-three/drei";
import * as THREE from "three";
import { makeLakeShape } from "@/lib/golf/geometry";
import { PALETTE } from "@/lib/golf/palette";

// Water -- lake-shaped reflective surface + animated ripple normal +
// caustic-like brightness overlay that rolls across the lake.
//
// Layers:
//   1. MeshReflectorMaterial on lake polygon (reflections + dark base)
//   2. Animated 3-octave ripple normal map on full plane
//   3. Caustic shimmer overlay (additive bright bands)

// Water sits ~2.2 ft below the bulkhead caps (1 wu = 3.05 m ~ 10 ft).
// It used to be -0.02, leaving only 2.4 INCHES of timber above the surface,
// which is why the bulkhead read as a thin brown line instead of a wall.
// The walls extrude 0.5 wu (5 ft) down, so they stay submerged at this level.
const WATER_Y = -0.22;

function useRippleTexture(): React.MutableRefObject<THREE.CanvasTexture | null> {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const texRef    = useRef<THREE.CanvasTexture | null>(null);
  const timeRef   = useRef(0);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const canvas    = document.createElement("canvas");
    canvas.width    = 256;
    canvas.height   = 256;
    canvasRef.current = canvas;
    const tex       = new THREE.CanvasTexture(canvas);
    tex.wrapS       = THREE.RepeatWrapping;
    tex.wrapT       = THREE.RepeatWrapping;
    tex.repeat.set(8, 8);
    texRef.current  = tex;
  }, []);

  useFrame((_, delta) => {
    timeRef.current += delta * 0.4;
    const canvas = canvasRef.current;
    const tex    = texRef.current;
    if (!canvas || !tex) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const t = timeRef.current;
    const imgData = ctx.createImageData(w, h);
    const data    = imgData.data;
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const fx = px / w;
        const fy = py / h;
        // 3 octaves for richer detail
        const w1 = Math.sin(fx * 14 + t * 1.1) * Math.cos(fy * 10 + t * 0.75);
        const w2 = Math.sin(fx * 8  - t * 0.85) * Math.cos(fy * 16 + t * 1.2);
        const w3 = Math.sin((fx + fy) * 22 + t * 1.6) * 0.5;
        const n  = (w1 + w2 + w3) * 0.34;
        const amp = 28;
        const idx = (py * w + px) * 4;
        data[idx + 0] = Math.round(128 + n * amp);
        data[idx + 1] = Math.round(128 + Math.sin(fy * 13 + t) * amp * 0.6);
        data[idx + 2] = 255;
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    tex.needsUpdate = true;
  });

  return texRef;
}

// Caustic-like shimmer: bright wavy bands that scroll across the surface.
function useCausticTexture(): React.MutableRefObject<THREE.CanvasTexture | null> {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const texRef    = useRef<THREE.CanvasTexture | null>(null);
  const timeRef   = useRef(0);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const canvas = document.createElement("canvas");
    canvas.width  = 512;
    canvas.height = 512;
    canvasRef.current = canvas;
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2.5, 2.5);
    texRef.current = tex;
  }, []);

  useFrame((_, delta) => {
    timeRef.current += delta * 0.18;
    const canvas = canvasRef.current;
    const tex    = texRef.current;
    if (!canvas || !tex) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const t = timeRef.current;
    const img = ctx.createImageData(w, h);
    const data = img.data;
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const fx = px / w;
        const fy = py / h;
        // Two interfering wave systems => caustic-like bright veins
        const a = Math.sin((fx * 7.0 + Math.sin(fy * 5.0 + t * 1.3)) * 2.5 + t * 0.9);
        const b = Math.sin((fy * 6.5 + Math.cos(fx * 4.8 + t * 1.1)) * 2.5 - t * 0.7);
        let v = (a + b) * 0.5;
        // Sharpen into bright veins
        v = Math.pow(Math.max(0, v), 4.2);
        const bright = Math.round(v * 255);
        const idx = (py * w + px) * 4;
        // Pale aqua tint
        data[idx + 0] = Math.round(180 + bright * 0.3);
        data[idx + 1] = Math.round(220 + bright * 0.13);
        data[idx + 2] = 255;
        data[idx + 3] = bright; // alpha = brightness so dark areas are transparent
      }
    }
    ctx.putImageData(img, 0, 0);
    tex.needsUpdate = true;
  });

  return texRef;
}

export function Water() {
  const rippleTexRef  = useRippleTexture();
  const causticTexRef = useCausticTexture();

  // Slowly scroll the caustic texture for movement
  const causticMatRef = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((_, delta) => {
    const tex = causticTexRef.current;
    if (!tex) return;
    tex.offset.x += delta * 0.012;
    tex.offset.y += delta * 0.009;
  });

  const lakeGeo = useMemo(() => {
    const shape = makeLakeShape();
    const geo   = new THREE.ShapeGeometry(shape, 32);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, []);

  return (
    <group name="water">
      {/* Reflective lake surface */}
      <mesh geometry={lakeGeo} position={[0, WATER_Y, 0]} receiveShadow>
        <MeshReflectorMaterial
          blur={[400, 120]}
          resolution={512}
          mixBlur={1.0}
          mixStrength={1.2}
          mixContrast={1.0}
          mirror={0.42}
          color={PALETTE.waterDeep}
          roughness={0.2}
          metalness={0.0}
        />
      </mesh>

      {/* Ripple normal overlay */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, WATER_Y + 0.001, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial
          color={PALETTE.waterRipple}
          transparent
          opacity={0.28}
          roughness={0.5}
          metalness={0.02}
          normalMap={rippleTexRef.current ?? undefined}
          normalScale={new THREE.Vector2(0.15, 0.15)}
        />
      </mesh>

      {/* Caustic shimmer overlay -- additive bright bands clipped to lake shape */}
      <mesh geometry={lakeGeo} position={[0, WATER_Y + 0.002, 0]}>
        <meshBasicMaterial
          ref={causticMatRef}
          map={causticTexRef.current ?? undefined}
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
