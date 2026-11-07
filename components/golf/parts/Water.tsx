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

// Both overlays used to rebuild a CanvasTexture pixel-by-pixel in JS every
// frame (~330k texels + two GPU uploads). The same wave math now runs in
// fragment shaders; per-frame cost is one uTime uniform write per material.
// Coordinates: the old textures tiled via tex.repeat, so shader coords are
// uv * old-repeat; frequencies below are unchanged from the canvas code.

const OVERLAY_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Ripple: 3-octave interference field, shaded as if lit from the sun side.
// Replaces the meshStandardMaterial + animated normal map.
const RIPPLE_FRAG = /* glsl */ `
uniform float uTime;
uniform vec3 uColor;
uniform float uOpacity;
varying vec2 vUv;
void main() {
  vec2 p = vUv * 8.0;        // was tex.repeat.set(8, 8); continuous, so no tile seams
  float t = uTime * 0.4;
  float w1 = sin(p.x * 14.0 + t * 1.1) * cos(p.y * 10.0 + t * 0.75);
  float w2 = sin(p.x * 8.0  - t * 0.85) * cos(p.y * 16.0 + t * 1.2);
  float w3 = sin((p.x + p.y) * 22.0 + t * 1.6) * 0.5;
  float n  = (w1 + w2 + w3) * 0.34;
  vec3 col = uColor * (0.8 + n * 0.45);
  gl_FragColor = vec4(col, uOpacity);
  #include <colorspace_fragment>
}
`;

// Caustics: two interfering wave systems sharpened into bright veins.
// Replaces the meshBasicMaterial + scrolling CanvasTexture. The lake
// ShapeGeometry's UVs are shape-space coords (world x, -z), so the pattern
// is anchored to the water, exactly like the old world-tiled texture.
const CAUSTIC_FRAG = /* glsl */ `
uniform float uTime;
uniform float uOpacity;
varying vec2 vUv;
void main() {
  float t = uTime * 0.18;
  // was tex.repeat.set(2.5, 2.5) + offset scroll of (0.012, 0.009) tiles/s
  vec2 p = vUv * 2.5 + vec2(0.012, 0.009) * uTime;
  float a = sin((p.x * 7.0 + sin(p.y * 5.0 + t * 1.3)) * 2.5 + t * 0.9);
  float b = sin((p.y * 6.5 + cos(p.x * 4.8 + t * 1.1)) * 2.5 - t * 0.7);
  float v = (a + b) * 0.5;
  v = pow(max(v, 0.0), 4.2);
  // The old mipmapped texture blurred to nothing at distance; without this
  // fade the full-frequency pattern aliases into white speckle far away.
  float px = max(fwidth(p.x), fwidth(p.y));
  v *= 1.0 - smoothstep(0.04, 0.18, px);
  vec3 col = vec3(0.706, 0.863, 1.0) + v * vec3(0.3, 0.13, 0.0); // pale aqua -> white veins
  gl_FragColor = vec4(col, v * uOpacity);
  #include <colorspace_fragment>
}
`;

interface WaterOverlayMaterials { ripple: THREE.ShaderMaterial; caustic: THREE.ShaderMaterial }

function useWaterOverlayMaterials(): WaterOverlayMaterials {
  const mats = useMemo<WaterOverlayMaterials>(() => {
    const ripple = new THREE.ShaderMaterial({
      vertexShader: OVERLAY_VERT,
      fragmentShader: RIPPLE_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(PALETTE.waterRipple) },
        uOpacity: { value: 0.14 },
      },
      transparent: true,
      depthWrite: false,
    });
    const caustic = new THREE.ShaderMaterial({
      vertexShader: OVERLAY_VERT,
      fragmentShader: CAUSTIC_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0.12 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    return { ripple, caustic };
  }, []);

  useFrame((_, delta) => {
    mats.ripple.uniforms.uTime.value += delta;
    mats.caustic.uniforms.uTime.value += delta;
  });

  useEffect(() => () => { mats.ripple.dispose(); mats.caustic.dispose(); }, [mats]);

  return mats;
}

export function Water() {
  const overlays = useWaterOverlayMaterials();

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

      {/* Ripple shimmer overlay (GPU, was animated normal map) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, WATER_Y + 0.001, 0]} material={overlays.ripple}>
        <planeGeometry args={[60, 60]} />
      </mesh>

      {/* Caustic shimmer overlay -- additive bright bands clipped to lake shape */}
      <mesh geometry={lakeGeo} position={[0, WATER_Y + 0.002, 0]} material={overlays.caustic} />
    </group>
  );
}
