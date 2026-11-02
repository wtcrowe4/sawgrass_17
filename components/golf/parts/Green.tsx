"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { makeGreenShape, makeGreenSurfaceShape } from "@/lib/golf/geometry";
import { PALETTE, ROUGHNESS } from "@/lib/golf/palette";
import { makeTurfMaterial, STRIPES } from "@/lib/golf/turf";

// Green -- two-layer island green.
//
// Layer 1 (landmass): full island outline (makeGreenShape) -- darker rough/collar green.
// Layer 2 (surface):  traced putting surface (makeGreenSurfaceShape) -- bright tour green.
//
// Flat on XZ plane, origin = front-center of green.

const GREEN_Y       = 0.05;
const LANDMASS_COLOR = PALETTE.turfRough;  // darker collar/rough green
const SURFACE_COLOR  = PALETTE.turfGreen;  // brightest -- shortest grass on the hole

export function Green() {
  const { landmassGeo, surfaceGeo } = useMemo(() => {
    const landmassGeo = new THREE.ShapeGeometry(makeGreenShape(), 64);
    landmassGeo.rotateX(-Math.PI / 2);

    const surfaceGeo = new THREE.ShapeGeometry(makeGreenSurfaceShape(), 64);
    surfaceGeo.rotateX(-Math.PI / 2);

    return { landmassGeo, surfaceGeo };
  }, []);

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
