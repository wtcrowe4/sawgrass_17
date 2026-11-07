"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { PALETTE } from "@/lib/golf/palette";
import { heightAt } from "@/lib/golf/elevation";

// Always-on distant treeline -- a silhouette canopy band ringing the scene.
// Every reference photo wraps the hole in dense trees; without this the
// horizon is an empty band of sky and the lake reflects nothing but sky,
// which is why the water read washed-out at grazing angles.
//
// This is NOT the props Trees.tsx (detailed in-field trees, behind the
// toggle). These are low-poly crown blobs + pine spikes at 55-90 wu, two to
// three rows deep so orbiting cannot see through the band. Scene fog
// (110-320) does the atmospheric fade. Deterministic placement via a seeded
// RNG so every load matches.
//
// Palette exception (same as Crowd/Trees): WHITE base materials so
// per-instance setColorAt multiplies correctly.

const CENTER_X = 0;
const CENTER_Z = -15;
const R_MIN = 55;
const R_MAX = 90;
const CROWN_COUNT = 260;
const PINE_COUNT = 80;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface TreeInst { x: number; z: number; sx: number; sy: number; sz: number; tone: number }

function scatter(count: number, seed: number, tall: boolean): TreeInst[] {
  const rng = mulberry32(seed);
  const out: TreeInst[] = [];
  while (out.length < count) {
    const ang = rng() * Math.PI * 2;
    // bias toward the inner edge so the front row is solid
    const r = R_MIN + (R_MAX - R_MIN) * Math.pow(rng(), 0.7);
    const x = CENTER_X + Math.cos(ang) * r;
    const z = CENTER_Z + Math.sin(ang) * r;
    if (tall) {
      const sy = 7 + rng() * 5;
      out.push({ x, z, sx: 1.6 + rng() * 1.2, sy, sz: 1.6 + rng() * 1.2, tone: rng() });
    } else {
      const sx = 3.2 + rng() * 3.4;
      out.push({ x, z, sx, sy: 2.6 + rng() * 2.6, sz: 3.2 + rng() * 3.4, tone: rng() });
    }
  }
  return out;
}

export function Treeline() {
  const crownRef = useRef<THREE.InstancedMesh>(null);
  const pineRef = useRef<THREE.InstancedMesh>(null);

  const { crowns, pines, crownGeo, pineGeo } = useMemo(() => ({
    crowns: scatter(CROWN_COUNT, 1701, false),
    pines: scatter(PINE_COUNT, 2203, true),
    crownGeo: new THREE.SphereGeometry(1, 7, 5),
    pineGeo: new THREE.ConeGeometry(1, 1, 6),
  }), []);

  useEffect(() => {
    const dark = new THREE.Color(PALETTE.canopyDark);
    const mid = new THREE.Color(PALETTE.canopyMid);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const c = new THREE.Color();

    const fill = (mesh: THREE.InstancedMesh | null, list: TreeInst[], cone: boolean) => {
      if (!mesh) return;
      list.forEach((t, i) => {
        const y = heightAt(t.x, t.z);
        // crowns: sphere centre sits at ~60% of height; cones: origin is centre
        const cy = cone ? y + t.sy * 0.5 : y + t.sy * 0.62;
        m.compose(new THREE.Vector3(t.x, cy, t.z), q, new THREE.Vector3(t.sx, t.sy, t.sz));
        mesh.setMatrixAt(i, m);
        mesh.setColorAt(i, c.copy(dark).lerp(mid, t.tone * 0.7));
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    };
    fill(crownRef.current, crowns, false);
    fill(pineRef.current, pines, true);
  }, [crowns, pines]);

  return (
    <group name="treeline">
      <instancedMesh ref={crownRef} args={[crownGeo, undefined, CROWN_COUNT]} frustumCulled={false} receiveShadow>
        <meshStandardMaterial color="#ffffff" roughness={1} metalness={0} />
      </instancedMesh>
      <instancedMesh ref={pineRef} args={[pineGeo, undefined, PINE_COUNT]} frustumCulled={false} receiveShadow>
        <meshStandardMaterial color="#ffffff" roughness={1} metalness={0} />
      </instancedMesh>
    </group>
  );
}
