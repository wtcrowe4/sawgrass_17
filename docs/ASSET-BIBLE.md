# Sawgrass 17 -- Asset Bible

Compiled 2026-11-18 from a one-by-one study of all 7 images in
`reference-photos/`. Goal: photo-realistic, SPECIFIC to this hole -- no
generic trees, no copy-pasted grandstands. Every entry: what it really is,
where it appears in which image, how the scene builds it today, the gap,
and the build plan (procedural / hand-modelled / CC0 asset / AI-generated).

Image key (what each photo gives us):

| Image | View | Season/light | Best for |
|---|---|---|---|
| image1 | Low aerial from behind-right of green | Summer, sunny midday | Hospitality "black box", azalea banks, water colour, treeline mix |
| image2 | Ground level behind green toward tee | March (PLAYERS), overcast | Grandstand scaffold+wrap, winter turf contrast, steel-grey water, bare deciduous |
| image3 | High overhead of whole complex | Spring, sunny | Tent/cabin ring layout, cart paths, tree island, mound shapes |
| image4 | From championship tee, player's view | Spring, sunny | Tee props (17 sign, Rolex clock, ball washer), leaning pine, navy structure, palms |
| image5 | Two satellite crops (summer) | Summer | Geometry ground truth, path colour, bald cypress island |
| image6 | PGA tourcast 3D render | n/a | NOT a realism ref -- tracer/overhead style only |
| image7 | Classic morning aerial from tee side | Early morning, warm | Hero lighting target, water reflections of structures, overall grade |

---

## 1. Vegetation

### 1a. Slash/loblolly pines (canopy emergents)
- **Refs:** image4 (hero: one tall pine LEANING ~8 deg left-of-center behind
  tee, sparse umbrella crown, bare trunk for 70% of height); image1/7
  (pine crowns poke above the oak line all around the horizon); image2
  (winter: crowns unchanged, pines are evergreen).
- **Real thing:** Pinus elliottii/taeda, 20-30 m, thin red-brown plated
  trunks, foliage only in irregular umbrella clusters at the top. Never
  cone-shaped.
- **Today:** Treeline.tsx draws 80 CONES -- the single most "generic" tell
  in the scene. Trees.tsx (props) similar primitives.
- **Gap:** no trunks, wrong silhouette, no lean, no sparseness.
- **Plan:** procedural archetype in a new `lib/golf/flora.ts`: instanced
  trunk cylinders (slight bend + lean param) + 3-6 instanced foliage
  "cloud" ellipsoids per crown, dark blue-green, placed only at the top.
  3 variants x mirrored = 6 silhouettes. Hero leaning pine behind tee
  placed to match image4. NO AI needed.

### 1b. Live oaks / mixed hardwood wall (the horizon mass)
- **Refs:** image1/3/7 -- the continuous 15-20 m dark-green wall behind
  everything; lumpy overlapping crowns, no gaps to sky below ~15 m.
- **Today:** Treeline.tsx 260 crown spheres -- right idea, too smooth and
  too uniform in colour; reads as bubbles up close.
- **Gap:** crown texture (lumpy sub-clusters), colour variation per tree
  (yellow-green to near-black), undergrowth filling to the ground.
- **Plan:** procedural: per-tree = 4-9 overlapping instanced ellipsoids
  with vertex-noise displacement, two-tone colour ramp per cluster, plus a
  low dark "hedge" band closing the bottom. Keep instancing (one mesh per
  species part).

### 1c. Sabal (cabbage) palms
- **Refs:** image4 right edge (cluster of 3-4 by the tee, fan fronds,
  curved grey trunks); image1 (scattered singles against pines).
- **Today:** none anywhere.
- **Gap:** whole species missing -- palms are what says "Florida".
- **Plan:** procedural first pass: bent cylinder trunk + 10-14 instanced
  fan-blade planes (alpha-cut texture) per head. If Higgsfield lands:
  generate_3d one hero palm, decimate to <=4k tris, instance 3 rotations.
  CC0 alternative: Poly Haven has palm models (check licence, log in
  CREDITS.md).

### 1d. Bald cypress on the tree island
- **Refs:** image5-right and image3: the small island east of the green
  carries ONE broad conical cypress with rusty/red-brown foliage (fall) or
  deep green (summer); image7 shows it as a neat green cone-ish dome.
- **Today:** TreeIsland.tsx has a placeholder tree behind the props toggle.
- **Gap:** this is a signature landmark visible in every aerial -- must be
  an individual, not a generic blob.
- **Plan:** hand-modelled/procedural hybrid: layered horizontal foliage
  discs (cypress habit) over a flared fluted trunk; seasonal colour
  uniform (green default, rust optional). Hero asset candidate for
  Higgsfield generate_3d if subscription happens.

### 1e. Winter-bare deciduous (optional season pack)
- **Refs:** image2 -- grey leafless crowns mixed into the line.
- **Plan:** SKIP for v1 (scene is golden-hour spring). Note for a future
  "March PLAYERS" lighting preset only.

## 2. Turf

### 2a. Putting surface + collar
- **Refs:** image1/7 (uniform bright TifEagle, subtle checker from
  mowing); image2 (overseeded vivid green vs everything dormant).
- **Today:** turf.ts procedural stripes + mottle; green contours done
  (greenReliefAt).
- **Gap:** stripe contrast slightly too strong up close; collar ring
  colour step too hard.
- **Plan:** procedural tune only: widen collar blend, reduce stripe
  contrast at grazing angles (already have fwidth techniques from water).

### 2b. Fairway/walkway + tee decks
- **Refs:** image1 left strip (bold light/dark mowing bands ~4 yd),
  image4 (tee deck nearly turquoise-green, tight cut).
- **Today:** flat palette colours + stripes on some surfaces.
- **Gap:** walkway reads flat; tee decks lack the manicured saturation.
- **Plan:** procedural: reuse turf stripes with per-surface angle + scale
  from shore.ts data; small saturation lift on tees.

### 2c. Rough / spectator mounds
- **Refs:** image1/3: medium bermuda green with wear paths; image2 winter
  tan (skip).
- **Today:** turfRough flat + mounds from elevation.ts.
- **Gap:** no wear, no texture at distance.
- **Plan:** CC0 tiling grass albedo+normal (ambientCG / Poly Haven,
  CC0 -- log in public/textures/CREDITS.md) on the existing world-space
  terrain UVs. 2k tiling, <=8 MB.

## 3. Water

- **Refs:** image1/3/5 summer: DARK OLIVE-BLACK, mirror-calm, strong tree
  reflections, almost no blue. image2: steel blue-grey (overcast sky
  reflection). image4: mid blue. image7 morning: warm grey-green with
  crisp white structure reflections.
- **Today:** reflector + depth ramp + GPU ripple/caustics; base waterDeep
  #123f54 (teal-blue).
- **Gap:** our lake is too BLUE and too light for the golden-hour look;
  the refs say water colour = mostly reflection, very dark base.
- **Plan:** procedural grade: darken base toward #0d2126 olive-dark, raise
  reflection weight near grazing, keep depth ramp at banks. The treeline
  and future structures ARE the reflection content -- water realism
  compounds every other asset. One palette + shader-constant pass.

## 4. Bulkhead (island, tee banks, 16th arc)

- **Refs:** image1/2/7 close looks: VERTICAL rough-sawn timber planks,
  stained dark brown to near-black, grey weathering and a lighter dry band
  just above waterline, slight per-plank height jitter at the cap.
- **Today:** quad-strip walls + Nano Banana albedo tile + derived normal
  + timberTint multiply. Good base.
- **Gap:** too red/orange in sun (see 11-10 screenshots); cap edge is
  perfectly straight; no per-plank value variation at distance.
- **Plan:** procedural + texture tune: darken timberTint toward #6e5c4c,
  add low-frequency value variation via vertex colour per arc-length,
  jitter cap strip height +-1 cm. Optional Higgsfield/ComfyUI re-bake of
  the tile with more grey weathering -- log source in CREDITS.md.

## 5. Sand

### 5a. Island pot bunker
- **Refs:** image1/3/7: SMALL kidney pot front-right, bright white-cream
  tour sand (near #e8e0c8 in sun), sharp dark shadow under a steep grass
  lip, concentric rake lines faint.
- **Today:** radial-gradient canvas texture, too yellow-tan, no lip.
- **Gap:** colour, lip shadow, rake detail.
- **Plan:** procedural: whiter sand ramp, ring of darker lip geometry
  (small extruded collar following the outline), subtle procedural rake
  rings in the shader. ComfyUI/Higgsfield normal map optional later.

### 5b. Waste/dirt patches
- **Refs:** image5-right tan patch NE of the island (maintenance/waste
  area).
- **Plan:** SKIP -- outside the playable camera frame.

## 6. Built structures (tournament dressing)

### 6a. The "black box" hospitality (behind 16 green / left of 17)
- **Refs:** image1 LEFT: large matte-BLACK angular two-storey structure
  with flat roof planes; image7 shows its white-roofed siblings.
- **Today:** Grandstands.tsx generic navy boxes (props toggle).
- **Gap:** signature structure missing; everything else is white or navy.
- **Plan:** hand-modelled low-poly (boxes + roof planes + railing strips),
  matte black, <=8k tris. Position from image1/3.

### 6b. White hospitality cabins / tent ring
- **Refs:** image3: ~15 white rectangular cabins with peaked white roofs
  ringing the lake W/S/E; image2: two BIG white-wrapped scaffold stands
  flanking the tee view; image7: long white pavilion row along the far
  bank.
- **Today:** nothing (props toggle has stands only).
- **Plan:** ONE modular kit, instanced with variation: frame box, peaked
  or flat roof, open front; scale/rotation/roof-type per instance from a
  placement table keyed to image3. Procedural, <=2k tris per module.

### 6c. Grandstand + scaffold wrap
- **Refs:** image2 (scaffold legs visible, white fabric wrap, navy skirt,
  TPC logos), image4 left (navy + white top).
- **Today:** Grandstands.tsx primitive risers.
- **Plan:** procedural upgrade: visible scaffold frame (instanced tubes),
  white wrap plane with subtle banner texture (AI-generated texture OK --
  generic branding only, log it), navy skirt. Seated crowd colour noise
  from existing Crowd.tsx.

### 6d. Tee-box props (player's-view charm)
- **Refs:** image4: black "17" tee sign (white number, yardage plate),
  green Rolex clock on post, dark-green ball washer, rope-and-stake
  gallery line.
- **Today:** none.
- **Plan:** hand-modelled primitives + baked text textures (canvas-drawn,
  no fonts shipped). "Rolex" replaced by a neutral clock face unless
  Thomas decides otherwise (trademark). <=3k tris total.

### 6e. Camera/TV towers
- **Refs:** image1 small white tower right of green; image2 center tower
  behind tee.
- **Plan:** simple scaffold tower from the 6c tube kit. LOW priority.

## 7. Paths and edges

- **Refs:** image3/5: cart paths pale warm concrete with joint lines, NOT
  asphalt-black; image4 foreground: tee surround mulch + rope line.
- **Today:** CartPath.tsx dark asphalt colour -- WRONG per refs.
- **Plan:** palette swap to warm concrete + procedural joint lines on
  existing UVs; keep edges soft via existing asphaltEdge ring.
- **Rock/railroad-tie edging:** close study of image1/4/7 shows the water
  edge on the SPECTATOR side is turf-to-water bank + azalea bed, with
  timber bulkhead only on island/tee/16 arcs -- which is what shore.ts
  already encodes. No rock riprap visible at this hole. CONFIRMED current
  shore model; no new asset.

## 8. Flower banks

- **Refs:** image1: coral-red azalea masses on the near bank behind-right
  of green; image7: lower, greener bank (azaleas not in bloom).
- **Today:** FlowerBed.tsx clumped per-vertex band (11-10 rework) along
  SHORE_ARCS.flowerbed.
- **Gap:** good at distance; up close it is a flat ribbon.
- **Plan:** procedural: add a second instanced "bloom puff" layer (small
  ellipsoids, same clump function) over the band. S effort, big close-up
  gain.

## 9. Sky and light

- **Refs:** image7 = the hero grade (warm low sun, long reflections);
  image1/4 = midday blue w/ scattered cumulus.
- **Today:** procedural gradient dome + venice sunset HDRI for IBL.
- **Gap:** no clouds; zenith a bit flat.
- **Plan:** keep golden hour as default. Add sparse cumulus via 6-10
  billboard cloud sprites (AI-generated cloud PNGs fine -- they are sky,
  not "photos of the hole"; log source) OR a CC0 golden-hour HDRI swap
  test. S effort.

## 10. Water-adjacent misc

- Mowed reflection strip, scoreboards, pin flag: flag already tournament
  yellow (matches image4 Rolex-green era flags vary; keep yellow). 
- Leaderboard right of green in image1: single white board, LOW priority,
  kit piece from 6b.

---

## Perf budget (laptop Intel Arc iGPU floor: 50 fps @ 1080p, embed 30 fps floor on mid phones)

| Class | Tris (total) | Textures (GPU) | Draw calls |
|---|---|---|---|
| Terrain + turf | 120k | 12 MB (2k tiling + detail) | 8 |
| Water | 5k | 0 (RT reflector 512) | 3 |
| Vegetation (all species, instanced) | 350k | 6 MB (frond/bark atlases) | <=12 (one per species part) |
| Bulkhead + paths + sand | 60k | 8 MB | 6 |
| Structures kit (stands, cabins, black box) | 180k | 10 MB | <=15 |
| Props (tee kit, towers, flags) | 40k | 4 MB | 10 |
| Tracers + replay | 30k | 0 | ~shots |
| **Total target** | **<=800k** | **<=40 MB** | **<=120 + tracers** |

Rules: everything instanced by archetype part; frustumCulled off only for
the treeline ring; no texture over 2k; KTX2/basis compression if we blow
40 MB; measure with the ?cam tower shot after every asset lands.

## Ranked build order (realism gain per effort)

1. **Vegetation overhaul** (1a-1d): pines-with-trunks + lumpy oak wall +
   palms + cypress island tree. The horizon and reflections touch every
   pixel. M-L, procedural, start now.
2. **Water grade to ref colour** (3): one palette/shader pass, compounds
   item 1 via reflections. S.
3. **Cart path to concrete + bulkhead tone** (7, 4): two small corrections
   that kill "video-game" tells. S.
4. **Bunker sand + lip** (5a). S-M.
5. **White cabin/tent modular kit + black box** (6a, 6b): fills every
   aerial's midground. M.
6. **Grandstand scaffold upgrade + tee props** (6c, 6d). M.
7. **Flower bloom puffs** (8) + **cloud sprites** (9). S each.
8. **Towers, leaderboard, season/lighting presets** (6e, 2c-extra). S,
   polish tier.

Higgsfield subscription call: NOT required for items 1-4 (all procedural/
CC0). It starts paying off at items 5-6 (hero cypress, palm, banner
textures, cloud sprites) -- recommend deciding after item 4 ships.
