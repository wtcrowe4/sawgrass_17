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
// Weathered timber -- the real island is edged with dark wooden plank walls
const TIMBER_COLOR    = "#6a5340";
const TIMBER_DARK     = "#4a3a2c";

// Vertical plank texture: plank-width hue jitter + dark seam lines.
// ExtrudeGeometry side faces map u along the contour, so RepeatWrapping
// with a high repeat.x wraps planks around the wall perimeter.
function buildPlankTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const w = 128;
  const h = 64;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  const plankW = 8;
  for (let x = 0; x < w; x += plankW) {
    const jitter = (Math.sin(x * 12.9898) * 43758.5453) % 1; // deterministic
    const v = Math.abs(jitter) * 30 - 15;
    ctx.fillStyle = `rgb(${106 + v}, ${83 + v * 0.8}, ${64 + v * 0.6})`;
    ctx.fillRect(x, 0, plankW, h);
    ctx.fillStyle = "rgba(30, 22, 16, 0.85)";
    ctx.fillRect(x, 0, 1, h);
  }
  // Horizontal waterline stain across the lower third
  const grad = ctx.createLinearGradient(0, h * 0.6, 0, h);
  grad.addColorStop(0, "rgba(25, 20, 15, 0)");
  grad.addColorStop(1, "rgba(25, 20, 15, 0.55)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, h * 0.6, w, h * 0.4);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(30, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function Bulkhead() {
  const plankTex = useMemo(() => buildPlankTexture(), []);
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
        <meshStandardMaterial
          color={plankTex ? "#ffffff" : TIMBER_COLOR}
          map={plankTex ?? undefined}
          roughness={0.94}
          metalness={0.02}
          side={THREE.FrontSide}
        />
      </mesh>
      <mesh geometry={innerGeo} castShadow receiveShadow>
        <meshStandardMaterial color={TIMBER_DARK} roughness={0.97} metalness={0.01} side={THREE.BackSide} />
      </mesh>
      <mesh geometry={lakeGeo} castShadow receiveShadow>
        <meshStandardMaterial
          color={plankTex ? "#ffffff" : TIMBER_COLOR}
          map={plankTex ?? undefined}
          roughness={0.94}
          metalness={0.02}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh geometry={approachGeo} castShadow receiveShadow>
        <meshStandardMaterial
          color={plankTex ? "#ffffff" : TIMBER_COLOR}
          map={plankTex ?? undefined}
          roughness={0.94}
          metalness={0.02}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
