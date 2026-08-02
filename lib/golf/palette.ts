// Scene palette -- single source of truth for every material colour.
//
// Session 1 (2026-08-01). Rule: no component hardcodes a hex. Import from
// here so a grade change is one edit, and so generated GLB props can be
// clamped into the same space on load (Session 3's material override).
//
// Deliberately more than three tokens: a 3-colour scheme (turf/water/sky)
// collapses sand, asphalt, timber and structure into mud. The turf RAMP is
// the important part -- mown surfaces read by relative lightness, not hue.

export const PALETTE = {
  // --- Turf ramp, dark -> light. Mowing height drives the step. ---
  turfRough:    "#2c5c31", // surrounding rough, darkest
  turfFairway:  "#3f7d44", // tee decks, fairway cuts
  turfApproach: "#4a8f4e", // approach / fringe collar
  turfGreen:    "#54a058", // putting surface, lightest

  // --- Water ---
  waterDeep:    "#123f54", // reflector base
  waterShallow: "#1b5570", // shoreline shelf
  waterRipple:  "#124256", // ripple overlay tint

  // --- Sky / atmosphere. fog MUST match the horizon or the terrain edge
  //     reads as a hard line against the background. ---
  sky:          "#e0a878",
  fog:          "#dba57e",

  // --- Hard surfaces ---
  sand:         "#e2d4a8",
  asphalt:      "#2c2c2e",
  asphaltEdge:  "#3a3a3c",
  timber:       "#6a5340", // bulkhead planks
  timberDark:   "#4a3a2c", // bulkhead shadow / waterline

  // --- Tournament dressing (props layer) ---
  structure:    "#1c2b4d", // TPC navy
  tarp:         "#f2f1ea", // white roof canvas
  trim:         "#e8e9ec",
  accent:       "#f2c744", // flag yellow

  // --- Shoreline planting (spectator side, per the 2026 refs) ---
  flowerRed:    "#a3313a",
  flowerRose:   "#b8474f",
  flowerCoral:  "#c2564a",
  bedMulch:     "#3a2c22",

  // --- Vegetation ---
  canopyDark:   "#1c3a24",
  canopyMid:    "#2c5433",
  canopyLight:  "#40704a",
  bark:         "#4a3a28",
} as const;

export type PaletteKey = keyof typeof PALETTE;

// Roughness floor for the whole scene. Golf turf, sand and timber are all
// fully diffuse; anything glossier than this reads as plastic under the
// HDRI. Water is the documented exception and sets its own.
export const ROUGHNESS = {
  turf:      0.95,
  green:     0.85, // tighter cut catches a little more sheen
  sand:      1.0,
  timber:    0.9,
  asphalt:   0.88,
  structure: 0.85,
  foliage:   1.0,
  water:     0.2, // exception -- reflective by design
} as const;
