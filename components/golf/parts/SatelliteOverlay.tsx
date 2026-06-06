"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

// SatelliteOverlay -- dev tool for geometry tracing.
// Fetches the satellite image from /api/satellite (Google Maps Static API proxy)
// and renders it as a transparent plane in the Three.js scene.
//
// World-space size calculation:
//   zoom=18, size=640, lat=30.1949 N
//   meters_per_px = 156543.03392 * cos(30.1949 * PI/180) / 2^18
//               = 0.5171 m/px
//   coverage_m  = 640px * 0.5171 = 330.9 m
//   1 wu        = 3.048 m
//   plane_wu    = 330.9 / 3.048 = 108.6 wu
//
// Rotation note: parent group rotates around WORLD Y (compass bearing).
// Child mesh rotates -PI/2 around local X to lay the plane flat.
// Combining both into one Euler would rotate around the mesh local Y
// (which after the X-flip points in -Z), causing a tilt not a spin.
//
// tex.repeat.set(-1,1) flips U to match scene east-west mirror convention.

const PLANE_SIZE = 108.6; // world units -- matches zoom=18 size=640 coverage
const OVERLAY_Y  = 0.12;  // above terrain (0.01) and water (-0.02)

interface Props {
  visible: boolean;
  opacity?: number; // 0..1, default 0.45
  rotDeg?: number;  // world-Y rotation in degrees for tee-box alignment
}

export function SatelliteOverlay({ visible, opacity = 0.45, rotDeg = 0 }: Props) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!visible || loadedRef.current) return;
    loadedRef.current = true;

    const loader = new THREE.TextureLoader();
    loader.load(
      "/api/satellite",
      (tex) => {
        tex.flipY = false;
        tex.repeat.set(-1, 1);
        tex.offset.set(1, 0);
        tex.needsUpdate = true;
        setTexture(tex);
      },
      undefined,
      (err) => {
        console.error("[SatelliteOverlay] load failed:", err);
        loadedRef.current = false;
      }
    );
  }, [visible]);

  if (!visible || !texture) return null;

  const yRad = (rotDeg * Math.PI) / 180;

  // group rotates around world Y (horizontal compass spin)
  // mesh rotates -PI/2 around local X to lay the plane flat
  return (
    <group rotation={[0, yRad, 0]} position={[0, OVERLAY_Y, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
        <planeGeometry args={[PLANE_SIZE, PLANE_SIZE]} />
        <meshBasicMaterial
          map={texture}
          transparent
          opacity={opacity}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
