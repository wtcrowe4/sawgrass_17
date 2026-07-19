"use client";

import { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { getLakeOutlinePoints } from "@/lib/golf/geometry";

// Trees -- InstancedMesh pine/cypress treeline ringing the hole, matching the
// dense Florida pine wall in reference photos image1/image2/image7.
//
// Rewritten 2026-07-11 for the post-satellite-trace coordinate system
// (world +x = west/causeway side, -x = east, +z = north behind green,
// tee at z ~ -46). Placement uses explicit world-space rectangles with
// rejection sampling: no tree may land in the lake polygon (which also
// covers the island green) or within a grandstand keep-out circle.

const TRUNK_COLOR    = "#2a1f15";
const CYPRESS_DARK   = "#1e3d26";   // far / shadow
const CYPRESS_MID    = "#2c5433";
const CYPRESS_LIGHT  = "#40704a";   // sunlit highlights

// Seeded RNG -- mulberry32, deterministic placement
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Lake outline in shape space: shape.x = world.x, shape.y = -world.z
const LAKE_PTS = getLakeOutlinePoints();

export function inLake(wx: number, wz: number): boolean {
  const x = wx;
  const y = -wz;
  let inside = false;
  for (let i = 0, j = LAKE_PTS.length - 1; i < LAKE_PTS.length; j = i++) {
    const xi = LAKE_PTS[i].x;
    const yi = LAKE_PTS[i].y;
    const xj = LAKE_PTS[j].x;
    const yj = LAKE_PTS[j].y;
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

// Grandstand keep-outs (world x, z, radius)
const KEEPOUTS: [number, number, number][] = [
  [-19.0, 7.0, 6],   // NE shore stand
  [-3.5, 10.5, 6],   // behind-green stand
  [9.0, -48.5, 7],   // main tee stand
  [-8.2, -45.5, 6],  // tee-right stand
  [-2.4, -50.5, 6],  // behind-tee stand
];

interface Band {
  xMin: number; xMax: number;
  zMin: number; zMax: number;
  count: number;
  sMin: number; sMax: number;
}

const BANDS: Band[] = [
  // Deep backdrop north of green -- tall pine wall
  { xMin: -32, xMax: 30, zMin: 18, zMax: 34, count: 45, sMin: 0.9, sMax: 1.5 },
  // Near band behind green
  { xMin: -17, xMax: 18, zMin: 6, zMax: 16, count: 28, sMin: 0.7, sMax: 1.2 },
  // East side beyond the shore (screen right)
  { xMin: -36, xMax: -20, zMin: -28, zMax: 6, count: 40, sMin: 0.8, sMax: 1.4 },
  // West side beyond cart path + suites (screen left)
  { xMin: 20, xMax: 34, zMin: -34, zMax: -2, count: 25, sMin: 0.8, sMax: 1.3 },
  // South flanks beside the tee complex (kept clear of the camera axis)
  { xMin: -24, xMax: -14, zMin: -52, zMax: -44, count: 8, sMin: 0.55, sMax: 0.85 },
  { xMin: 15, xMax: 26, zMin: -52, zMax: -44, count: 8, sMin: 0.55, sMax: 0.85 },
];

interface TreeInstance {
  x: number;
  z: number;
  scale: number;
  rotY: number;
  shade: number; // 0..1 for color lerp
}

function isBlocked(x: number, z: number): boolean {
  if (inLake(x, z)) return true;
  for (const [kx, kz, kr] of KEEPOUTS) {
    const dx = x - kx;
    const dz = z - kz;
    if (dx * dx + dz * dz < kr * kr) return true;
  }
  return false;
}

function buildInstances(): TreeInstance[] {
  const rng = mulberry32(0xCAFEBABE);
  const out: TreeInstance[] = [];
  BANDS.forEach((band) => {
    let placed = 0;
    let attempts = 0;
    while (placed < band.count && attempts < band.count * 12) {
      attempts++;
      const x = band.xMin + rng() * (band.xMax - band.xMin);
      const z = band.zMin + rng() * (band.zMax - band.zMin);
      if (isBlocked(x, z)) continue;
      out.push({
        x,
        z,
        scale: band.sMin + rng() * (band.sMax - band.sMin),
        rotY: rng() * Math.PI * 2,
        shade: rng(),
      });
      placed++;
    }
  });
  return out;
}

const BASE_HEIGHT = 5.5;
const BASE_RADIUS = 0.95;

export function Trees() {
  const conesRef  = useRef<THREE.InstancedMesh>(null);
  const trunksRef = useRef<THREE.InstancedMesh>(null);

  const { instances, coneGeo, trunkGeo } = useMemo(() => {
    const cone  = new THREE.ConeGeometry(BASE_RADIUS, BASE_HEIGHT, 7, 1, false);
    const trunk = new THREE.CylinderGeometry(0.12, 0.18, 0.9, 6);
    return { instances: buildInstances(), coneGeo: cone, trunkGeo: trunk };
  }, []);

  useEffect(() => {
    const cones  = conesRef.current;
    const trunks = trunksRef.current;
    if (!cones || !trunks) return;

    const m = new THREE.Matrix4();
    const color = new THREE.Color();
    const cMid  = new THREE.Color(CYPRESS_MID);
    const cLight = new THREE.Color(CYPRESS_LIGHT);
    const cDark = new THREE.Color(CYPRESS_DARK);

    instances.forEach((inst, i) => {
      const treeY = (BASE_HEIGHT * inst.scale) / 2 + 0.45;
      m.compose(
        new THREE.Vector3(inst.x, treeY, inst.z),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), inst.rotY),
        new THREE.Vector3(inst.scale, inst.scale, inst.scale)
      );
      cones.setMatrixAt(i, m);

      // Trunk
      const trunkY = 0.45 * inst.scale;
      m.compose(
        new THREE.Vector3(inst.x, trunkY, inst.z),
        new THREE.Quaternion(),
        new THREE.Vector3(inst.scale, inst.scale, inst.scale)
      );
      trunks.setMatrixAt(i, m);

      // Per-instance color
      if (inst.shade < 0.4) color.copy(cDark);
      else if (inst.shade < 0.75) color.copy(cMid);
      else color.copy(cLight);
      cones.setColorAt(i, color);
    });

    cones.instanceMatrix.needsUpdate = true;
    if (cones.instanceColor) cones.instanceColor.needsUpdate = true;
    trunks.instanceMatrix.needsUpdate = true;
  }, [instances]);

  return (
    <group name="trees">
      <instancedMesh
        ref={trunksRef}
        args={[trunkGeo, undefined, instances.length]}
        castShadow={false}
        receiveShadow={false}
      >
        <meshStandardMaterial color={TRUNK_COLOR} roughness={1.0} metalness={0.0} />
      </instancedMesh>

      <instancedMesh
        ref={conesRef}
        args={[coneGeo, undefined, instances.length]}
        castShadow={false}
        receiveShadow={false}
      >
        {/* base color white -- per-instance colors multiply against it */}
        <meshStandardMaterial color="#ffffff" roughness={1.0} metalness={0.0} vertexColors={false} />
      </instancedMesh>
    </group>
  );
}
