"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { TessellateModifier } from "three/examples/jsm/modifiers/TessellateModifier.js";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { makeGreenShape, makeGreenSurfaceShape } from "@/lib/golf/geometry";
import { greenReliefAt } from "@/lib/golf/elevation";
import { PALETTE, ROUGHNESS } from "@/lib/golf/palette";
import { makeTurfMaterial, STRIPES } from "@/lib/golf/turf";

// Green -- two-layer island green.
//
// Layer 1 (landmass): full island outline (makeGreenShape) -- darker rough/collar green.
// Layer 2 (surface):  traced putting surface (makeGreenSurfaceShape) -- bright tour green.
//
// Contoured (2026-11-10): both layers carry greenReliefAt() displacement --
// back-left shelf, crown, front-right runoff into the pot bunker. The relief
// is gated to 0 at the landmass outline, so the bulkhead/walkway junctions
// stay exactly where the flat version put them.
//
// ShapeGeometry only creates vertices ON the outline, so displacing it alone
// does nothing inside the polygon: TessellateModifier splits the fill
// triangles down to ~0.6 wu first. mergeVertices afterwards welds the
// tessellation output (non-indexed) so computeVertexNormals shades the
// contours smoothly instead of faceting.

const GREEN_Y       = 0.05;
const LANDMASS_COLOR = PALETTE.turfRough;  // darker collar/rough green
const SURFACE_COLOR  = PALETTE.turfGreen;  // brightest -- shortest grass on the hole

/** ShapeGeometry -> tessellated, relief-displaced, smooth-shaded geometry. */
function buildContouredGeo(shape: THREE.Shape): THREE.BufferGeometry {
  let geo: THREE.BufferGeometry = new THREE.ShapeGeometry(shape, 64);
  geo = new TessellateModifier(0.6, 10).modify(geo);
  geo.rotateX(-Math.PI / 2);
  geo = mergeVertices(geo);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, pos.getY(i) + greenReliefAt(pos.getX(i), pos.getZ(i)));
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

export function Green() {
  const { landmassGeo, surfaceGeo } = useMemo(() => ({
    landmassGeo: buildContouredGeo(makeGreenShape()),
    surfaceGeo: buildContouredGeo(makeGreenSurfaceShape()),
  }), []);

  const { landmassMat, surfaceMat } = useMemo(() => ({
    landmassMat: makeTurfMaterial({ color: LANDMASS_COLOR, roughness: ROUGHNESS.turf }),
    // cross-cut checkerboard; finer blade detail than the rough
    surfaceMat: makeTurfMaterial({
      color: SURFACE_COLOR,
      roughness: ROUGHNESS.green,
      stripe: STRIPES.green,
      detail: 0.25,
      mottle: 0.04,
      emissive: SURFACE_COLOR,
      emissiveIntensity: 0.04,
    }),
  }), []);

  return (
    <group name="green">
      {/* Landmass -- full island, darker collar/rough shade */}
      <mesh geometry={landmassGeo} material={landmassMat} position={[0, GREEN_Y - 0.005, 0]} receiveShadow />

      {/* Putting surface -- traced outline, bright tour green */}
      <mesh geometry={surfaceGeo} material={surfaceMat} position={[0, GREEN_Y, 0]} receiveShadow />
    </group>
  );
}
