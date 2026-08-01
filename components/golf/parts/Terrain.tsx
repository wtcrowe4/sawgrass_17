"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { getLakeOutlinePoints } from "@/lib/golf/geometry";
import { PALETTE, ROUGHNESS } from "@/lib/golf/palette";
import { heightAt, lakeEdgeDistance, GRID_FADE_END } from "@/lib/golf/elevation";

// Terrain -- displaced ground built from THREE pieces, because no single
// approach gives both smooth mounds and an exact shoreline:
//
//   1. RING   exact lake outline -> outward offset, earcut, flat at h=0.
//             Narrow ring between two dense polygons triangulates cleanly, so
//             the traced waterline stays pixel-accurate.
//   2. GRID   uniform lattice outside the ring, displaced by heightAt().
//             Uniform triangles are the whole point: the previous version
//             subdivided earcut output, whose slivers sheared under
//             displacement and produced garbage normals.
//   3. SKIRT  flat quads out to the old +/-100 extent. heightAt fades to 0
//             before the grid ends (GRID_FADE_END), so this joins with no step.
//
// The grid also gives usable world-space UVs, which ShapeGeometry never did --
// that is what unblocks a tiling turf albedo/normal.
//
// Shape space: sx = world.x, sy = -world.z.

const TERRAIN_Y = 0.01;
const ROUGH_COLOR = PALETTE.turfRough;

const GRID_EXTENT = 70;   // half-width of the displaced lattice (wu)
const GRID_N = 200;       // cells per axis -> 0.7wu cells
const OUTER_EXTENT = 100; // matches the original terrain square
// Ring width is bounded by the NARROWEST part of the lake: offsetting both
// banks of the north-east arm outward by more than half its width makes the
// offsets cross and the ring bridges the channel with green. 2.2 clears it.
// Must still exceed RING_INNER_SKIP + half a grid cell or a gap opens.
const RING_INNER_SKIP = 1.4; // grid cells within this of the water are dropped
const RING_OUTER = 2.2;      // ring reaches past the grid edge, no gap
const UV_TILE = 6.0;         // wu per texture repeat, for future turf maps

function signedArea(p: THREE.Vector2[]): number {
  let a = 0;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    a += (p[j].x + p[i].x) * (p[j].y - p[i].y);
  }
  return a / 2;
}

/** Offset a closed polygon outward by d, using averaged edge normals.
 *  Self-correcting: winding is verified by comparing areas, because guessing
 *  it wrong silently collapses the polygon inward. */
function offsetPolygon(pts: THREE.Vector2[], d: number): THREE.Vector2[] {
  const grown = offsetRaw(pts, d);
  if (Math.abs(signedArea(grown)) >= Math.abs(signedArea(pts))) return grown;
  return offsetRaw(pts, -d);
}

function offsetRaw(pts: THREE.Vector2[], d: number): THREE.Vector2[] {
  const ccw = signedArea(pts) > 0;
  const n = pts.length;
  const out: THREE.Vector2[] = [];
  for (let i = 0; i < n; i++) {
    const prev = pts[(i - 1 + n) % n];
    const cur = pts[i];
    const next = pts[(i + 1) % n];
    const e1 = new THREE.Vector2(cur.x - prev.x, cur.y - prev.y).normalize();
    const e2 = new THREE.Vector2(next.x - cur.x, next.y - cur.y).normalize();
    // outward normal of an edge depends on winding
    const n1 = ccw ? new THREE.Vector2(e1.y, -e1.x) : new THREE.Vector2(-e1.y, e1.x);
    const n2 = ccw ? new THREE.Vector2(e2.y, -e2.x) : new THREE.Vector2(-e2.y, e2.x);
    const sum = n1.add(n2);
    const len = sum.length();
    // Miter: averaged normals shorten at sharp corners, so dividing by the
    // half-angle keeps the offset distance uniform -- clamped, because at a
    // spike that factor runs away.
    const miter = len > 1e-6 ? Math.min(1.6, 2 / len) : 1;
    const nrm = sum.normalize();
    out.push(new THREE.Vector2(cur.x + nrm.x * d * miter, cur.y + nrm.y * d * miter));
  }
  return out;
}

export function Terrain() {
  const { ringGeo, gridGeo, skirtGeo } = useMemo(() => {
    const lake = getLakeOutlinePoints();
    const ringOuter = offsetPolygon(lake, RING_OUTER);

    // --- 1. ring: explicit quad strip, lake[i] -> ringOuter[i] ---
    // NOT earcut over the offset outline. Offsetting a concave outline makes
    // it self-intersect at sharp vertices, and earcut then bridges the loop
    // with long triangles that stab across the water (the wedge by the tees
    // and the spike in the east arm). A strip keeps every triangle local and
    // no wider than the offset, so a local self-intersection stays local.
    const rp: number[] = [];
    const ru: number[] = [];
    const n = lake.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      // world: (sx, -sy)
      const q = [
        [lake[i].x, -lake[i].y],
        [lake[j].x, -lake[j].y],
        [ringOuter[j].x, -ringOuter[j].y],
        [ringOuter[i].x, -ringOuter[i].y],
      ];
      for (const [a, b, d] of [[0, 2, 1], [0, 3, 2]]) {
        for (const k of [a, b, d]) {
          rp.push(q[k][0], 0, q[k][1]);
          ru.push(q[k][0] / UV_TILE, q[k][1] / UV_TILE);
        }
      }
    }
    const ringGeo = new THREE.BufferGeometry();
    ringGeo.setAttribute("position", new THREE.Float32BufferAttribute(rp, 3));
    ringGeo.setAttribute("uv", new THREE.Float32BufferAttribute(ru, 2));
    ringGeo.computeVertexNormals();

    // --- 2. displaced grid, cells inside skipPoly removed ---
    const step = (GRID_EXTENT * 2) / GRID_N;
    const pos: number[] = [];
    const uv: number[] = [];
    const h = (x: number, z: number) => heightAt(x, z);
    for (let ix = 0; ix < GRID_N; ix++) {
      const x0 = -GRID_EXTENT + ix * step;
      const x1 = x0 + step;
      for (let iz = 0; iz < GRID_N; iz++) {
        const z0 = -GRID_EXTENT + iz * step;
        const z1 = z0 + step;
        const cx = (x0 + x1) / 2;
        const cz = (z0 + z1) / 2;
        // Skip anything in the lake or within the flat shore band -- the ring
        // owns that area. Distance test, not point-in-offset-polygon: offsetting
        // a concave outline self-intersects and the parity test then lies.
        const e = lakeEdgeDistance(cx, cz);
        if (e.inside || e.dist < RING_INNER_SKIP) continue;
        const c = [
          [x0, h(x0, z0), z0], [x1, h(x1, z0), z0],
          [x1, h(x1, z1), z1], [x0, h(x0, z1), z1],
        ];
        // CCW seen from above -> upward normals
        for (const [a, b, d] of [[0, 2, 1], [0, 3, 2]]) {
          for (const k of [a, b, d]) {
            pos.push(c[k][0], c[k][1], c[k][2]);
            uv.push(c[k][0] / UV_TILE, c[k][2] / UV_TILE);
          }
        }
      }
    }
    const gridGeo = new THREE.BufferGeometry();
    gridGeo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    gridGeo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    gridGeo.computeVertexNormals();

    // --- 3. flat skirt out to the original extent ---
    const G = GRID_EXTENT, O = OUTER_EXTENT;
    const bands: [number, number, number, number][] = [
      [-O, -O, O, -G], [-O, G, O, O], [-O, -G, -G, G], [G, -G, O, G],
    ];
    const sp: number[] = [];
    const su: number[] = [];
    for (const [ax, az, bx, bz] of bands) {
      const q = [[ax, az], [bx, az], [bx, bz], [ax, bz]];
      for (const [a, b, d] of [[0, 2, 1], [0, 3, 2]]) {
        for (const k of [a, b, d]) {
          sp.push(q[k][0], 0, q[k][1]);
          su.push(q[k][0] / UV_TILE, q[k][1] / UV_TILE);
        }
      }
    }
    const skirtGeo = new THREE.BufferGeometry();
    skirtGeo.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
    skirtGeo.setAttribute("uv", new THREE.Float32BufferAttribute(su, 2));
    skirtGeo.computeVertexNormals();

    return { ringGeo, gridGeo, skirtGeo };
  }, []);

  return (
    <group name="terrain">
      {/* ring sits a hair proud so its overlap with the grid cannot z-fight */}
      <mesh geometry={ringGeo} position={[0, TERRAIN_Y + 0.004, 0]} receiveShadow>
        <meshStandardMaterial color={ROUGH_COLOR} roughness={ROUGHNESS.turf} metalness={0} />
      </mesh>
      <mesh geometry={gridGeo} position={[0, TERRAIN_Y, 0]} receiveShadow castShadow>
        <meshStandardMaterial color={ROUGH_COLOR} roughness={ROUGHNESS.turf} metalness={0} />
      </mesh>
      <mesh geometry={skirtGeo} position={[0, TERRAIN_Y, 0]} receiveShadow>
        <meshStandardMaterial color={ROUGH_COLOR} roughness={ROUGHNESS.turf} metalness={0} />
      </mesh>
    </group>
  );
}
