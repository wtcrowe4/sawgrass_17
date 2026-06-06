# TPC Sawgrass - Hole 17 (Island Green) - 3D Model

Broadcast-quality stylized 3D model of TPC Sawgrass Stadium Course, Hole 17.
Built with React Three Fiber as a standalone dev environment, designed to drop
into the main portfolio at `D:\thomascrowe`.

## Stack

| Package | Version | Notes |
|---|---|---|
| next | 16.2.4 | App Router, Turbopack |
| react | 19 | |
| @react-three/fiber | ^9.6.1 | R3F canvas renderer |
| @react-three/drei | ^10.7.7 | MeshReflectorMaterial, OrbitControls, Html |
| three | ^0.184.0 | Pinned higher than spec (was ^0.170.0) |
| tailwindcss | ^4.0.0 | CSS-first, @theme block in globals.css |

### Type resolution note

`@types/three@0.184.1` is a barrel-only package that re-exports from `three/src/`
files that don't exist at runtime. Workaround: `types/three/` contains
`@types/three@0.171.0` (last version with self-contained declarations).
`tsconfig.json` paths override redirects `"three"` there. Drop this once
three ships native `.d.ts` bundles.

`next` v16 ships `.d.ts` files inside `dist/` - if typecheck fails on `next`
imports after a fresh install, the ambient shim in `types/next.d.ts` covers
`NextConfig` and `Metadata`.

## Dev

```bash
npm install
npm run dev       # http://localhost:3000
npm run typecheck # tsc --noEmit
npm run build     # production build
```

## Coordinate system

```
Origin = front-center of green
+x     = right (looking from tee toward green)
+y     = up (elevation)
+z     = toward tee (negative = toward back of green)
Y2W    = 0.3  (1 yard = 0.3 R3F world units)

Tee:    world (0, 0, -137 * Y2W) = (0, 0, -41.1)
Green:  ~22.8 yds wide x 27.0 yds deep, centered on origin
```

## Component tree

```
<Sawgrass17 shots pin onHoverShot intro>
  <Canvas>
    <Scene>
      <Water />           MeshReflectorMaterial + animated ripple normal map
      <Green />           ShapeGeometry kidney green + fringe ring
      <Bulkhead />        ExtrudeGeometry stone wall around perimeter
      <Causeway />        ExtrudeGeometry walkway from tee side
      <TeeBox />          Platform + orange/white tee markers
      <Bunkers />         Front-right pot bunker + short-right bunker
      <Pin pin={pin} />   Flagstick + waving flag, tints to pin day color
      <Background />      Low-poly tree silhouettes + grandstand shapes
      <Tracers shots />   Animated parabolic arcs, landing dots, hover tooltip
      <OrbitControls />
    </Scene>
  </Canvas>
```

## Data contract

See `lib/golf/types.ts` for `Shot`, `HoleData`, `ShotOutcome`, `PinPosition`.
Sample data with 20 shots across all 4 pins: `data/sample-shots.ts`.

## v2 path (out of scope for this session)

- Replace `<Green>` with a Gaussian splat capture (Spark renderer) - designed
  as a single component boundary swap.
- Google Maps Photorealistic 3D Tiles base layer.
- DataGolf API live data feed (wired in main portfolio repo).
