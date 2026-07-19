# Sawgrass 17 — R3F 3D Model

Standalone Next.js 16 + React Three Fiber repo for TPC Sawgrass hole 17 (island green). Eventual drop-in to `D:\thomascrowe` portfolio. Work here in isolation until geometry is production-ready.

## Stack

| Package | Version | Notes |
|---------|---------|-------|
| Next.js | 16 (Turbopack) | `next dev --turbopack` |
| React | 19 | |
| TypeScript | 5.8 strict | `noEmit` typecheck only |
| @react-three/fiber | ^9.6.1 | |
| @react-three/drei | ^10.7.7 | |
| three | ^0.184.0 | |
| Tailwind | v4 (CSS-first) | `@theme` in globals.css, HUD only |

## Commands

```bash
npm run dev        # Turbopack dev server, localhost:3000
npm run typecheck  # tsc --noEmit (run after every change)
npm run build      # production build
```

**Always run typecheck before declaring work done.** Zero errors is the bar.

## Project structure

```
app/
  page.tsx              # RSC host, renders Sawgrass17Client
  globals.css           # Tailwind v4 @theme block
components/golf/
  Sawgrass17.tsx        # Canvas + Scene + lighting + OrbitControls
  Sawgrass17Client.tsx  # "use client" HUD: pin selector, legend
  parts/
    Background.tsx      # Tree silhouettes (grandstands removed, pending)
    Bulkhead.tsx        # Stone retaining wall around green
    Bunkers.tsx         # Two sand bunkers
    Causeway.tsx        # Wooden walkway to green
    Green.tsx           # Putting surface + fringe ring
    Pin.tsx             # Flagstick + animated flag
    TeeBox.tsx          # Tee platform with markers
    Terrain.tsx         # Grass ground plane with lake hole punched out
    Tracers.tsx         # Animated shot arcs + landing dots + tooltips
    Water.tsx           # Lake mesh with MeshReflectorMaterial + ripple
data/
  sample-shots.ts       # 20 sample shots across 4 pin positions
lib/golf/
  geometry.ts           # Pure shape functions + constants
  types.ts              # Shot, HoleData, ShotOutcome, Y2W=0.3
reference-photos/       # Aerial reference images of the real hole
```

## Coordinate system

**Critical — get this wrong and everything is mirrored/flipped.**

### Shape space (geometry.ts input)
- `x` = lateral: `+x` = right when standing at tee looking toward green
- `y` = depth: `+y` = toward back of green, `y=0` = front edge center
- Units: **yards**

### World space (Three.js scene)
After `rotateX(-Math.PI / 2)` (applied to all ShapeGeometry):
- `shape.x` -> `world.x` (unchanged)
- `shape.y` -> `world.-z` (positive depth = more negative z)

| Location | World coords |
|----------|-------------|
| Green front-center (origin) | (0, 0, 0) |
| Green back | z = -7.8 wu |
| Tee box | z = -41.1 wu |
| Camera (default) | (0, 22, -38) |
| Camera target | (0, 0, -5) |

**Scale:** `Y2W = 0.3` — one yard = 0.3 world units.

### Camera x-axis flip
The camera at `(0, 22, -38)` looking at `(0, 0, -5)` has its local x-axis pointing in the **world -x direction**. Result: world `+x` appears on the **left** of the screen, world `-x` on the **right**.

Practical consequence: the causeway is placed at `+x` in world space (shape space x=+13..+48) so it appears on the **screen-left** side, matching real broadcast footage where the walkway is on the left.

When placing new geometry, think in **screen space** (what the camera sees), not map north/east.

## Key constants (lib/golf/types.ts)

```ts
Y2W = 0.3          // yards to world units
GREEN_Y = 0.05     // green surface elevation (wu)
WATER_Y = -0.02    // water surface elevation (wu)
TERRAIN_Y = 0.01   // surrounding grass elevation (wu)
TEE_Z = -41.1      // tee world z (wu) = -137 * Y2W
```

## Geometry functions (lib/golf/geometry.ts)

| Function | Returns | Description |
|----------|---------|-------------|
| `makeGreenShape()` | THREE.Shape | 18-pt polygon, SplineCurve smoothed |
| `makeFringeShape()` | THREE.Shape | 18-inch outward offset from green |
| `makeCausewayShape()` | THREE.Shape | 4-yd wide spine, runs east (+x) to bank |
| `makeLakeShape()` | THREE.Shape | 15-pt lake polygon, 128-pt spline |
| `makeTerrainShape()` | THREE.Shape | 60wu square with lake hole (CW winding) |
| `parabolaPoints()` | THREE.Vector3[] | Shot arc, yards -> world units |
| `PIN_POSITIONS` | Record | sunday/thursday/friday/saturday in wu |

## Critical file hygiene rules

These cause silent build failures — do not skip:

1. **No Unicode in JSX/TSX files.** Em-dashes (`—`), box-drawing chars (`─`), degree symbols (`°`) all break Turbopack's SWC parser with `TS17008: JSX element has no corresponding closing tag`. Use `--` in comments.

2. **No null bytes.** The Write tool has historically injected `\x00` bytes. Use bash `cat > file << 'ENDOFFILE'` heredocs for any file > ~30 lines.

3. **Verify file isn't truncated after writing.** Run `wc -l` and `tail -5` to confirm. The append (`cat >>`) pattern has been needed when edits cut off closing braces.

4. **After any geometry.ts edit, check the file ends with `}`** — the file has been truncated mid-function multiple times.

5. **Clear `.next` cache when Turbopack reports errors at line numbers that don't exist** in the current file. `rm -rf .next` then restart `npm run dev`.

## TypeScript rules

- Strict mode, `noEmit` only
- No `any`, no `@ts-ignore` (one exception: R3F JSX `<line>` clash — use `new THREE.Line() + <primitive>`)
- Explicit types on `forEach` callbacks: `(p: THREE.Vector2) => ...`
- `THREE.ExtrudeGeometryOptions` for extrude settings object

## R3F patterns

```tsx
// Correct: Line geometry (avoids JSX <line> clash with HTML)
const geo = new THREE.BufferGeometry().setFromPoints(pts);
const mat = new THREE.LineBasicMaterial({ color });
const line = new THREE.Line(geo, mat);
<primitive object={line} />

// Animation without GC churn: drawRange, not geometry recreation
arcGeo.setDrawRange(0, count); // in useFrame, not useMemo

// Geometry created once
const geo = useMemo(() => { ... }, []); // empty deps = truly once
```

## Satellite overlay calibration (2026-05-11)

GPS anchor: `30.194823320989965, -81.3908035333445` (hole 17 green center, verified via Google Maps pin)
Overlay rotation: **-26 deg world-Y** aligns real tee box bearing with shot arc origins.
Default `satRot` in `Sawgrass17Client.tsx` is hardcoded to -26. ROT input in HUD allows live fine-tuning.

Zoom=18, size=640x640, scale=2 -> 108.6 wu coverage. Proxy at `/api/satellite` caches 24h.

East-west mirror: scene geometry is E-W mirrored vs real geography (causeway at world +X = screen left).
Texture is U-flipped (`tex.repeat.set(-1,1)`) to match. North-up image maps correctly after plane -PI/2 X rotation.
Parent group handles world-Y spin; child mesh does the -PI/2 X flip (keeps rotation axis correct).

## Current state (as of 2026-07-19)

**Done:**
- All geometry satellite-traced (green, lake, approach, causeway, cart path, tree island)
- Real 2025 ShotLink data: 431 tee shots + real per-round pins (`data/real-shots-2025.ts`,
  regenerate: `scripts/fetch-shots.sh R2025011` then `scripts/transform_shots.py`)
- Tournament build-out from Getty refs (local-only in `reference-photos/tournament/`):
  navy/white grandstands + east stadium wall, videoboard w/ leaderboard behind green,
  hospitality tents, ~400 instanced spectators (muted palette), tree island lone oak
  w/ yellow bloom ring; 16th green complex + fairway on the far shore (Hole16.tsx)
- Plank-textured wood bulkhead, pine/oak instanced treeline, golden hour lighting
- Tracers: real data, arcs fade to faint traces after landing, hover restores
- Flag always tournament yellow (real 17 flag); PIN_COLORS = HUD swatches only
- `scripts/snap.sh <out.png> [url] [waitMs]` -- GPU screenshots via Windows Chrome CDP.
  NEVER launch WSL-side chromium against this scene (SwiftShader pins 8 cores)

**Pending:**
- Terrain elevation (spectator mounds; USGS 3DEP 1m DEM candidate)
- Gaussian splat capture (pipeline researched; needs source video pick)
- Stands could be bigger/more continuous vs getty 1248046004
- Water darker at golden hour; lighting fine-tune

## Reference photos

`reference-photos/` contains 7 aerial/overhead images. image2.jpg and image6.jpg (PGA Tour overhead diagram) are most useful for geometry. image1.jpg and image7.jpg best for overall lake shape and grandstand placement.

## Shot data schema

```ts
interface Shot {
  id: string;
  player: string;
  year: number;
  pin: "sunday" | "thursday" | "friday" | "saturday";
  landing: { x: number; y: number }; // yards from green-front-center
  tee:     { x: number; y: number }; // yards (tee.y is negative)
  outcome: "birdie" | "par" | "bogey" | "double+" | "water";
  carryYds: number;
  club: string;
}
```

Outcome colors locked: birdie `#10b981` · par `#a3a3a3` · bogey `#fbbf24` · double+ `#ef4444` · water `#3b82f6`

## Working style

Caveman mode. Lead with answer. No filler. Run typecheck after every change. Use heredocs for file writes. Check for truncation. No unicode in TSX.

## Multi-agent workflow

Multiple Claude Code agents can work on this repo in parallel. See `.claude/AGENTS.md` for full details.

**TL;DR:**
- Use `claude --worktree` to get an isolated branch per session (safest)
- Without worktree: check AGENTS.md component ownership table before editing any file
- geometry.ts and Sawgrass17.tsx are the two highest-conflict files -- one agent at a time
- Always typecheck before declaring done
