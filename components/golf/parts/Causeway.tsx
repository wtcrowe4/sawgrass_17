"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { makeCausewayShape } from "@/lib/golf/geometry";

// Causeway -- grass approach strip from island west shore to far bank.
// Flat ShapeGeometry, grass-colored to match surrounding terrain.

const SURFACE_Y     = 0.03;
const SURFACE_COLOR = "#2e5c36"; // approach grass -- slightly darker than green

export function Causeway() {
  const surfaceGeo = useMemo(() => {
    const geo = new THREE.ShapeGeometry(makeCausewayShape(), 64);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, []);

  return (
    <group name="causeway">
      <mesh geometry={surfaceGeo} position={[0, SURFACE_Y, 0]} receiveShadow>
        <meshStandardMaterial
          color={SURFACE_COLOR}
          roughness={0.92}
          metalness={0.0}
        />
      </mesh>
    </group>
  );
}
