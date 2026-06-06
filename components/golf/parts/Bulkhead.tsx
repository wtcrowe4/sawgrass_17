"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { makeGreenShape, getLakeOutlinePoints, makeGrassApproachShape } from "@/lib/golf/geometry";

// Bulkhead -- wooden retaining walls around all land/water boundaries.
//
// Three wall rings:
//   1. Green island  -- scaled-out outer face + back-side inner cap
//   2. Lake perimeter -- thin ring shape (outer=lake outline, inner=contracted)
//      Ring prevents the extrusion cap from filling the entire lake.
//   3. Grass approach -- edges facing water, cap covered by GrassApproach mesh
//
// All extruded downward 0.5 wu, warm concrete/timber tone.

const BULKHEAD_HEIGHT = 0.5;
const BULKHEAD_SCALE  = 1.04;
const LAKE_WALL_WIDTH = 0.35;  // wu -- thin sliver at shore edge
const STONE_COLOR     = "#7a7060";
const STONE_DARK      = "#5c5448";

export function Bulkhead() {
  const { outerGeo, innerGeo, lakeGeo, approachGeo } = useMemo(() => {
    const extSettings: THREE.ExtrudeGeometryOptions = {
      depth: BULKHEAD_HEIGHT,
      bevelEnabled: false,
    };

    // 1. Green island
    const greenShape = makeGreenShape();
    const outerVerts = makeGreenShape().getPoints(64);
    outerVerts.forEach((p: THREE.Vector2) => {
      p.x *= BULKHEAD_SCALE;
      p.y *= BULKHEAD_SCALE;
    });
    const outerShape = new THREE.Shape(outerVerts);

    const outerGeo = new THREE.ExtrudeGeometry(outerShape, extSettings);
    outerGeo.rotateX(-Math.PI / 2);
    outerGeo.translate(0, -BULKHEAD_HEIGHT, 0);

    const innerGeo = new THREE.ExtrudeGeometry(greenShape, extSettings);
    innerGeo.rotateX(-Math.PI / 2);
    innerGeo.translate(0, -BULKHEAD_HEIGHT, 0);

    // 2. Lake perimeter -- ring shape to avoid cap filling whole lake
    const lakePts = getLakeOutlinePoints();
    const cx = lakePts.reduce((s, p) => s + p.x, 0) / lakePts.length;
    const cy = lakePts.reduce((s, p) => s + p.y, 0) / lakePts.length;
    const innerLakePts = lakePts.map((p) => {
      const dx = cx - p.x;
      const dy = cy - p.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      return new THREE.Vector2(
        p.x + (dx / len) * LAKE_WALL_WIDTH,
        p.y + (dy / len) * LAKE_WALL_WIDTH
      );
    });
    const lakeRingShape = new THREE.Shape(lakePts);
    lakeRingShape.holes.push(new THREE.Path([...innerLakePts].reverse()));

    const lakeGeo = new THREE.ExtrudeGeometry(lakeRingShape, extSettings);
    lakeGeo.rotateX(-Math.PI / 2);
    lakeGeo.translate(0, -BULKHEAD_HEIGHT, 0);

    // 3. Grass approach edge walls (cap covered by GrassApproach mesh above)
    const approachGeo = new THREE.ExtrudeGeometry(makeGrassApproachShape(), extSettings);
    approachGeo.rotateX(-Math.PI / 2);
    approachGeo.translate(0, -BULKHEAD_HEIGHT, 0);

    return { outerGeo, innerGeo, lakeGeo, approachGeo };
  }, []);

  return (
    <group name="bulkhead">
      <mesh geometry={outerGeo} castShadow receiveShadow>
        <meshStandardMaterial color={STONE_COLOR} roughness={0.94} metalness={0.02} side={THREE.FrontSide} />
      </mesh>
      <mesh geometry={innerGeo} castShadow receiveShadow>
        <meshStandardMaterial color={STONE_DARK} roughness={0.97} metalness={0.01} side={THREE.BackSide} />
      </mesh>
      <mesh geometry={lakeGeo} castShadow receiveShadow>
        <meshStandardMaterial color={STONE_COLOR} roughness={0.94} metalness={0.02} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={approachGeo} castShadow receiveShadow>
        <meshStandardMaterial color={STONE_COLOR} roughness={0.94} metalness={0.02} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
