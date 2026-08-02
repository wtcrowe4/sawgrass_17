// Shore treatment -- what the lake edge is made of, arc by arc.
//
// Derived 2026-08-02 from reference-photos/sawgrass-17-overhead.jpg and
// sawgrass-17-crowd.webp. The lake perimeter is NOT uniformly bulkheaded:
//   - spectator side  -> low flower bed at the water, grass bank above it
//   - around 16 green -> timber bulkhead
//   - everywhere else -> plain grass bank running into the water
// (The island green, the walkway and the tree island are separately and
// fully bulkheaded -- that is handled in Bulkhead.tsx and unaffected here.)
//
// Arcs are FRACTIONS of the outline loop so they survive any resampling of
// getLakeOutlinePoints(). Fractions were picked by finding the control points
// nearest each feature:
//   crowd behind green  -> idx 4-13    of 75
//   west stand row      -> idx 19-24
//   west rope line      -> idx 27-32   } spectator side = idx 4..34
//   16th green centre   -> idx 57-64   } bulkhead      = idx 52..66
// The 16th FAIRWAY runs north from its green along idx 64-74, and gets no
// bulkhead -- the wall stops at the green complex.

export type ShoreTreatment = "bulkhead" | "flowerbed" | "bank";

/** [start, end] as fraction of the loop, walking the outline in order. */
export const SHORE_ARCS: Record<"flowerbed" | "bulkhead", [number, number]> = {
  flowerbed: [0.05, 0.45],
  bulkhead: [0.69, 0.88],
};

/** How far below the water the grass bank's inner lip sits (wu).
 *  Kept TINY on purpose. At 0.10 the lip sat well under the water plane, and
 *  because the water polygon stops at the outline that left an uncovered strip
 *  of lit bank showing as a bright tan rim around the whole lake. Just under
 *  the surface, the water edge and the bank meet with nothing exposed. */
export const BANK_DROP = 0.02;
/** Width of the flower planting band, as offsets from the outline (wu). */
export const BED_NEAR = 0.45;
export const BED_FAR = 1.15;

function inArc(frac: number, [a, b]: [number, number]): boolean {
  return a <= b ? frac >= a && frac <= b : frac >= a || frac <= b;
}

export function shoreTreatmentAt(frac: number): ShoreTreatment {
  if (inArc(frac, SHORE_ARCS.bulkhead)) return "bulkhead";
  if (inArc(frac, SHORE_ARCS.flowerbed)) return "flowerbed";
  return "bank";
}

/** Smoothstep 0..1. */
function smooth(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

/** Shortest distance between two fractions on a unit loop. */
function loopDist(a: number, b: number): number {
  const d = Math.abs(a - b) % 1;
  return Math.min(d, 1 - d);
}

/**
 * 0 where the bank is held up by bulkhead, 1 where it slopes into the water.
 * Blended over `ramp` so the wall ends do not leave a step in the ground.
 */
export function bankFactor(frac: number, ramp = 0.012): number {
  const [a, b] = SHORE_ARCS.bulkhead;
  if (inArc(frac, [a, b])) {
    const edge = Math.min(loopDist(frac, a), loopDist(frac, b));
    return 1 - smooth(edge / ramp);
  }
  const edge = Math.min(loopDist(frac, a), loopDist(frac, b));
  return smooth(edge / ramp);
}
