"use client";

import { useCallback } from "react";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";

// TracerPlane -- invisible ground plane at y=0 for coordinate tracing.
// Only active when traceMode is true. Calls onPoint with world (x, z).

interface Props {
  active: boolean;
  onPoint: (x: number, z: number) => void;
}

export function TracerPlane({ active, onPoint }: Props) {
  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      if (!active) return;
      e.stopPropagation();
      // e.point is the 3D world position of the click on the plane
      onPoint(
        Math.round(e.point.x * 100) / 100,
        Math.round(e.point.z * 100) / 100
      );
    },
    [active, onPoint]
  );

  if (!active) return null;

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.15, 0]}
      onClick={handleClick}
      renderOrder={2}
    >
      <planeGeometry args={[200, 200]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}
