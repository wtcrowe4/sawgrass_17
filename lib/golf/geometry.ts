import * as THREE from "three";
import { Y2W } from "./types";

function toSceneX(value: number): number {
  return -value;
}

// ============================================================
// LAKE SHAPE
// ============================================================
//
// Hand-traced + satellite overlay calibration.
// GPS anchor: 30.194823320989965, -81.3908035333445
// Overlay rotation: -26 deg world-Y (calibrated 2026-05-11).
//
// Coordinate system:
//   Positive LAKE_POLY_WU.x -> negative world.x (screen right, east)
//   Negative LAKE_POLY_WU.x -> positive world.x (screen left, causeway/west)

const LAKE_POLY_WU: [number, number][] = [
  // --- North tip (behind green, traced 2026-05-12) ---
  [11.73, -15.47],
  [10.56, -15.37],
  [ 9.62, -14.59],
  [ 8.80, -12.40],
  [ 9.15,  -9.45],
  [ 8.96,  -5.38],
  [ 8.87,  -3.09],
  [ 8.69,  -1.05],
  [ 8.22,  -0.35],
  [ 7.36,   0.26],
  [ 5.65,   0.34],
  [ 3.25,  -0.99],
  [ 1.28,  -2.28],
  [-1.32,  -3.87],
  [-3.55,  -4.58],
  [-5.46,  -4.70],
  [-8.69,  -4.29],
  [-10.06, -3.59],
  [-10.56, -2.67],
  // --- Causeway / northwest shore (traced 2026-05-12) ---
  [-13.29, -0.93],
  [-14.24, -0.86],
  [-15.06, -0.56],
  [-15.52,  0.32],
  [-15.59,  1.69],
  [-14.93,  4.94],
  [-13.66,  8.95],
  [-12.83, 12.98],
  [-12.44, 16.50],
  [-12.84, 19.90],
  [-13.51, 22.68],
  [-13.15, 24.03],
  [-12.55, 24.90],
  [-11.42, 26.94],
  [-10.16, 29.95],
  [ -8.32, 33.88],
  [ -7.73, 36.39],
  // --- South end (traced 2026-05-13) ---
  [ -7.77, 36.07],
  [ -7.59, 38.20],
  [ -7.55, 40.24],
  [ -6.94, 42.10],
  [ -5.64, 43.51],
  [ -4.04, 43.66],
  [ -2.05, 42.83],
  [ -0.64, 41.74],
  [  0.65, 41.42],
  [  3.34, 41.60],
  [  5.59, 41.32],
  [  7.07, 39.38],
  [  7.98, 37.94],
  [ 10.30, 36.51],
  [ 13.67, 36.46],
  [ 18.13, 38.15],
  [ 22.06, 39.42],
  [ 25.39, 40.35],
  [ 27.58, 39.43],
  [ 29.07, 38.12],
  [ 29.38, 37.26],
  [ 28.81, 36.50],
  [ 27.58, 35.91],
  [ 26.41, 35.88],
  [ 24.51, 35.45],
  [ 22.91, 34.43],
  [ 22.18, 33.45],
  // --- East shore going north (traced 2026-05-12) ---
  [ 22.72, 34.39],
  [ 21.24, 32.16],
  [ 20.63, 27.52],
  [ 21.76, 23.53],
  [ 22.09, 18.34],
  [ 21.45, 13.25],
  [ 20.86,  9.94],
  [ 20.08,  6.22],
  [ 19.27,  2.30],
  [ 18.44, -1.83],
  [ 17.21, -6.12],
  [ 15.92, -8.22],
  [ 14.39,-11.10],
  [ 13.39,-13.39],
];

const LAKE_SAMPLES = 320;

export function getLakeOutlinePoints(): THREE.Vector2[] {
  const control = LAKE_POLY_WU.map(([x, y]) => new THREE.Vector2(toSceneX(x), y));
  const spline = new THREE.SplineCurve([...control, control[0].clone()]);
  return spline.getPoints(LAKE_SAMPLES);
}

export function makeLakeShape(): THREE.Shape {
  return new THREE.Shape(getLakeOutlinePoints());
}

// ============================================================
// GREEN / ISLAND SHAPE
// ============================================================
//
// Full perimeter traced 2026-05-11 to 2026-05-12 via in-scene
// satellite overlay click tool (rotation -26 deg).
//
// Coordinate convention (GREEN_POLY_YDS):
//   x_yds: negative = screen left (west, causeway side)
//           positive = screen right (east, grandstand side)
//   y_yds: positive = further north (back of green, away from tee)
//   world.x = -x_yds * Y2W   world.z = -y_yds * Y2W
//
// Polygon traversal: back peak -> east side (south) -> south/front edge
//   -> causeway approach (SW extension) -> west shore (north) -> NW -> back peak.

const GREEN_POLY_YDS: [number, number][] = [
  // Thinned 2026-05-14 -- key inflection points only, spline smooths between.
  // --- Back/north peak ---
  [-18.8, 33.4],
  [-16.0, 33.6],
  [-13.7, 32.8],
  [-12.0, 30.6],
  [-9.5,  29.1],
  [-6.0,  27.9],
  // --- East side ---
  [-5.2,  26.1],
  [-3.9,  24.6],
  [-1.2,  21.0],
  [-0.4,  18.0],
  [-0.2,  15.3],
  [-1.0,  11.9],
  [-1.6,   9.7],
  // --- Front/south edge ---
  [-3.3,   6.3],
  [-6.7,   4.7],
  [-12.2,  3.6],
  [-18.8,  3.8],
  // --- SW arc ---
  [-21.0,  4.5],
  [-26.0,  6.0],
  [-30.5,  8.2],
  // --- West shore ---
  [-31.2,  9.1],
  [-29.6, 13.7],
  [-28.8, 17.4],
  [-28.8, 20.2],
  [-28.5, 22.9],
  // --- Northwest corner ---
  [-26.3, 27.9],
  [-23.7, 30.6],
  [-22.0, 31.8],
  [-19.8, 32.8],
];

export function makeGreenShape(): THREE.Shape {
  const wuPts = GREEN_POLY_YDS.map(
    ([x, y]) => new THREE.Vector2(toSceneX(x * Y2W), y * Y2W)
  );
  const spline = new THREE.SplineCurve(wuPts);
  const smooth = spline.getPoints(200);
  return new THREE.Shape(smooth);
}

export function makeFringeShape(): THREE.Shape {
  const fringeExtra = 0.5 * Y2W;
  const wuPts = GREEN_POLY_YDS.map(
    ([x, y]) => new THREE.Vector2(toSceneX(x * Y2W), y * Y2W)
  );
  // Centroid: island center approx x_yds=-18, y_yds=12
  // shape.x = toSceneX(-18*Y2W) = 5.4
  // shape.y = 12*Y2W = 3.6
  const cx = 5.4;
  const cy = 3.6;

  const offsetPts = wuPts.map((point) => {
    const dx = point.x - cx;
    const dy = point.y - cy;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    return new THREE.Vector2(
      point.x + (dx / len) * fringeExtra,
      point.y + (dy / len) * fringeExtra
    );
  });

  const spline = new THREE.SplineCurve(offsetPts);
  const smooth = spline.getPoints(200);
  return new THREE.Shape(smooth);
}

// ============================================================
// CAUSEWAY SHAPE
// ============================================================
//
// Spine traced 2026-05-12 via satellite overlay click tool.
// Grass approach path from island west shore to far bank.
// 16-point outline traced 2026-05-14 (GREEN coord format: x_yds, y_yds).
// Direct polygon -- no spine offset needed.

export function makeCausewayShape(): THREE.Shape {
  const pts: [number, number][] = [
    [-2.4,  100.1],
    [-31.8,   8.6],
    [-33.0,   5.7],
    [-35.0,   3.5],
    [-38.1,   0.2],
    [-40.5,  -1.8],
    [-44.2,  -2.8],
    [-45.2,  -3.0],
    [-38.2,  -6.9],
    [-36.8,  -5.4],
    [-36.2,  -4.4],
    [-33.9,  -2.0],
    [-31.5,   0.8],
    [-29.7,   3.2],
    [-27.7,   5.2],
    [-25.8,   6.1],
  ];

  const spline = new THREE.SplineCurve(
    pts.map(([x, y]) => new THREE.Vector2(toSceneX(x * Y2W), y * Y2W))
  );
  const outline = spline.getPoints(128);
  const shape = new THREE.Shape();
  shape.setFromPoints(outline);
  return shape;
}

// ============================================================
// PARABOLIC TRACER ARC
// ============================================================

export function parabolaPoints(
  tee: { x: number; y: number },
  landing: { x: number; y: number },
  apexFactor = 0.2,
  segments = 48
): THREE.Vector3[] {
  const tx = toSceneX(tee.x * Y2W);
  const tz = tee.y * Y2W;
  const lx = toSceneX(landing.x * Y2W);
  const lz = landing.y * Y2W;

  const dist = Math.sqrt((lx - tx) ** 2 + (lz - tz) ** 2);
  const apexH = dist * apexFactor;

  // Launch from tee-pad height, terminate at green-surface height so the
  // arc tip lands ON the putting surface instead of inside the bulkhead.
  const teeY = 0.03;
  const landY = 0.06;

  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = tx + (lx - tx) * t;
    const z = tz + (lz - tz) * t;
    const y = teeY + (landY - teeY) * t + 4 * apexH * t * (1 - t);
    pts.push(new THREE.Vector3(x, y, z));
  }
  return pts;
}

// ============================================================
// PIN POSITIONS
// ============================================================
// Positioned inside the putting surface area.
// x_yds range for putting surface approx -4 to -28, y_yds approx 10 to 30.

export type PinPosition = "sunday" | "thursday" | "friday" | "saturday";

export const PIN_POSITIONS: Record<PinPosition, { x: number; z: number }> = {
  // REAL 2025 THE PLAYERS pin locations, from pgatour.com
  // tourcast pinCoords transformed via scripts/transform_shots.py.
  // All 4 verified inside GREEN_SURFACE_POLY_YDS.
  thursday: { x: toSceneX(-18.35 * Y2W), z: -9.36  * Y2W },  // R1 back-left
  friday:   { x: toSceneX(-22.28 * Y2W), z: -24.66 * Y2W },  // R2 front-left
  saturday: { x: toSceneX(-13.62 * Y2W), z: -8.25  * Y2W },  // R3 back-center
  sunday:   { x: toSceneX(-4.94  * Y2W), z: -16.28 * Y2W },  // R4 right edge
};

// Terrain -- 100wu square with lake punched out (edge stays past the fog line).
export function makeTerrainShape(): THREE.Shape {
  const outer = 100;
  const terrain = new THREE.Shape([
    new THREE.Vector2(-outer, -outer),
    new THREE.Vector2(outer, -outer),
    new THREE.Vector2(outer, outer),
    new THREE.Vector2(-outer, outer),
  ]);
  terrain.holes.push(new THREE.Path([...getLakeOutlinePoints()].reverse()));
  return terrain;
}

// ============================================================
// GREEN DIMENSIONS (derived -- used by sample-shots.ts)
// ============================================================
const xVals = GREEN_POLY_YDS.map(([x]) => x);
const yVals = GREEN_POLY_YDS.map(([, y]) => y);
export const GREEN_DIMENSIONS_YDS = {
  width: Math.max(...xVals) - Math.min(...xVals),
  depth: Math.max(...yVals) - Math.min(...yVals),
  minX: Math.min(...xVals),
  maxX: Math.max(...xVals),
  minY: Math.min(...yVals),
  maxY: Math.max(...yVals),
};

// ============================================================
// PUTTING SURFACE SHAPE
// ============================================================
//
// Traced 2026-05-12. Inner putting surface only -- sits on top
// of the full island landmass (makeGreenShape).
// Same coordinate convention as GREEN_POLY_YDS.

const GREEN_SURFACE_POLY_YDS: [number, number][] = [
  // Thinned to ~22 key points for organic spline smoothness.
  // Traced 2026-05-12, every-other-point selected.
  [-23.4,  7.8],
  [-19.1,  6.5],
  [-14.2,  5.6],
  [-10.2,  6.1],
  [ -5.8,  7.6],
  [ -2.3, 10.8],
  [ -1.3, 16.5],
  [ -1.4, 18.7],
  [ -2.9, 21.2],
  [ -6.8, 23.2],
  [ -9.2, 23.5],
  [-10.4, 24.4],
  [-11.5, 26.6],
  [-12.2, 29.4],
  [-13.8, 31.2],
  [-15.5, 32.4],
  [-19.4, 32.2],
  [-22.7, 30.3],
  [-26.6, 26.1],
  [-27.9, 19.6],
  [-27.3, 15.1],
  [-25.2,  9.5],
  [-23.4,  7.8],
];

export function makeGreenSurfaceShape(): THREE.Shape {
  const wuPts = GREEN_SURFACE_POLY_YDS.map(
    ([x, y]) => new THREE.Vector2(toSceneX(x * Y2W), y * Y2W)
  );
  const spline = new THREE.SplineCurve(wuPts);
  const smooth = spline.getPoints(200);
  return new THREE.Shape(smooth);
}


// ============================================================
// WOODEN WALKWAY SHAPE
// ============================================================
//
// Centerline-based walkway. Eastern half attaches to green;
// western half traced 2026-05-13 with 7 anchor points showing
// gradual curve to the lake-edge bank.
// Width: 3 yards (perpendicular offset from spine).

const WALKWAY_CENTERLINE_YDS: [number, number][] = [
  // East attachment at green front
  [ -1.5,  9.0],
  [ -5.0,  7.0],
  [-10.0,  5.5],
  [-16.0,  5.0],
  [-22.0,  5.5],
  [-28.0,  5.0],
  // Western half (traced 2026-05-13)
  [-33.7,  4.3],
  [-35.3,  2.8],
  [-37.4,  0.6],
  [-38.7, -0.7],
  [-40.8, -2.5],
  [-42.5, -3.0],
  [-44.9, -3.2],
];

export function makeWalkwayShape(): THREE.Shape {
  const width = 3 * Y2W;

  const spine = new THREE.SplineCurve(
    WALKWAY_CENTERLINE_YDS.map(
      ([x, y]) => new THREE.Vector2(toSceneX(x * Y2W), y * Y2W)
    )
  );

  const spinePts = spine.getPoints(64);
  const left: THREE.Vector2[] = [];
  const right: THREE.Vector2[] = [];

  spinePts.forEach((pt, i) => {
    const next = spinePts[Math.min(i + 1, spinePts.length - 1)];
    const prev = spinePts[Math.max(i - 1, 0)];
    const tx = next.x - prev.x;
    const ty = next.y - prev.y;
    const len = Math.sqrt(tx * tx + ty * ty) || 1;
    const nx = -ty / len;
    const ny = tx / len;
    left.push(new THREE.Vector2(pt.x + nx * width * 0.5, pt.y + ny * width * 0.5));
    right.push(new THREE.Vector2(pt.x - nx * width * 0.5, pt.y - ny * width * 0.5));
  });

  const shape = new THREE.Shape();
  shape.setFromPoints([...left, ...right.reverse()]);
  return shape;
}

// ============================================================
// ISLAND BUNKER SHAPE
// ============================================================
//
// Greenside bunker on the island, traced 2026-05-12.
// GREEN coord format: x_yds, y_yds.

const ISLAND_BUNKER_POLY_YDS: [number, number][] = [
  [-9.7, 26.2],
  [-8.8, 24.9],
  [-7.0, 25.1],
  [-6.5, 26.4],
  [-7.2, 27.7],
  [-8.0, 28.0],
  [-9.0, 27.9],
];

export function makeIslandBunkerShape(): THREE.Shape {
  const wuPts = ISLAND_BUNKER_POLY_YDS.map(
    ([x, y]) => new THREE.Vector2(toSceneX(x * Y2W), y * Y2W)
  );
  const spline = new THREE.SplineCurve([...wuPts, wuPts[0].clone()]);
  const smooth = spline.getPoints(48);
  return new THREE.Shape(smooth);
}

// ============================================================
// TREE ISLAND SHAPE
// ============================================================
//
// Small island east of green, traced 2026-05-12.
// GREEN coord format: x_yds, y_yds.
// Center approx: x_yds=25.6, y_yds=57.9 -> world (-7.68, 0, -17.37).

const TREE_ISLAND_POLY_YDS: [number, number][] = [
  [18.5, 53.2],
  [21.7, 49.4],
  [26.9, 47.8],
  [32.0, 51.5],
  [35.3, 58.9],
  [33.3, 64.6],
  [30.8, 65.9],
  [25.8, 65.3],
  [21.8, 63.8],
  [18.2, 60.4],
  [17.2, 55.8],
];

export const TREE_ISLAND_CENTER = {
  x: toSceneX(25.6 * Y2W),
  z: -(57.9 * Y2W),
};

export function makeTreeIslandShape(): THREE.Shape {
  const wuPts = TREE_ISLAND_POLY_YDS.map(
    ([x, y]) => new THREE.Vector2(toSceneX(x * Y2W), y * Y2W)
  );
  const spline = new THREE.SplineCurve([...wuPts, wuPts[0].clone()]);
  const smooth = spline.getPoints(64);
  return new THREE.Shape(smooth);
}

// ============================================================
// TEE BOX AREAS
// ============================================================
//
// Lighter mown grass tee box surfaces. Both polygons traced
// 2026-05-13 (GREEN coord format: x_yds, y_yds).

const MEMBERS_TEE_POLY_YDS: [number, number][] = [
  [-48.7,  83.6],
  [-44.8,  85.9],
  [-41.9,  91.0],
  [-38.4,  99.5],
  [-34.3, 106.9],
  [-31.1, 115.2],
  [-29.4, 123.7],
  [-29.3, 130.5],
  [-28.4, 137.0],
  [-25.6, 143.7],
  [-20.4, 147.4],
  [-15.4, 150.4],
  [-13.5, 154.9],
  [-15.7, 159.8],
  [-19.4, 161.0],
  [-26.0, 159.0],
  [-34.3, 152.7],
  [-38.8, 145.5],
  [-40.6, 140.7],
  [-42.1, 135.6],
  [-44.9, 126.3],
  [-45.8, 120.0],
  [-44.3, 117.1],
  [-43.2, 113.9],
  [-43.7, 106.9],
  [-47.5, 101.5],
  [-51.3,  97.2],
  [-53.1,  92.6],
  [-52.6,  87.7],
  [-50.6,  84.6],
];

const PRO_TEE_POLY_YDS: [number, number][] = [
  [-12.6, 153.6],
  [-11.0, 148.6],
  [ -7.9, 146.6],
  [ -3.3, 144.3],
  [ -0.1, 142.5],
  [  2.7, 141.8],
  [  6.1, 143.7],
  [  8.4, 147.2],
  [  9.9, 151.8],
  [ 10.6, 157.7],
  [  8.6, 161.3],
  [  4.1, 163.6],
  [ -1.5, 163.6],
  [ -7.6, 162.2],
  [-10.9, 159.6],
  [-12.6, 155.5],
  [-12.6, 151.3],
  [-10.6, 148.3],
];

function polyToShape(pts: [number, number][], samples = 128): THREE.Shape {
  const wu = pts.map(([x, y]) => new THREE.Vector2(toSceneX(x * Y2W), y * Y2W));
  const spline = new THREE.SplineCurve([...wu, wu[0].clone()]);
  const smooth = spline.getPoints(samples);
  return new THREE.Shape(smooth);
}

export function makeMembersTeeShape(): THREE.Shape {
  return polyToShape(MEMBERS_TEE_POLY_YDS, 192);
}

export function makeProTeeShape(): THREE.Shape {
  return polyToShape(PRO_TEE_POLY_YDS, 128);
}

export const PRO_TEE_CENTER = (() => {
  const xs = PRO_TEE_POLY_YDS.map(([x]) => x);
  const ys = PRO_TEE_POLY_YDS.map(([, y]) => y);
  const cx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const cy = ys.reduce((a, b) => a + b, 0) / ys.length;
  return { x: toSceneX(cx * Y2W), z: -(cy * Y2W) };
})();

// ============================================================
// CART PATH
// ============================================================
//
// Asphalt cart path linking the pro tee + members tee complex
// down to the causeway entrance near the green.
// Width: 2.5 yards. Spline-smoothed centerline.

const CART_PATH_CENTERLINE_YDS: [number, number][] = [
  // Traced 2026-05-13 (GREEN coord format).
  [-22.5, 177.1],
  [-29.0, 170.2],
  [-37.2, 157.4],
  [-40.7, 145.5],
  [-44.5, 134.1],
  [-49.3, 121.0],
  [-53.5, 113.5],
  [-58.4,  99.5],
  [-57.6,  89.9],
  [-52.5,  75.7],
  [-49.2,  66.9],
  [-47.4,  55.7],
  [-48.5,  64.7],
  [-46.8,  51.1],
  [-50.8,  34.4],
  [-53.6,  21.9],
  [-57.8,   5.7],
  [-58.0,  -1.7],
  [-57.6,  -6.7],
  [-59.8, -10.5],
  [-65.4, -14.9],
  [-70.9, -18.7],
  [-74.3, -21.7],
  [-73.2, -27.1],
  [-80.6, -31.9],
  [-85.6, -24.6],
  [-78.7, -19.3],
  [-85.3,  -9.8],
  [-87.4, -43.7],
  [-66.3, -37.1],
  [-70.0, -45.4],
];

export function makeCartPathShape(): THREE.Shape {
  const width = 2.5 * Y2W;

  const spine = new THREE.SplineCurve(
    CART_PATH_CENTERLINE_YDS.map(
      ([x, y]) => new THREE.Vector2(toSceneX(x * Y2W), y * Y2W)
    )
  );

  const spinePts = spine.getPoints(240);
  const left: THREE.Vector2[] = [];
  const right: THREE.Vector2[] = [];

  spinePts.forEach((pt, i) => {
    const next = spinePts[Math.min(i + 1, spinePts.length - 1)];
    const prev = spinePts[Math.max(i - 1, 0)];
    const tx = next.x - prev.x;
    const ty = next.y - prev.y;
    const len = Math.sqrt(tx * tx + ty * ty) || 1;
    const nx = -ty / len;
    const ny = tx / len;
    left.push(new THREE.Vector2(pt.x + nx * width * 0.5, pt.y + ny * width * 0.5));
    right.push(new THREE.Vector2(pt.x - nx * width * 0.5, pt.y - ny * width * 0.5));
  });

  const shape = new THREE.Shape();
  shape.setFromPoints([...left, ...right.reverse()]);
  return shape;
}

export function getCartPathCenterline(): THREE.Vector2[] {
  return CART_PATH_CENTERLINE_YDS.map(
    ([x, y]) => new THREE.Vector2(toSceneX(x * Y2W), y * Y2W)
  );
}

// ============================================================
// GRASS APPROACH PATCH (replaces wooden walkway)
// ============================================================
//
// User-traced 2026-05-13. Two parallel edges define a strip of
// approach grass running from west of green out toward the bank.
// Order: south edge SW, then north edge NE back to start.

const GRASS_APPROACH_POLY_YDS: [number, number][] = [
  // Traced 2026-05-14 -- full grass approach outline, island west shore to far bank.
  [-31.8,   8.6],
  [-33.0,   5.7],
  [-35.0,   3.5],
  [-38.1,   0.2],
  [-40.5,  -1.8],
  [-44.2,  -2.8],
  [-45.2,  -3.0],
  [-38.2,  -6.9],
  [-36.8,  -5.4],
  [-36.2,  -4.4],
  [-33.9,  -2.0],
  [-31.5,   0.8],
  [-29.7,   3.2],
  [-27.7,   5.2],
  [-25.8,   6.1],
];

export function makeGrassApproachShape(): THREE.Shape {
  const wuPts = GRASS_APPROACH_POLY_YDS.map(
    ([x, y]) => new THREE.Vector2(toSceneX(x * Y2W), y * Y2W)
  );
  const spline = new THREE.SplineCurve([...wuPts, wuPts[0].clone()]);
  const smooth = spline.getPoints(160);
  return new THREE.Shape(smooth);
}
