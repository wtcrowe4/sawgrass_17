"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { Y2W } from "@/lib/golf/types";

// Bunkers -- two sand bunkers:
//   1. Front-right pot bunker ON the green  (2 yds wide, circular depression)
//   2. Short-right bunker off the walkway   (3 yds wide, oval)
//
// Rendered as ShapeGeometry depressions -- slightly below green surface,
// with a sand-colored fill. No actual hole geometry needed for v1.
//
// Coordinate system: x = lateral, z = depth (-z = toward back of green)

const GREEN_Y    = 0.05;             // wu -- green surface elevation
const BUNKER_Y   = GREEN_Y + 0.004;  // wu -- sits just above green (avoids z-fight)
const SAND_COLOR   = "#d4b483";      // warm sand
const SHADOW_COLOR = "#b89a60";      // bunker edge shadow

// Pot bunker on green: front-right, ~5 yds right, 2 yds back
// world: x = -5*Y2W (screen-right = world -x), z = -2*Y2W
const POT_X = -5 * Y2W;
const POT_Z = -2 * Y2W;
const POT_R = 1 * Y2W;  // radius: 1 yd = 0.3 wu

// Short-right bunker: just off the walkway
const SHORT_X  = -8 * Y2W;
const SHORT_Z  = -30 * Y2W;
const SHORT_RX = 1.5 * Y2W;
const SHORT_RY = 1.0 * Y2W;

function makeBunkerGeo(rx: number, ry: number, segments = 32): THREE.ShapeGeometry {
  const shape = new THREE.Shape();
  shape.absellipse(0, 0, rx, ry, 0, Math.PI * 2, false, 0);
  const geo = new THREE.ShapeGeometry(shape, segments);
  geo.rotateX(-Math.PI / 2);
  return geo;
}

export function Bunkers() {
  const { potGeo, potRimGeo, shortGeo, shortRimGeo } = useMemo(() => {
    return {
      potGeo:     makeBunkerGeo(POT_R, POT_R),
      potRimGeo:  makeBunkerGeo(POT_R * 1.3, POT_R * 1.3),
      shortGeo:   makeBunkerGeo(SHORT_RX, SHORT_RY),
      shortRimGeo: makeBunkerGeo(SHORT_RX * 1.2, SHORT_RY * 1.2),
    };
  }, []);

  return (
    <group name="bunkers">
      {/* Pot bunker on green */}
      <group position={[POT_X, 0, POT_Z]}>
        <mesh geometry={potRimGeo} position={[0, BUNKER_Y - 0.002, 0]}>
          <meshStandardMaterial color={SHADOW_COLOR} roughness={1.0} />
        </mesh>
        <mesh geometry={potGeo} position={[0, BUNKER_Y, 0]}>
          <meshStandardMaterial color={SAND_COLOR} roughness={1.0} metalness={0.0} />
        </mesh>
      </group>

      {/* Short-right bunker off causeway */}
      <group position={[SHORT_X, 0, SHORT_Z]}>
        <mesh geometry={shortRimGeo} position={[0, 0.002, 0]}>
          <meshStandardMaterial color={SHADOW_COLOR} roughness={1.0} />
        </mesh>
        <mesh geometry={shortGeo} position={[0, 0.004, 0]}>
          <meshStandardMaterial color={SAND_COLOR} roughness={1.0} metalness={0.0} />
        </mesh>
      </group>
    </group>
  );
}
