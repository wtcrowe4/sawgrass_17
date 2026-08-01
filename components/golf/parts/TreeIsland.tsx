"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { makeTreeIslandShape, TREE_ISLAND_CENTER } from "@/lib/golf/geometry";
import { PALETTE } from "@/lib/golf/palette";

// TreeIsland -- small island east/south of green with large cypress.
// Traced 2026-05-12 from satellite overlay.
// Previous placeholder ellipse + 4 cone trees removed.

const ISLAND_COLOR = PALETTE.turfRough;
const TREE_COLOR   = "#172b1a";
const ISLAND_Y     = 0.06;  // just above water

// [dx, dz, scale] offsets from island center -- continuous YELLOW bloom ring
// hugging the water's edge (getty 2082122646 / 2205293816: golden flowers
// circle the entire base of the oak).
const FLOWER_RING: [number, number, number][] = [
  [ 1.75,  0.0, 0.62],
  [ 1.45,  1.0, 0.55],
  [ 0.65,  1.6, 0.6 ],
  [-0.35,  1.75, 0.58],
  [-1.25,  1.25, 0.55],
  [-1.75,  0.35, 0.62],
  [-1.65, -0.7, 0.55],
  [-0.95, -1.5, 0.6 ],
  [ 0.05, -1.75, 0.58],
  [ 1.0, -1.45, 0.55],
  [ 1.6, -0.75, 0.6 ],
];

interface TreeIslandProps {
  /** Show the oak + bloom ring (props layer). The mound itself is terrain
   *  and always renders. */
  showTree?: boolean;
}

export function TreeIsland({ showTree = true }: TreeIslandProps) {
  const moundGeo = useMemo(() => {
    const geo = new THREE.ShapeGeometry(makeTreeIslandShape(), 4);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, []);

  // The real tree is a lone live OAK -- thick trunk, broad irregular canopy
  // (getty 2113291318 / 2205293816), not a conifer cone.
  const trunkGeo     = useMemo(() => new THREE.CylinderGeometry(0.14, 0.24, 2.6, 7), []);
  const canopyGeo    = useMemo(() => new THREE.SphereGeometry(1.0, 8, 6), []);
  const shrubGeo     = useMemo(() => new THREE.SphereGeometry(0.7, 8, 6), []);

  const CX = TREE_ISLAND_CENTER.x;
  const CZ = TREE_ISLAND_CENTER.z;

  return (
    <group name="tree-island">
      <mesh geometry={moundGeo} position={[0, ISLAND_Y, 0]} receiveShadow>
        <meshStandardMaterial color={ISLAND_COLOR} roughness={0.96} metalness={0.0} />
      </mesh>
      {showTree && (
        <>
        {/* oak trunk + irregular canopy blobs */}
        <mesh geometry={trunkGeo} position={[CX, ISLAND_Y + 1.3, CZ]} castShadow>
          <meshStandardMaterial color="#4a3a28" roughness={0.95} metalness={0.0} />
        </mesh>
        <mesh geometry={canopyGeo} position={[CX, ISLAND_Y + 3.1, CZ]} scale={[1.9, 1.15, 1.7]} castShadow={false}>
          <meshStandardMaterial color={TREE_COLOR} roughness={1.0} metalness={0.0} />
        </mesh>
        <mesh geometry={canopyGeo} position={[CX + 1.1, ISLAND_Y + 2.7, CZ + 0.5]} scale={[1.1, 0.8, 1.0]} castShadow={false}>
          <meshStandardMaterial color="#20402a" roughness={1.0} metalness={0.0} />
        </mesh>
        <mesh geometry={canopyGeo} position={[CX - 1.0, ISLAND_Y + 3.5, CZ - 0.4]} scale={[1.0, 0.75, 0.9]} castShadow={false}>
          <meshStandardMaterial color="#1c3a24" roughness={1.0} metalness={0.0} />
        </mesh>
        <mesh geometry={shrubGeo} position={[CX + 1.3, ISLAND_Y + 0.4, CZ - 0.8]} castShadow={false}>
          <meshStandardMaterial color="#24482a" roughness={1.0} metalness={0.0} />
        </mesh>
        <mesh geometry={shrubGeo} position={[CX + 0.6, ISLAND_Y + 0.35, CZ + 1.4]} scale={[0.8, 0.7, 0.8]} castShadow={false}>
          <meshStandardMaterial color="#1f4025" roughness={1.0} metalness={0.0} />
        </mesh>
        <mesh geometry={shrubGeo} position={[CX - 0.9, ISLAND_Y + 0.35, CZ - 1.3]} scale={[0.9, 0.65, 0.9]} castShadow={false}>
          <meshStandardMaterial color="#2a4f30" roughness={1.0} metalness={0.0} />
        </mesh>
        {/* Yellow bloom ring circling the oak at the waterline */}
        {FLOWER_RING.map(([ax, az, s], i) => (
          <mesh
            key={`fl-${i}`}
            geometry={shrubGeo}
            position={[CX + ax, ISLAND_Y + 0.18, CZ + az]}
            scale={[s, 0.35, s]}
            castShadow={false}
          >
            <meshStandardMaterial color={i % 2 === 0 ? "#d9b93a" : "#e6c94a"} roughness={0.9} metalness={0.0} />
          </mesh>
        ))}
        </>
      )}
    </group>
  );
}
