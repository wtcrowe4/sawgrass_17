"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { getLakeOutlinePoints } from "@/lib/golf/geometry";

// Shoreline -- thin stone/rock band following the lake perimeter.
// Makes the water/land transition look intentional instead of a z-fighting seam.
//
// Approach: CatmullRomCurve3 from the lake spline points (converting shape
// space Vector2 -> world Vector3), then TubeGeometry with a small radius.
// Sits at y=0.04 (above water -0.02 and terrain 0.01) so it crowns the edge.
//
// Shape space -> world: shape.x = world.x, shape.y = world.-z (after rotateX).

const SHORE_COLOR  = "#3d3730";  // dark wet stone
const TUBE_RADIUS  = 0.10;       // ~4 inches in world units
const TUBE_SEGS    = 6;          // radial segments -- low poly, stays fast
const SHORE_Y      = 0.04;       // elevation above water

export function Shoreline() {
  const tubeGeo = useMemo(() => {
    // getLakeOutlinePoints returns Vector2[] in shape space.
    // Convert to world Vector3: (shape.x, SHORE_Y, -shape.y)
    const pts2d = getLakeOutlinePoints();
    const pts3d = pts2d.map(
      (p: THREE.Vector2) => new THREE.Vector3(p.x, SHORE_Y, -p.y)
    );

    // CatmullRomCurve3 needs at least 3 points; close the loop.
    const curve = new THREE.CatmullRomCurve3(pts3d, true, "catmullrom", 0.3);

    return new THREE.TubeGeometry(
      curve,
      pts3d.length,  // tube segments -- one per spline sample for smoothness
      TUBE_RADIUS,
      TUBE_SEGS,
      true           // closed loop
    );
  }, []);

  return (
    <group name="shoreline">
      <mesh geometry={tubeGeo} receiveShadow={false} castShadow={false}>
        <meshStandardMaterial
          color={SHORE_COLOR}
          roughness={0.88}
          metalness={0.04}
        />
      </mesh>
    </group>
  );
}
