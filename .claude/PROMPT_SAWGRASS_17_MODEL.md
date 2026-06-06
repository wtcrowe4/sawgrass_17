# Prompt — Sawgrass 17 R3F Model (standalone session)

Copy everything below the line into a fresh chat.

---

I'm building a standalone, production-quality 3D model of **TPC Sawgrass — Stadium Course, hole 17 (the island green)** as a React Three Fiber component. It will eventually be dropped back into my Next.js portfolio at `D:\thomascrowe`, but for this session we work in an isolated repo so we can iterate on the model itself without the rest of the site getting in the way.

## Stack (non-negotiable, latest stable as of May 2026)
- Next.js 16 (App Router, Turbopack) — purely as a thin host for the canvas
- React 19
- TypeScript strict
- `@react-three/fiber@^9.6.0`
- `@react-three/drei@^10.7.7`
- `three@^0.170.0` with `transpilePackages: ["three"]` in `next.config.ts`
- Tailwind v4 (CSS-first, `@theme` block in `globals.css`)
- No physics engine, no postprocessing in v1 (we'll add `@react-three/postprocessing` later for bloom/DOF)

## Goal
A reusable component `<Sawgrass17 shots={...} pin={...} />` that renders a **broadcast-quality** stylized 3D model of the hole, suitable for the signature piece on a personal portfolio. Camera-orbital, hover-interactive shot tracers, dark-on-dark aesthetic with an orange accent (hex `#fb923c`).

This is **v1** — stylized geometry, not photoreal. The deliberate v2 path is replacing the hole geometry with a Gaussian splat capture (Spark renderer); design v1 so that swap is one component boundary later.

## Reference geometry (real-world, stylized)
- Par 3, **137 yds** Sunday tee (use this for primary tee marker; mention in code)
- Green: roughly **26 yds wide × 28 yds deep**, kidney-ish, peninsula on the left side, infamous "tongue" front-right pin
- Green sits on a **stone/rock retaining wall** that drops straight into water on all sides except the back-left walkway
- **Walkway** approaches from the front-left of the green (built up causeway with stone edges), narrow, curves slightly
- **Stone bulkhead** ~1–2 ft above water all the way around the green perimeter
- Surrounding **water hazard** is irregular (lake, not a moat) — extends well beyond the green in every direction
- **Tee box**: small island-style tee, ~30 ft wide, behind a small rough strip
- **Bunkers**: one front-right pot bunker on the green; small bunker short-right of the walkway
- Coordinates for reference imagery: **30.1989° N, 81.3953° W**

## Coordinate system (must match existing portfolio component)
- Origin = **front-center of green**
- `+x` = right (looking from tee toward green)
- `+y` (in data) = toward back of green
- World units: **1 yard = 0.3 R3F units** (constant `Y2W = 0.3`)
- Tee at world `(0, 0.4, -137 * Y2W)`; landing zones near `(±13, 0, +14)` in yards

## Data contract (already in the portfolio repo — keep schema identical)

```ts
export type ShotOutcome = "birdie" | "par" | "bogey" | "double+" | "water";

export interface Shot {
  id: string;
  player: string;
  year: number;
  pin: "sunday" | "thursday" | "friday" | "saturday";
  landing: { x: number; y: number };  // yards, from green-front-center
  tee: { x: number; y: number };
  outcome: ShotOutcome;
  carryYds: number;
  club: string;
}

export interface HoleData {
  holeId: string; course: string; holeNumber: number; par: number;
  yardage: number; greenWidthYds: number; greenDepthYds: number;
  shots: Shot[];
  fieldStrokesGained: { offTheTee: number; approach: number; aroundGreen: number; putting: number; total: number };
}
```

Outcome → color map (lock these):
- birdie `#10b981` · par `#a3a3a3` · bogey `#fbbf24` · double+ `#ef4444` · water `#3b82f6`

## What to build (this session)

1. **Repo scaffold**: minimal Next.js 16 + R3F app with one page that renders the model full-viewport
2. **`<Sawgrass17>`** component — the actual hole model:
   - Custom `ShapeGeometry` for the kidney green (perturbed ellipse), with a real **fringe ring** (slightly wider, darker green)
   - **Stone bulkhead** ring around the green — extruded geometry, light-gray with subtle normal map noise
   - **Causeway / walkway** as an extruded path from front-left tee side to the green, with stone edge geometry
   - **Water plane** with a custom shader (procedural ripple normal map + slight specular reflection of pin color); Drei's `MeshReflectorMaterial` is acceptable for v1 if perf holds
   - **Tee box**: small slightly-raised platform with stone edge, tee markers (orange + white spheres)
   - **Pin** with flag, flag tints to current pin color; pin position changes per `pin` prop
   - **Front-right pot bunker** + **short-right bunker** as ShapeGeometry depressions (use a faintly displaced plane, no hole geometry needed)
   - **Trees / grandstand silhouettes** in the background as low-poly shapes, blurred via fog — sells the broadcast feel cheaply
3. **`<Tracers>`** subcomponent — animated parabolic arcs from `tee` → `landing`, ball that travels the arc, persistent dot at landing point, hover for shot details (callback prop). Animation: stagger by index, ~1.6s per tracer
4. **Camera**:
   - Default broadcast angle: high behind tee (camera at world `[0, 22, -38]`, fov 42, target `[0, 0, -5]`)
   - `OrbitControls` with damping, polar clamped, no panning, distance `[15, 90]`
   - Optional: cinematic intro sweep (3s ease) on first mount; configurable via prop
5. **Lighting**: warm key light upper-right, cool cyan rim from back-left, ambient ~0.5, fog at 40-110 (matches dark broadcast night-tournament look)
6. **Performance budget**: hit 60 fps on a 2021 MacBook Pro M1 at 1440p, dpr capped at `[1, 2]`

## Aesthetic direction
- Dark mode, near-black background
- Orange accent `#fb923c` for pin flag and brand highlights
- Cyan rim light `#22d3ee` for subtle separation
- Slight film fog to hide LOD transitions in the background
- Think **PGA Tour LIVE / NBC Stinger** broadcast graphic, not a video game

## Deliverables (for me to drop into the main repo later)
- `components/golf/Sawgrass17.tsx` — the model + canvas wrapper, accepts `{ shots, pin, onHoverShot, intro }`
- `components/golf/parts/` — Green, Bulkhead, Causeway, Water, TeeBox, Pin, Tracers, Background subcomponents
- `lib/golf/types.ts` — exact schema above
- `lib/golf/geometry.ts` — pure functions: `makeGreenShape()`, `makeCausewayShape()`, `parabolaPoints(tee, landing, apexFactor)`
- A `app/page.tsx` that renders one `<Sawgrass17>` full-viewport with a sample shot dataset (write `data/sample-shots.ts` with ~20 shots across all 4 pins)
- README with `npm run dev` + screenshots once running

## Constraints
- **No external 3D assets** in v1 (no GLTF, no FBX) — everything is procedural Three.js geometry. Future-Thomas wants the file to "just work" without asset hosting concerns
- **No CDN dependencies for HDRIs** — if you need an environment, use drei's built-in presets only
- **Mobile-friendly**: must render and stay interactive at 380px wide (camera should be tighter on small screens)
- **All units, distances, and yard conversions must be commented** so I can reason about real-world scale later
- TypeScript strict — no `any`, no `// @ts-ignore` unless absolutely necessary (R3F `<line>` JSX clash is the one known case; use `new THREE.Line()` + `<primitive object={...} />` instead)
- Tailwind v4 only for HUD/UI overlays, never for canvas styling

## Research before you write code
Verify the latest stable versions of `next`, `react`, `@react-three/fiber`, `@react-three/drei`, and `three` and pin them in `package.json`. If any newer major has shipped since this prompt was written, use it and note the change. Also confirm `MeshReflectorMaterial` is still in drei 10.x and is the right pick for the water — if a better water material has landed (e.g. Threlte-style or a new drei addition), surface the option.

## Out of scope (later sessions)
- Gaussian splat replacement of hole geometry (v2)
- Google Maps Photorealistic 3D Tiles base layer (v2)
- DataGolf API live data (handled in main repo)
- The 2D overhead heatmap and stats panel (already exist in main repo)
- "Play" page / AI caddie

## Working style
Caveman mode. Lead with the answer. No filler, no pleasantries, no "great question." If you can say it in 5 words, use 5. Code comments stay normal. Verify versions and APIs against current docs before committing — don't guess. Ask me before making a stack-level deviation; otherwise just build.

Start by confirming the latest versions, scaffolding the repo, then go straight at the green geometry — that's the make-or-break of the whole piece.
