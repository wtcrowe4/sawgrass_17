"use client";

import { useMemo } from "react";
import * as THREE from "three";

// Hole16 -- the 16th green complex on the far shore of 17's lake plus the
// par-5 fairway ribbon approaching from the south. Visible in every wide
// shot of 17 (getty 1248046004 top-left, 2113291111 bottom-left): lakeside
// green, white sand bunkers, lone oak, fairway running south between the
// tree line and the stand row.
//
// World coords. Shape convention: shape.x = world.x, shape.y = -world.z,
// then geometry.rotateX(-PI/2).

const GREEN_C   = { x: -21.5, z: 4.2 };
const FWY_COLOR    = "#3e7a43";
const FRINGE_COLOR = "#3f7d44";
const GREEN_COLOR  = "#5aa35c";
const SAND_COLOR   = "#e2d4a8";

function blobShape(cx: number, cz: number, rx: number, rz: number, wobble: number, seed: number): THREE.Shape {
  const raw: THREE.Vector2[] = [];
  const N = 14;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const w = 1 + wobble * Math.sin(a * 3 + seed * 2.1);
    raw.push(new THREE.Vector2(cx + Math.cos(a) * rx * w, -cz + Math.sin(a) * rz * w));
  }
  const curve = new THREE.SplineCurve([...raw, raw[0]]);
  const pts = curve.getPoints(56);
  const shape = new THREE.Shape();
  shape.moveTo(pts[0].x, pts[0].y);
  pts.slice(1).forEach((p: THREE.Vector2) => shape.lineTo(p.x, p.y));
  return shape;
}

// Fairway outline, world (x, z) -- neck at the green, sweeping south
const FWY_PTS: [number, number][] = [
  [-22.2, 5.6], [-23.3, 2.5], [-24.0, -4.0], [-24.6, -12.0], [-25.5, -20.0],
  [-26.5, -26.0], [-30.5, -26.0], [-30.0, -17.0], [-29.4, -7.0], [-28.8, 1.0],
  [-26.8, 5.2], [-24.2, 6.6],
];

function fairwayShape(): THREE.Shape {
  const raw = FWY_PTS.map(([x, z]) => new THREE.Vector2(x, -z));
  const curve = new THREE.SplineCurve([...raw, raw[0]]);
  const pts = curve.getPoints(72);
  const shape = new THREE.Shape();
  shape.moveTo(pts[0].x, pts[0].y);
  pts.slice(1).forEach((p: THREE.Vector2) => shape.lineTo(p.x, p.y));
  return shape;
}

function flatGeo(shape: THREE.Shape): THREE.BufferGeometry {
  const geo = new THREE.ShapeGeometry(shape, 4);
  geo.rotateX(-Math.PI / 2);
  return geo;
}

export function Hole16() {
  const geos = useMemo(() => ({
    fairway: flatGeo(fairwayShape()),
    fringe:  flatGeo(blobShape(GREEN_C.x, GREEN_C.z, 3.9, 3.2, 0.1, 3)),
    green:   flatGeo(blobShape(GREEN_C.x, GREEN_C.z, 3.2, 2.6, 0.12, 3)),
    bunkerE: flatGeo(blobShape(-19.0, 1.8, 1.5, 1.0, 0.18, 5)),
    bunkerW: flatGeo(blobShape(-24.3, 1.5, 1.1, 0.9, 0.18, 8)),
  }), []);

  const oakTrunk  = useMemo(() => new THREE.CylinderGeometry(0.12, 0.2, 2.2, 7), []);
  const oakCanopy = useMemo(() => new THREE.SphereGeometry(1, 8, 6), []);

  return (
    <group name="hole16">
      <mesh geometry={geos.fairway} position={[0, 0.018, 0]} receiveShadow>
        <meshStandardMaterial color={FWY_COLOR} roughness={0.95} metalness={0} />
      </mesh>
      <mesh geometry={geos.fringe} position={[0, 0.028, 0]} receiveShadow>
        <meshStandardMaterial color={FRINGE_COLOR} roughness={0.92} metalness={0} />
      </mesh>
      <mesh geometry={geos.green} position={[0, 0.038, 0]} receiveShadow>
        <meshStandardMaterial color={GREEN_COLOR} roughness={0.75} metalness={0} />
      </mesh>
      <mesh geometry={geos.bunkerE} position={[0, 0.032, 0]} receiveShadow>
        <meshStandardMaterial color={SAND_COLOR} roughness={1} metalness={0} />
      </mesh>
      <mesh geometry={geos.bunkerW} position={[0, 0.032, 0]} receiveShadow>
        <meshStandardMaterial color={SAND_COLOR} roughness={1} metalness={0} />
      </mesh>
      {/* 16 flag -- plain yellow, small */}
      <group position={[GREEN_C.x, 0.038, GREEN_C.z]}>
        <mesh position={[0, 0.7, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 1.4, 5]} />
          <meshStandardMaterial color="#d4d4d4" roughness={0.4} metalness={0.3} />
        </mesh>
        <mesh position={[0.14, 1.28, 0]}>
          <planeGeometry args={[0.28, 0.18]} />
          <meshStandardMaterial color="#f2c744" side={THREE.DoubleSide} roughness={0.8} />
        </mesh>
      </group>
      {/* lone oak beside the green (getty 2113291111) */}
      <group position={[-24.5, 0, 6.0]}>
        <mesh geometry={oakTrunk} position={[0, 1.1, 0]} castShadow>
          <meshStandardMaterial color="#4a3a28" roughness={0.95} metalness={0} />
        </mesh>
        <mesh geometry={oakCanopy} position={[0, 2.6, 0]} scale={[1.7, 1.05, 1.55]} castShadow={false}>
          <meshStandardMaterial color="#20402a" roughness={1} metalness={0} />
        </mesh>
        <mesh geometry={oakCanopy} position={[0.95, 2.2, 0.4]} scale={[1.0, 0.7, 0.9]} castShadow={false}>
          <meshStandardMaterial color="#1c3a24" roughness={1} metalness={0} />
        </mesh>
      </group>
    </group>
  );
}
