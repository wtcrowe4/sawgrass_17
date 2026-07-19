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
  [-6.0, 10.0, 6],   // behind-green stand
  [1.5, 10.8, 5],    // videoboard
  [9.0, -48.5, 8],   // main tee stand
  [-8.2, -45.5, 6],  // tee-right stand
  [-2.4, -50.5, 7],  // behind-tee stand
  [-21.2, 1.0, 6],   // east stadium wall N segment
  [-22.8, -9.8, 6],  // east stadium wall S segment
  [8.9, 9.9, 5],     // back-shore tent row
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
  pine: boolean; // slash pine vs live oak
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
        pine: rng() < 0.72, // Florida treeline: mostly slash pine, some live oak
      });
      placed++;
    }
  });
  return out;
}

// Two archetypes built from shared unit geometry, non-uniformly scaled per
// instance: slash pine (tall bare trunk, small high crown) and live oak
// (short thick trunk, broad low crown). Matches the real mixed treeline in
// the Getty aerials -- the old uniform cone forest read as toy conifers.
export function Trees() {
  const trunksRef = useRef<THREE.InstancedMesh>(null);
  const crownARef = useRef<THREE.InstancedMesh>(null);
  const crownBRef = useRef<THREE.InstancedMesh>(null);

  const { instances, trunkGeo, crownGeo } = useMemo(() => {
    const trunk = new THREE.CylinderGeometry(0.5, 0.62, 1, 6);
    const crown = new THREE.SphereGeometry(1, 8, 6);
    return { instances: buildInstances(), trunkGeo: trunk, crownGeo: crown };
  }, []);

  useEffect(() => {
    const trunks = trunksRef.current;
    const crownA = crownARef.current;
    const crownB = crownBRef.current;
    if (!trunks || !crownA || !crownB) return;

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const color = new THREE.Color();
    const PINE_TONES = ["#223f27", "#2c5433", "#3a6641"];
    const OAK_TONES  = ["#2c5433", "#40704a", "#4d7f54"];

    instances.forEach((inst, i) => {
      const s = inst.scale;
      const ox = Math.cos(inst.rotY) * (inst.pine ? 0.6 : 0.9) * s;
      const oz = Math.sin(inst.rotY) * (inst.pine ? 0.6 : 0.9) * s;

      if (inst.pine) {
        m.compose(new THREE.Vector3(inst.x, 2.1 * s, inst.z), q, new THREE.Vector3(0.2 * s, 4.2 * s, 0.2 * s));
        trunks.setMatrixAt(i, m);
        m.compose(new THREE.Vector3(inst.x, 4.35 * s, inst.z), q, new THREE.Vector3(1.25 * s, 0.8 * s, 1.25 * s));
        crownA.setMatrixAt(i, m);
        m.compose(new THREE.Vector3(inst.x + ox, 3.7 * s, inst.z + oz), q, new THREE.Vector3(0.85 * s, 0.6 * s, 0.85 * s));
        crownB.setMatrixAt(i, m);
      } else {
        m.compose(new THREE.Vector3(inst.x, 0.95 * s, inst.z), q, new THREE.Vector3(0.45 * s, 1.9 * s, 0.45 * s));
        trunks.setMatrixAt(i, m);
        m.compose(new THREE.Vector3(inst.x, 2.3 * s, inst.z), q, new THREE.Vector3(1.9 * s, 1.25 * s, 1.75 * s));
        crownA.setMatrixAt(i, m);
        m.compose(new THREE.Vector3(inst.x + ox, 1.9 * s, inst.z + oz), q, new THREE.Vector3(1.15 * s, 0.85 * s, 1.05 * s));
        crownB.setMatrixAt(i, m);
      }

      const tones = inst.pine ? PINE_TONES : OAK_TONES;
      const tone = inst.shade < 0.4 ? tones[0] : inst.shade < 0.75 ? tones[1] : tones[2];
      color.set(tone);
      crownA.setColorAt(i, color);
      color.multiplyScalar(0.82);
      crownB.setColorAt(i, color);
    });

    trunks.instanceMatrix.needsUpdate = true;
    crownA.instanceMatrix.needsUpdate = true;
    crownB.instanceMatrix.needsUpdate = true;
    if (crownA.instanceColor) crownA.instanceColor.needsUpdate = true;
    if (crownB.instanceColor) crownB.instanceColor.needsUpdate = true;
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
      {/* base color white -- per-instance colors multiply against it */}
      <instancedMesh
        ref={crownARef}
        args={[crownGeo, undefined, instances.length]}
        castShadow={false}
        receiveShadow={false}
      >
        <meshStandardMaterial color="#ffffff" roughness={1.0} metalness={0.0} />
      </instancedMesh>
      <instancedMesh
        ref={crownBRef}
        args={[crownGeo, undefined, instances.length]}
        castShadow={false}
        receiveShadow={false}
      >
        <meshStandardMaterial color="#ffffff" roughness={1.0} metalness={0.0} />
      </instancedMesh>
    </group>
  );
}
