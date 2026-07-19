"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { makeTerrainShape } from "@/lib/golf/geometry";

// Terrain -- large grass plane surrounding the lake.
// Uses ShapeGeometry with the lake polygon punched out as a hole,
// so grass is visible everywhere the water is not.
//
// Sits at y=0.01 wu (just above water level at y=-0.02) to ensure
// clean z-ordering at the shoreline.
//
// Color: dark rough/rough-cut grass matching TPC Sawgrass surroundings.

const TERRAIN_Y    = 0.01;
const ROUGH_COLOR  = "#2c5c31";  // Bermuda rough in Florida sun
const ROUGH_COLOR2 = "#336838";  // slightly lighter -- fairway areas

export function Terrain() {
  const roughGeo = useMemo(() => {
    const shape = makeTerrainShape();

    // Main terrain with lake hole
    const roughGeo = new THREE.ShapeGeometry(shape, 4);
    roughGeo.rotateX(-Math.PI / 2);

    // Thin inner band around the lake edge -- slightly lighter, suggests mown rough
    // Built by scaling the outer terrain inward a bit (simple approach)
    return roughGeo;
  }, []);

  return (
    <group name="terrain">
      <mesh geometry={roughGeo} position={[0, TERRAIN_Y, 0]} receiveShadow>
        <meshStandardMaterial
          color={ROUGH_COLOR}
          roughness={0.97}
          metalness={0.0}
        />
      </mesh>
    </group>
  );
}
