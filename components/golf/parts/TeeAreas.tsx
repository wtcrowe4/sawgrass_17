"use client";

import { useMemo } from "react";
import * as THREE from "three";
import {
  makeMembersTeeShape,
  makeProTeeShape,
  PRO_TEE_CENTER,
} from "@/lib/golf/geometry";
import { Y2W } from "@/lib/golf/types";

// TeeAreas -- light-green mown turf for the members tee complex
// and the pro tournament tee box. Flat surfaces (no stone edge)
// per user direction 2026-05-13.

const TEE_GRASS_Y     = 0.025;
const TEE_GRASS_COLOR = "#347856";  // darker than putting surface (#5fa860)

const MARKER_R       = 0.13;
const MARKER_SPACING = 0.55;
const MARKER_Y       = TEE_GRASS_Y + MARKER_R;

export function TeeAreas() {
  const { membersGeo, proGeo } = useMemo(() => {
    const m = new THREE.ShapeGeometry(makeMembersTeeShape(), 64);
    m.rotateX(-Math.PI / 2);
    const p = new THREE.ShapeGeometry(makeProTeeShape(), 48);
    p.rotateX(-Math.PI / 2);
    return { membersGeo: m, proGeo: p };
  }, []);

  return (
    <group name="tee-areas">
      <mesh geometry={membersGeo} position={[0, TEE_GRASS_Y, 0]} receiveShadow>
        <meshStandardMaterial color={TEE_GRASS_COLOR} roughness={0.85} metalness={0.0} />
      </mesh>

      <mesh geometry={proGeo} position={[0, TEE_GRASS_Y + 0.005, 0]} receiveShadow>
        <meshStandardMaterial color={TEE_GRASS_COLOR} roughness={0.8} metalness={0.0} />
      </mesh>

      <mesh
        position={[PRO_TEE_CENTER.x - MARKER_SPACING, MARKER_Y, PRO_TEE_CENTER.z + 1.2 * Y2W]}
        castShadow
      >
        <sphereGeometry args={[MARKER_R, 12, 12]} />
        <meshStandardMaterial
          color="#fb923c"
          roughness={0.3}
          metalness={0.6}
          emissive="#fb923c"
          emissiveIntensity={0.2}
        />
      </mesh>
      <mesh
        position={[PRO_TEE_CENTER.x + MARKER_SPACING, MARKER_Y, PRO_TEE_CENTER.z + 1.2 * Y2W]}
        castShadow
      >
        <sphereGeometry args={[MARKER_R, 12, 12]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.3} metalness={0.5} />
      </mesh>
    </group>
  );
}
