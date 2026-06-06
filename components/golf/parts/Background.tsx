"use client";

import { useMemo } from "react";
import * as THREE from "three";

// Background -- tree silhouettes ringing the hole.
// Grandstands removed pending proper placement from reference photos.
// Fog (near=40, far=110) makes these soft at distance.

const SILHOUETTE_COLOR = "#1c2333";

function makeTreeGeo(r: number, h: number): THREE.ConeGeometry {
  return new THREE.ConeGeometry(r, h, 6);
}

// Placeholder trees removed 2026-05-12 -- awaiting traced grandstand/treeline coords.
const TREE_CONFIGS: Array<{ x: number; y: number; z: number; r: number; h: number }> = [];

export function Background() {
  const treeGeos = useMemo(
    () => TREE_CONFIGS.map((cfg) => makeTreeGeo(cfg.r, cfg.h)),
    []
  );

  return (
    <group name="background">
      {TREE_CONFIGS.map((cfg, i) => (
        <mesh
          key={`tree-${i}`}
          geometry={treeGeos[i]}
          position={[cfg.x, cfg.h / 2 + 0.1, cfg.z]}
          castShadow={false}
          receiveShadow={false}
        >
          <meshStandardMaterial color={SILHOUETTE_COLOR} roughness={1.0} metalness={0.0} />
        </mesh>
      ))}
    </group>
  );
}
