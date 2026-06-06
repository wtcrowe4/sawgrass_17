"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { makeTreeIslandShape, TREE_ISLAND_CENTER } from "@/lib/golf/geometry";

// TreeIsland -- small island east/south of green with large cypress.
// Traced 2026-05-12 from satellite overlay.
// Previous placeholder ellipse + 4 cone trees removed.

const ISLAND_COLOR = "#1e3d22";
const TREE_COLOR   = "#172b1a";
const ISLAND_Y     = 0.06;  // just above water

export function TreeIsland() {
  const moundGeo = useMemo(() => {
    const geo = new THREE.ShapeGeometry(makeTreeIslandShape(), 4);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, []);

  // Single large cypress-style cone tree at island center
  const treeGeo = useMemo(() => new THREE.ConeGeometry(1.8, 7.0, 7), []);

  const CX = TREE_ISLAND_CENTER.x;
  const CZ = TREE_ISLAND_CENTER.z;

  return (
    <group name="tree-island">
      <mesh geometry={moundGeo} position={[0, ISLAND_Y, 0]} receiveShadow>
        <meshStandardMaterial color={ISLAND_COLOR} roughness={0.96} metalness={0.0} />
      </mesh>
      <mesh geometry={treeGeo} position={[CX, ISLAND_Y + 3.5, CZ]} castShadow={false}>
        <meshStandardMaterial color={TREE_COLOR} roughness={1.0} metalness={0.0} />
      </mesh>
    </group>
  );
}
