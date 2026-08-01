"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { makeGrassApproachShape } from "@/lib/golf/geometry";
import { PALETTE, ROUGHNESS } from "@/lib/golf/palette";

// GrassApproach -- short-mown approach grass strip west of the green.
// Replaces the old wooden walkway placeholder until proper geometry
// is traced (per user 2026-05-13).

const GRASS_Y      = 0.022;          // just above terrain
// MUST match the island landmass and the terrain rough: the walkway, the
// green's collar and the bank read as one continuous piece of land. Using a
// separate ramp step here made the walkway a third shade of green.
const GRASS_COLOR  = PALETTE.turfRough;

export function GrassApproach() {
  const geo = useMemo(() => {
    const g = new THREE.ShapeGeometry(makeGrassApproachShape(), 64);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);

  return (
    <group name="grass-approach">
      <mesh geometry={geo} position={[0, GRASS_Y, 0]} receiveShadow>
        <meshStandardMaterial color={GRASS_COLOR} roughness={ROUGHNESS.turf} metalness={0.0} />
      </mesh>
    </group>
  );
}
