"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { getLakeOutlinePoints, offsetPolygon } from "@/lib/golf/geometry";
import { PALETTE } from "@/lib/golf/palette";
import { WATER_Y } from "@/lib/golf/types";
import { SHORE_ARCS, BANK_DROP, BED_NEAR, BED_FAR } from "@/lib/golf/shore";

// FlowerBed -- the planting band along the spectator shore.
//
// Both 2026 references (sawgrass-17-overhead.jpg, sawgrass-17-crowd.webp) show
// the crowd side of the lake edged with a low red/rose flower bed rather than
// timber: bank runs down from the galleries, flowers at the bottom, then water.
// Bulkhead there was wrong.
//
// Geometry is a quad strip following the lake outline between BED_NEAR and
// BED_FAR, sitting ON the sloped terrain bank. Bank height at an offset d is
// linear from (WATER_Y - BANK_DROP) at the outline to 0 at RING_OUTER, so the
// band is placed by the same formula and lifted a hair to avoid z-fighting.
//
// Per-vertex colour gives clumping instead of a flat painted ribbon.

const RING_OUTER = 2.2;   // must match Terrain's ring width
// The ring MESH is drawn at Terrain's TERRAIN_Y + 0.004 = 0.014, so the bed has
// to clear that as well as the bank surface itself. The first attempt used
// 0.012 and the bed sat 2mm UNDER the ring -- invisible.
const RING_MESH_Y = 0.024;
const LIFT = RING_MESH_Y + 0.022;

function bankY(offset: number): number {
  return (WATER_Y - BANK_DROP) * (1 - offset / RING_OUTER) + LIFT;
}

/** Deterministic 0..1 from an integer. */
function rand(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function FlowerBed() {
  const geo = useMemo(() => {
    const lake = getLakeOutlinePoints();
    const n = lake.length;
    // Interpolate along the SAME span Terrain's ring uses instead of offsetting
    // twice more. offsetPolygon at 0.75/1.95 self-intersects on this concave
    // outline and chopped the bed into dashes; lerping the ring's own endpoints
    // keeps the bed exactly on the bank and inherits its (already sane) offset.
    const ringOuter = offsetPolygon(lake, RING_OUTER);
    const fNear = BED_NEAR / RING_OUTER;
    const fFar = BED_FAR / RING_OUTER;
    const at = (i: number, f: number) =>
      new THREE.Vector2(
        lake[i].x + (ringOuter[i].x - lake[i].x) * f,
        lake[i].y + (ringOuter[i].y - lake[i].y) * f
      );

    const [a, b] = SHORE_ARCS.flowerbed;
    const lo = Math.floor(a * n);
    const hi = Math.ceil(b * n);

    const yFar = bankY(BED_FAR);
    const fnAt = (idx: number) => {
      const t = (idx - lo) / (hi - lo);
      const taper = Math.min(1, Math.min(t, 1 - t) * 12);
      return fNear + (fFar - fNear) * (1 - taper) * 0.55;
    };

    const pos: number[] = [];
    const col: number[] = [];
    const tint = new THREE.Color();
    const tones = [PALETTE.flowerRed, PALETTE.flowerRose, PALETTE.flowerCoral];

    for (let i = lo; i < hi; i++) {
      const j = (i + 1) % n;
      // taper the band to nothing at both ends so it does not stop dead
      // Taper the band to nothing at both ends so it does not stop dead.
      // Width is evaluated PER VERTEX INDEX, not once per segment: using one
      // width for both ends of a quad meant neighbouring quads did not share
      // an edge, which chopped the bed into dashes.
      const n0 = at(i, fnAt(i));
      const n1 = at(j, fnAt(j));
      const f0 = at(i, fFar);
      const f1 = at(j, fFar);
      const y0 = bankY(fnAt(i) * RING_OUTER);
      const y1 = bankY(fnAt(j) * RING_OUTER);

      const quad = [
        [n0.x, y0, -n0.y],
        [n1.x, y1, -n1.y],
        [f1.x, yFar, -f1.y],
        [f0.x, yFar, -f0.y],
      ];
      // one tone per segment, with a little value jitter -- reads as clumps
      const base = tones[Math.floor(rand(i) * tones.length) % tones.length];
      tint.set(base);
      const v = 0.82 + rand(i * 3 + 1) * 0.36;
      tint.multiplyScalar(v);

      for (const [p, q, r] of [[0, 2, 1], [0, 3, 2]]) {
        for (const k of [p, q, r]) {
          pos.push(quad[k][0], quad[k][1], quad[k][2]);
          col.push(tint.r, tint.g, tint.b);
        }
      }
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
  }, []);

  useEffect(() => () => geo.dispose(), [geo]);

  return (
    <mesh name="flower-bed" geometry={geo} receiveShadow>
      <meshStandardMaterial vertexColors side={THREE.DoubleSide} roughness={0.95} metalness={0} />
    </mesh>
  );
}
