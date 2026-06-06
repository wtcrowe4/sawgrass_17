"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { Text } from "@react-three/drei";
import { Y2W } from "@/lib/golf/types";

// DistanceMarkers -- standard yardage plates on the cart path.
// Colors per USGA/PGA broadcast convention:
//   red   = 100 yds to green
//   white = 150 yds to green
//   blue  = 200 yds (omitted -- hole only 137yd to back tee)

interface MarkerSpec {
  yards: number;
  color: string;
  // Position on cart path (GREEN coord format, x_yds, y_yds).
  pos: [number, number];
}

const MARKERS: MarkerSpec[] = [
  { yards: 100, color: "#dc2626", pos: [-52.8, 100] },
  { yards: 150, color: "#f5f5f5", pos: [-45.0, 150] },
];

const PLATE_R   = 0.32;   // wu, ~1yd radius
const PLATE_Y   = 0.022;  // just above cart path (0.018) but below tee
const TEXT_SIZE = 0.45;

export function DistanceMarkers() {
  const plateGeo = useMemo(() => {
    const g = new THREE.CircleGeometry(PLATE_R, 24);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);

  return (
    <group name="distance-markers">
      {MARKERS.map((m) => {
        const wx = -(m.pos[0] * Y2W);
        const wz = -(m.pos[1] * Y2W);
        return (
          <group key={m.yards} position={[wx, 0, wz]}>
            {/* Disc plate */}
            <mesh geometry={plateGeo} position={[0, PLATE_Y, 0]} receiveShadow>
              <meshStandardMaterial
                color={m.color}
                roughness={0.55}
                metalness={0.1}
                emissive={m.color}
                emissiveIntensity={0.08}
              />
            </mesh>
            {/* Yardage label, billboarded */}
            <Text
              position={[0, PLATE_Y + 0.04, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={TEXT_SIZE}
              color="#0a0a0a"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.012}
              outlineColor="#ffffff"
            >
              {String(m.yards)}
            </Text>
          </group>
        );
      })}
    </group>
  );
}
