"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { makeWalkwayShape } from "@/lib/golf/geometry";

// WalkWay -- wooden boardwalk recently added around the front of hole 17 green.
// Traced 2026-05-12. Rendered as a flat surface at water level +0.04 wu.

const WALK_Y       = 0.04;
const PLANK_COLOR  = "#6b4f2a";  // weathered wood plank

export function WalkWay() {
  const geo = useMemo(() => {
    const g = new THREE.ShapeGeometry(makeWalkwayShape(), 32);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);

  return (
    <group name="walkway">
      <mesh geometry={geo} position={[0, WALK_Y, 0]} receiveShadow>
        <meshStandardMaterial
          color={PLANK_COLOR}
          roughness={0.9}
          metalness={0.0}
        />
      </mesh>
    </group>
  );
}
