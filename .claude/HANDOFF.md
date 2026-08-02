# Sawgrass 17 -- Session Handoff

**Written 2026-08-02.** Supersedes the deleted HANDOFF_GEOMETRY.md, which had
gone stale enough to be actively misleading.

Rule that keeps biting: **when this doc and the code disagree, the code wins.**
Check `components/golf/Sawgrass17.tsx` imports for what is actually mounted.

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

Dev server: `PORT=3001 npm run dev`. **Port 3000 is deliberately left free** for
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

## Open decisions / next steps

1. **Terrain material.** The grid now carries world-space UVs, which is what was
   blocking a tiling turf albedo + normal. This is the highest-value remaining
   realism step and it is unblocked. `ShapeGeometry` UVs never worked for this.
2. **Elevation source.** Synthetic mounds are in and look right. The user wanted
   to see them before committing to real DEM work. Decision still open; see the
   flatten-corridor constraint above.
3. **Higgsfield props.** The plan is to generate props (grandstand, spectators,
   flag, trees) rather than model them. `Prop` component + palette-clamping
   material override are NOT built yet. Draco decoder must be vendored to
   `public/draco/` -- drei defaults to a CDN, and a CDN fetch already broke the
   scene once this project (hence `public/hdr/venice_sunset_1k.hdr`).
4. **Postprocessing** is installed and wired but off. `EffectComposer` takes over
   the render target and breaks `MeshReflectorMaterial`, flattening the lake to
   grey. Revisit if water moves to a custom shader. `POST_FX` in the client.

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
