# Sawgrass 17 -- Session Handoff

**Written 2026-08-02.** Supersedes the deleted HANDOFF_GEOMETRY.md, which had
gone stale enough to be actively misleading.

Rule that keeps biting: **when this doc and the code disagree, the code wins.**
Check `components/golf/Sawgrass17.tsx` imports for what is actually mounted.

---

## Realism tier 1 -- branch `feat/realism-tier1` (2026-11-01)

Unmerged, unpushed, awaiting review. All three tier-1 items are in.

| Commit | What |
|---|---|
| `e3acc5d` | `?cam=px,py,pz,tx,ty,tz` query param -- repeatable screenshot angles |
| `5d4221a` | Turf albedo/normal + mowing stripes (`lib/golf/turf.ts`) |
| `e6ca5ca` | Water depth ramp + fresnel (`Water.tsx`, `waterBank` token) |

- **Turf** -- `makeTurfMaterial()` in `lib/golf/turf.ts`. Samples by WORLD
  x/z (not mesh UVs), so terrain, island, tees, approach and tree island tile
  continuously across mesh boundaries. Albedo is divided by its measured mean
  (`MAP_MEAN`), so it adds blade detail only and `palette.ts` still sets every
  hue. Plus value-noise mottling. Assets: ambientCG Grass004 (CC0), 1K albedo
  + 512 normal = 274 KB, see `public/textures/CREDITS.md`.
- **Stripes** -- `STRIPES` in `turf.ts`: green 0.9 wu diagonal cross-cut
  checkerboard, tees 1.6 wu along the line of play, rough none. Widths are
  exaggerated vs real mower passes on purpose (sub-pixel from the tower).
- **Water** -- shore distance (lake edge + island green + tree island) baked
  once into a 192px R8 texture; ramp `waterBank -> waterShallow -> waterDeep`.
  Fresnel spliced into drei's reflector by WRAPPING its `onBeforeCompile`
  (overriding it would drop the reflection pass). Grazing = full mirror as
  before, overhead = 30% reflection so the ramp shows. Postprocessing still off.
  Ripple overlay opacity halved (0.28 -> 0.14) -- its flat tint hid the ramp.
- Crowd/Trees white-base exception untouched. Bulkhead, flower bed, cart path
  and sand unchanged.

**Screenshot tooling note:** against `next dev`, every capture after the first
lands on a blank canvas -- Turbopack sends `[Fast Refresh] rebuilding` on HMR
connect and virtual time skips past the first frame. Reliable path:
`npm run build && npx next start -p 3002`, then `scripts/snap.sh`. Blank
frames are ~16 KB; retry those.

### Left after tier 1
- Fairway: the scene has no fairway mesh -- `GrassApproach` is the walkway and
  is deliberately rough-coloured and unstriped. Stripes appear on tees + green.
- Bank rim reads slightly amber at very low camera angles (olive bank tint x
  warm sky reflection). Tune `waterBank` or the 0..1 wu ramp in `Water.tsx`.
- Tier 2/3 untouched (green contours, bunker sand, props, cart path texture).

### Known perf item -- `Water.tsx` CPU canvases
`useRippleTexture` (256^2) and `useCausticTexture` (512^2) rebuild their
canvases pixel by pixel in JS **every frame** (~330k texels, several trig calls
each) and re-upload both textures. That is almost certainly the scene's
biggest per-frame cost -- far more than the tier-1 shaders. Fix: move both to
a shader (time uniform) or at minimum throttle to ~15-20 Hz. Not touched in
tier 1.

---

## Where things stand

Working tree is clean, everything committed on `main`. Last commit `569bade`.

The session ran a cleanup/unification pass (the user's "Session 1") plus a
terrain elevation prototype and a shore rebuild. Scene currently renders with
**props OFF** -- that is deliberate, see below.

### Done this session

| Commit | What |
|---|---|
| `0514e75` | `snap.sh` rebuilt for NAT-mode WSL (see Tooling) |
| `c28981c` | PROPS toggle -- tournament dressing hidden, nothing deleted |
| `0a97b27` | `lib/golf/palette.ts` -- single source of truth for colour |
| `513f7a9` | One HDRI + one sun, matched by decoding the HDR |
| `ae75dd2` | Postprocessing wired but **defaulted off** (breaks water) |
| `5b2ee20` | Elevation prototype behind `heightAt()` |
| `7d906e7` | Terrain rebuilt: ring + uniform grid + skirt |
| `6bd238e` | Ring spikes killed; walkway bulkhead made visible |
| `4180ab1` | Traced lake cusps removed; turf colours unified |
| `80d1eda` | Water dropped ~2 ft; tree island walled |
| `3e33474` | Bulkhead: real plank texture, arc-length UVs |
| `203638f` | Flower bed + bulkhead limited to the 16th green |
| `569bade` | Offset relaxation; bank staircase cleared |

---

## Key architecture added

### `lib/golf/palette.ts`
Every material colour. 4-step turf ramp (`turfRough` -> `turfGreen`), water,
sky/fog, hard surfaces, dressing, vegetation, plus a `ROUGHNESS` table.
**Do not hardcode hexes in components.**

Exception that must be preserved: `Crowd.tsx` and `Trees.tsx` use **white base
materials** so per-instance `setColorAt` colours multiply correctly. A blanket
"force all materials through the palette" pass will turn them muddy.

### `lib/golf/elevation.ts`
`heightAt(x, z)` is the only elevation source. Currently synthetic mounds read
off the tournament aerials. **Swapping in USGS 3DEP means replacing the function
body -- no caller changes.**

Known constraint, and it is the expensive part of any real DEM: the cart path
and tee pads are **fixed-height flat meshes**. A mound reaching under one buries
it. Current mounds are placed outboard to dodge this. Real DEM data will need
explicit flatten corridors per playing surface.

### `lib/golf/shore.ts`
What the lake edge is made of, arc by arc, as **fractions of the outline loop**
(survives resampling). Shared by Terrain, Bulkhead and FlowerBed so they cannot
drift. Derived from `reference-photos/sawgrass-17-{overhead,crowd}`:
- spectator side -> flower bed + grass bank (`SHORE_ARCS.flowerbed`)
- around 16 green -> timber bulkhead (`SHORE_ARCS.bulkhead`)
- 16th fairway and the rest -> plain grass bank into the water

**This is the file to edit to move any shore boundary.**

### Terrain is three meshes
`RING` (exact lake outline, earcut-free quad strip) + `GRID` (uniform 0.7wu
lattice, displaced, carries world-space UVs) + `SKIRT` (flat, to +/-100).
The grid's uniform triangles are the whole point -- the earlier version
subdivided earcut output, whose slivers sheared under displacement.

---

## Tooling -- read before screenshotting

`scripts/snap.sh <out.png> [url] [budgetMs]`

Dev server: `PORT=3001 npm run dev` (other agents: 3002). **Port 3000 is deliberately left free** for
the user's other work.

**Mirrored WSL networking was disabled 2026-07-30** (`.wslconfig`: Tailscale +
Modern Standby resume caused `0x8007274c`). So WSL cannot reach Windows
localhost, and the Hyper-V firewall blocks binding CDP to the gateway IP.
snap.sh therefore uses **no socket**: Windows Chrome writes the PNG to
`C:\temp\claude-shots`, WSL reads it back via `/mnt/c`.

Landmines already handled in the script -- keep them if you edit it:
- `--headless=new` silently ignores `--screenshot`; use old `--headless`
- a shared `--user-data-dir` deadlocks; unique profile per run
- `--virtual-time-budget` never elapses against R3F's rAF loop; hard `timeout`
- Turbopack's "Compiling..." splash beats the capture; it pre-warms twice
- `?nointro=1` skips the cinematic sweep (virtual time never advances
  `useFrame` deltas, so the camera would freeze mid-flight)

**Never launch chromium inside WSL against this scene** -- SwiftShader, and the
frame loop pins ~8 cores until killed.

---

## Realism roadmap -- ordered by payoff per unit effort

Everything in the scene is currently **flat untextured colour**. That single
fact is the biggest gap between this and a broadcast frame, and it is why the
list starts where it does.

### Tier 1 -- do these first

1. **[DONE on feat/realism-tier1]** **Turf albedo + normal on the terrain grid.** UNBLOCKED as of this session:
   the grid carries world-space UVs (`UV_TILE = 6.0` wu per repeat).
   `ShapeGeometry` never gave usable UVs, which is why this waited. Biggest
   single visual win available.
2. **[DONE on feat/realism-tier1]** **Mowing stripes.** The strongest "this is a golf broadcast" cue there is,
   and it is nearly free -- a directional stripe factor in the shader or a
   second UV channel. Green gets a tight cross-cut, fairway/tee a wider stripe,
   rough none. Do it with (1); same material work.
3. **[DONE on feat/realism-tier1]** **Water depth gradient.** The lake is one flat blue. Real water shallows to
   olive/tan at the bank. Sample distance-to-shore (`lakeEdgeDistance` already
   exists) and blend `waterShallow` -> `waterDeep`. Also add fresnel so grazing
   angles go reflective and overhead goes transparent.

### Tier 2 -- clear wins, more work

4. **Green surface contours.** The real 17 green is tiered -- back-left shelf,
   front-right runoff into the bunker. Currently perfectly flat, which reads as
   a putting mat. Needs its own small height function; `heightAt` is terrain-only
   and forced to 0 over the island.
5. **Bunker sand.** Flat cream at the moment. Wants a sand normal map, a darker
   lip, and rake lines. Small mesh, high per-pixel payoff on close shots.
6. **Higgsfield prop pipeline.** `Prop` component (useGLTF + Draco + shadow
   flags) and the palette-clamping material override. Generated props must be
   forced into the scene palette or they read as pasted-in stickers.
   **Vendor the Draco decoder to `public/draco/`** -- drei defaults to a CDN and
   a CDN fetch has already broken this scene once (hence the local HDR).

### Tier 3 -- polish / open questions

7. **Elevation source.** Synthetic mounds are in and look right. Real USGS 3DEP
   is the accurate path, but the cost is not sampling -- it is that the cart
   path and tee pads are fixed-height flat meshes and need explicit flatten
   corridors. Decide only if the mounds start looking wrong.
8. **Cart path + walkway texture.** Asphalt is flat grey; the walkway is flat
   green. Both would take the same world-space UV treatment as the turf.
9. **Postprocessing.** Installed, wired, off. `EffectComposer` breaks
   `MeshReflectorMaterial` and flattens the lake to grey. Revisit only after (3)
   -- if water moves to a custom shader the conflict likely disappears, and then
   SMAA + subtle bloom become free.

### Deliberately NOT next

- More prop placement tuning. The stands/crowds are behind the PROPS toggle and
  are placeholder geometry until the Higgsfield pipeline lands; refining their
  positions now is work that gets thrown away.
- Hole16 precision. Same reason -- it is approximate by the user's own account
  and inside the toggle.

## Known cosmetic issues

- Small bulkhead fragments poke through the grass on the south-east shore where
  terrain elevation rises over the wall cap.
- Flower bed edge is slightly uneven where the outline curves tightly. Reads
  fine at tower distance.
- `Hole16.tsx` is admittedly approximate (user: "slapped on") and is inside the
  props toggle, so it is off by default.

## Unmounted but kept (fallbacks, not dead weight)

`Background`, `Bunkers`, `Causeway`, `TeeBox`, `WalkWay`, `DistanceMarkers`,
`Shoreline`. Nothing was deleted this session by explicit instruction.
`Shoreline` was unmounted because its tube drew at a fixed y and would hover
over the now-sloped bank.
