"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { makeCartPathShape } from "@/lib/golf/geometry";

// CartPath -- asphalt strip linking the tee complex to the causeway.
// Sits just above terrain (y=0.015) so it reads as paved over grass.

const PATH_Y         = 0.018;
const ASPHALT_COLOR  = "#2c2c2e";   // weathered asphalt
const SHOULDER_COLOR = "#3a3a3c";   // very subtle border

export function CartPath() {
  const geo = useMemo(() => {
    const g = new THREE.ShapeGeometry(makeCartPathShape(), 64);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);

  return (
    <group name="cart-path">
      {/* Slight darker shoulder underneath for grounding */}
      <mesh geometry={geo} position={[0, PATH_Y - 0.003, 0]} receiveShadow>
        <meshStandardMaterial
          color={SHOULDER_COLOR}
          roughness={0.95}
          metalness={0.0}
        />
      </mesh>
      {/* Asphalt surface */}
      <mesh geometry={geo} position={[0, PATH_Y, 0]} receiveShadow>
        <meshStandardMaterial
          color={ASPHALT_COLOR}
          roughness={0.88}
          metalness={0.05}
        />
      </mesh>
    </group>
  );
}
