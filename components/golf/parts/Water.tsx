"use client";

import { useRef, useMemo, useEffect, useLayoutEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshReflectorMaterial } from "@react-three/drei";
import * as THREE from "three";
import { makeLakeShape, getLakeOutlinePoints, makeGreenShape, makeTreeIslandShape } from "@/lib/golf/geometry";
import { lakeEdgeDistance } from "@/lib/golf/elevation";
import { PALETTE } from "@/lib/golf/palette";
import { WATER_Y } from "@/lib/golf/types";

// Water -- lake-shaped reflective surface + animated ripple normal +
// caustic-like brightness overlay that rolls across the lake.
//
// Layers:
//   1. MeshReflectorMaterial on lake polygon (reflections + dark base)
//   2. Animated 3-octave ripple normal map on full plane
//   3. Caustic shimmer overlay (additive bright bands)

// --- Depth gradient + fresnel (realism tier 1, item 3) -----------------------
// The lake has no bed geometry, so "depth" is distance to the nearest shore:
// lake outline, island green and tree island. It is baked ONCE into a small
// R8 texture over the lake's bounds and sampled per pixel by world x/z -- the
// lake is a ShapeGeometry with no interior vertices, so a per-vertex
// attribute would have nothing to interpolate across.
//
// The colour ramp and the fresnel are spliced into drei's MeshReflectorMaterial
// shader by WRAPPING its onBeforeCompile (replacing it would drop the
// reflection pass). Postprocessing stays off -- see Sawgrass17.tsx.

const SHORE_TEX = 192;     // texels on the long axis
const SHORE_MAX = 8;       // wu encoded as 1.0 -- deeper than this is all "deep"
const SHORE_PAD = 1;       // wu of margin around the lake bounds

function segDist(px: number, py: number, a: THREE.Vector2, b: THREE.Vector2): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / l2));
  const qx = a.x + t * dx - px, qy = a.y + t * dy - py;
  return Math.sqrt(qx * qx + qy * qy);
}

function polyDist(px: number, py: number, pts: THREE.Vector2[]): number {
  let best = Infinity;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    best = Math.min(best, segDist(px, py, pts[j], pts[i]));
  }
  return best;
}

interface ShoreField { tex: THREE.DataTexture; bounds: THREE.Vector4 }

function bakeShoreField(): ShoreField {
  const lake = getLakeOutlinePoints(); // shape space: world (sx, -sy)
  const islands = [makeGreenShape().getPoints(48), makeTreeIslandShape().getPoints(24)];
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const p of lake) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, -p.y); maxZ = Math.max(maxZ, -p.y);
  }
  minX -= SHORE_PAD; maxX += SHORE_PAD; minZ -= SHORE_PAD; maxZ += SHORE_PAD;
  const spanX = maxX - minX, spanZ = maxZ - minZ;
  const w = spanX >= spanZ ? SHORE_TEX : Math.max(8, Math.round(SHORE_TEX * spanX / spanZ));
  const h = spanZ >= spanX ? SHORE_TEX : Math.max(8, Math.round(SHORE_TEX * spanZ / spanX));
  const data = new Uint8Array(w * h);
  for (let j = 0; j < h; j++) {
    const wz = minZ + ((j + 0.5) / h) * spanZ;
    for (let i = 0; i < w; i++) {
      const wx = minX + ((i + 0.5) / w) * spanX;
      const e = lakeEdgeDistance(wx, wz);
      let d = e.inside ? e.dist : 0;
      if (d > 0) for (const isl of islands) d = Math.min(d, polyDist(wx, -wz, isl));
      data[j * w + i] = Math.round(Math.min(1, d / SHORE_MAX) * 255);
    }
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RedFormat, THREE.UnsignedByteType);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return { tex, bounds: new THREE.Vector4(minX, minZ, 1 / spanX, 1 / spanZ) };
}

// drei's final reflection mix -- the line the fresnel term rewrites. If a drei
// upgrade changes it the patch logs once and the water keeps the depth ramp.
const DREI_MIX = "diffuseColor.rgb = diffuseColor.rgb * ((1.0 - min(1.0, mirror)) + newMerge.rgb * mixStrength);";

function patchReflector(mat: THREE.MeshStandardMaterial, field: ShoreField): void {
  const flagged = mat as THREE.MeshStandardMaterial & { __depthPatched?: boolean };
  if (flagged.__depthPatched) return;
  flagged.__depthPatched = true;
  const base = mat.onBeforeCompile.bind(mat);
  const toLinear = (hex: string) => new THREE.Color(hex); // Color() stores linear
  const uniforms = {
    uShoreTex: { value: field.tex },
    uShoreBounds: { value: field.bounds },
    uShoreMax: { value: SHORE_MAX },
    uWaterBank: { value: toLinear(PALETTE.waterBank) },
    uWaterShallow: { value: toLinear(PALETTE.waterShallow) },
    uWaterDeep: { value: toLinear(PALETTE.waterDeep) },
    uReflMin: { value: 0.3 },
  };
  mat.onBeforeCompile = (shader, renderer) => {
    base(shader, renderer);
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = "varying vec3 vWaterWorld;\n" + shader.vertexShader.replace(
      "#include <fog_vertex>",
      "#include <fog_vertex>\n  vWaterWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;",
    );
    let fs = `uniform sampler2D uShoreTex;
uniform vec4 uShoreBounds;
uniform float uShoreMax;
uniform vec3 uWaterBank;
uniform vec3 uWaterShallow;
uniform vec3 uWaterDeep;
uniform float uReflMin;
varying vec3 vWaterWorld;
` + shader.fragmentShader;
    // Depth ramp goes in BEFORE drei's reflection block (inserted at the same
    // include), so the reflection is tinted by the local water colour.
    fs = fs.replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
      {
        vec2 suv = (vWaterWorld.xz - uShoreBounds.xy) * uShoreBounds.zw;
        float sd = texture2D(uShoreTex, suv).r * uShoreMax;
        vec3 wc = mix(uWaterBank, uWaterShallow, smoothstep(0.0, 1.0, sd));
        wc = mix(wc, uWaterDeep, smoothstep(1.0, 6.5, sd));
        diffuseColor.rgb = wc;
      }`);
    if (fs.includes(DREI_MIX)) {
      // Schlick-shaped, artistically scaled: grazing -> full mirror (as
      // before), overhead -> mostly body colour, so the depth ramp shows.
      fs = fs.replace(DREI_MIX, `{
        float cosT = clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0);
        float rw = mix(uReflMin, 1.0, clamp(pow(1.0 - cosT, 2.5) * 1.6, 0.0, 1.0));
        diffuseColor.rgb = diffuseColor.rgb * ((1.0 - min(1.0, mirror) * rw) + newMerge.rgb * mixStrength * rw);
      }`);
    } else {
      console.warn("Water: drei reflector mix line not found -- fresnel skipped");
    }
    shader.fragmentShader = fs;
  };
  mat.customProgramCacheKey = () => "water-depth-v1";
  mat.needsUpdate = true;
}

// WATER_Y lives in lib/golf/types.ts -- Bulkhead needs it too, to align the
// texture's baked waterline stain with the actual surface.

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

  const shoreField = useMemo(() => bakeShoreField(), []);
  const reflectorRef = useRef<React.ComponentRef<typeof MeshReflectorMaterial>>(null);
  useLayoutEffect(() => {
    if (reflectorRef.current) patchReflector(reflectorRef.current, shoreField);
  }, [shoreField]);

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
          ref={reflectorRef}
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
          opacity={0.14}
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
