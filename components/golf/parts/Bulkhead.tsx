"use client";

import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import {
  makeGreenShape,
  getLakeOutlinePoints,
  makeGrassApproachShape,
  makeTreeIslandShape,
  offsetPolygon,
} from "@/lib/golf/geometry";
import { WATER_Y } from "@/lib/golf/types";
import { PALETTE } from "@/lib/golf/palette";
import { SHORE_ARCS } from "@/lib/golf/shore";

// Bulkhead -- timber retaining walls around every land/water boundary.
//
// Rebuilt 2026-08-01 from ExtrudeGeometry to explicit quad strips. Extrude gave
// no control over either problem we had:
//   - UVs. Its side-wall generator derives UVs from world position, so plank
//     width varied with where a wall happened to sit and could not be dialled
//     in. Strips let U be CUMULATIVE ARC LENGTH, so PLANK_TILE_WU is literally
//     "world units per texture repeat" and plank width is a number you set.
//   - Width. Extrude's top cap was doing the visual work, which is why the rim
//     read wide. Now the cap is an explicit board of CAP_BOARD_WU.
//
// V is mapped from world Y so the texture's BAKED WATERLINE STAIN lands on the
// real surface: WATER_Y -> v=0.15 (top of the stain), cap -> v=1.
//
// Texture is public/textures/bulkhead/bulkhead-tile.jpg (Nano Banana, albedo
// only, horizontally tileable). The normal map is derived from its luminance
// at load -- no second asset, and it is what makes individual planks catch the
// low sun.

const WALL_DEPTH    = 0.5;   // wu -- how far the wall drops below its cap
const WALL_OFFSET   = 0.14;  // wu -- wall face outboard of the land outline
const CAP_BOARD_WU  = 0.14;  // wu -- width of the horizontal coping board
const PLANK_TILE_WU = 1.6;   // wu of shoreline per texture repeat (~16 planks)
const STAIN_V       = 0.15;  // v of the waterline stain's top edge in the image

const TIMBER_COLOR = "#6a5340"; // fallback before the texture resolves

// Cap heights sit just BELOW the surface each wall retains, so the land mesh
// hides the inner edge of the coping board and only the outer rim shows.
const CAP_GREEN   = 0.042; // island landmass 0.045, green surface 0.05
const CAP_WALKWAY = 0.018; // GrassApproach 0.022
const CAP_LAKE    = 0.006; // terrain 0.01, shore ring 0.014
const CAP_TREE    = 0.050; // TreeIsland mound 0.06

/** Map a world Y to texture V so the baked stain sits at the waterline. */
function vAt(y: number, capY: number): number {
  return STAIN_V + ((y - WATER_Y) / (capY - WATER_Y)) * (1 - STAIN_V);
}

interface Strip {
  pos: number[];
  uv: number[];
}

/**
 * Vertical wall + horizontal coping board along an outline.
 * `wallOn` picks which edge carries the wall: islands are retained from the
 * outside (wall on the offset line), the lake bank from the inside (wall on the
 * outline itself, at the water's edge).
 * `arc` limits the run to a fraction range of the loop -- the lake perimeter is
 * only bulkheaded around the 16th green (see lib/golf/shore.ts).
 */
function buildWall(
  pts: THREE.Vector2[],
  capY: number,
  wallOn: "outer" | "inner",
  arc?: [number, number]
): Strip {
  const outer = offsetPolygon(pts, WALL_OFFSET);
  const cap = offsetPolygon(pts, wallOn === "outer" ? CAP_BOARD_WU : -CAP_BOARD_WU);
  const wallLine = wallOn === "outer" ? outer : pts;
  const capA = wallOn === "outer" ? pts : pts;
  const capB = wallOn === "outer" ? outer : cap;

  const pos: number[] = [];
  const uv: number[] = [];
  const n = pts.length;
  const bottom = capY - WALL_DEPTH;
  const vBot = vAt(bottom, capY);
  const vTop = vAt(capY, capY);

  const lo = arc ? Math.floor(arc[0] * n) : 0;
  const hi = arc ? Math.ceil(arc[1] * n) : n;

  let arcLen = 0;
  for (let i = lo; i < hi; i++) {
    const j = (i + 1) % n;
    const a = wallLine[i];
    const b = wallLine[j];
    const segLen = Math.hypot(b.x - a.x, b.y - a.y);
    const u0 = arcLen / PLANK_TILE_WU;
    const u1 = (arcLen + segLen) / PLANK_TILE_WU;
    arcLen += segLen;

    // shape space -> world: (sx, y, -sy)
    // wall quad: a-top, b-top, b-bottom, a-bottom
    const q = [
      [a.x, capY, -a.y, u0, vTop],
      [b.x, capY, -b.y, u1, vTop],
      [b.x, bottom, -b.y, u1, vBot],
      [a.x, bottom, -a.y, u0, vBot],
    ];
    for (const [p, r, s] of [[0, 1, 2], [0, 2, 3]]) {
      for (const k of [p, r, s]) {
        pos.push(q[k][0], q[k][1], q[k][2]);
        uv.push(q[k][3], q[k][4]);
      }
    }

    // coping board -- flat, spans the wall face to the land edge
    const ca = capA[i], cb = capA[j];
    const oa = capB[i], ob = capB[j];
    const c = [
      [ca.x, capY, -ca.y, u0, 0.97],
      [cb.x, capY, -cb.y, u1, 0.97],
      [ob.x, capY, -ob.y, u1, 1.0],
      [oa.x, capY, -oa.y, u0, 1.0],
    ];
    for (const [p, r, s] of [[0, 2, 1], [0, 3, 2]]) {
      for (const k of [p, r, s]) {
        pos.push(c[k][0], c[k][1], c[k][2]);
        uv.push(c[k][3], c[k][4]);
      }
    }
  }
  return { pos, uv };
}

function toGeometry(strips: Strip[]): THREE.BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  for (const s of strips) {
    pos.push(...s.pos);
    uv.push(...s.uv);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

/** Sobel a luminance map out of the albedo to fake a normal map. */
function deriveNormalMap(img: HTMLImageElement, strength = 3.0): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const src = document.createElement("canvas");
  src.width = w;
  src.height = h;
  const sctx = src.getContext("2d");
  if (!sctx) return null;
  sctx.drawImage(img, 0, 0);
  const data = sctx.getImageData(0, 0, w, h).data;

  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    lum[i] = (0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2]) / 255;
  }
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const octx = out.getContext("2d");
  if (!octx) return null;
  const dst = octx.createImageData(w, h);
  const at = (x: number, y: number) =>
    lum[((y + h) % h) * w + ((x + w) % w)];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx =
        at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1) -
        at(x + 1, y - 1) - 2 * at(x + 1, y) - at(x + 1, y + 1);
      const dy =
        at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1) -
        at(x - 1, y + 1) - 2 * at(x, y + 1) - at(x + 1, y + 1);
      let nx = -dx * strength;
      let ny = -dy * strength;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len;
      ny /= len;
      const i = (y * w + x) * 4;
      dst.data[i] = (nx * 0.5 + 0.5) * 255;
      dst.data[i + 1] = (ny * 0.5 + 0.5) * 255;
      dst.data[i + 2] = (nz / len) * 255;
      dst.data[i + 3] = 255;
    }
  }
  octx.putImageData(dst, 0, 0);
  const tex = new THREE.CanvasTexture(out);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function Bulkhead() {
  const [maps, setMaps] = useState<{ map: THREE.Texture; normalMap: THREE.Texture | null } | null>(null);

  useEffect(() => {
    let alive = true;
    const loader = new THREE.TextureLoader();
    loader.load("/textures/bulkhead/bulkhead-tile.jpg", (tex) => {
      if (!alive) return;
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      const img = tex.image as HTMLImageElement;
      setMaps({ map: tex, normalMap: img ? deriveNormalMap(img) : null });
    });
    return () => {
      alive = false;
    };
  }, []);

  const geo = useMemo(() => {
    const green = makeGreenShape().getPoints(200);
    const walkway = makeGrassApproachShape().getPoints(96);
    const tree = makeTreeIslandShape().getPoints(96);
    const lake = getLakeOutlinePoints();
    return toGeometry([
      buildWall(green, CAP_GREEN, "outer"),
      buildWall(walkway, CAP_WALKWAY, "outer"),
      buildWall(tree, CAP_TREE, "outer"),
      // lake perimeter: ONLY around the 16th green, not down its fairway
      buildWall(lake, CAP_LAKE, "inner", SHORE_ARCS.bulkhead),
    ]);
  }, []);

  useEffect(() => () => geo.dispose(), [geo]);

  return (
    <group name="bulkhead">
      <mesh geometry={geo} castShadow receiveShadow>
        <meshStandardMaterial
          color={maps ? PALETTE.timberTint : TIMBER_COLOR}
          map={maps?.map ?? undefined}
          normalMap={maps?.normalMap ?? undefined}
          normalScale={new THREE.Vector2(0.8, 0.8)}
          roughness={0.92}
          metalness={0.02}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
