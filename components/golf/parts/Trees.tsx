"use client";

import { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";

// Trees -- InstancedMesh of cypress cones forming a treeline around
// the hole perimeter (back and east of green, around tree island).
// Avoids west side where cart path + tee complex live.

const TREE_COUNT     = 180;
const TRUNK_COLOR    = "#2a1f15";
const CYPRESS_DARK   = "#0e2014";   // far / shadow
const CYPRESS_MID    = "#1a3a22";
const CYPRESS_LIGHT  = "#2c5235";   // sunlit highlights

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

interface PlaceCfg {
  // Annular bands in world coords: trees only where r in [rMin, rMax]
  rMin: number;
  rMax: number;
  // Angle range in radians (atan2(z, x), 0..2pi)
  aMin: number;
  aMax: number;
  count: number;
}

// Three placement bands: behind green, east of lake, around tree island
const BANDS: PlaceCfg[] = [
  // Behind green (north, +z negative), east half
  { rMin: 18, rMax: 38, aMin: -Math.PI * 0.95, aMax: -Math.PI * 0.55, count: 70 },
  // East of lake / past tree island
  { rMin: 16, rMax: 36, aMin: -Math.PI * 0.55, aMax: -Math.PI * 0.05, count: 60 },
  // South-east arc behind tracers landing zone
  { rMin: 22, rMax: 40, aMin: -Math.PI * 0.05, aMax:  Math.PI * 0.30, count: 30 },
  // Far back (deep north)
  { rMin: 38, rMax: 55, aMin: -Math.PI * 0.85, aMax: -Math.PI * 0.20, count: 20 },
];

interface TreeInstance {
  x: number;
  z: number;
  scale: number;
  rotY: number;
  shade: number; // 0..1 for color lerp
}

function buildInstances(): TreeInstance[] {
  const rng = mulberry32(0xCAFEBABE);
  const out: TreeInstance[] = [];
  BANDS.forEach((band) => {
    for (let i = 0; i < band.count; i++) {
      const r = band.rMin + rng() * (band.rMax - band.rMin);
      const a = band.aMin + rng() * (band.aMax - band.aMin);
      const x = r * Math.cos(a);
      const z = r * Math.sin(a);
      // Scale variation 0.7..1.5
      const scale = 0.7 + rng() * 0.8;
      const rotY = rng() * Math.PI * 2;
      const shade = rng();
      out.push({ x, z, scale, rotY, shade });
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
        <meshStandardMaterial color={CYPRESS_MID} roughness={1.0} metalness={0.0} vertexColors={false} />
      </instancedMesh>
    </group>
  );
}
