// Turf material -- tiling grass albedo + normal, macro mottling and mowing
// stripes, all sampled in WORLD space.
//
// Realism tier 1 (items 1 + 2). Why world space and not the mesh UVs: the
// terrain grid carries world UVs, but Green / TeeAreas / GrassApproach are
// ShapeGeometry whose UVs are raw shape coordinates. Sampling by world x/z
// makes every turf mesh line up with no seam where one meets another, and
// lets a stripe run continuously across them.
//
// COLOUR STILL COMES FROM THE PALETTE. The albedo map is used as a DETAIL
// signal only: each texel is divided by the map's measured mean colour, so
// the map averages to 1.0 and the palette colour is preserved on average.
// The texture adds blade-scale variation, never a hue of its own.
//
// Assets: public/textures/turf/ (ambientCG Grass004, CC0 -- see CREDITS.md).

import * as THREE from "three";

/** Linear-space mean of turf-albedo.jpg, measured when the asset was
 *  resized (sharp, per-pixel sRGB -> linear). Re-measure if the file changes. */
const MAP_MEAN = new THREE.Vector3(0.1255, 0.1599, 0.0348);

/** World units per texture repeat. The source photo covers ~1 m of turf;
 *  3 wu (~9 m) over-scales the blades but they are sub-pixel at broadcast
 *  distance anyway, and a smaller tile shows its repeat as a grid. */
const TILE = 3.0;

export interface StripeSpec {
  /** Width of one mower pass (wu). */
  width: number;
  /** Lightness swing either side of the palette colour, e.g. 0.12 = +/-12%. */
  amount: number;
  /** Mowing direction in world XZ, radians from +z (the line of play). */
  angle: number;
  /** Second pass at +90 deg -- the checkerboard cross-cut on greens. */
  cross?: boolean;
}

export interface TurfOptions {
  color: string;
  roughness: number;
  stripe?: StripeSpec;
  vertexColors?: boolean;
  emissive?: string;
  emissiveIntensity?: number;
  /** Blade detail contrast, 0..1. */
  detail?: number;
  /** Large-scale patchiness, 0..~0.1. */
  mottle?: number;
}

// --- shared textures (one load for every turf material) ---------------------
let albedo: THREE.Texture | null = null;
let normal: THREE.Texture | null = null;

function turfTextures(): { albedo: THREE.Texture; normal: THREE.Texture } {
  if (!albedo || !normal) {
    const loader = new THREE.TextureLoader();
    albedo = loader.load("/textures/turf/turf-albedo.jpg");
    albedo.colorSpace = THREE.SRGBColorSpace;
    normal = loader.load("/textures/turf/turf-normal.jpg");
    normal.colorSpace = THREE.NoColorSpace;
    for (const t of [albedo, normal]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 8; // three clamps to the device max
    }
  }
  return { albedo, normal };
}

// --- shader patch ------------------------------------------------------------
const FRAG_PARS = /* glsl */ `
uniform float uTurfTile;
uniform vec3  uTurfMean;
uniform float uTurfDetail;
uniform float uTurfMottle;
uniform float uStripeAmt;
uniform float uStripeWidth;
uniform vec2  uStripeDir;
uniform float uStripeCross;
varying vec3  vTurfWorld;

float turfHash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float turfNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(turfHash(i), turfHash(i + vec2(1.0, 0.0)), u.x),
             mix(turfHash(i + vec2(0.0, 1.0)), turfHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
// One mower direction: +1 / -1 bands, softened by screen-space derivative so
// distant stripes blend instead of aliasing, and faded out entirely once a
// pass is narrower than a couple of pixels.
float turfStripe(vec2 p, vec2 dir) {
  float a = dot(p, vec2(dir.y, -dir.x)) / uStripeWidth; // across the passes
  float fw = fwidth(a);
  float k = clamp(fw * 3.0 + 0.12, 0.12, 1.0);
  float s = smoothstep(-k, k, sin(a * 3.14159265));
  return (s * 2.0 - 1.0) * (1.0 - smoothstep(0.2, 0.5, fw));
}
`;

const FRAG_MAP = /* glsl */ `
#ifdef USE_MAP
  {
    vec3 tex = texture2D(map, vTurfWorld.xz / uTurfTile).rgb;
    vec3 d = clamp(tex / uTurfMean, 0.0, 3.0);
    float l = dot(d, vec3(0.3, 0.6, 0.1));
    // mostly luminance, a little of the photo's yellow/green blade variation
    vec3 detail = mix(vec3(l), d, 0.3);
    diffuseColor.rgb *= mix(vec3(1.0), detail, uTurfDetail);
  }
#endif
  {
    vec2 w = vTurfWorld.xz;
    float m = turfNoise(w * 0.07) * 0.6 + turfNoise(w * 0.23 + 7.1) * 0.4;
    diffuseColor.rgb *= 1.0 + uTurfMottle * (m - 0.5) * 2.0;
    if (uStripeAmt > 0.0) {
      float s = turfStripe(w, uStripeDir);
      if (uStripeCross > 0.5) {
        s = 0.5 * (s + turfStripe(w, vec2(-uStripeDir.y, uStripeDir.x)));
      }
      diffuseColor.rgb *= 1.0 + uStripeAmt * s;
    }
  }
`;

const WORLD_UV = "(vTurfWorld.xz / uTurfTile)";

export function makeTurfMaterial(opts: TurfOptions): THREE.MeshStandardMaterial {
  const { albedo: map, normal: normalMap } = turfTextures();
  const mat = new THREE.MeshStandardMaterial({
    color: opts.color,
    roughness: opts.roughness,
    metalness: 0,
    map,
    normalMap,
    normalScale: new THREE.Vector2(0.7, 0.7),
    vertexColors: opts.vertexColors ?? false,
    emissive: opts.emissive ?? "#000000",
    emissiveIntensity: opts.emissiveIntensity ?? 0,
  });

  const st = opts.stripe;
  const uniforms = {
    uTurfTile: { value: TILE },
    uTurfMean: { value: MAP_MEAN },
    uTurfDetail: { value: opts.detail ?? 0.55 },
    uTurfMottle: { value: opts.mottle ?? 0.07 },
    uStripeAmt: { value: st ? st.amount : 0 },
    uStripeWidth: { value: st ? st.width : 1 },
    uStripeDir: { value: new THREE.Vector2(Math.sin(st?.angle ?? 0), Math.cos(st?.angle ?? 0)) },
    uStripeCross: { value: st?.cross ? 1 : 0 },
  };

  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = "varying vec3 vTurfWorld;\n" + shader.vertexShader.replace(
      "#include <fog_vertex>",
      "#include <fog_vertex>\n  vTurfWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;",
    );
    // Normal map sampled in world space too. The chunks are expanded inline
    // so their vNormalMapUv references can be swapped; the varying itself is
    // left declared (and unused) so the vertex stage still links.
    const nBegin = THREE.ShaderChunk.normal_fragment_begin.split("vNormalMapUv").join(WORLD_UV);
    const nMaps = THREE.ShaderChunk.normal_fragment_maps.split("vNormalMapUv").join(WORLD_UV);
    shader.fragmentShader = FRAG_PARS + shader.fragmentShader
      .replace("#include <map_fragment>", FRAG_MAP)
      .replace("#include <normal_fragment_begin>", nBegin)
      .replace("#include <normal_fragment_maps>", nMaps);
  };
  // Uniform-driven, so every turf material shares one program per define set.
  mat.customProgramCacheKey = () => "turf-v1";
  return mat;
}

/** Mowing patterns per surface. Exaggerated vs a real mower pass (~0.2 wu on
 *  a green) on purpose: the default camera is ~60 wu out and real-width
 *  passes are sub-pixel there. Rough is never striped. */
export const STRIPES = {
  // tight diagonal cross-cut -> checkerboard
  green:   { width: 0.9, amount: 0.15, angle: Math.PI / 4, cross: true },
  // wide passes along the line of play (tee -> green is world +z)
  fairway: { width: 1.6, amount: 0.12, angle: 0 },
} as const satisfies Record<string, StripeSpec>;
