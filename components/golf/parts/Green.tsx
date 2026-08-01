"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { makeGreenShape, makeGreenSurfaceShape } from "@/lib/golf/geometry";
import { PALETTE, ROUGHNESS } from "@/lib/golf/palette";

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

  return (
    <group name="green">
      {/* Landmass -- full island, darker collar/rough shade */}
      <mesh geometry={landmassGeo} position={[0, GREEN_Y - 0.005, 0]} receiveShadow>
        <meshStandardMaterial
          color={LANDMASS_COLOR}
          roughness={ROUGHNESS.turf}
          metalness={0.0}
        />
      </mesh>

      {/* Putting surface -- traced outline, bright tour green */}
      <mesh geometry={surfaceGeo} position={[0, GREEN_Y, 0]} receiveShadow>
        <meshStandardMaterial
          color={SURFACE_COLOR}
          roughness={ROUGHNESS.green}
          metalness={0.0}
          emissive={SURFACE_COLOR}
          emissiveIntensity={0.04}
        />
      </mesh>
    </group>
  );
}
