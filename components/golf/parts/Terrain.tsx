"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { makeTerrainShape } from "@/lib/golf/geometry";
import { PALETTE, ROUGHNESS } from "@/lib/golf/palette";
import { heightAt } from "@/lib/golf/elevation";

// Terrain -- grass surrounding the lake, displaced by lib/golf/elevation.
//
// The base is still ShapeGeometry with the lake punched out, so the shoreline
// outline stays EXACT. To get vertices to displace, the triangulation is
// midpoint-subdivided: each triangle becomes 4, recursively. That is the whole
// trick -- the midpoint of a boundary edge lies on that edge, so subdividing
// never moves the lake outline. A regular grid clipped to the polygon would
// have been simpler but would stair-step the shoreline.
//
// heightAt() returns 0 within a few wu of the water, so the shore ring and the
// water plane still meet the ground exactly where they did when it was flat.
//
// ELEVATION_ENABLED=false restores the old flat plane in one edit.
//
// KNOWN ARTIFACT (2026-08-01): the mounds render as jagged shards on the west
// side. Cause is triangle QUALITY, not the displacement -- earcut fans the
// 100wu square out to the lake vertices, producing extremely elongated
// slivers, and midpoint subdivision preserves aspect ratio, so slivers stay
// slivers. Displacing a sliver shears it. Fixing this means abandoning earcut
// for a uniform grid (which stair-steps the traced shoreline unless the shore
// ring masks it) or a constrained Delaunay triangulation. See the session
// notes before reworking.

const TERRAIN_Y = 0.01;
const ROUGH_COLOR = PALETTE.turfRough;

const ELEVATION_ENABLED = true;
const SUBDIVISIONS = 5; // 4^5 = 1024x the base triangle count

/** Split every triangle into 4. Non-indexed in, non-indexed out. */
function subdivideOnce(pos: Float32Array): Float32Array {
  const triCount = pos.length / 9;
  const out = new Float32Array(triCount * 4 * 9);
  let o = 0;
  const mid = (a: number, b: number, i: number) => (pos[a + i] + pos[b + i]) / 2;
  for (let t = 0; t < triCount; t++) {
    const a = t * 9, b = t * 9 + 3, c = t * 9 + 6;
    const ab = [mid(a, b, 0), mid(a, b, 1), mid(a, b, 2)];
    const bc = [mid(b, c, 0), mid(b, c, 1), mid(b, c, 2)];
    const ca = [mid(c, a, 0), mid(c, a, 1), mid(c, a, 2)];
    const A = [pos[a], pos[a + 1], pos[a + 2]];
    const B = [pos[b], pos[b + 1], pos[b + 2]];
    const C = [pos[c], pos[c + 1], pos[c + 2]];
    for (const tri of [[A, ab, ca], [ab, B, bc], [ca, bc, C], [ab, bc, ca]]) {
      for (const v of tri) { out[o++] = v[0]; out[o++] = v[1]; out[o++] = v[2]; }
    }
  }
  return out;
}

export function Terrain() {
  const roughGeo = useMemo(() => {
    const base = new THREE.ShapeGeometry(makeTerrainShape(), 4);
    base.rotateX(-Math.PI / 2);

    if (!ELEVATION_ENABLED) return base;

    const nonIndexed = base.toNonIndexed();
    base.dispose();
    let pos = nonIndexed.getAttribute("position").array as Float32Array;
    nonIndexed.dispose();

    for (let i = 0; i < SUBDIVISIONS; i++) pos = subdivideOnce(pos);

    // Displace. Vertices are already in world XZ (mesh sits at origin).
    for (let i = 0; i < pos.length; i += 3) {
      pos[i + 1] = heightAt(pos[i], pos[i + 2]);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <group name="terrain">
      <mesh geometry={roughGeo} position={[0, TERRAIN_Y, 0]} receiveShadow castShadow>
        <meshStandardMaterial
          color={ROUGH_COLOR}
          roughness={ROUGHNESS.turf}
          metalness={0.0}
        />
      </mesh>
    </group>
  );
}
