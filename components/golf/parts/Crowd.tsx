"use client";

import { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { inLake } from "./Trees";

// Crowd -- instanced spectators. One "detailed person" template (legs, torso,
// two arms, head, cap) repeated everywhere as filler per user direction.
// Six InstancedMeshes total per crowd block (one per body part); per-instance
// color carries shirt/skin/pants/cap variation. Caps on ~55% (zero-scaled
// matrix hides the rest).
//
// Person is ~0.6 wu tall standing (= 6 ft at Y2W = 0.3/yd).

// Muted palette -- getty crowds read as desaturated masses (whites, navys,
// grays, pastels) with only occasional saturated shirts.
const SHIRTS = [
  "#e8e6e0", "#d9d5cc", "#2c3e70", "#31404f", "#8a93a3",
  "#a3536b", "#6d8fae", "#c9b98f", "#5c7361", "#b0554a",
  "#e8e6e0", "#3d4a63", "#9aa5b5", "#c4b8d4", "#7d8a99",
];
const SKINS  = ["#c8946a", "#8a5a3b", "#e0b48c", "#6b4226"];
const PANTS  = ["#2b2f38", "#4a4238", "#5a6472", "#3d3d3d", "#7a7264"];
const CAPS   = ["#c0392b", "#ffffff", "#2c3e70", "#111111", "#e6b93f", "#3a7ca5"];

export interface PersonSpec {
  x: number; y: number; z: number;
  rotY: number;
  s: number;        // overall scale (0.8..0.95 typical)
  seated: boolean;
  shirt: string;
  skin: string;
  pants: string;
  cap: string | null;
}

// Part local placement per pose: [cx, cy, cz, sy]
type PartPose = [number, number, number, number];
interface PartDef {
  standing: PartPose;
  seated: PartPose;
}

const PARTS: Record<string, PartDef> = {
  legs: { standing: [0, 0.15, 0, 1], seated: [0, 0.075, 0.08, 0.5] },
  torso: { standing: [0, 0.43, 0, 1], seated: [0, 0.30, 0, 1] },
  armL: { standing: [-0.135, 0.42, 0, 1], seated: [-0.135, 0.29, 0, 1] },
  armR: { standing: [0.135, 0.42, 0, 1], seated: [0.135, 0.29, 0, 1] },
  head: { standing: [0, 0.63, 0, 1], seated: [0, 0.50, 0, 1] },
  cap: { standing: [0, 0.685, 0, 1], seated: [0, 0.555, 0, 1] },
};

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

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function makePerson(
  rng: () => number,
  x: number, y: number, z: number,
  rotY: number, seated: boolean
): PersonSpec {
  return {
    x, y, z, rotY,
    s: 0.8 + rng() * 0.15,
    seated,
    shirt: pick(rng, SHIRTS),
    skin: pick(rng, SKINS),
    pants: pick(rng, PANTS),
    cap: rng() < 0.55 ? pick(rng, CAPS) : null,
  };
}

interface InstancedPartProps {
  people: PersonSpec[];
  part: keyof typeof PARTS;
  colorOf: (p: PersonSpec) => string | null;
  geo: THREE.BufferGeometry;
}

function InstancedPart({ people, part, colorOf, geo }: InstancedPartProps) {
  const ref = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const partM = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const yAxis = new THREE.Vector3(0, 1, 0);
    const color = new THREE.Color();
    const def = PARTS[part];

    people.forEach((p, i) => {
      const c = colorOf(p);
      if (c === null) {
        m.makeScale(0, 0, 0);
        mesh.setMatrixAt(i, m);
        return;
      }
      const [cx, cy, cz, sy] = p.seated ? def.seated : def.standing;
      q.setFromAxisAngle(yAxis, p.rotY);
      m.compose(new THREE.Vector3(p.x, p.y, p.z), q, new THREE.Vector3(p.s, p.s, p.s));
      partM.makeTranslation(cx, cy, cz);
      partM.multiply(new THREE.Matrix4().makeScale(1, sy, 1));
      m.multiply(partM);
      mesh.setMatrixAt(i, m);
      color.set(c);
      mesh.setColorAt(i, color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [people, part, colorOf]);

  return (
    <instancedMesh ref={ref} args={[geo, undefined, people.length]} castShadow={false} receiveShadow={false}>
      <meshStandardMaterial color="#ffffff" roughness={0.9} metalness={0.0} />
    </instancedMesh>
  );
}

export function PersonInstances({ people }: { people: PersonSpec[] }) {
  const geos = useMemo(() => ({
    legs: new THREE.BoxGeometry(0.17, 0.30, 0.10),
    torso: new THREE.BoxGeometry(0.22, 0.26, 0.12),
    arm: new THREE.BoxGeometry(0.05, 0.24, 0.06),
    head: new THREE.SphereGeometry(0.065, 8, 6),
    cap: new THREE.CylinderGeometry(0.07, 0.07, 0.03, 8),
  }), []);

  if (people.length === 0) return null;

  return (
    <group name="person-instances">
      <InstancedPart people={people} part="legs" geo={geos.legs} colorOf={(p) => p.pants} />
      <InstancedPart people={people} part="torso" geo={geos.torso} colorOf={(p) => p.shirt} />
      <InstancedPart people={people} part="armL" geo={geos.arm} colorOf={(p) => p.shirt} />
      <InstancedPart people={people} part="armR" geo={geos.arm} colorOf={(p) => p.shirt} />
      <InstancedPart people={people} part="head" geo={geos.head} colorOf={(p) => p.skin} />
      <InstancedPart people={people} part="cap" geo={geos.cap} colorOf={(p) => p.cap} />
    </group>
  );
}

// --- Seated rows for a grandstand (stand-local coordinates) -----------------
// y = y0 - z * slope models the raked seating deck.
interface CrowdRowsProps {
  len: number;
  depth: number;
  y0: number;
  slope: number;
  seed: number;
}

export function CrowdRows({ len, depth, y0, slope, seed }: CrowdRowsProps) {
  const people = useMemo(() => {
    const rng = mulberry32(0xBEEF0000 + seed);
    const out: PersonSpec[] = [];
    const rows = 3;
    const usableLen = len - 0.8;
    const perRow = Math.floor(usableLen / 0.42);
    for (let r = 0; r < rows; r++) {
      const z = -depth * 0.35 + (r / (rows - 1)) * depth * 0.62;
      for (let i = 0; i < perRow; i++) {
        if (rng() < 0.16) continue; // empty seats
        const x = -usableLen / 2 + i * 0.42 + (rng() - 0.5) * 0.1;
        const y = y0 - z * slope;
        out.push(makePerson(rng, x, y, z, (rng() - 0.5) * 0.5, true));
      }
    }
    return out;
  }, [len, depth, y0, slope, seed]);

  return <PersonInstances people={people} />;
}

// --- Standing crowds on the shoreline mounds (world coordinates) ------------
interface Zone {
  xMin: number; xMax: number;
  zMin: number; zMax: number;
  count: number;
  faceX: number; faceZ: number; // spectators loosely face this world point
}

// Getty refs (1248046004, 2266061676): dense dark crowd masses line the ENTIRE
// shoreline between the stands and the water, plus mounds around the tee.
const ZONES: Zone[] = [
  // Behind the green, between the two stands
  { xMin: -12, xMax: 5, zMin: 5.5, zMax: 8.5, count: 90, faceX: 4.5, faceZ: -5.5 },
  // East shore rail (screen right) -- ropes line along the 16th fairway side,
  // no stands over there
  { xMin: -18.6, xMax: -17.2, zMin: -20, zMax: 5, count: 40, faceX: 4.5, faceZ: -5.5 },
  // West hospitality row concourse (screen left, south of the stadium row)
  { xMin: 17.5, xMax: 21.0, zMin: -28, zMax: -12, count: 60, faceX: 0, faceZ: -15 },
  // Rail strip between the west cart path and the water, below the stands
  { xMin: 14.0, xMax: 15.4, zMin: -12, zMax: -3, count: 25, faceX: 4.5, faceZ: -5.5 },
  // Tee gallery -- fans stand BEHIND the ropes, never on the course. The
  // cart path runs up the west side (x ~7->17.5 as z goes -53->-30); these
  // pack the berm behind the tee and a tight rope-line OUTBOARD of the path,
  // running up-and-down roughly the same line as the west grandstands.
  // Berm behind the tee boxes (z < back of tee ~ -49), densely packed
  { xMin: -7, xMax: 16, zMin: -55, zMax: -50, count: 120, faceX: 4.5, faceZ: -5.5 },
  // West rope-line gallery, outboard of the cart path, tee up to the stands
  { xMin: 18.2, xMax: 19.6, zMin: -34, zMax: -13, count: 95, faceX: 4.5, faceZ: -5.5 },
];

export function StandingCrowds() {
  const people = useMemo(() => {
    const rng = mulberry32(0xFACE0FF);
    const out: PersonSpec[] = [];
    ZONES.forEach((zone) => {
      let placed = 0;
      let attempts = 0;
      while (placed < zone.count && attempts < zone.count * 10) {
        attempts++;
        const x = zone.xMin + rng() * (zone.xMax - zone.xMin);
        const z = zone.zMin + rng() * (zone.zMax - zone.zMin);
        if (inLake(x, z)) continue;
        const rotY = Math.atan2(zone.faceX - x, zone.faceZ - z) + (rng() - 0.5) * 0.6;
        out.push(makePerson(rng, x, 0.02, z, rotY, false));
        placed++;
      }
    });
    return out;
  }, []);

  return (
    <group name="standing-crowds">
      <PersonInstances people={people} />
    </group>
  );
}
