// Terrain elevation -- single height function for the whole scene.
//
// PROTOTYPE (2026-08-01). The shape of this module is the point: everything
// asks heightAt(x, z) and nothing else knows where the number came from. Right
// now it is synthetic (hand-placed mounds from the Getty galleries). Swapping
// in USGS 3DEP 1m LiDAR later means replacing the body of heightAt with a
// sampler over a loaded heightfield -- no caller changes.
//
// Units are world units (1 wu = 3.05 m). Elevations here are small on purpose:
// the real hole is nearly flat, and TPC's "stadium" mounding is a couple of
// yards, not a hillside.

import { getLakeOutlinePoints } from "./geometry";

const LAKE = getLakeOutlinePoints(); // shape space: sx = world.x, sy = -world.z

/** Squared distance from (px,py) to segment (ax,ay)-(bx,by), shape space. */
function segDistSq(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
  const qx = ax + t * dx;
  const qy = ay + t * dy;
  return (px - qx) * (px - qx) + (py - qy) * (py - qy);
}

/** Distance from a world point to the lake edge, and whether it is inside. */
export function lakeEdgeDistance(wx: number, wz: number): { dist: number; inside: boolean } {
  const px = wx;
  const py = -wz;
  let best = Infinity;
  let inside = false;
  for (let i = 0, j = LAKE.length - 1; i < LAKE.length; j = i++) {
    const xi = LAKE[i].x, yi = LAKE[i].y;
    const xj = LAKE[j].x, yj = LAKE[j].y;
    const d = segDistSq(px, py, xi, yi, xj, yj);
    if (d < best) best = d;
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return { dist: Math.sqrt(best), inside };
}

interface Mound {
  x: number;
  z: number;
  radius: number; // wu -- falls to zero here
  height: number; // wu at the peak
}

// Spectator mounding, read off the tournament aerials: the galleries stand on
// raised berms, which is why the crowds read as banked rows rather than a flat
// line. Positions mirror the Crowd.tsx zones and the stand row.
// Placed OUTBOARD of the cart path and behind the tee pads on purpose: those
// are fixed-height flat meshes, so a mound reaching under one buries it.
// A real DEM will need explicit flatten corridors for the path and tees.
const MOUNDS: Mound[] = [
  { x: 24.5, z: -14.0, radius: 11.0, height: 1.20 }, // west stadium bank
  { x: 23.0, z: -25.0, radius: 9.0, height: 0.90 },  // west hospitality shelf
  { x: 4.0, z: -60.0, radius: 10.0, height: 1.15 },  // berm behind the tee
  { x: -21.0, z: -6.0, radius: 11.0, height: 0.85 }, // east rope-line bank
  { x: -8.0, z: 12.5, radius: 12.0, height: 1.05 },  // mound behind the green
  { x: 13.0, z: 13.0, radius: 9.0, height: 0.70 },   // north-west shoulder
];

// How far from the water the ground must already be flat. Inside this band
// height is forced to 0 so the shoreline ring and the water plane keep meeting
// the ground exactly where they do today -- mounds must never open a gap at
// the lake edge.
const SHORE_FLAT = 2.5;
const SHORE_RAMP = 6.0;

/** Elevation is forced flat beyond this Chebyshev radius (wu). Must sit
 *  inside Terrain's GRID_EXTENT so the flat skirt joins seamlessly. */
export const GRID_FADE_END = 64;

/** Smoothstep 0..1. */
function smooth(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

/**
 * Ground height in world units at a world (x, z).
 * Returns 0 at and near the lake edge; rises into the mounds inland.
 */
export function heightAt(wx: number, wz: number): number {
  const { dist, inside } = lakeEdgeDistance(wx, wz);
  if (inside) return 0;

  // Ramp in from the shoreline so nothing lifts off the water line.
  const shoreGate = smooth((dist - SHORE_FLAT) / SHORE_RAMP);
  if (shoreGate <= 0) return 0;

  let h = 0;
  for (const m of MOUNDS) {
    const dx = wx - m.x;
    const dz = wz - m.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d >= m.radius) continue;
    // cosine bell -- flat top, zero slope at the rim, no creases
    const t = d / m.radius;
    h += m.height * 0.5 * (1 + Math.cos(Math.PI * t));
  }

  // Gentle long-wavelength roll so the outfield is not a billiard table.
  h += 0.18 * Math.sin(wx * 0.045) * Math.cos(wz * 0.038);

  // Fade to flat before the detail grid ends, so the coarse outer skirt
  // (which is flat by construction) joins it with no step.
  const far = Math.max(Math.abs(wx), Math.abs(wz));
  const outerGate = smooth((GRID_FADE_END - far) / 6);

  return h * shoreGate * outerGate;
}
