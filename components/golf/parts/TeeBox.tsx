"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { Y2W } from "@/lib/golf/types";

// ─── Tee Box ──────────────────────────────────────────────────────────────────
// Small slightly-raised platform at tee position.
// Sunday tee: 137 yds behind green front → world z = -137 * Y2W = -41.1 wu
//
// Tee box: ~30 ft wide = 10 yds = 3 wu
// Raised 0.08 wu above water (≈ 3 inches)
//
// Includes:
// - Turf surface
// - Stone edge extrusion (same pattern as green bulkhead)
// - Two tee markers: orange (#fb923c) + white spheres on the forward edges

const TEE_Z = -137 * Y2W;       // world z: -41.1 wu
const TEE_W = 10 * Y2W;         // width: 3 wu
const TEE_D = 6 * Y2W;          // depth: 1.8 wu
const TEE_Y = 0.08;             // surface elevation
const STONE_H = 0.25;           // stone edge height (wu)
const TURF_COLOR = "#2d6a4f";
const STONE_COLOR = "#6b7280";

// Tee marker offsets from center (in wu)
// Orange = left marker, white = right marker (broadcast convention)
const MARKER_R = 0.12;          // sphere radius wu
const MARKER_Y = TEE_Y + MARKER_R;
const MARKER_SPACING = TEE_W * 0.35; // wu from center on each side

export function TeeBox() {
  const { turfGeo, stoneGeo } = useMemo(() => {
    // Simple rounded-rectangle tee shape
    const shape = new THREE.Shape();
    const r = 0.25; // corner radius wu
    const hw = TEE_W / 2;
    const hd = TEE_D / 2;
    shape.moveTo(-hw + r, -hd);
    shape.lineTo(hw - r, -hd);
    shape.quadraticCurveTo(hw, -hd, hw, -hd + r);
    shape.lineTo(hw, hd - r);
    shape.quadraticCurveTo(hw, hd, hw - r, hd);
    shape.lineTo(-hw + r, hd);
    shape.quadraticCurveTo(-hw, hd, -hw, hd - r);
    shape.lineTo(-hw, -hd + r);
    shape.quadraticCurveTo(-hw, -hd, -hw + r, -hd);
    shape.closePath();

    // Turf surface
    const turfGeo = new THREE.ShapeGeometry(shape, 32);
    turfGeo.rotateX(-Math.PI / 2);

    // Stone edge extrusion
    const stoneGeo = new THREE.ExtrudeGeometry(shape, {
      depth: STONE_H,
      bevelEnabled: false,
    });
    stoneGeo.rotateX(-Math.PI / 2);
    stoneGeo.translate(0, -STONE_H, 0);

    return { turfGeo, stoneGeo };
  }, []);

  return (
    <group name="tee-box" position={[0, 0, TEE_Z]}>
      {/* Stone edge */}
      <mesh geometry={stoneGeo} castShadow receiveShadow>
        <meshStandardMaterial color={STONE_COLOR} roughness={0.9} metalness={0.04} />
      </mesh>

      {/* Turf surface */}
      <mesh geometry={turfGeo} position={[0, TEE_Y, 0]} receiveShadow>
        <meshStandardMaterial color={TURF_COLOR} roughness={0.8} metalness={0.0} />
      </mesh>

      {/* Tee marker — orange (left) */}
      <mesh position={[-MARKER_SPACING, MARKER_Y, 0]} castShadow>
        <sphereGeometry args={[MARKER_R, 12, 12]} />
        <meshStandardMaterial
          color="#fb923c"  // brand orange
          roughness={0.3}
          metalness={0.6}
          emissive="#fb923c"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Tee marker — white (right) */}
      <mesh position={[MARKER_SPACING, MARKER_Y, 0]} castShadow>
        <sphereGeometry args={[MARKER_R, 12, 12]} />
        <meshStandardMaterial
          color="#f5f5f5"
          roughness={0.3}
          metalness={0.5}
        />
      </mesh>
    </group>
  );
}
